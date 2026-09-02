/**
 * 出题采集器（M3 扩量，2026-09-02 起）：
 * 随机生成「无字牌」的 14 张手牌 → 引擎过滤出有真抉择的候选，供人工挑选写讲解。
 *
 * 背景：手工拼「几副完成面子 + 赠品浮牌」的模板题，正解永远是孤张、没有取舍
 * （用户反馈 2026-09-02）。实战型何切来自自然发牌——本脚本模拟该来源，
 * 用引擎把「正解太明显」的牌直接滤掉。只产候选不落库；选题、定考点、写讲解仍人工。
 *
 * 过滤条件（全部满足才输出）：
 *   1. 切最优后 0/1/2 向听（训练价值区间）
 *   2. 最优切法 ≤2 种（唯一或成对并列；并列本身是教学点）
 *   3. 同向听层面，次优与最优进张差 1~5 张（真二择；差距 0 = 平庸并列，差距大 = 无取舍）
 *   4. 每个最优切牌都不是孤立牌：同花色 2 以内有邻居，或本身成对（答案必须在块里）
 *   5. 全手孤立牌 ≤3 张（实战手牌自然形态）
 *
 * 用法：npx tsx content/build/harvest.ts [数量=30] [随机种子]
 */

import { analyze14, bestDiscards } from "@nanikiru/engine";

const WANT = Number(process.argv[2] ?? 30);
const SEED = Number(process.argv[3] ?? Date.now() % 100000);

/** 线性同余随机（可复现） */
function makeRand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

const KINDS: string[] = [];
for (const suit of ["m", "p", "s"]) {
  for (let n = 1; n <= 9; n++) KINDS.push(`${n}${suit}`);
}

/** 孤立牌判定：同花色 2 以内无邻居、且不成对 */
function isIsolated(hand: string[], t: string): boolean {
  const n = Number(t[0]);
  const suit = t[1];
  return !hand.some((o) => {
    if (o === t) return false;
    if (o[1] !== suit) return false;
    return Math.abs(Number(o[0]) - n) <= 2;
  });
}

function randomHand14(rand: () => number): string[] {
  const wall: string[] = [];
  for (const k of KINDS) for (let i = 0; i < 4; i++) wall.push(k);
  for (let i = wall.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [wall[i], wall[j]] = [wall[j], wall[i]];
  }
  return wall.slice(0, 14).sort();
}

const rand = makeRand(SEED);
const seen = new Set<string>();
const found: string[] = [];
let tried = 0;

while (found.length < WANT && tried < 200000) {
  tried++;
  const hand = randomHand14(rand);
  const key = hand.join(" ");
  if (seen.has(key)) continue;
  seen.add(key);

  const a = analyze14(hand);
  const best = bestDiscards(a);
  if (best.length === 0 || best.length > 2) continue;

  const bestRow = a.candidates.find((c) => c.discard === best[0])!;
  if (bestRow.shantenAfter > 2) continue;

  // 次优（同向听层面）与最优的进张差
  const runner = a.candidates.find(
    (c) => !best.includes(c.discard) && c.shantenAfter === bestRow.shantenAfter,
  );
  if (!runner) continue;
  const gap = bestRow.ukeireCount - runner.ukeireCount;
  if (gap < 1 || gap > 5) continue;

  // 正解不许是孤立牌
  if (best.some((d) => isIsolated(hand, d))) continue;

  // 全手孤立牌 ≤3
  const uniq = [...new Set(hand)];
  if (uniq.filter((t) => isIsolated(hand, t)).length > 3) continue;

  found.push(key);
  const s = bestRow.shantenAfter;
  console.log(
    `#${found.length} ${key}\n  最优[${best.join(" ")}] ${s}向听/${bestRow.ukeireCount}张 [${bestRow.ukeireTiles.join(" ")}]` +
      ` 次优 切${runner.discard} ${runner.ukeireCount}张(差${gap})`,
  );
}

console.error(`尝试 ${tried} 手，命中 ${found.length} 手（种子 ${SEED}）`);
