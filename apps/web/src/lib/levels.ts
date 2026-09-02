/** 关卡结构与判分（PRD 5.2 七级分类、6.2 达标解锁、web-v1.md §二.5 抽题） */

import { analyze14 } from "@nanikiru/engine";
import type { Level, Question, UkeireRow } from "./types";
import { LEVELS } from "./types";

export interface LevelMeta {
  level: Level;
  name: string;
  desc: string;
}

export const LEVEL_META: Record<Level, LevelMeta> = {
  L1: { level: "L1", name: "基本形与搭子识别", desc: "面子 / 搭子 / 雀头，两面嵌张边张对子" },
  L2: { level: "L2", name: "搭子价值与进张计算", desc: "有效牌张数，搭子价值排序" },
  L3: { level: "L3", name: "复合形与多面张", desc: "三张四张复合形，多面听牌结构" },
  L4: { level: "L4", name: "五搭子原理与拆搭", desc: "搭子过剩时的取舍，浮牌处理" },
  L5: { level: "L5", name: "一向听与听牌选择", desc: "一向听的牌理，听牌形式优劣" },
  L6: { level: "L6", name: "改良与向听倒退", desc: "好形变化的价值，何时接受倒退" },
  L7: { level: "L7", name: "综合判断", desc: "攻守与综合效率（通用牌效口径）" },
};

/** 试点期每级 1 关（PRD 5.4 每关 8-12 题；试点题库不足，web-v1.md §二.5 允许复用并提示） */
export const STAGE_OF_LEVEL = "S1";

export const PASS_RATE = 0.8;

/** 判分（web-v1.md §二.2）：比对 answer.correct，不实时算引擎 */
export function isCorrect(q: Question, userAnswer: string): boolean {
  return q.answer.correct.includes(userAnswer);
}

/** 讲解用候选表：优先 snapshot；缺失时引擎兜底（题库经 CLI 校验，正常不落此处） */
export function candidatesOf(q: Question): UkeireRow[] {
  if (q.engine_snapshot?.candidates?.length) return q.engine_snapshot.candidates;
  const a = analyze14(q.hand);
  return a.candidates.map((c) => ({
    discard: c.discard,
    shanten_after: c.shantenAfter,
    ukeire_count: c.ukeireCount,
    ukeire_tiles: [...c.ukeireTiles],
  }));
}

export function shantenBefore(q: Question): number {
  return q.engine_snapshot?.shanten_before ?? analyze14(q.hand).shanten;
}

/* ---------- 展示层：中文牌面文字与手牌排序（web-v1.md §一 卡片展示口径） ---------- */

const SUIT_WORD: Record<string, string> = { m: "万", p: "筒", s: "条" };
const HONOR_WORD: Record<string, string> = { E: "东", S: "南", W: "西", N: "北", h: "白", f: "发", c: "中" };

/** 单张牌的中文叫法：4s → 4条、E → 东（给人看的文字用；内部 id 不变） */
export function tileLabel(id: string): string {
  const m = /^([1-9])([mps])$/i.exec(id);
  if (m) return `${m[1]}${SUIT_WORD[m[2].toLowerCase()]}`;
  return HONOR_WORD[id] ?? id;
}

/** 手牌重排：万→筒→条各自成块，块内 1→9 升序、同张相邻；字牌兜底在最后。
 *  只用于展示（不帮忙组牌、不提示搭子），题库源数组保持原样。 */
export function orderHand(hand: string[]): string[] {
  const zIdx = (t: string): number => {
    const m = /^([1-9])([mps])$/i.exec(t);
    if (m) return "mps".indexOf(m[2].toLowerCase()) * 9 + (Number(m[1]) - 1);
    const j = ["E", "S", "W", "N", "h", "f", "c"].indexOf(t);
    return j < 0 ? 99 : 27 + j;
  };
  return [...hand].sort((a, b) => zIdx(a) - zIdx(b));
}

/** 一列进张牌的中文表述：["3s","6s"] → "3条 6条" */
export function tilesLabel(ids: string[]): string {
  return ids.map(tileLabel).join(" ");
}

