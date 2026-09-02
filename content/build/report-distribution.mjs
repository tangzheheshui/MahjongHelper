/**
 * 题库分布报告（只读，M3 QA，question-bank.md §六）：对照 PRD A.1 起步/完整目标，
 * 打印七级题量、题型、难度分布与缺口。不改任何文件。
 *
 * 用法：node content/build/report-distribution.mjs
 * 退出码：起步批（每级 ≥10）全达标 0，否则 1 —— 方便 CI/收尾闸门。
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "..", "questions");

// PRD A.1：起步 = 每级 ≥10（共 ≥70）；完整目标见 question-bank.md §六
const START_MIN_PER_LEVEL = 10;
const FULL_TARGET = { L1: 30, L2: 35, L3: 30, L4: 40, L5: 30, L6: 20, L7: 15 };

const all = [];
for (const f of readdirSync(SRC).filter((x) => x.endsWith(".json")).sort()) {
  const data = JSON.parse(readFileSync(join(SRC, f), "utf-8"));
  const qs = Array.isArray(data) ? data : data.questions;
  all.push(...qs.map((q) => ({ ...q, _file: f })));
}

const byLevel = {};
const byType = {};
const byDiff = {};
const missingVerified = [];
for (const q of all) {
  byLevel[q.level] = (byLevel[q.level] ?? 0) + 1;
  byType[q.question_type] = (byType[q.question_type] ?? 0) + 1;
  byDiff[q.difficulty] = (byDiff[q.difficulty] ?? 0) + 1;
  if (!q.verified) missingVerified.push(`${q.id}（${q._file}）`);
}

console.log(`总题数 ${all.length}（${all.length >= 70 ? "达起步 70" : `距起步 70 还差 ${70 - all.length}`}）\n`);
console.log("级别 | 现题量 | 起步≥10 | 完整目标 | 缺口(完整)");
const levelOrder = ["L1", "L2", "L3", "L4", "L5", "L6", "L7"];
let belowStart = 0;
for (const lv of levelOrder) {
  const n = byLevel[lv] ?? 0;
  const ok = n >= START_MIN_PER_LEVEL ? "✓" : "✗";
  if (n < START_MIN_PER_LEVEL) belowStart++;
  console.log(` ${lv}  |  ${String(n).padStart(3)}   |   ${ok}      |  ${String(FULL_TARGET[lv]).padStart(3)}    |  ${FULL_TARGET[lv] - n > 0 ? FULL_TARGET[lv] - n : 0}`);
}
console.log(`\n未达起步 ${belowStart} 级 | 全级达标起步 ${belowStart === 0}`);

console.log("\n题型分布:", Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join("  "));
console.log("难度分布:", Object.entries(byDiff).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join("  "));
if (missingVerified.length > 0) {
  console.warn(`\n⚠ 缺少 verified 字段 ${missingVerified.length} 题（未过 verify --write）：${missingVerified.slice(0, 5).join(", ")}${missingVerified.length > 5 ? " …" : ""}`);
}

// 起步达标（每级≥10）才算通过
const allMet = levelOrder.every((lv) => (byLevel[lv] ?? 0) >= START_MIN_PER_LEVEL);
console.log(`\n${allMet ? "✓ 起步批达标（七级每级 ≥10）" : `✗ 起步批未达标，还差 ${70 - all.length} 题 / ${belowStart} 级`}`);
process.exit(allMet ? 0 : 1);
