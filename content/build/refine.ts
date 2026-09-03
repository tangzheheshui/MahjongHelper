/**
 * 反查工具（probe 的互补）：给定 14 张种子手牌 + 一个目标效果，枚举
 * 「替换一张牌」的全部近邻手牌，返回满足目标、引擎校验过的候选（去重、
 * 按「离种子步数 → 最优切与次优张数差 → 字典序」排序）。
 *
 *   probe  ：给我一手牌 → 告诉我引擎数字（确认某手）
 *   refine ：给我一手「还差一点」的牌 + 我要的效果 → 帮我找到满足的手（搜牌）
 *
 * 面向 M3 出题工作流：作者先摆一手大致想要的牌，
 * refine 把「手牌构造」里的试错从『改一张 → probe → 再改』变成一次搜索。
 * 只产出候选手牌（含引擎数字），knowledge_point / 讲解仍由作者写，不落 content/questions/。
 *
 * 目标语法（goal）：
 *   best:T        最优切恰好是且唯一是 T（正解唯一题）
 *   best:A;B      最优切恰好并列 A、B 两张（「并列不算错」题）
 *   nobest:T      T 不该是最优切（负向约束，验证自己以为的「错切」确实错）
 *
 * 用法：
 *   npx tsx content/build/refine.ts "<14 张空格分隔>" best:9m
 *   npx tsx content/build/refine.ts "<14 张>" "best:9m;3s"
 *   npx tsx content/build/refine.ts "<14 张>" nobest:9m --suit mps --shanten 1 --max 6 --json
 *
 * 选项：
 *   --suit mpsz    只允许在这些花色里替换（m万/p筒/s条/z字；默认全部 34 种）
 *   --shanten N    只保留「最优切后向听 = N」的候选（如 1 = 一向听）
 *   --max N        打印条数上限（默认 8）
 *   --json         输出 JSON 到 stdout（供脚本消费，调试信息走 stderr）
 */

import { analyze14, bestDiscards, TILE_KINDS, toCounts, countsToHand } from "@nanikiru/engine";
import type { Counts } from "@nanikiru/engine";

/* ---------- 参数解析 ---------- */

function usageAndExit(msg: string): never {
  console.error(msg);
  console.error(
    '用法: npx tsx content/build/refine.ts "<14张空格分隔>" <best:T | best:A;B | nobest:T> [--suit mpsz] [--shanten N] [--max N] [--json]',
  );
  process.exit(2);
}

interface Goal {
  kind: "best" | "nobest";
  /** best:T → [T]；best:A;B → [A,B]（恰好并列）；nobest:T → [T] */
  tiles: string[];
}

function parseGoal(raw: string): Goal {
  const m = /^(best|nobest):([^;]+)(?:;([^;]+))?$/.exec(raw.trim());
  if (!m) usageAndExit(`无法解析目标 "${raw}"`);
  const kind = m[1] as Goal["kind"];
  const a = m[2];
  const b = m[3];
  if (kind === "nobest" && b !== undefined) usageAndExit(`nobest 只接受一张牌，收到 "${a};${b}"`);
  if (kind === "best" && b === undefined) return { kind, tiles: [a] };
  if (kind === "best") return { kind, tiles: a < b ? [a, b] : [b, a] };
  return { kind, tiles: [a] };
}

function parseSuit(pool: string): string[] {
  // 只接受 mpsz，任一组合
  const all: string[] = [];
  if (/m/.test(pool)) all.push(...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `${n}m`));
  if (/p/.test(pool)) all.push(...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `${n}p`));
  if (/s/.test(pool)) all.push(...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `${n}s`));
  if (/z/.test(pool)) all.push("E", "S", "W", "N", "h", "f", "c");
  if (all.length === 0) usageAndExit(`--suit 只接受 m/p/s/z 的组合，收到 "${pool}"`);
  return all;
}

/* ---------- 目标谓词 ---------- */

function evalHand(hand: string[], goal: Goal, wantShanten: number | null): { ok: boolean; shanten: number; margin: number } | null {
  const a = analyze14(hand);
  if (wantShanten !== null && a.shanten !== wantShanten) return null;
  const best = bestDiscards(a);
  if (goal.kind === "nobest") {
    if (best.includes(goal.tiles[0])) return null;
    return { ok: true, shanten: a.shanten, margin: 0 };
  }
  // best：与期望集合完全相等（顺序无关）
  const expect = [...goal.tiles].sort();
  const got = [...best].sort();
  if (got.length !== expect.length || got.some((t, i) => t !== expect[i])) return null;
  // 清晰度 = 最优张数与次优张数之差（越大越「唯一明显」）
  const c0 = a.candidates[0];
  const runner = a.candidates.find((c) => !got.includes(c.discard) && c.shantenAfter === a.shanten);
  const margin = runner ? c0.ukeireCount - runner.ukeireCount : 0;
  return { ok: true, shanten: a.shanten, margin };
}

/** seed 与近邻手牌的差异描述：返回 { removed, added }；nb[i] 比 seed[i] 少 1 = 删掉，多 1 = 加上 */
function diffOf(seed: Counts, nb: Counts): { removed: string; added: string } | null {
  let removed = "";
  let added = "";
  for (let i = 0; i < 34; i++) {
    if (nb[i] === seed[i] - 1) removed = TILE_KINDS[i];
    else if (nb[i] === seed[i] + 1) added = TILE_KINDS[i];
  }
  return removed || added ? { removed, added } : null;
}

