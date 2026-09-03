/**
 * 考点近亲查重（骨架查重的互补，2026-09-03 加）：
 *
 * skeleton-check 只抓「换皮撞车」（骨架同＝铁撞），抓不住「同考点近亲」——
 * 两题骨架不同但练的是同一件事（例：4556 何切 vs L5_008 的单骑vs中膨重张 wc，
 * 骨架不撞、考点撞）。本题库判分题有限，同考点不同题形 = 重复训练，须人工拦下。
 *
 * 做法（作者声明式，非语义引擎）：
 *   作者给出候选手牌 + 声明它教的核心词（`--kp "中膨 差听 单骑"`），工具
 *   在题库 knowledge_point 里做子串匹配，报告所有可能同考点的题供人复核。
 *   子串匹配只做粗筛，命中 = 提醒，不是自动否决。
 *
 * 用法：
 *   npx tsx content/build/nearcheck.ts "<14 张>" --kp "大肚 中膨 差听 单骑"
 *   npx tsx content/build/nearcheck.ts "<14 张>" --kp "听牌升级 两面 嵌张"
 *
 * 输出：骨架撞车（若有）+ 考点子串命中清单（id / 级别 / 题型 / knowledge_point）。
 */

import { TILE_KINDS, toCounts } from "@nanikiru/engine";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

interface Q { id: string; level: string; question_type: string; knowledge_point?: string; hand: string[] }

const dir = join(process.cwd(), "content", "questions");
const bank: Q[] = [];
for (const f of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
  const arr = JSON.parse(readFileSync(join(dir, f), "utf8")) as Q[];
  bank.push(...arr.map((q) => ({ ...q })));
}

function fpOf(hand: string[]): string {
  const suits: number[][] = [[], [], []];
  const honors: number[] = [];
  for (const t of hand) {
    const i = TILE_KINDS.indexOf(t);
    if (i < 27) suits[Math.floor(i / 9)].push((i % 9) + 1);
    else honors.push(i - 27);
  }
  const sigs = suits.map((s) => [...s].sort((a, b) => a - b).join(",")).filter((s) => s.length > 0).sort();
  return sigs.join("|") + "||" + [...honors].sort((a, b) => a - b).join(",");
}

const args = process.argv.slice(2);
// --kp 值两种写法都收：`--kp=甲 乙` 或 `--kp 甲 乙`（空格式取下一个参数）
const kpIdx = args.findIndex((a) => a.startsWith("--kp"));
let tokens: string[] = [];
if (kpIdx >= 0) {
  const raw = args[kpIdx].includes("=") ? args[kpIdx].slice(args[kpIdx].indexOf("=") + 1) : args[kpIdx + 1] ?? "";
  tokens = raw.split(/[\s,，、]/).filter((t) => t.length >= 2);
}
const handArg = args.find((a) => !a.startsWith("--"));
if (!handArg) {
  console.error("用法: npx tsx content/build/nearcheck.ts \"<14 张>\" --kp \"核心词 核心词\"");
  process.exit(2);
}
const hand = handArg.trim().split(/\s+/);
try { toCounts(hand, 14); } catch (e) { console.error(`手牌不合法：${(e as Error).message}`); process.exit(2); }

// 1) 骨架撞车
const fp = fpOf(hand);
const skel = bank.filter((q) => fpOf(q.hand) === fp);
if (skel.length) console.log(`✘ 骨架撞车：${skel.map((q) => q.id).join(", ")}`);
else console.log("✔ 骨架无撞车");

// 2) 考点近亲（子串粗筛）
if (tokens.length) {
  const hits = bank.filter((q) => q.knowledge_point && tokens.some((t) => q.knowledge_point!.includes(t)));
  if (hits.length) {
    console.log(`\n⚠ 考点近亲候选（声明词：${tokens.join(" / ")}）——人工复核是否同考点重复训练：`);
    for (const h of hits) console.log(`   ${h.id} (${h.level} ${h.question_type})  ${h.knowledge_point}`);
  } else {
    console.log("✔ 考点无命中（声明词库内无同考点题）");
  }
} else {
  console.log("（未给 --kp，跳过考点近亲检查；建议声明本手教的考点核心词）");
}
