/** 关卡结构与判分（requirements.md：七级分类、达标解锁、抽题口径） */

import { analyze14 } from "@nanikiru/engine";
import type { Level, MentsuAnswer, MentsuType, Question, UkeireRow, WaitOption } from "./types";
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

/** 试点期每级 1 关（requirements.md：每关 8-12 题；题库不足允许复用并提示） */
export const STAGE_OF_LEVEL = "S1";

export const PASS_RATE = 0.8;

/** 搭子类型 → 中文（mentsu_identify 的选项与判分展示） */
export const MENTSU_TYPE_LABEL: Record<MentsuType, string> = {
  ryanmen: "两面",
  kanchan: "嵌张",
  penchan: "边张",
  pair: "对子",
};

/** mi 的两张答案编码：无序两张 → 排序后 "a|b"（与题库 correct[].tiles 同构） */
export function mentsuPairKey(tiles: string[]): string {
  return [...tiles].sort().join("|");
}

/** 判分（requirements.md）：比对 answer.correct，不实时算引擎。
 *  wtd/uc 比切牌、wc 比 value、mi 比两张的无序组合（correct 全列该形状组合）。 */
export function isCorrect(q: Question, userAnswer: string): boolean {
  if (q.question_type === "mentsu_identify") {
    return (q.answer.correct as MentsuAnswer[]).some((c) => mentsuPairKey(c.tiles) === userAnswer);
  }
  return (q.answer.correct as string[]).includes(userAnswer);
}

/** mi 题面要求点选的搭子类型（全部 correct 项同型，verify CLI 保证） */
export function mentsuTypeOf(q: Question): MentsuType | null {
  if (q.question_type !== "mentsu_identify") return null;
  return (q.answer.correct as MentsuAnswer[])[0]?.type ?? null;
}

/** 判分后的正确答案文案（verdict 行用）：切牌 / 类型 / 留法 label */
export function correctLabelOf(q: Question): string {
  if (q.question_type === "mentsu_identify") {
    return (q.answer.correct as MentsuAnswer[]).map((c) => tilesLabel(c.tiles)).join(" / ");
  }
  if (q.question_type === "wait_choose") {
    const byValue = new Map(((q.answer.options as WaitOption[]) ?? []).map((o) => [o.value, o.label]));
    return (q.answer.correct as string[])
      .map((v) => byValue.get(v) ?? v)
      .join(" / ");
  }
  return (q.answer.correct as string[]).map(tileLabel).join(" / ");
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

/* ---------- 展示层：中文牌面文字与手牌排序（requirements.md） ---------- */

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

/** Fisher–Yates 洗牌（原地） */
function shuffle<T>(arr: T[], rand: () => number = Math.random): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** 关卡抽题（requirements.md：每关 8-12 题）：先洗牌再截到上限 12、不足时循环补足到下限——
 *  题序每次不同；库存超过 12 时随机抽 12（扩量后单局不膨胀），题量不足时的复用
 *  也从随机位置开始，避免连续两次进关看到同一顺序。 */
export function pickStageQuestions(all: Question[], min = 8, rand: () => number = Math.random): { qs: Question[]; reused: boolean } {
  if (all.length === 0) return { qs: [], reused: false };
  const pool = shuffle([...all], rand);
  const qs = pool.slice(0, 12);
  let i = 0;
  while (qs.length < Math.min(min, 12)) {
    qs.push(pool[i % pool.length]);
    i++;
  }
  return { qs, reused: all.length < min };
}

/** 达标判断（requirements.md）：正确率 ≥80% 解锁下一级 */
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

/** 结算落地（requirements.md）：写最高正确率/星级，达标解锁下一级。纯函数，闭环冒烟共用。 */
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

/* ---------- 水平测试（requirements.md） ---------- */

export const PLACEMENT_GRADES: { grade: "入门" | "初级" | "中级" | "高级"; levels: Level[] }[] = [
  { grade: "入门", levels: ["L1", "L2"] },
  { grade: "初级", levels: ["L3", "L4"] },
  { grade: "中级", levels: ["L5", "L6"] },
  { grade: "高级", levels: ["L7"] },
];

/** 每级抽 2 题组卷；只抽 L4-L7（2026-09-02 用户裁定：L1-L3 太简单不进评测，requirements.md）。
 *  级内洗牌——「重新测试」不再永远是同一套题，评测才可复评。 */
export function pickPlacementQuestions(byLevel: Record<string, Question[]>, rand: () => number = Math.random): Question[] {
  const picked: Question[] = [];
  for (const lv of LEVELS.filter((l) => ["L4", "L5", "L6", "L7"].includes(l))) {
    const pool = shuffle([...(byLevel[lv] ?? []).filter((q) => q.question_type === "what_to_discard")], rand);
    for (const idx of [0, 1]) {
      if (pool[idx]) picked.push(pool[idx]);
    }
  }
  return picked;
}

/** 「继续训练」目标级：最低的未开始或未达标（<80%）级 → 最低未满星级级 → L7。
 *  取「最低待改进」而非「练得最好」——前者才是下一步该练的地方。 */
export function nextTrainingLevel(progress: { levels: Partial<Record<Level, { bestRate?: number; stars?: 1 | 2 | 3 }>> }): Level {
  for (const lv of LEVELS) {
    const r = progress.levels[lv]?.bestRate;
    if (r === undefined || r < PASS_RATE) return lv;
  }
  for (const lv of LEVELS) {
    if ((progress.levels[lv]?.stars ?? 0) < 3) return lv;
  }
  return "L7";
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
