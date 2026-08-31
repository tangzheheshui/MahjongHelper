/**
 * 手牌分析：进张枚举与最优切牌排序。
 *
 * 口径（docs/requirements/engine.md）：
 * - 进张张数 = 剩余可摸张数 4 − 手内该牌张数（V1 不考虑他家可见牌）
 * - 进张判定：摸该牌后 14 张的最优向听数 ≤ 切牌后 13 张向听数 − 1
 *   （听牌（0）时进张 = 和了牌）
 * - 并列最优全部保留，排序不分先后
 */

import { shanten13, shanten14 } from "./shanten";
import { TILE_KINDS, toCounts, tileToStr } from "./tiles";
import type { Counts } from "./tiles";

/** 一种切牌候选的分析结果 */
export interface Candidate {
  /** 切掉的牌 */
  discard: string;
  /** 切牌后 13 张的向听数 */
  shantenAfter: number;
  /** 进张总张数（按剩余可摸张数计） */
  ukeireCount: number;
  /** 进张牌种（字符串数组） */
  ukeireTiles: string[];
}

/** 14 张手牌的完整分析 */
export interface Analysis14 {
  /** 最优（最小）切牌后向听数 */
  shanten: number;
  /** 全部可切牌候选，按 (shantenAfter 升序, ukeireCount 降序) 排序 */
  candidates: Candidate[];
}

/**
 * 14 张手牌分析：枚举每种可切牌，给出切牌后向听数与进张表。
 * 输入须为 14 张（无副露）。
 */
export function analyze14(hand: string[]): Analysis14 {
  const counts = toCounts(hand, 14);
  const candidates: Candidate[] = [];

  for (let d = 0; d < 34; d++) {
    if (counts[d] === 0) continue;
    counts[d]--;
    const s = shanten13(counts);

    const ukeireTiles: string[] = [];
    let ukeireCount = 0;
    for (let j = 0; j < 34; j++) {
      const remaining = 4 - counts[j];
      if (remaining <= 0) continue;
      counts[j]++;
      const s14 = shanten14(counts);
      counts[j]--;
      if (s14 <= s - 1) {
        ukeireTiles.push(tileToStr(j));
        ukeireCount += remaining;
      }
    }

    counts[d]++;
    candidates.push({
      discard: tileToStr(d),
      shantenAfter: s,
      ukeireCount,
      ukeireTiles,
    });
  }

  candidates.sort(
    (a, b) => a.shantenAfter - b.shantenAfter || b.ukeireCount - a.ukeireCount,
  );
  return { shanten: candidates[0]?.shantenAfter ?? 99, candidates };
}

/** 13 张手牌的进张表 */
export interface Analysis13 {
  /** 当前向听数 */
  shanten: number;
  /** 每种能推进向听的摸牌 */
  advances: { tile: string; remaining: number; shantenAfter: number }[];
  /** 进张总张数 */
  ukeireCount: number;
}

/** 13 张手牌分析：向听数 + 进张（含和了牌）枚举 */
export function analyze13(hand: string[]): Analysis13 {
  const counts = toCounts(hand, 13);
  const s = shanten13(counts);
  const advances: Analysis13["advances"] = [];
  let ukeireCount = 0;

  for (let j = 0; j < 34; j++) {
    const remaining = 4 - counts[j];
    if (remaining <= 0) continue;
    counts[j]++;
    const s14 = shanten14(counts);
    counts[j]--;
    if (s14 <= s - 1) {
      advances.push({
        tile: tileToStr(j),
        remaining,
        shantenAfter: s14,
      });
      ukeireCount += remaining;
    }
  }

  return { shanten: s, advances, ukeireCount };
}

/** 便捷：仅取最优切牌集合（并列全保留） */
export function bestDiscards(analysis: Analysis14): string[] {
  const best = analysis.candidates[0];
  if (!best) return [];
  return analysis.candidates
    .filter((c) => c.shantenAfter === best.shantenAfter && c.ukeireCount === best.ukeireCount)
    .map((c) => c.discard);
}

/** 引擎版本号（校验流水用） */
export const ENGINE_VERSION = "0.1.0";
