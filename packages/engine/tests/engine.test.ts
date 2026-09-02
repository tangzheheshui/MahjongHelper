import { describe, expect, it } from "vitest";

import {
  analyze13,
  analyze14,
  bestDiscards,
  isWin,
  parseTile,
  randomHand13,
  shanten,
  shanten14,
  tileToStr,
  toCounts,
} from "../src";

/* ---------- 牌编解码 ---------- */

describe("tiles", () => {
  it("parseTile / tileToStr 往返", () => {
    expect(parseTile("1m")).toBe(0);
    expect(parseTile("9m")).toBe(8);
    expect(parseTile("1p")).toBe(9);
    expect(parseTile("1s")).toBe(18);
    expect(parseTile("E")).toBe(27);
    expect(parseTile("c")).toBe(33);
    for (let i = 0; i < 34; i++) expect(tileToStr(parseTile(tileToStr(i)))).toBe(tileToStr(i));
  });

  it("非法输入抛错", () => {
    expect(() => parseTile("0m")).toThrow();
    expect(() => parseTile("10m")).toThrow();
    expect(() => parseTile("3x")).toThrow();
    expect(() => toCounts(["1m", "1m", "1m", "1m", "1m"])).toThrow(/超过 4 张/);
    expect(() => toCounts(["1m", "2m"], 13)).toThrow(/张数/);
  });
});

/* ---------- 和了判定 ---------- */

describe("isWin", () => {
  it("标准形和了", () => {
    const win = ["1m","2m","3m","4p","5p","6p","7s","8s","9s","1s","2s","3s","5s","5s"];
    expect(isWin(toCounts(win, 14))).toBe(true);
  });

  it("纯七对子不算和（V1 仅标准形）", () => {
    // 注意不能用 11223344556677 —— 它同时可拆 123/123/456/456+77（二杯口），标准形也是和
    const chiitoi = ["1m","1m","2m","2m","4m","4m","6m","6m","8m","8m","E","E","c","c"];
    expect(isWin(toCounts(chiitoi, 14))).toBe(false);
  });

  it("听牌 13 张不是和了", () => {
    const tenpai = ["1m","2m","3m","4p","5p","6p","7s","8s","9s","1s","2s","3s","5s"];
    expect(isWin(toCounts(tenpai, 13))).toBe(false);
  });
});

/* ---------- 向听数（手验用例） ---------- */

describe("shanten", () => {
  it("四面子 + 单骑浮牌 = 听牌(0)", () => {
    const hand = ["1m","2m","3m","4p","5p","6p","7s","8s","9s","1s","2s","3s","5m"];
    expect(shanten(toCounts(hand, 13))).toBe(0);
  });

  it("三面子 + 搭子 + 雀头 = 听牌(0)", () => {
    const hand = ["1m","2m","3m","4p","5p","6p","7s","8s","9s","3s","4s","5s","5s"];
    expect(shanten(toCounts(hand, 13))).toBe(0);
  });

  it("三面子 + 两搭子无雀头 = 一向听(1)（五块无雀头修正）", () => {
    const hand = ["1m","2m","3m","4p","5p","6p","7s","8s","9s","1p","2p","4s","5s"];
    expect(shanten(toCounts(hand, 13))).toBe(1);
  });

  it("两面子 + 两搭子 + 雀头 + 浮牌 = 一向听(1)", () => {
    const hand = ["1m","2m","3m","4p","5p","6p","1s","2s","4s","5s","5m","5m","9p"];
    expect(shanten(toCounts(hand, 13))).toBe(1);
  });

  it("全孤立字牌 + 幺九 = 最大向听(8)", () => {
    const hand = ["1m","9m","1p","9p","1s","9s","E","S","W","N","h","f","c"];
    expect(shanten(toCounts(hand, 13))).toBe(8);
  });
});

/* ---------- 进张分析 ---------- */

describe("analyze13", () => {
  it("听牌时进张 = 和了牌（张数扣除手内已见）", () => {
    // 123m 456p 789s 34s 55s：两面听 2s/5s；手内已有两张 5s，故 5s 仅剩 2 张
    const hand = ["1m","2m","3m","4p","5p","6p","7s","8s","9s","3s","4s","5s","5s"];
    const a = analyze13(hand);
    expect(a.shanten).toBe(0);
    expect(a.advances.map((x) => x.tile).sort()).toEqual(["2s", "5s"]);
    expect(a.advances.find((x) => x.tile === "2s")!.remaining).toBe(4);
    expect(a.advances.find((x) => x.tile === "5s")!.remaining).toBe(2);
    expect(a.ukeireCount).toBe(6);
  });

  it("一向听的进张含完成搭子与做雀头两类", () => {
    // 123m 456p 789s 12p 45s：一向听
    // 完成类：3p（补 12p）、3s/6s（补 45s）；雀头类：1p/2p 成对拆 12p 做头
    const hand = ["1m","2m","3m","4p","5p","6p","7s","8s","9s","1p","2p","4s","5s"];
    const a = analyze13(hand);
    expect(a.shanten).toBe(1);
    const tiles = a.advances.map((x) => x.tile);
    for (const t of ["3p", "3s", "6s", "1p", "2p"]) expect(tiles).toContain(t);
    // 1m 成对并不推进：拆掉的面子无法复原（手验反例，防回归）
    expect(tiles).not.toContain("1m");
  });

  it("超载搭子结构：一面子+四搭子+雀头实为 2 向听（随机测试反例回归）", () => {
    // m:1,2,2,4,6,7,8 / p:2,3,4,4,6,8 —— 搭子超载且无浮牌，一向听虚报会得出零进张
    const hand = ["8p","6p","2m","4m","8m","1m","3p","2m","7m","4p","4p","6m","2p"];
    const a = analyze13(hand);
    expect(a.shanten).toBe(2);
    expect(a.advances.length).toBeGreaterThanOrEqual(1);
    expect(a.advances.map((x) => x.tile)).toContain("3m");
  });
});

