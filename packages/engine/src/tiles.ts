/**
 * 牌的表示与编解码。
 *
 * 34 种牌 → 下标 0-33：
 *   0-8   1m-9m（万）
 *   9-17  1p-9p（饼）
 *   18-26 1s-9s（索）
 *   27-33 东 E / 南 S / 西 W / 北 N / 白 h / 發 f / 中 c
 *
 * 手牌统一用 Counts（长度 34 的张数数组）表示。
 */

/** 万饼索字 34 种牌的规范字符串 */
export const TILE_KINDS: readonly string[] = [
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `${n}m`),
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `${n}p`),
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `${n}s`),
  "E", "S", "W", "N", "h", "f", "c",
];

const KIND_INDEX: ReadonlyMap<string, number> = new Map(
  TILE_KINDS.map((s, i) => [s, i]),
);

/** 长度 34 的张数数组 */
export type Counts = number[];

/** 单张牌字符串 → 0-33 下标；非法输入抛错 */
export function parseTile(s: string): number {
  const i = KIND_INDEX.get(s);
  if (i === undefined) throw new Error(`非法牌名: "${s}"`);
  return i;
}

/** 0-33 下标 → 牌字符串 */
export function tileToStr(i: number): string {
  const s = TILE_KINDS[i];
  if (s === undefined) throw new Error(`非法牌下标: ${i}`);
  return s;
}

/** 手牌字符串数组 → Counts；校验张数（13 或 14 由调用方决定）、每种 ≤ 4 张 */
export function toCounts(hand: string[], expected?: 13 | 14): Counts {
  const counts: Counts = new Array(34).fill(0);
  for (const s of hand) {
    const i = parseTile(s);
    counts[i] += 1;
    if (counts[i] > 4) throw new Error(`牌 "${s}" 超过 4 张`);
  }
  const total = counts.reduce((a, b) => a + b, 0);
  if (expected !== undefined && total !== expected) {
    throw new Error(`手牌张数为 ${total}，期望 ${expected}`);
  }
  return counts;
}

/** Counts → 牌字符串数组（按下标排序，不保留原始顺序） */
export function countsToHand(counts: Counts): string[] {
  const hand: string[] = [];
  for (let i = 0; i < 34; i++) {
    for (let k = 0; k < counts[i]; k++) hand.push(tileToStr(i));
  }
  return hand;
}

/** 生成随机合法 13 张手牌（测试/出题辅助用） */
export function randomHand13(rand: () => number): string[] {
  // 136 张牌池不放回抽样
  const pool: number[] = [];
  for (let i = 0; i < 34; i++) for (let k = 0; k < 4; k++) pool.push(i);
  const hand: number[] = [];
  for (let n = 0; n < 13; n++) {
    const j = n + Math.floor(rand() * (pool.length - n));
    [pool[n], pool[j]] = [pool[j], pool[n]];
    hand.push(pool[n]);
  }
  return hand.map(tileToStr);
}
