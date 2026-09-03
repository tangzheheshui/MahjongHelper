/**
 * 极简内存 fake-indexedDB（仅覆盖 bank.ts 用到的 open/get/put）。
 * e2e-bank.ts（node 自测）与 Drill.test.tsx（jsdom 页面级回归）共用，
 * 免装 fake-indexeddb 依赖。
 */

type Idb = { get(k: string): unknown; put(v: unknown, k: string): void };

function mkReq(result: unknown) {
  const req: { onsuccess?: () => void; onerror?: () => void; result?: unknown } = {};
  queueMicrotask(() => {
    req.result = result;
    req.onsuccess?.();
  });
  return req;
}

export function installFakeIdb(): { getStore: () => Map<string, unknown> } {
  const maps = new Map<string, Map<string, unknown>>();
  const store = (name: string): Idb => {
    const m = maps.get(name) ?? new Map<string, unknown>();
    maps.set(name, m);
    return {
      get: (k) => mkReq(m.get(k)),
      put: (v, k) => { m.set(k, v); return mkReq(undefined); },
    };
  };
  (globalThis as Record<string, unknown>).indexedDB = {
    open: (_name: string, _ver: number) => {
      const req: {
        result?: { objectStoreNames: { contains(n: string): boolean }; createObjectStore(n: string): unknown; transaction(_n: string, _m: string): { objectStore(n: string): unknown } };
        onupgradeneeded?: () => void;
        onsuccess?: () => void;
        onerror?: () => void;
      } = {};
      queueMicrotask(() => {
        const db = {
          objectStoreNames: { contains: (n: string) => maps.has(n) },
          createObjectStore: (n: string) => { store(n); return store(n); },
          transaction: (_n: string) => ({ objectStore: (n: string) => store(n) }),
        };
        req.result = db;
        req.onupgradeneeded?.();
        req.onsuccess?.();
      });
      return req;
    },
  };
  return { getStore: () => maps.get("bank") ?? new Map() };
}
