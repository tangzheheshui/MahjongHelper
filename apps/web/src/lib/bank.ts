/**
 * 题库层（web-v1.md §二.3）：内置题库（打包产物，随 SW 预缓存）→ IndexedDB 种子 → 读取。
 * M4 起远程增量也并入 IDB 同一 store，客户端只认 nk.bank 一个真源。
 */

import bankJson from "../data/bank.json";
import type { Bank, Question } from "./types";

const DB_NAME = "nanikiru";
const STORE = "bank";
const KEY = "merged";

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
        if (stored.bank_version < bundled.bank_version) {
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
