/**
 * 题库发布构建（M4，architecture.md §五）：content/questions/* → server/bank/。
 *
 * 产出：
 *   server/bank/v{bank_version}/{L1..L7}.json   分级分片（旧版本目录保留，天然支持回滚）
 *   server/bank/manifest.json                    版本清单（最后写——先数据后指针）
 *
 * 用法：
 *   node content/build/publish.mjs                    # 用 version.mjs 的单点版本号，产物进 server/bank/
 *   node content/build/publish.mjs --out <目录> --bank-version <版本>   # 自定义（e2e 干跑用）
 *
 * 前置：content/questions/*.json 必须已过 engine verify CLI（题目自带 verified 快照）。
 * 分片 = 同一批题源的直接切分，与 App 内置出厂题库（roll-bank.mjs）同源同构。
 * 本文件导出 buildShards 供 e2e 脚本复用。
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { CURRENT_BANK_VERSION } from "./version.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "..", "questions");
const DEFAULT_OUT = resolve(HERE, "..", "..", "server", "bank");

/** 级别自然排序（L1…L7，勿按字典序排到 L10 之后） */
function levelRank(level) {
  const n = /^L(\d+)$/.exec(level ?? "");
  return n ? Number(n[1]) : Number.MAX_SAFE_INTEGER;
}

/**
 * 分片正文：只含 level + questions，【不含 bank_version】——否则每发一版全部级哈希都变、
 * 增量退化为全量。同内容跨版本字节一致 → sha 不变 → 客户端只拉真变化的级（架构 §五）。
 */
function shardBody(level, questions) {
  return JSON.stringify({ level, questions }, null, 1) + "\n";
}

/** 读取题源目录 → { level: questions[] } */
export function readQuestions(srcDir = SRC) {
  const files = readdirSync(srcDir).filter((f) => f.endsWith(".json")).sort();
  if (files.length === 0) throw new Error(`${srcDir}: 没有题源文件`);
  const byLevel = {};
  for (const f of files) {
    const data = JSON.parse(readFileSync(join(srcDir, f), "utf-8"));
    const qs = Array.isArray(data) ? data : data.questions;
    if (!Array.isArray(qs)) throw new Error(`${f}: 无法识别的题库结构`);
    for (const q of qs) byLevel[q.level] = (byLevel[q.level] ?? []).concat(q);
  }
  return byLevel;
}

/**
 * 生成 server/bank 全量产物。返回生成的 manifest。
 * @param {object} opts
 * @param {Record<string, object[]>} opts.byLevel  题目按级分组
 * @param {string} opts.bankVersion                bank_version（= 版本目录 token）
 * @param {string} opts.outDir                     产物根目录（server/bank/）
 * @param {string} [opts.publishedAt]              缺省 now
 */
