/**
 * 出题探针：给定 14 张手牌，输出引擎分析（最优切牌集合 + 候选表）。
 * 出题工作流辅助：先探针确认数字，再写入题库 JSON。
 *
 * 用法：npx tsx content/build/probe.ts "1m 2m 3m ..." ["另一手 ..."]
 */

import { analyze14, bestDiscards } from "@nanikiru/engine";

const hands = process.argv.slice(2);
if (hands.length === 0) {
  console.error('用法: npx tsx content/build/probe.ts "1m 2m 3m …"（空格分隔，可多手）');
  process.exit(2);
}

for (const h of hands) {
  const hand = h.trim().split(/\s+/);
  const a = analyze14(hand);
  const best = bestDiscards(a);
  // 难度画像行（decisions.md）：不退向听切法数 + 最优/次优张数差（越小越难）
  const same = a.candidates.filter((c) => c.shantenAfter === a.shanten);
  const tiers = [...new Set(same.map((c) => c.ukeireCount))].sort((x, y) => y - x);
  const margin = tiers.length > 1 ? tiers[0] - tiers[1] : 0;
  console.log(`手牌: ${hand.join(" ")}`);
  console.log(`  最优: [${best.join(" ")}] · 切后 ${a.shanten} 向听 · 不退向听切法 ${same.length} 种 · 最优/次优张数差 ${margin}`);
  for (const c of a.candidates.slice(0, 8)) {
    const mark = best.includes(c.discard) ? "★" : " ";
    console.log(
      `  ${mark} 切 ${c.discard}: ${c.shantenAfter}向听 / ${c.ukeireCount}张 / [${c.ukeireTiles.join(" ")}]`,
    );
  }
  console.log();
}
