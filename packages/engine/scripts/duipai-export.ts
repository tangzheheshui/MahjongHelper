/**
 * 对拍导出：把引擎对一批手牌的计算结果写成 JSON，交给 Python mahjong 库独立复算比对。
 *
 * 批次构成（可复现，固定种子）：
 *   - golden.json 全部用例（教材锚定手牌）
 *   - 随机 13 张 × 80、随机 14 张 × 60（136 张牌池不放回抽样）
 *
 * 用法：npx tsx packages/engine/scripts/duipai-export.ts
 * 产物：scripts/out/duipai-batch.json（中间产物，不入 git，见仓库 .gitignore）
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { analyze13, analyze14, ENGINE_VERSION } from "../src/index";
import { parseTile, tileToStr } from "../src/tiles";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, "out");
const GOLDEN_PATH = join(HERE, "..", "tests", "golden", "golden.json");

/** 固定种子 PRNG（mulberry32）：保证批次可复现 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 136 张牌池不放回抽样 n 张（13 或 14） */
function randomHand(n: 13 | 14, rand: () => number): string[] {
  const pool: number[] = [];
  for (let i = 0; i < 34; i++) for (let k = 0; k < 4; k++) pool.push(i);
  const hand: number[] = [];
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(rand() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
    hand.push(pool[i]);
  }
  return hand.map(tileToStr);
}

interface Case13 {
  id: string;
  source: string;
  hand: string[];
  engine: {
    kind: "13";
    shanten: number;
    ukeireCount: number;
    advances: { tile: string; remaining: number; shantenAfter: number }[];
  };
}

interface Case14 {
  id: string;
  source: string;
  hand: string[];
  engine: {
    kind: "14";
    bestShanten: number;
    candidates: {
      discard: string;
      shantenAfter: number;
      ukeireCount: number;
      ukeireTiles: string[];
    }[];
  };
}

const cases: (Case13 | Case14)[] = [];

// ① golden 用例
const golden = JSON.parse(readFileSync(GOLDEN_PATH, "utf-8")) as {
  cases: ({ id: string; hand: string[] } | { id: string; hand14: string[] })[];
};
for (const g of golden.cases) {
  if ("hand14" in g) {
    const a = analyze14(g.hand14);
    cases.push({
      id: g.id,
      source: "golden",
      hand: g.hand14,
      engine: {
        kind: "14",
        bestShanten: a.shanten,
        candidates: a.candidates.map((c) => ({
          discard: c.discard,
          shantenAfter: c.shantenAfter,
          ukeireCount: c.ukeireCount,
          ukeireTiles: [...c.ukeireTiles],
        })),
      },
    });
  } else {
    const a = analyze13(g.hand);
    cases.push({
      id: g.id,
      source: "golden",
      hand: g.hand,
      engine: {
        kind: "13",
        shanten: a.shanten,
        ukeireCount: a.ukeireCount,
        advances: a.advances.map((x) => ({
          tile: x.tile,
          remaining: x.remaining,
          shantenAfter: x.shantenAfter,
        })),
      },
    });
  }
}

// ② 固定种子随机手牌
const rand = mulberry32(20260902);
for (let i = 1; i <= 80; i++) {
  const hand = randomHand(13, rand);
  const a = analyze13(hand);
  cases.push({
    id: `R13-${String(i).padStart(3, "0")}`,
    source: "random",
    hand,
    engine: {
      kind: "13",
      shanten: a.shanten,
      ukeireCount: a.ukeireCount,
      advances: a.advances.map((x) => ({
        tile: x.tile,
        remaining: x.remaining,
        shantenAfter: x.shantenAfter,
      })),
    },
  });
}
for (let i = 1; i <= 60; i++) {
  const hand = randomHand(14, rand);
  const a = analyze14(hand);
  cases.push({
    id: `R14-${String(i).padStart(3, "0")}`,
    source: "random",
    hand,
    engine: {
      kind: "14",
      bestShanten: a.shanten,
      candidates: a.candidates.map((c) => ({
        discard: c.discard,
        shantenAfter: c.shantenAfter,
        ukeireCount: c.ukeireCount,
        ukeireTiles: [...c.ukeireTiles],
      })),
    },
  });
}

// 导入 parseTile 仅为校验手牌字符串合法（提前暴露编码错误）
for (const c of cases) for (const t of c.hand) parseTile(t);

mkdirSync(OUT_DIR, { recursive: true });
const batch = {
  schema_version: 1,
  engine_version: ENGINE_VERSION,
  generated_at: new Date().toISOString(),
  tile_order: "0-8=1m-9m, 9-17=1p-9p, 18-26=1s-9s, 27-33=E,S,W,N,h(白),f(發),c(中)",
  cases,
};
writeFileSync(join(OUT_DIR, "duipai-batch.json"), JSON.stringify(batch, null, 1), "utf-8");

const n13 = cases.filter((c) => c.engine.kind === "13").length;
const n14 = cases.filter((c) => c.engine.kind === "14").length;
console.log(`导出 ${cases.length} 手（13张×${n13}，14张×${n14}）→ ${join(OUT_DIR, "duipai-batch.json")}`);
