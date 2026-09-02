/**
 * publish.mjs 防呆与写后自检的常驻测试（M4，selfcheck 内跑）。
 *
 * 覆盖 publish.mjs 的发布安全行为，防止「悄悄破坏更新」的回归：
 *   A. 首发成功
 *   B. 同版本同内容幂等重发 → 只警告不报错
 *   C. 同版本但内容变了（漏 bump version.mjs）→ 必须拒绝
 *   D. 一致篡改（分片正文带 bank_version + 同步 manifest sha）→ verifyPublished 必须按
 *      增量铁律拦下（分片正文不含 bank_version，见架构 §五）
 *
 * 用法：node content/build/test-publish.mjs（退出码非 0 = 失败）
 */

import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildShards, readQuestions, verifyPublished } from "./publish.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "..", "questions");

let pass = 0;
let fail = 0;
function ok(cond, name, extra) {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.error(`  ✗ FAIL ${name}${extra ? ` — ${extra}` : ""}`);
  }
}

const out = mkdtempSync(join(tmpdir(), "nanikiru-publish-test-"));
try {
  const V = "test.0.0";
  console.log("A 首发 / B 幂等 / C 漏 bump / D 一致篡改");

  // A. 首发成功
  let threw = false;
  try {
    buildShards({ byLevel: readQuestions(SRC), bankVersion: V, outDir: out });
  } catch (e) {
    threw = true;
  }
  ok(!threw, "A 首发不抛错");
  const verifiedA = verifyPublished(out);
  ok(verifiedA.total === verifiedA.total && existsSync(join(out, "manifest.json")), "A 写后自检可跑通");

  // B. 幂等重发（同内容同版本）：只警告不抛错
  threw = false;
  try {
    buildShards({ byLevel: readQuestions(SRC), bankVersion: V, outDir: out });
  } catch (e) {
    threw = true;
  }
  ok(!threw, "B 同版本同内容幂等重发不抛错");

  // C. 同版本改内容（模拟漏 bump）：必须拒绝并提示 bump
  const drifted = readQuestions(SRC);
  drifted.L1 = [...drifted.L1, { id: "PUBLISH_TEST_FAKE", level: "L1" }];
  let cMsg = "";
  threw = false;
  try {
    buildShards({ byLevel: drifted, bankVersion: V, outDir: out });
  } catch (e) {
    threw = true;
    cMsg = e.message;
  }
  ok(threw && /bump/.test(cMsg), "C 同版本内容漂移被拦（提示 bump version.mjs）", cMsg);

  // D. 一致篡改：重写 L1 分片正文【带 bank_version】并同步 manifest sha → 自检按铁律拦下
  buildShards({ byLevel: readQuestions(SRC), bankVersion: "test.0.1", outDir: out });
  const evil = JSON.stringify(
    { level: "L1", bank_version: "test.0.1", questions: readQuestions(SRC).L1 },
    null,
    1,
  ) + "\n";
  writeFileSync(join(out, "vtest.0.1", "L1.json"), evil, "utf-8");
  const mfPath = join(out, "manifest.json");
  const mf = JSON.parse(readFileSync(mfPath, "utf-8"));
  mf.levels = mf.levels.map((l) =>
    l.level === "L1" ? { ...l, sha256: createHash("sha256").update(evil, "utf-8").digest("hex") } : l,
  );
  writeFileSync(mfPath, JSON.stringify(mf, null, 1) + "\n", "utf-8");
  let dMsg = "";
  threw = false;
  try {
    verifyPublished(out);
  } catch (e) {
    threw = true;
    dMsg = e.message;
  }
  ok(threw && /bank_version/.test(dMsg), "D 一致篡改（分片带版本号）被自检按增量铁律拦下", dMsg);
} finally {
  rmSync(out, { recursive: true, force: true });
}

console.log(`\n${pass} 通过 / ${fail} 失败`);
process.exit(fail ? 1 : 0);
