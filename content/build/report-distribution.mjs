/**
 * 题库分布报告（只读，M3 QA）：对照 requirements.md 题量表（起步下限），
 * 打印七级题量、题型、难度分布与缺口。不改任何文件。
 *
 * 用法：node content/build/report-distribution.mjs
 * 退出码：起步批全达标 0，否则 1 —— 方便 CI/收尾闸门。
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "..", "questions");

// 起步下限（2026-09-02 用户裁定：L1-L3 太简单、减量 → ≥8；L4-L7 保持 ≥10）；完整目标 200 见 requirements.md
const START_MIN = { L1: 8, L2: 8, L3: 8, L4: 10, L5: 10, L6: 10, L7: 10 };
const START_MIN_SUM = Object.values(START_MIN).reduce((a, b) => a + b, 0);
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

console.log(`总题数 ${all.length}（起步下限合计 ${START_MIN_SUM}）\n`);
console.log("级别 | 现题量 | 起步下限 | 完整目标 | 缺口(完整)");
const levelOrder = ["L1", "L2", "L3", "L4", "L5", "L6", "L7"];
let belowStart = 0;
for (const lv of levelOrder) {
  const n = byLevel[lv] ?? 0;
  const ok = n >= START_MIN[lv] ? "✓" : "✗";
  if (n < START_MIN[lv]) belowStart++;
  console.log(` ${lv}  |  ${String(n).padStart(3)}   |   ≥${START_MIN[lv]}${ok}    |  ${String(FULL_TARGET[lv]).padStart(3)}    |  ${FULL_TARGET[lv] - n > 0 ? FULL_TARGET[lv] - n : 0}`);
}
console.log(`\n未达起步 ${belowStart} 级 | 全级达标起步 ${belowStart === 0}`);

console.log("\n题型分布:", Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join("  "));
console.log("难度分布:", Object.entries(byDiff).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join("  "));
if (missingVerified.length > 0) {
  console.warn(`\n⚠ 缺少 verified 字段 ${missingVerified.length} 题（未过 verify --write）：${missingVerified.slice(0, 5).join(", ")}${missingVerified.length > 5 ? " …" : ""}`);
}

// 起步达标（每级达到下限）才算通过
const allMet = levelOrder.every((lv) => (byLevel[lv] ?? 0) >= START_MIN[lv]);
console.log(`\n${allMet ? "✓ 起步批达标（L1-L3 ≥8、L4-L7 ≥10）" : `✗ 起步批未达标（${belowStart} 级低于下限）`}`);
process.exit(allMet ? 0 : 1);
