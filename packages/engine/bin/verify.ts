#!/usr/bin/env node
/**
 * 题库校验 CLI（schema v1 语义闸）：题库 JSON 全量校验，不一致的题拒绝入库。
 *
 * 用法：
 *   npx tsx packages/engine/bin/verify.ts <题库.json | 目录>... [--write]
 *
 * - 默认只校验（只读）；--write 时对全部通过的文件写回 engine_snapshot 与 verified 字段
 * - 文件格式：题目数组，或 { questions: [...] }（content/questions/LX.json，M3 落地）
 * - 退出码：全部通过 0，存在被拒绝的题（或文件错误）1
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { argv, exit } from "node:process";
import { buildSnapshot, buildVerified, verifyQuestionBank } from "../src/verify";
import type { Question } from "../src/verify";

const args = argv.slice(2);
const write = args.includes("--write");
const paths = args.filter((a) => !a.startsWith("--"));

if (paths.length === 0) {
  console.error("用法: npx tsx packages/engine/bin/verify.ts <题库.json|目录>... [--write]");
  exit(2);
}

function expand(path: string): string[] {
  if (statSync(path).isDirectory()) {
    return readdirSync(path)
      .filter((f) => f.endsWith(".json"))
      .map((f) => `${path.replace(/[\\/]$/, "")}/${f}`);
  }
  return [path];
}

function loadQuestions(file: string): { questions: Question[]; wrap: boolean } {
  const data = JSON.parse(readFileSync(file, "utf-8"));
  if (Array.isArray(data)) return { questions: data, wrap: false };
  if (data && Array.isArray(data.questions)) return { questions: data.questions, wrap: true };
  throw new Error(`无法识别的题库结构（须为题目数组或 {questions: [...]}）`);
}

let failed = false;

for (const path of paths.flatMap(expand)) {
  let questions: Question[];
  let wrap: boolean;
  try {
    ({ questions, wrap } = loadQuestions(path));
  } catch (e) {
    console.error(`✗ ${path}: 读取失败 —— ${(e as Error).message}`);
    failed = true;
    continue;
  }

  const { ok, total, passed, rejected } = verifyQuestionBank(questions);
  for (const r of rejected) {
    console.error(`✗ ${path} · ${r.id}`);
    for (const err of r.errors) console.error(`    - ${err}`);
  }

  if (ok && write) {
    for (const q of questions) {
      if (q.question_type === "what_to_discard" || q.question_type === "ukeire_compare") {
        q.engine_snapshot = buildSnapshot(q.hand);
      }
      q.verified = buildVerified();
    }
    writeFileSync(path, JSON.stringify(wrap ? { questions } : questions, null, 2) + "\n", "utf-8");
    console.log(`✓ ${path}: ${total} 题全部通过，已写入 engine_snapshot / verified`);
  } else if (ok) {
    console.log(`✓ ${path}: ${total} 题全部通过（只读校验，未写入）`);
  } else {
    console.error(`✗ ${path}: ${passed}/${total} 通过，${rejected.length} 题被拒绝入库`);
    failed = true;
  }
}

exit(failed ? 1 : 0);
