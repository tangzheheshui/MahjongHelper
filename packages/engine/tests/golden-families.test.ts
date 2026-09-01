import { describe, expect, it } from "vitest";
import { analyze13 } from "../src";

/**
 * golden 结构族：期望值由教材公理独立推导，不经过引擎。
 *
 * 公理（79博客 5.3 搭子价值排序、麻雀的基础 11 听牌型）：
 *   两面听 = 2 种 × 4 张；嵌张/边张听 = 1 种 × 4 张；双碰听 = 2 种各剩 2 张；
 *   单骑听 = 手内 1 张剩 3 张；四连形两面单骑 = 2 种各剩 3 张
 * 张数算术：进张张数 = 4 − 手内该牌张数（engine.md 口径）
 */

/** 三副完整面子 + 一对字牌雀头（9+2=11 张），给被测搭子留 2 张位 */
const MELDS_WITH_EE = {
  m: ["1p","2p","3p","4p","5p","6p","7s","8s","9s","E","E"], // 测 m 花色时面子用 p/s
  p: ["1m","2m","3m","4m","5m","6m","7s","8s","9s","E","E"],
  s: ["1m","2m","3m","4m","5m","6m","7p","8p","9p","E","E"],
};
const t = (n: number, suit: string) => `${n}${suit}`;

function expectTenpai(hand: string[], waits: string[], ukeire: number, label: string) {
  const a = analyze13(hand);
  expect(a.shanten, `${label} 向听数`).toBe(0);
  expect(a.advances.map((x) => x.tile).sort(), `${label} 和了牌`).toEqual([...waits].sort());
  expect(a.ukeireCount, `${label} 进张张数`).toBe(ukeire);
}

describe("golden 结构族 · 两面听（2 种 8 张）", () => {
  for (const suit of ["m", "p", "s"] as const) {
    for (let low = 2; low <= 7; low++) {
      it(`${t(low, suit)}${t(low + 1, suit)} 两面`, () => {
        const hand = [...MELDS_WITH_EE[suit], t(low, suit), t(low + 1, suit)];
        expectTenpai(hand, [t(low - 1, suit), t(low + 2, suit)], 8, `${low}${suit}两面`);
      });
    }
  }
});

describe("golden 结构族 · 嵌张听（1 种 4 张）", () => {
  for (const suit of ["m", "p", "s"] as const) {
    for (let low = 1; low <= 7; low++) {
      it(`${t(low, suit)}${t(low + 2, suit)} 嵌张`, () => {
        const hand = [...MELDS_WITH_EE[suit], t(low, suit), t(low + 2, suit)];
        expectTenpai(hand, [t(low + 1, suit)], 4, `${low}${suit}嵌张`);
      });
    }
  }
});

describe("golden 结构族 · 边张听（1 种 4 张）", () => {
  for (const suit of ["m", "p", "s"] as const) {
    it(`1${suit}2${suit} 边张`, () => {
      const hand = [...MELDS_WITH_EE[suit], t(1, suit), t(2, suit)];
      expectTenpai(hand, [t(3, suit)], 4, `12${suit}边张`);
    });
    it(`8${suit}9${suit} 边张`, () => {
      const hand = [...MELDS_WITH_EE[suit], t(8, suit), t(9, suit)];
      expectTenpai(hand, [t(7, suit)], 4, `89${suit}边张`);
    });
  }
});

describe("golden 结构族 · 双碰听（2 种各剩 2 张 = 4 张）", () => {
  const melds = ["1m","2m","3m","4m","5m","6m","7s","8s","9s"];
  const cases: [string[], string[], string][] = [
    [["4p","4p"], ["E","E"], "4p+E"],
    [["4p","4p"], ["5s","5s"], "4p+5s"],
    [["2s","2s"], ["E","E"], "2s+E"],
    [["6p","6p"], ["f","f"], "6p+發"],
    [["8s","8s"], ["c","c"], "8s+中（注：88s 与 789s 重叠，手内 3 张 8s → 总进张 3 而非 4）"],
    [["3p","3p"], ["W","W"], "3p+W"],
  ];
  const ukeireOf = (label: string) => (label.startsWith("8s") ? 3 : 4); // 88s 与面子 789s 重叠：手内 3 张 8s
  for (const [pairA, pairB, label] of cases) {
    it(`${label} 双碰`, () => {
      const hand = [...melds, ...pairA, ...pairB];
      const waits = [pairA[0], pairB[0]];
      expectTenpai(hand, waits, ukeireOf(label), `${label}双碰`);
    });
  }
});

describe("golden 结构族 · 单骑听（手内 1 张剩 3 张）", () => {
  const melds4 = ["1m","2m","3m","4m","5m","6m","7s","8s","9s","1p","2p","3p"];
  // 不取 4p：紧贴 123p 时摸 1p 可转 234p+11p，属四连单骑而非纯单骑
  for (const tanki of ["5p", "6p", "9p", "E", "W", "h", "f", "c"]) {
    it(`${tanki} 单骑`, () => {
      expectTenpai([...melds4, tanki], [tanki], 3, `${tanki}单骑`);
    });
  }
});

describe("golden 结构族 · 四连形两面单骑（2 种各剩 3 张 = 6 张）", () => {
  const threeMelds = {
    p: ["1m","2m","3m","4m","5m","6m","7s","8s","9s"],
    s: ["1m","2m","3m","4m","5m","6m","7p","8p","9p"],
    m: ["1p","2p","3p","4p","5p","6p","7s","8s","9s"],
  };
  const cases: [string[], string[], string[], string[], string] = [
    [threeMelds.p, ["3p","4p","5p","6p"], ["3p","6p"], "3456p"],
    [threeMelds.p, ["4p","5p","6p","7p"], ["4p","7p"], "4567p"],
    [threeMelds.s, ["5s","6s","7s","8s"], ["5s","8s"], "5678s"],
    [threeMelds.m, ["2m","3m","4m","5m"], ["2m","5m"], "2345m"],
  ];
  for (const [melds, run, waits, label] of cases) {
    it(`${label} 四连单骑`, () => {
      expectTenpai([...melds, ...run], waits, 6, label);
    });
  }
});
