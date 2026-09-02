/**
 * 题库增量更新（M4，web-v1.md §二.4 / architecture.md §五）。
 *
 * 本模块只做「拉 manifest → 判变化 → 下载校验分片 → 归并」，**不做任何持久化**：
 * 浏览器侧由 bank.ts 把它接入 IndexedDB，node e2e 脚本直接复用它跑真实链路——
 * 因此这里只用平台无关能力（fetch + crypto.subtle），保证同一份代码两端跑同一逻辑。
 *
 * 归并语义：
 * - manifest 是「服务器当前全量」的指针，逐级全量替换：该级整组换成下载分片
 * - manifest 缺省的级 = 服务器已删 = 本地也删
 * - 未变化的级保留本地（本地已是该远程版本内容）
 * - 新装（无 update_state）不知道内置题库每级哈希 → 首拉全量，之后只拉哈希变化的级
 */

import type { Question } from "./types";

/** 服务器 manifest.json（question-bank.md §四，publish.mjs 生成） */
export interface ManifestLevel {
  level: string;
  /** 相对 manifest.json 的分片路径，客户端不推断目录名 */
  file: string;
  count: number;
  sha256: string;
}

export interface Manifest {
  schema_version: number;
  bank_version: string;
  published_at: string;
  levels: ManifestLevel[];
}

/** 客户端「已应用」状态：上次成功应用的版本 + 每级 sha256（存 IndexedDB key update_state） */
export interface UpdateState {
  bank_version: string;
  levels: Record<string, string>;
}

/**
 * 分片文件内容（publish.mjs 写出的 { level, questions }，**不含 bank_version**：
 * 保证同内容跨版本字节一致、sha 不变，增量更新才成立）。
 */
export interface LevelShard {
  level: string;
  questions: Question[];
}

/** 版本号数值比较：YYYY.MM.N[-suffix]，按点分数字段比较（非字典序，2026.09.10 > 2026.09.9） */
export function compareVersion(a: string, b: string): number {
  const re = /^(\d+)\.(\d+)\.(\d+)(?:-(.*))?$/;
  const ma = re.exec(a);
  const mb = re.exec(b);
  if (!ma || !mb) return a < b ? -1 : a > b ? 1 : 0; // 非规范格式兜底走字典序
  for (let i = 1; i <= 3; i++) {
    const d = Number(ma[i]) - Number(mb[i]);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  const ta = ma[4] ?? "";
  const tb = mb[4] ?? "";
  return ta < tb ? -1 : ta > tb ? 1 : 0;
}

/** sha256 十六进制（浏览器 / Node ≥20 均有 crypto.subtle） */
export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** 分片相对路径 → 绝对 URL（相对 manifest.json 解析，天然落到同目录 v{version}/ 下） */
export function resolveLevelUrl(manifestUrl: string, file: string): string {
  return new URL(file, manifestUrl).href;
}

/** 默认取数器：3s 超时拉文本，任何非 200 / 超时都抛错（由调用方决定静默） */
export function fetchTextTimeout(url: string, timeoutMs = 3000): Promise<string> {
  return fetch(url, { signal: AbortSignal.timeout(timeoutMs) }).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${url}`);
    return r.text();
  });
}

export interface ChangePlan {
  /** 本次需要下载的分级（首拉 = 全部级） */
  changedLevels: string[];
  /** 更新后应保留的分级（= manifest 当前全集） */
  targetLevels: string[];
}

/** 纯函数：按本地已应用哈希表算「哪些级变了」。state 为空 = 新装/首次远程，全量。 */
export function planChanged(manifest: Manifest, state: UpdateState | null): ChangePlan {
  const targetLevels = manifest.levels.map((l) => l.level);
  const hasBaseline = state != null && state.levels != null && Object.keys(state.levels).length > 0;
  const known = new Map<string, string>();
  if (hasBaseline && state) for (const [lv, sha] of Object.entries(state.levels)) known.set(lv, sha);

  const changedLevels = manifest.levels
    .filter((l) => !known.has(l.level) || known.get(l.level) !== l.sha256)
    .map((l) => l.level);

  return { changedLevels, targetLevels };
}

/** 纯函数：归并出更新后的题目全集。fetchedByLevel 只含本次下载成功的分片。 */
export function mergeBank(
  current: Question[],
  fetchedByLevel: Record<string, Question[]>,
  plan: ChangePlan,
): Question[] {
  const currentByLevel = new Map<string, Question[]>();
  for (const q of current) {
    const arr = currentByLevel.get(q.level) ?? [];
    arr.push(q);
    currentByLevel.set(q.level, arr);
  }
  const out: Question[] = [];
  for (const level of plan.targetLevels) {
    const picked = fetchedByLevel[level] ?? currentByLevel.get(level) ?? [];
    out.push(...picked);
  }
  return out;
}

export type UpdateOutcome =
  | { status: "up_to_date"; manifest: Manifest }
  | { status: "updated"; manifest: Manifest; downloaded: string[]; questions: Question[] }
  | { status: "newer_local"; manifest: Manifest };

/**
 * 编排一次「旧题库 → manifest → 增量」更新（网络 + 校验 + 归并，不含持久化）。
 *
 * @param manifest       已拉取并解析的服务器 manifest
 * @param currentVersion 本地题库当前版本（内置 bank_version 或上次应用的远程版本）
 * @param currentState   本地已应用哈希表（可为 null，见 planChanged）
 * @param current        本地题库题目全集
 * @param fetchText      取分片文本（默认 3s 超时），生产/测试可注入
 *
 * 任一步失败（网络、sha256 不符、结构错误）抛错——调用方负责静默保留旧题库。
 */
export async function runBankUpdate(opts: {
  manifest: Manifest;
  currentVersion: string;
  currentState: UpdateState | null;
  current: Question[];
  manifestUrl?: string;
  fetchText?: (url: string) => Promise<string>;
}): Promise<UpdateOutcome> {
  const { manifest, currentVersion, currentState, current } = opts;
  const baselineVersion = currentState?.bank_version ?? currentVersion;
  const cmp = compareVersion(manifest.bank_version, baselineVersion);
  if (cmp < 0) return { status: "newer_local", manifest };
  if (cmp === 0) return { status: "up_to_date", manifest };

  const plan = planChanged(manifest, currentState);
  const get = opts.fetchText ?? fetchTextTimeout;

  const fetchedByLevel: Record<string, Question[]> = {};
  const downloaded: string[] = [];
  for (const lv of plan.changedLevels) {
    const entry = manifest.levels.find((l) => l.level === lv);
    if (!entry) continue;
    const text = await get(resolveLevelUrl(opts.manifestUrl ?? "/bank/manifest.json", entry.file));
    if ((await sha256Hex(text)) !== entry.sha256) {
      throw new Error(`分片 sha256 校验失败: ${entry.file}`);
    }
    const shard = JSON.parse(text) as LevelShard;
    if (shard.level !== lv || !Array.isArray(shard.questions) || shard.questions.length !== entry.count) {
      throw new Error(`分片结构不符: ${entry.file}`);
    }
    fetchedByLevel[lv] = shard.questions;
    downloaded.push(lv);
  }

  const questions = mergeBank(current, fetchedByLevel, plan);
  return { status: "updated", manifest, downloaded, questions };
}