/** 关卡抽题：题量不足整关时循环复用至下限（试点期策略） */
export function pickStageQuestions(all: Question[], min = 8): { qs: Question[]; reused: boolean } {
  if (all.length === 0) return { qs: [], reused: false };
  const qs = [...all];
  let i = 0;
  while (qs.length < Math.min(min, 12) && all.length > 0) {
    qs.push(all[i % all.length]);
    i++;
  }
  return { qs, reused: all.length < min };
}

/** 达标判断（PRD 6.2）：正确率 ≥80% 解锁下一级 */
export function passRateOf(correct: number, total: number): number {
  return total === 0 ? 0 : correct / total;
}

export function starsOf(rate: number): 1 | 2 | 3 {
  if (rate >= 1) return 3;
  if (rate >= 0.9) return 2;
  return 1;
}

/** 下一级解锁（L7 无下一级） */
export function nextLevelOf(level: Level): Level | null {
  const i = LEVELS.indexOf(level);
  return i < LEVELS.length - 1 ? LEVELS[i + 1] : null;
}

/** 结算落地（PRD 6.2）：写最高正确率/星级，达标解锁下一级。纯函数，闭环冒烟共用。 */
export function applyRunResult(
  p: { levels: Partial<Record<Level, { unlocked: boolean; bestRate?: number; stars?: 1 | 2 | 3; completedAt?: string }>> },
  level: Level,
  results: { ok: boolean }[],
): { progress: typeof p; passed: boolean; rate: number } {
  const total = results.length;
  const correct = results.filter((r) => r.ok).length;
  const rate = passRateOf(correct, total);
  const passed = total > 0 && rate >= PASS_RATE;
  const levels = { ...p.levels };
  const lp = { unlocked: true, ...levels[level] };
  lp.bestRate = Math.max(lp.bestRate ?? 0, rate);
  lp.stars = Math.max(lp.stars ?? 0, starsOf(rate)) as 1 | 2 | 3;
  if (passed) {
    lp.completedAt = new Date().toISOString();
    const nl = nextLevelOf(level);
    if (nl) {
      const np = { unlocked: false, ...levels[nl] };
      np.unlocked = true;
      levels[nl] = np;
    }
  }
  levels[level] = lp;
  return { progress: { levels }, passed, rate };
}

/* ---------- 水平测试（PRD 6.3） ---------- */

export const PLACEMENT_GRADES: { grade: "入门" | "初级" | "中级" | "高级"; levels: Level[] }[] = [
  { grade: "入门", levels: ["L1", "L2"] },
  { grade: "初级", levels: ["L3", "L4"] },
  { grade: "中级", levels: ["L5", "L6"] },
  { grade: "高级", levels: ["L7"] },
];

/** 每级抽 1-2 题组卷（题库不足时有多少用多少） */
export function pickPlacementQuestions(byLevel: Record<string, Question[]>): Question[] {
  const picked: Question[] = [];
  for (const lv of LEVELS) {
    const pool = (byLevel[lv] ?? []).filter((q) => q.question_type === "what_to_discard");
    // 固定取第 1、3 题（题库小且需稳定；难度混合留给 M3 扩量后随机）
    for (const idx of [0, 2]) {
      if (pool[idx]) picked.push(pool[idx]);
    }
  }
  return picked;
}

/** 定级：从 L7 往下找第一个「该级题正确率 ≥1/2」的级别所在档；全不过 → 入门、起始 L1 */
export function gradePlacement(perLevel: Partial<Record<Level, { ok: number; total: number }>>): {
  grade: "入门" | "初级" | "中级" | "高级";
  startLevel: Level;
} {
  for (const lv of [...LEVELS].reverse()) {
    const s = perLevel[lv];
    if (s && s.total > 0 && s.ok * 2 >= s.total) {
      const band = PLACEMENT_GRADES.find((g) => g.levels.includes(lv))!;
      return { grade: band.grade, startLevel: lv };
    }
  }
  return { grade: "入门", startLevel: "L1" };
}