describe("analyze14", () => {
  it("经典何切：123m 56m 345678p 22s 4s → 切 4s 听牌，进张 4m/7m", () => {
    const hand = ["1m","2m","3m","5m","6m","3p","4p","5p","6p","7p","8p","2s","2s","4s"];
    const a = analyze14(hand);
    expect(a.shanten).toBe(0); // 切 4s 后听牌
    const top = a.candidates[0];
    expect(top.discard).toBe("4s");
    expect(top.shantenAfter).toBe(0);
    expect(top.ukeireTiles.sort()).toEqual(["4m", "7m"]);
    expect(top.ukeireCount).toBe(8);
    // 切 8p：34567p 只剩一个面子 + 搭子 → 一向听
    const cut8p = a.candidates.find((c) => c.discard === "8p")!;
    expect(cut8p.shantenAfter).toBe(1);
    // 切 4s 必须排在切 8p 之前
    expect(a.candidates.findIndex((c) => c.discard === "4s")).toBeLessThan(
      a.candidates.findIndex((c) => c.discard === "8p"),
    );
  });

  it("最优切牌按进张数区分并列向听（切面子留两面 8 张 > 双碰 4 张 > 单骑 3 张）", () => {
    // 123m 456p 789s + 2s2s 4s4s4s：
    // 切 1m/4p/6p/9s 拆一个面子 → 两面听 8 张（最优，并列 4 种）
    // 切 4s → 22s+44s 双碰 4 张；切 2s → 单骑 3 张
    const hand = ["1m","2m","3m","4p","5p","6p","7s","8s","9s","2s","2s","4s","4s","4s"];
    const a = analyze14(hand);
    expect(a.shanten).toBe(0);
    expect(bestDiscards(a)).toEqual(["1m", "4p", "6p", "9s"]);
    for (const d of ["1m", "4p", "6p", "9s"]) {
      const c = a.candidates.find((x) => x.discard === d)!;
      expect(c.shantenAfter).toBe(0);
      expect(c.ukeireCount).toBe(8);
    }
    const cut4s = a.candidates.find((c) => c.discard === "4s")!;
    expect(cut4s.ukeireCount).toBe(4);
    const cut2s = a.candidates.find((c) => c.discard === "2s")!;
    expect(cut2s.shantenAfter).toBe(0);
    // 单骑 2s（3 张）+ 拆 444s 为 44 雀头留 24s 嵌张（3s×4）= 7 张
    expect(cut2s.ukeireCount).toBe(7);
    expect(cut2s.ukeireTiles.sort()).toEqual(["2s", "3s"]);
  });
});

/* ---------- 随机性质测试（确定性种子） ---------- */

/** mulberry32：确定性 PRNG */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("随机性质测试", () => {
  it("向听数恒在 [0, 8]，且非听牌必有进张", () => {
    const rand = mulberry32(20260831);
    for (let n = 0; n < 500; n++) {
      const hand = randomHand13(rand);
      const a = analyze13(hand);
      expect(a.shanten).toBeGreaterThanOrEqual(0);
      expect(a.shanten).toBeLessThanOrEqual(8);
      if (a.shanten > 0) {
        expect(
          a.advances.length,
          `手牌 ${hand.join(" ")} 向听 ${a.shanten} 却无进张`,
        ).toBeGreaterThanOrEqual(1);
      } else {
        // 听牌：进张即和了牌，至少 1 种
        expect(a.advances.length).toBeGreaterThanOrEqual(1);
        for (const adv of a.advances) expect(adv.shantenAfter).toBe(-1);
      }
    }
  });

  it("analyze14 最优切牌后向听数 ≤ 任意切牌", () => {
    const rand = mulberry32(79);
    for (let n = 0; n < 200; n++) {
      const hand13 = randomHand13(rand);
      const extra = randomHand13(rand)[0]; // 随机摸一张凑 14
      const hand = [...hand13, extra];
      const a = analyze14(hand);
      for (const c of a.candidates) {
        expect(c.shantenAfter).toBeGreaterThanOrEqual(a.shanten);
      }
      expect(shanten14(toCounts(hand, 14))).toBe(a.shanten);
    }
  });
});