/* ---------- 主流程 ---------- */

const args = process.argv.slice(2);
const handArg = args[0];
if (!handArg) usageAndExit("缺少手牌参数");
let rest = args.slice(1);
const goalArgIdx = rest.findIndex((x) => !x.startsWith("--"));
if (goalArgIdx < 0) usageAndExit("缺少目标（best:… / nobest:…）");
const goal = parseGoal(rest[goalArgIdx]);

const opts: Record<string, string> = {};
for (let i = goalArgIdx + 1; i < rest.length; i++) {
  const a = rest[i];
  if (a.startsWith("--")) {
    const val = rest[i + 1];
    if (val !== undefined && !val.startsWith("--")) {
      opts[a.slice(2)] = val;
      i++;
    } else opts[a.slice(2)] = "true";
  }
}
const suitPool = opts.suit ? parseSuit(opts.suit) : [...TILE_KINDS];
const wantShanten = opts.shanten !== undefined && opts.shanten !== "true" ? Number(opts.shanten) : null;
if (wantShanten !== null && !Number.isInteger(wantShanten)) usageAndExit(`--shanten 需为整数，收到 "${opts.shanten}"`);
const maxShow = opts.max !== undefined && opts.max !== "true" ? Number(opts.max) : 8;

let seed: Counts;
try {
  seed = toCounts(handArg.trim().split(/\s+/), 14);
} catch (e) {
  usageAndExit(`种子手牌非法：${(e as Error).message}`);
}
const seedHand = countsToHand(seed);
const seedAnalysis = evalHand(seedHand, goal, wantShanten);

interface Hit {
  hand: string;
  change: string; // "" = 种子本身
  distance: number;
  shanten: number;
  margin: number;
  best: string[];
}
const hits: Hit[] = [];
if (seedAnalysis) {
  hits.push({ hand: seedHand.join(" "), change: "", distance: 0, shanten: seedAnalysis.shanten, margin: seedAnalysis.margin, best: bestDiscards(analyze14(seedHand)) });
}

// 枚举：替换一张牌。去掉同一手牌被多次触达的情况（理论唯一，防御性去重）。
const seen = new Set<string>([seedHand.join(" ")]);
const t0 = performance.now();
for (let d = 0; d < 34; d++) {
  if (seed[d] === 0) continue;
  for (const r of suitPool) {
    const ri = TILE_KINDS.indexOf(r);
    if (ri === d) continue;
    if (seed[ri] >= 4) continue;
    const nb: Counts = [...seed];
    nb[d]--;
    nb[ri]++;
    const hand = countsToHand(nb);
    const sig = hand.join(" ");
    if (seen.has(sig)) continue;
    seen.add(sig);
    const res = evalHand(hand, goal, wantShanten);
    if (!res) continue;
    const diff = diffOf(seed, nb);
    hits.push({
      hand: sig,
      change: diff ? `${diff.removed}→${diff.added}` : "",
      distance: 1,
      shanten: res.shanten,
      margin: res.margin,
      best: bestDiscards(analyze14(hand)),
    });
  }
}

hits.sort(
  (a, b) => a.distance - b.distance || b.margin - a.margin || (a.hand < b.hand ? -1 : a.hand > b.hand ? 1 : 0),
);

const dt = performance.now() - t0;

if (opts.json === "true") {
  const out = hits.slice(0, maxShow).map((h) => ({ hand: h.hand, change: h.change, distance: h.distance, shanten: h.shanten, best: h.best, ukeire_margin: h.margin }));
  process.stdout.write(JSON.stringify(out, null, 2) + "\n");
  process.stderr.write(`# 枚举 ${seen.size - 1} 个近邻，命中 ${hits.length}，耗时 ${dt.toFixed(0)}ms\n`);
  process.exit(0);
}

const seedNote = hits.some((h) => h.distance === 0) ? "\n（种子本身已满足目标，下列是「同样满足」的近邻替代，可挑牌型更干净的）" : "\n（种子不满足目标，下列是改一张后满足的最近候选）";
console.log(`种子: ${seedHand.join(" ")}  目标: ${goal.kind === "nobest" ? `nobest:${goal.tiles[0]}` : `best:${goal.tiles.join(";")}`}${seedNote}`);
console.log("");

if (hits.length === 0) {
  console.log("没找到满足目标的候选（单张替换范围内）。尝试：");
  console.log("  1) 放宽 --suit / 去掉 --shanten / 换成更近的目标");
  console.log("  2) 缩小范围：改 --suit mps 让替换更贴题，或换一张更接近的种子");
  console.log("  3) 用本工具输出当新种子再搜一次（迭代逼近，每次只差一张牌）");
  process.exit(0);
}

const shown = hits.slice(0, maxShow);
console.log(`#  变化(离种子)   最优切      向听  最优/次优张数差  手牌`);
for (let i = 0; i < shown.length; i++) {
  const h = shown[i];
  const change = h.distance === 0 ? "＝种子" : h.change.padEnd(11);
  console.log(
    `${String(i + 1).padStart(2)}  ${change.padEnd(12)}  [${h.best.join(" ")}]${" ".repeat(Math.max(1, 10 - h.best.join(" ").length))}  ${h.shanten}向听  ${String(h.margin).padStart(2)}     ${h.hand}`,
  );
}
console.log("");
console.log(`枚举 ${seen.size - 1} 个近邻，命中 ${hits.length}，耗时 ${dt.toFixed(0)}ms。命中手牌可再跑 probe 看完整候选表。`);