export function buildShards({ byLevel, bankVersion, outDir, publishedAt }) {
  if (!/^[A-Za-z0-9._-]+$/.test(bankVersion)) {
    throw new Error(`bank_version 含非法字符（仅允许 A-Za-z0-9._-）: ${bankVersion}`);
  }
  const levels = Object.keys(byLevel).sort((a, b) => levelRank(a) - levelRank(b));
  const nonEmpty = levels.filter((lv) => byLevel[lv].length > 0);
  if (nonEmpty.length === 0) throw new Error("没有非空的分级，拒绝发布空库");
  const empty = levels.filter((lv) => byLevel[lv].length === 0);
  if (empty.length > 0) console.warn(`跳过空级: ${empty.join(",")}`);

  // 先全部算好（分片正文、sha、id 校验、同版本防呆），再落盘 —— 避免写到一半报错留下残缺产物
  const manifestLevels = [];
  for (const level of nonEmpty) {
    const file = `v${bankVersion}/${level}.json`;
    // 分片正文【不含 bank_version】——否则每发一版全部级哈希都变、增量退化为全量；
    // 只含 level + questions，同内容跨版本字节一致 → sha 不变 → 客户端只拉真变化的级
    const body = shardBody(level, byLevel[level]);
    manifestLevels.push({
      level,
      file,
      count: byLevel[level].length,
      sha256: createHash("sha256").update(body, "utf-8").digest("hex"),
    });
  }

  // 校验题目 id 全局唯一（与 roll-bank 口径一致，双保险）
  const ids = new Set();
  for (const lv of nonEmpty) {
    for (const q of byLevel[lv]) {
      if (ids.has(q.id)) throw new Error(`题目 id 重复: ${q.id}`);
      ids.add(q.id);
    }
  }

  // 同版本防呆：server/bank 已有同版本 manifest 且内容哈希不同 → 说明改内容忘 bump
  // version.mjs。同版本覆盖 = 客户端 compareVersion 判等 → 永不更新，必须拒绝。
  const prevPath = join(outDir, "manifest.json");
  if (existsSync(prevPath)) {
    let prev;
    try {
      prev = JSON.parse(readFileSync(prevPath, "utf-8"));
    } catch {
      prev = null; // manifest 损坏：覆盖为全新发布
    }
    if (prev && prev.bank_version === bankVersion) {
      const prevSha = new Map(prev.levels.map((l) => [l.level, l.sha256]));
      const drift = manifestLevels.filter((l) => prevSha.get(l.level) !== l.sha256);
      if (drift.length > 0) {
        throw new Error(
          `同版本 ${bankVersion} 内容已变化（${drift.map((d) => d.level).join(",")}）——` +
            `请先 bump content/build/version.mjs 再发布，否则客户端永远收不到更新`,
        );
      }
      console.warn(`⚠ ${bankVersion} 已在 ${outDir} 发布过且内容一致（幂等重发，跳过覆盖）`);
    }
  }

  mkdirSync(join(outDir, `v${bankVersion}`), { recursive: true });
  for (const l of manifestLevels) {
    writeFileSync(join(outDir, l.file), shardBody(l.level, byLevel[l.level]), "utf-8");
  }
  const manifest = {
    schema_version: 1,
    bank_version: bankVersion,
    published_at: publishedAt ?? new Date().toISOString(),
    levels: manifestLevels,
  };
  // manifest 最后写（先数据后指针）
  writeFileSync(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 1) + "\n", "utf-8");

  const counts = nonEmpty.map((lv) => `${lv}×${byLevel[lv].length}`);
  console.log(`✓ 发布 ${bankVersion} → ${outDir}`);
  console.log(`  分片 ${nonEmpty.length} 级（${counts.join(" / ")}） + manifest`);
  return manifest;
}

/**
 * 写后自检：re-读产物核对 manifest 与实际字节一致，把「哈希与落盘不同源 / 分片误带
 * bank_version 导致增量退化」这类回归从 e2e 前移到发布当时硬报错。main 发布即调用，
 * e2e 脚本也可复用。校验项：分片可解析、sha256(re-read)=manifest、count 一致、正文
 * 不含 bank_version 键（增量铁律，见架构 §五）。
 */
export function verifyPublished(outDir) {
  const manifestPath = join(outDir, "manifest.json");
  if (!existsSync(manifestPath)) throw new Error(`${outDir}: 缺 manifest.json，无法自检`);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
  let total = 0;
  for (const l of manifest.levels) {
    const filePath = join(outDir, l.file);
    if (!existsSync(filePath)) throw new Error(`分片缺失: ${l.file}`);
    const raw = readFileSync(filePath, "utf-8");
    const sha = createHash("sha256").update(raw, "utf-8").digest("hex");
    if (sha !== l.sha256) throw new Error(`${l.file}: 磁盘字节与 manifest sha256 不一致（发布逻辑回归？）`);
    const body = JSON.parse(raw);
    if (body.level !== l.level) throw new Error(`${l.file}: 正文 level 与 manifest 不一致`);
    if (!Array.isArray(body.questions) || body.questions.length !== l.count) {
      throw new Error(`${l.file}: 题数与 manifest(${l.count}) 不一致`);
    }
    if ("bank_version" in body) throw new Error(`${l.file}: 分片正文不得含 bank_version（增量铁律，见架构 §五）`);
    total += body.questions.length;
  }
  console.log(
    `✓ 写后自检通过：${manifest.levels.length} 级 / ${total} 题 / ${manifest.bank_version}（sha、count、无 bank_version 键均核对）`,
  );
  return { levels: manifest.levels.length, total, version: manifest.bank_version };
}

function main() {
  const args = process.argv.slice(2);
  const out = args.indexOf("--out") >= 0 ? args[args.indexOf("--out") + 1] : DEFAULT_OUT;
  const bankVersion =
    args.indexOf("--bank-version") >= 0 ? args[args.indexOf("--bank-version") + 1] : CURRENT_BANK_VERSION;
  buildShards({ byLevel: readQuestions(SRC), bankVersion, outDir: out });
  verifyPublished(out); // 发布即自检；校验失败抛错、退出码非 0
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) main();
