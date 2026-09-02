/**
 * M4 e2e 干跑（M4 DoD 自测，architecture.md §五）：本地 http 服务模拟服务器，跑通
 * 「旧题库 → manifest → 增量更新」真实链路。
 *
 * 覆盖（客户端走的是生产同一份 update.ts 逻辑 + 真 fetch + 真 sha256）：
 *   1) 服务器 v1→v2 发布：全新客户端（无已应用哈希）首拉全量 → 归并出新题库
 *   2) 服务器 v2→v3 只改 L3：客户端增量只下载 L3 一个分片，其余级保留
 *   3) 无新版本：up_to_date 不再拉取
 *   4) 分片 sha256 被篡改：更新失败抛错 → 调用方静默保留旧题库（PRD 6.4）
 *
 * 用法：npx tsx apps/web/scripts/e2e-update.ts
 * 退出码：全部通过 0，任一断言失败 1。
 */

import { createServer } from "node:http";
import { readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { buildShards } from "../../../content/build/publish.mjs";
import { fetchTextTimeout, runBankUpdate } from "../src/lib/update";
import type { Bank, Question } from "../src/lib/types";
import type { UpdateState } from "../src/lib/update";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..", "..");
const BUNDLED = join(ROOT, "apps", "web", "src", "data", "bank.json");

let failures = 0;
function pass(msg: string) {
  console.log(`✓ ${msg}`);
}
function fail(msg: string) {
  failures += 1;
  console.error(`✗ ${msg}`);
}
function assert(cond: boolean, msg: string) {
  (cond ? pass : fail)(msg);
}

/** 第三段 +1 生成下个版本（YYYY.MM.N[-suffix]） */
function bumpVersion(v: string): string {
  const m = /^(\d+\.\d+\.)(\d+)(.*)$/.exec(v);
  if (!m) throw new Error(`无法 bump 版本: ${v}`);
  return `${m[1]}${Number(m[2]) + 1}${m[3] ?? ""}`;
}

/** 浅拷贝一题并换 id，用于构造「服务器多出的一题」（e2e 虚构内容，不入真库） */
function synthetic(base: Question, id: string): Question {
  return { ...base, id };
}

async function main() {
  const bundledRaw = JSON.parse(await readFile(BUNDLED, "utf-8")) as Bank;
  const V1 = bundledRaw.bank_version;
  const V2 = bumpVersion(V1);
  const V3 = bumpVersion(V2);

  // —— 服务器内容构造（以内置 28 题为底，虚构后续版本）——
  const byL1 = bundledRaw.questions.filter((q) => q.level === "L1");
  const byL3 = bundledRaw.questions.filter((q) => q.level === "L3");
  const group = (qs: Question[]) => {
    const g: Record<string, Question[]> = {};
    for (const q of qs) (g[q.level] = g[q.level] ?? []).push(q);
    return g;
  };
  const v2Groups = group(bundledRaw.questions);
  v2Groups.L1.push(synthetic(byL1[0], "L1_e2e_v2")); // v2 新增 1 题到 L1
  const v3Groups = JSON.parse(JSON.stringify(v2Groups)) as Record<string, Question[]>;
  v3Groups.L3.push(synthetic(byL3[0], "L3_e2e_v3")); // v3 只在 L3 新增 1 题

  // —— 起本地静态服务器 ——
  const serverRoot = join(tmpdir(), `nanikiru-e2e-${Date.now()}`);
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      let p = decodeURIComponent(url.pathname);
      if (p.endsWith("/")) p = "index.html";
      const fp = resolve(join(serverRoot, p));
      if (!fp.startsWith(serverRoot + sep)) throw new Error("越界访问");
      const body = await readFile(fp);
      res.writeHead(200, {
        "content-type": p.endsWith(".json") ? "application/json" : "application/octet-stream",
      });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end("not found");
    }
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as { port: number }).port;
  const manifestUrl = `http://127.0.0.1:${port}/manifest.json`;
  const fetchText = (u: string) => fetchTextTimeout(u, 3000);

  try {
    // 服务器先发 v1（== 客户端内置，留存目录模拟回滚基础）
    buildShards({ byLevel: group(bundledRaw.questions), bankVersion: V1, outDir: serverRoot });

    // ===== 场景 1：服务器发 v2 → 全新客户端首拉全量 =====
    buildShards({ byLevel: v2Groups, bankVersion: V2, outDir: serverRoot });
    let current: Question[] = bundledRaw.questions;
    let state: UpdateState | null = null; // 新装：无已应用哈希
    const r1 = await runBankUpdate({
      manifest: JSON.parse(await fetchText(manifestUrl)),
      currentVersion: V1,
      currentState: state,
      current,
      manifestUrl,
      fetchText,
    });
    assert(r1.status === "updated", `场景1: 检测到 v2 更新（实际 ${r1.status}）`);
    if (r1.status === "updated") {
      assert(r1.downloaded.length === 7, `场景1: 首拉全量 7 级（实际 ${r1.downloaded.join(",")}）`);
      const hasV2New = r1.questions.some((q) => q.id === "L1_e2e_v2");
      assert(hasV2New, "场景1: 归并后含服务器 v2 新增题");
      current = r1.questions;
      state = {
        bank_version: V2,
        levels: Object.fromEntries((JSON.parse(await fetchText(manifestUrl)) as { levels: { level: string; sha256: string }[] }).levels.map((l) => [l.level, l.sha256])),
      };
    }

    // ===== 场景 2：服务器只改 L3 发 v3 → 增量只拉 L3 =====
    buildShards({ byLevel: v3Groups, bankVersion: V3, outDir: serverRoot });
    const r2 = await runBankUpdate({
      manifest: JSON.parse(await fetchText(manifestUrl)),
      currentVersion: state.bank_version,
      currentState: state,
      current,
      manifestUrl,
      fetchText,
    });
    assert(r2.status === "updated", `场景2: 检测到 v3 更新（实际 ${r2.status}）`);
    if (r2.status === "updated") {
      assert(r2.downloaded.length === 1 && r2.downloaded[0] === "L3", `场景2: 只拉 L3（实际 ${r2.downloaded.join(",")}）`);
      assert(r2.questions.some((q) => q.id === "L3_e2e_v3"), "场景2: 含 v3 新增 L3 题");
      assert(r2.questions.some((q) => q.id === "L1_e2e_v2"), "场景2: v2 已有题保留（未重拉不丢失）");
      current = r2.questions;
      state = { bank_version: V3, levels: Object.fromEntries(((await (async () => JSON.parse(await fetchText(manifestUrl)))()) as { levels: { level: string; sha256: string }[] }).levels.map((l) => [l.level, l.sha256])) };
    }

    // ===== 场景 3：无新版本 → up_to_date =====
    const r3 = await runBankUpdate({
      manifest: JSON.parse(await fetchText(manifestUrl)),
      currentVersion: state.bank_version,
      currentState: state,
      current,
      manifestUrl,
      fetchText,
    });
    assert(r3.status === "up_to_date", `场景3: 已最新不再拉取（实际 ${r3.status}）`);

    // ===== 场景 4：服务器分片被篡改（sha 对不上）→ 抛错，客户端静默保留旧题库 =====
    const man = JSON.parse(await fetchText(manifestUrl)) as {
      bank_version: string;
      levels: { level: string; sha256: string }[];
    };
    const tampered = {
      schema_version: 1,
      bank_version: bumpVersion(state.bank_version),
      published_at: "",
      levels: man.levels.map((l) => (l.level === "L1" ? { ...l, sha256: "deadbeef".repeat(8) } : l)),
    };
    let threw = false;
    try {
      await runBankUpdate({
        manifest: tampered as never,
        currentVersion: state.bank_version,
        currentState: state,
        current,
        manifestUrl,
        fetchText,
      });
    } catch {
      threw = true;
    }
    assert(threw, "场景4: 分片 sha 篡改 → 更新抛错（调用方静默保留旧题库）");

    console.log(`\n发布版本链 ${V1} → ${V2} → ${V3} 干跑完成：首拉全量 / 单级增量 / 已最新 / 篡改拒收`);
    console.log(`临时服务器目录：${serverRoot}`);
  } finally {
    server.close();
    await rm(serverRoot, { recursive: true, force: true });
  }
}

main()
  .then(() => {
    if (failures > 0) {
      console.error(`\ne2e 有 ${failures} 项未通过`);
      process.exit(1);
    }
    console.log("\ne2e-update 全部通过（M4 DoD 干跑绿）");
  })
  .catch((e) => {
    console.error("e2e 异常终止：", e);
    process.exit(1);
  });
