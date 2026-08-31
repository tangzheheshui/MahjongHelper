/**
 * 向听数与和了判定（V1：仅标准形「4 面子 + 1 雀头」，不含七对/国士）。
 *
 * 算法：逐花色枚举所有分解（面子 / 搭子 / 对子），全局合并后取
 *   shanten = 8 − 2×面子数 − min(搭子数, 4−面子数) − 雀头
 * 搭子上限取 4−面子数：面子+搭子凑满 4 个「面子候补」后，多余搭子不产生进度
 * （如 一面子+四搭子+雀头 实为 2 向听而非 1 向听——已由随机测试反例验证）。
 * 口径见 docs/requirements/engine.md。
 */

import type { Counts } from "./tiles";

const INF = 99;

/** 单花色的一个分解状态：面子数 / 搭子数（含对子视为搭子）/ 雀头候选对子数 */
interface SuitState {
  m: number;
  t: number;
  p: number;
}

/** 四个花色的 [起始下标, 长度]；字牌长 7、无顺子 */
const SUIT_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0, 9],
  [9, 9],
  [18, 9],
  [27, 7],
];

/** 枚举单花色（张数数组局部切片）的全部分解状态 */
function decomposeSuit(src: number[], len: number): SuitState[] {
  const counts = src.slice();
  const hasRun = len === 9; // 字牌无顺子
  const results: SuitState[] = [];

  function rec(i: number, m: number, t: number, p: number): void {
    while (i < len && counts[i] === 0) i++;
    if (i >= len) {
      results.push({ m, t, p });
      return;
    }
    // 刻子
    if (counts[i] >= 3) {
      counts[i] -= 3;
      rec(i, m + 1, t, p);
      counts[i] += 3;
    }
    // 顺子
    if (hasRun && i + 2 < len && counts[i + 1] > 0 && counts[i + 2] > 0) {
      counts[i]--; counts[i + 1]--; counts[i + 2]--;
      rec(i, m + 1, t, p);
      counts[i]++; counts[i + 1]++; counts[i + 2]++;
    }
    // 对子：作雀头候选
    if (counts[i] >= 2) {
      counts[i] -= 2;
      rec(i, m, t, p + 1);
      counts[i] += 2;
    }
    // 对子：作搭子（刻子候补）
    if (counts[i] >= 2) {
      counts[i] -= 2;
      rec(i, m, t + 1, p);
      counts[i] += 2;
    }
    // 两面 / 边张搭子（i, i+1）
    if (hasRun && i + 1 < len && counts[i + 1] > 0) {
      counts[i]--; counts[i + 1]--;
      rec(i, m, t + 1, p);
      counts[i]++; counts[i + 1]++;
    }
    // 嵌张搭子（i, i+2）
    if (hasRun && i + 2 < len && counts[i + 2] > 0) {
      counts[i]--; counts[i + 2]--;
      rec(i, m, t + 1, p);
      counts[i]++; counts[i + 2]++;
    }
    // 浮牌
    counts[i]--;
    rec(i, m, t, p);
    counts[i]++;
  }

  rec(0, 0, 0, 0);
  return prune(results);
}

/** 去掉被支配的状态（存在 m/t/p 全 ≥ 的其他状态则本状态无用） */
function prune(list: SuitState[]): SuitState[] {
  const sorted = [...list].sort(
    (a, b) => b.m - a.m || b.t - a.t || b.p - a.p,
  );
  const out: SuitState[] = [];
  for (const s of sorted) {
    if (out.some((o) => o.m >= s.m && o.t >= s.t && o.p >= s.p)) continue;
    out.push(s);
  }
  return out;
}

/** 13 张手牌的标准形向听数（0 = 听牌） */
export function shanten(counts: Counts): number {
  let states: SuitState[] = [{ m: 0, t: 0, p: 0 }];
  for (const [start, len] of SUIT_RANGES) {
    const part = decomposeSuit(counts.slice(start, start + len), len);
    const merged: SuitState[] = [];
    for (const a of states) {
      for (const b of part) {
        const m = a.m + b.m;
        if (m > 4) continue;
        merged.push({ m, t: a.t + b.t, p: Math.min(a.p + b.p, 1) });
      }
    }
    states = prune(merged);
    if (states.length === 0) return INF; // 理论不可达，防御
  }
  let best = INF;
  for (const s of states) {
    const t = Math.min(s.t, 4 - s.m);
    const head = s.p > 0 ? 1 : 0;
    const v = 8 - 2 * s.m - t - head;
    if (v < best) best = v;
  }
  return best;
}

/** 单花色能否全部拆成面子（刻子/顺子，用于和了判定） */
function suitAllSets(counts: number[], i: number, end: number): boolean {
  while (i < end && counts[i] === 0) i++;
  if (i === end) return true;
  if (counts[i] >= 3) {
    counts[i] -= 3;
    const ok = suitAllSets(counts, i, end);
    counts[i] += 3;
    if (ok) return true;
  }
  if (end - i > 2 && counts[i + 1] > 0 && counts[i + 2] > 0) {
    counts[i]--; counts[i + 1]--; counts[i + 2]--;
    const ok = suitAllSets(counts, i, end);
    counts[i]++; counts[i + 1]++; counts[i + 2]++;
    if (ok) return true;
  }
  return false;
}

/** 14 张手牌是否和了（标准形） */
export function isWin(counts: Counts): boolean {
  const c = counts.slice();
  for (let i = 0; i < 34; i++) {
    if (c[i] >= 2) {
      c[i] -= 2;
      let ok = true;
      for (const [start, len] of SUIT_RANGES) {
        if (!suitAllSets(c, start, start + len)) {
          ok = false;
          break;
        }
      }
      c[i] += 2;
      if (ok) return true;
    }
  }
  return false;
}

/* ---------- 带缓存的 13/14 张向听数（analyze 用） ---------- */

const cache = new Map<string, number>();

function key(c: Counts): string {
  return c.join("");
}

function memoGet(k: string): number | undefined {
  return cache.get(k);
}
function memoSet(k: string, v: number): void {
  if (cache.size > 200_000) cache.clear();
  cache.set(k, v);
}

/** shanten(counts) 的记忆化版本 */
export function shanten13(counts: Counts): number {
  const k = key(counts);
  const hit = memoGet(k);
  if (hit !== undefined) return hit;
  const v = shanten(counts);
  memoSet(k, v);
  return v;
}

/** 14 张手牌向听数：−1 = 和了；否则 = 最优切牌后的 13 张向听数 */
export function shanten14(counts: Counts): number {
  const k = key(counts);
  const hit = memoGet(k);
  if (hit !== undefined) return hit;
  let v: number;
  if (isWin(counts)) {
    v = -1;
  } else {
    v = INF;
    for (let i = 0; i < 34; i++) {
      if (counts[i] === 0) continue;
      counts[i]--;
      const s = shanten13(counts);
      counts[i]++;
      if (s < v) v = s;
    }
  }
  memoSet(k, v);
  return v;
}
