/**
 * 题库层（web-v1.md §二.3）：内置题库（打包产物，随 SW 预缓存）→ IndexedDB 种子 → 读取。
 * M4 起远程增量也并入 IDB 同一 store，客户端只认 nk.bank 一个真源。
 */

import bankJson from "../data/bank.json";
import type { Bank, Question } from "./types";
import { compareVersion, fetchTextTimeout, runBankUpdate, type Manifest, type UpdateState } from "./update";

const DB_NAME = "nanikiru";
const STORE = "bank";
const KEY = "merged";
const KEY_STATE = "update_state";

const bundled = bankJson as unknown as Bank;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet<T>(db: IDBDatabase, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
    tx.onsuccess = () => resolve(tx.result as T | undefined);
    tx.onerror = () => reject(tx.error);
  });
}

function idbPut(db: IDBDatabase, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite").objectStore(STORE).put(value, key);
    tx.onsuccess = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

let cache: Bank | null = null;

/** IDB 回调悬挂兜底（隐私模式/嵌入式 WebView 等场景）：超时即视为不可用 */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("IndexedDB 超时")), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

/** 取题库：IDB 有则用（含远程增量合并结果），否则以内置题库种入 */
export async function loadBank(): Promise<Bank> {
  if (cache) return cache;
  try {
    const bank = await withTimeout((async () => {
      const db = await openDB();
      const stored = await idbGet<Bank>(db, KEY);
      if (stored && stored.bank_version) {
        // 内置版本比 IDB 新（App 更新携带新出厂题库）→ 以内置为底重新种入
        if (compareVersion(stored.bank_version, bundled.bank_version) < 0) {
          await idbPut(db, KEY, bundled);
          return bundled;
        }
        return stored;
      }
      await idbPut(db, KEY, bundled);
      return bundled;
    })(), 1500);
    cache = bank;
  } catch {
    // IndexedDB 不可用（隐私模式等）：静默降级到内置题库，功能不缺
    cache = bundled;
  }
  return cache;
}

export function questionsOf(bank: Bank, level: string): Question[] {
  return bank.questions.filter((q) => q.level === level);
}

/* ---------- 题库增量更新（M4，架构见 update.ts） ---------- */

export interface BankUpdateResult {
  status: "up_to_date" | "updated" | "unavailable";
  /** 更新前本地版本 */
  version?: string;
  /** 已更新到版本 */
  to?: string;
  /** 本次下载的分级（首拉为全部分级） */
  downloaded?: string[];
  /** 净题量变化（+新增 -删除，可负） */
  added?: number;
}

/** 清掉内存缓存，下次 loadBank 重读 IDB（页面已在展示旧版时，配合重新挂载使用） */
export function invalidateBank() {
  cache = null;
}

function defaultManifestUrl(): string {
  const base = typeof location !== "undefined" && location.origin ? location.origin : "http://localhost";
  return new URL("/bank/manifest.json", base).href;
}

/**
 * 检查并应用一次题库增量更新。永不抛错：IndexedDB 不可用 / 断网 / manifest 损坏 /
 * 分片校验失败一律返回 unavailable 或 up_to_date，保留本地题库（PRD 6.4 静默降级）。
 * App 启动静默与设置页手动「检查并更新」走同一入口。
 */
export async function checkBankUpdate(
  opts: { manifestUrl?: string; fetchText?: (url: string) => Promise<string> } = {},
): Promise<BankUpdateResult> {
  try {
    const db = await withTimeout(openDB(), 1500);
    const stored = await idbGet<Bank>(db, KEY);
    const current = stored && stored.bank_version ? stored : bundled;
    const state = (await idbGet<UpdateState>(db, KEY_STATE)) ?? null;
    const manifestUrl = opts.manifestUrl ?? defaultManifestUrl();

    const manifestText = await (opts.fetchText ?? fetchTextTimeout)(manifestUrl);
    const manifest = JSON.parse(manifestText) as Manifest;
    if (
      manifest.schema_version !== 1 ||
      typeof manifest.bank_version !== "string" ||
      !Array.isArray(manifest.levels)
    ) {
      return { status: "unavailable" };
    }

    const outcome = await runBankUpdate({
      manifest,
      currentVersion: current.bank_version,
      currentState: state,
      current: current.questions,
      manifestUrl,
      fetchText: opts.fetchText,
    });

    if (outcome.status === "updated") {
      const next: Bank = {
        bank_version: outcome.manifest.bank_version,
        generated_at: new Date().toISOString(),
        questions: outcome.questions,
      };
      await idbPut(db, KEY, next);
      await idbPut(db, KEY_STATE, {
        bank_version: outcome.manifest.bank_version,
        levels: Object.fromEntries(outcome.manifest.levels.map((l) => [l.level, l.sha256])),
      });
      cache = next; // 就地刷新，避免后续 loadBank 命中旧缓存
      return {
        status: "updated",
        version: current.bank_version,
        to: outcome.manifest.bank_version,
        downloaded: outcome.downloaded,
        added: outcome.questions.length - current.questions.length,
      };
    }
    // up_to_date 与 newer_local（本地比服务器还新，App 发布先行）都不动作
    return { status: "up_to_date" };
  } catch {
    return { status: "unavailable" };
  }
}
