import { describe, expect, it } from "vitest";
import golden from "./golden/golden.json";
import { analyze13, analyze14, bestDiscards, toCounts } from "../src";
import type { Counts } from "../src";

interface GoldenCase {
  id: string;
  hand?: string[];
  hand14?: string[];
  shanten: number;
  waits?: string[];
  ukeireCount?: number;
  bestIncludes?: string[];
  source: string;
  provenance: "book" | "constructed";
}

describe("golden 用例集（期望值独立于引擎锚定）", () => {
  for (const c of golden.cases as GoldenCase[]) {
    it(`${c.id} ${c.source}`, () => {
      if (c.hand) {
        const a = analyze13(c.hand);
        expect(a.shanten, `${c.id} 向听数`).toBe(c.shanten);
        if (c.waits) {
          expect(
            a.advances.map((x) => x.tile).sort(),
            `${c.id} 进张种类`,
          ).toEqual([...c.waits].sort());
        }
        if (c.ukeireCount !== undefined) {
          expect(a.ukeireCount, `${c.id} 进张张数`).toBe(c.ukeireCount);
        }
        // 附带一致性：向听数的判定不受手牌输入顺序影响
        const shuffled = [...c.hand].reverse();
        expect(analyze13(shuffled).shanten).toBe(a.shanten);
      }
      if (c.hand14) {
        const a = analyze14(c.hand14);
        const best = bestDiscards(a);
        for (const d of c.bestIncludes ?? []) {
          expect(best, `${c.id} 最优切牌应包含 ${d}`).toContain(d);
        }
        // 14 张手牌的牌数与合法性自检
        toCounts(c.hand14, 14);
        expect(a.candidates.length).toBeGreaterThan(0);
      }
    });
  }
});
