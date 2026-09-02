/**
 * 题库打包（M2 最小版，M3 扩展 manifest/sha256 分片）：
 * 合并 content/questions/*.json → apps/web/src/data/bank.json（App 内置出厂题库）。
 *
 * 用法：node content/build/roll-bank.mjs
 * 题源结构：数组 或 { questions: [...] }；必须已过 engine verify CLI。
 */

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "..", "questions");
const OUT = join(HERE, "..", "..", "apps", "web", "src", "data", "bank.json");
const BANK_VERSION = "2026.09.0-pilot";

const files = readdirSync(SRC).filter((f) => f.endsWith(".json")).sort();
const questions = [];
for (const f of files) {
  const data = JSON.parse(readFileSync(join(SRC, f), "utf-8"));
  const qs = Array.isArray(data) ? data : data.questions;
  if (!Array.isArray(qs)) throw new Error(`${f}: 无法识别的题库结构`);
  questions.push(...qs);
}

const ids = new Set();
for (const q of questions) {
  if (ids.has(q.id)) throw new Error(`题目 id 重复: ${q.id}`);
  ids.add(q.id);
}

const bank = { bank_version: BANK_VERSION, generated_at: new Date().toISOString(), questions };
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(bank, null, 1) + "\n", "utf-8");

const byLevel = {};
for (const q of questions) byLevel[q.level] = (byLevel[q.level] ?? 0) + 1;
console.log(`打包 ${questions.length} 题 → ${OUT}`);
console.log("分布:", JSON.stringify(byLevel));
