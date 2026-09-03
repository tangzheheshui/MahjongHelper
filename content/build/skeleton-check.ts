/**
 * 骨架查重工具：判断若干 14 张候选手牌是否与题库已有手牌「换皮撞车」。
 *
 * 换皮 = 同一副骨架只在花色间置换（m/p/s 轮换、字牌不动）——牌面不同但结构相同，
 * 会让用户产生「这题做过」的雷同感。M3 出题查重用（与 nearcheck 组双闸）。
 *
 * 指纹设计（对花色置换不敏感）：
 *   每门花色各自取「该门牌的号码序列（升序）」→ 一副牌的指纹 = 三门花色序列的
 *   多重集排序 + 字牌出现数。两手牌撞车 ⇔ 能通过整体花色置换互相重合。
 *   例：{123456}m{55 7 8 9}p{2 4 5}s  与  {123456}s{55 7 8 9}p{2 4 5}m  同指纹。
 *
 * 用法：
 *   npx tsx content/build/skeleton-check.ts "<14 张空格分隔>" ["<另一手>"] ...
 *   不传参数 = 只对题库自检（报告库内换皮对，供对账用）。
 *
 * 输出：每候选一行，报告「✔ 无撞车」或列出撞车的题库题 id。
 */

import { TILE_KINDS, toCounts, countsToHand } from "@nanikiru/engine";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

interface Question { id: string; hand: string[] }

function fpOf(hand: string[]): string {
  const suits: number[][] = [[], [], []]; // m p s
  const honors: number[] = [];
  for (const t of hand) {
    const i = TILE_KINDS.indexOf(t);
    if (i < 27) suits[Math.floor(i / 9)].push((i % 9) + 1);
    else honors.push(i - 27);
  }
  const sigs = suits.map((seq) => [...seq].sort((a, b) => a - b).join(",")).filter((s) => s.length > 0);
  sigs.sort();
  return sigs.join("|") + "||" + [...honors].sort((a, b) => a - b).join(",");
}

// 读题库：content/questions/L*.json
const dir = join(process.cwd(), "content", "questions");
const bank: Question[] = [];
for (const f of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
  const arr = JSON.parse(readFileSync(join(dir, f), "utf8")) as Question[];
  bank.push(...arr.map((q) => ({ id: q.id, hand: q.hand })));
}

const byFp = new Map<string, Question[]>();
for (const q of bank) {
  const fp = fpOf(q.hand);
  byFp.set(fp, [...(byFp.get(fp) ?? []), q]);
}

function report(hand: string[], label: string): void {
  const fp = fpOf(hand);
  const hits = (byFp.get(fp) ?? []).filter((q) => fpOf(q.hand) === fp);
  if (hits.length === 0) console.log(`✔ 无撞车  [${label}]`);
  else console.log(`✘ 撞车!  与 ${hits.map((q) => q.id).join(", ")} 同骨架  [${label}]`);
}

const candidates = process.argv.slice(2).map((h) => h.trim().split(/\s+/));

if (candidates.length === 0) {
  console.log(`库内共 ${bank.length} 题，按换皮指纹分组：`);
  for (const [fp, group] of byFp) {
    if (group.length > 1) console.log(`  ✘ ${group.map((q) => q.id).join("、")}  （同一骨架 ${fp}）`);
  }
  console.log(`唯一骨架 ${byFp.size} / 共 ${bank.length} 题（含 4 对已明知换皮）`);
} else {
  for (const hand of candidates) {
    try { toCounts(hand, 14); } catch (e) { console.log(`✘ 手牌不合法：${(e as Error).message}  [${hand.join(" ")}]`); continue; }
    report(hand, hand.join(" "));
  }
}
