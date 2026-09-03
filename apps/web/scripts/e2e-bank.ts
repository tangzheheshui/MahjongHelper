/**
 * bank.ts（IDB 层）集成自测（M4，requirements.md）：node 里以内存 fake-indexedDB
 * 跑真实 loadBank / checkBankUpdate —— 覆盖「种内置 → update_state 落库 → 增量合并 →
 * 缓存刷新 → 失败静默保留」的浏览器路径，逻辑与线上同源。
 *
 * 用法：npx tsx apps/web/scripts/e2e-bank.ts
 * 退出码：全部通过 0，任一断言失败 1。
 */

import { createServer } from "node:http";
import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { buildShards } from "../../../content/build/publish.mjs";
import { checkBankUpdate, invalidateBank, loadBank } from "../src/lib/bank";
import type { Question } from "../src/lib/types";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..", "..");
const BUNDLED = join(ROOT, "apps", "web", "src", "data", "bank.json");

let failures = 0;
const pass = (m: string) => console.log(`✓ ${m}`);
const fail = (m: string) => { failures += 1; console.error(`✗ ${m}`); };
const assert = (c: boolean, m: string) => (c ? pass : fail)(m);

/* ---------- 极简内存 fake-indexedDB（仅覆盖 bank.ts 用到的 get/put/open） ---------- */
type Idb = { get(k: string): unknown; put(v: unknown, k: string): void };
function mkReq(result: unknown) {
  const req: { onsuccess?: () => void; onerror?: () => void; result?: unknown } = {};
  queueMicrotask(() => {
    req.result = result;
    req.onsuccess?.();
  });
  return req;
}
function installFakeIdb(): { getStore: () => Map<string, unknown> } {
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

/* ---------- 本地静态服务器（同 e2e-update） ---------- */
async function startServer(root: string) {
  const server = createServer(async (req, res) => {
    try {
      const p = decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname);
      const fp = resolve(join(root, p));
      if (!fp.startsWith(root + sep)) throw new Error("越界");
      res.writeHead(200, { "content-type": "application/json" });
      res.end(await readFile(fp));
    } catch {
      res.writeHead(404);
      res.end("not found");
    }
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  return { server, url: `http://127.0.0.1:${(server.address() as { port: number }).port}/manifest.json` };
}

const bump = (v: string) => { const m = /^(\d+\.\d+\.)(\d+)(.*)$/.exec(v)!; return `${m[1]}${Number(m[2]) + 1}${m[3] ?? ""}`; };
const synthetic = (q: Question, id: string): Question => ({ ...q, id });

async function main() {
  const bundled = JSON.parse(await readFile(BUNDLED, "utf-8")) as { bank_version: string; questions: Question[] };
  const V1 = bundled.bank_version;
  const V2 = bump(V1);
  const V3 = bump(V2);
  const group = (qs: Question[]) => {
    const g: Record<string, Question[]> = {};
    for (const q of qs) (g[q.level] = g[q.level] ?? []).push(q);
    return g;
  };
  const v2g = group(bundled.questions);
  v2g.L1.push(synthetic(v2g.L1[0], "L1_idb_v2"));
  const v3g = JSON.parse(JSON.stringify(v2g)) as Record<string, Question[]>;
  v3g.L3.push(synthetic(v3g.L3[0], "L3_idb_v3"));

  const serverRoot = join(tmpdir(), `nanikiru-idb-${Date.now()}`);
  const { getStore } = installFakeIdb();
  const { server, url } = await startServer(serverRoot);
  try {
    // ① 空库 → 种内置
    let bank = await loadBank();
    assert(bank.bank_version === V1 && bank.questions.length === bundled.questions.length, `① 空库种入内置 ${V1}（${bank.questions.length} 题）`);
    assert(getStore().has("merged"), "① merged 已写入 IDB");

    // ② 服务器发 v2 → 首拉全量（无 update_state），缓存刷新为 v2
    buildShards({ byLevel: v2g, bankVersion: V2, outDir: serverRoot });
    let r = await checkBankUpdate({ manifestUrl: url });
    assert(r.status === "updated" && r.to === V2, `② 检测到 v2 更新（${r.status} → ${r.to}）`);
    bank = await loadBank();
    assert(bank.bank_version === V2 && bank.questions.some((q) => q.id === "L1_idb_v2"), "② loadBank 返回已归并 v2（含新增题）");
    assert(getStore().has("update_state"), "② update_state 已落库");

    // ③ 已最新 → up_to_date，不再拉
    r = await checkBankUpdate({ manifestUrl: url });
    assert(r.status === "up_to_date", `③ 已最新（${r.status}）`);

    // ④ 服务器只改 L3 发 v3 → 只拉 L3，v2 内容保留
    buildShards({ byLevel: v3g, bankVersion: V3, outDir: serverRoot });
    r = await checkBankUpdate({ manifestUrl: url });
    assert(r.status === "updated" && r.downloaded?.length === 1 && r.downloaded[0] === "L3", `④ 只拉 L3（${r.downloaded?.join(",")}）`);
    invalidateBank();
    bank = await loadBank();
    assert(
      bank.bank_version === V3 && bank.questions.some((q) => q.id === "L3_idb_v3") && bank.questions.some((q) => q.id === "L1_idb_v2"),
      "④ v3 合并：含 L3 新题且 v2 题保留",
    );

    // ⑤ 服务器不可达 → unavailable，题库不变
    server.close();
    const r5 = await checkBankUpdate({ manifestUrl: "http://127.0.0.1:1/manifest.json" });
    assert(r5.status === "unavailable", `⑤ 服务器不可达 → ${r5.status}（静默保留本地）`);
    invalidateBank();
    const after = await loadBank();
    assert(after.bank_version === V3 && after.questions.length === bank.questions.length, "⑤ 失败后本地题库未变");

    console.log(`\n版本链 ${V1} → ${V2} → ${V3} 经真实 IDB 层全链路通过`);
  } finally {
    server.close();
    await rm(serverRoot, { recursive: true, force: true });
  }
}

main()
  .then(() => (failures > 0 ? (console.error(`\ne2e-bank 有 ${failures} 项未通过`), process.exit(1)) : console.log("\ne2e-bank 全部通过 ✅")))
  .catch((e) => { console.error("e2e-bank 异常：", e); process.exit(1); });
