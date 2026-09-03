/**
 * 题库校验（engine.md §三.4、question-bank.md §五③）：
 * 出题流水线的关卡——correct 必须落在引擎最优集合内，不一致的题拒绝入库。
 *
 * verifyQuestion 为纯函数（bin/verify.ts 只做文件 IO）；
 * buildSnapshot 生成题库 JSON 里的 engine_snapshot / verified 字段。
 */

import { analyze14, bestDiscards, ENGINE_VERSION } from "./analyze";
import { TILE_KINDS, parseTile, toCounts } from "./tiles";

/** 题库单题（校验所需的最小子集，完整 Schema 见 content/schema/，M3 落地） */
export interface Question {
  schema_version: number;
  id: string;
  level: string;
  knowledge_point?: string;
  /** 专项分类（question-bank.md §九，2026-09-03 加）：App 专项训练按它筛选 */
  category?: string;
  question_type: "what_to_discard" | "ukeire_compare" | "mentsu_identify" | "wait_choose";
  hand: string[];
  answer: {
    correct: unknown;
    options?: { discard?: string }[] | null;
  };
  engine_snapshot?: unknown;
  explanation?: { best?: string; source?: string };
  verified?: { engine_version?: string; checked_at?: string };
}

/** 单题校验结果 */
export interface VerifyResult {
  id: string;
  ok: boolean;
  /** 拒绝原因（ok=false 时非空） */
  errors: string[];
}

/** 34 种进张候选的分析快照（题库 JSON 内嵌，讲解与判分直接消费） */
export interface EngineSnapshot {
  shanten_before: number;
  candidates: {
    discard: string;
    shanten_after: number;
    ukeire_count: number;
    ukeire_tiles: string[];
  }[];
}

const QUESTION_TYPES = new Set([
  "what_to_discard",
  "ukeire_compare",
  "mentsu_identify",
  "wait_choose",
]);

const MENTSU_TYPES = new Set(["ryanmen", "kanchan", "penchan", "pair"]);

/** 专项分类枚举（question-bank.md §九）：词汇库大分类的 App 5 组映射 */
const CATEGORIES = new Set(["basic", "composite", "structure", "tenpai", "strategy"]);

/**
 * 两张牌的搭子形状分类（question-bank.md §三 细则）：
 * 同花色数牌 n,n+1 且非 12/89 → ryanmen；12/89 → penchan；n,n+2 → kanchan；
 * 同牌两张 → pair；跨花色 / 字牌 / 其他间距 → null（不构成搭子形状）。
 */
export function mentsuShapeOf(a: string, b: string): string | null {
  if (a === b) return "pair";
  let ia: number;
  let ib: number;
  try {
    ia = parseTile(a);
    ib = parseTile(b);
  } catch {
    return null;
  }
  if (ia >= 27 || ib >= 27 || Math.floor(ia / 9) !== Math.floor(ib / 9)) return null;
  const lo = Math.min(ia, ib);
  const d = Math.abs(ia - ib);
  if (d === 1) return lo % 9 === 0 || lo % 9 === 7 ? "penchan" : "ryanmen";
  if (d === 2) return "kanchan";
  return null;
}

/** 生成 14 张手牌的引擎快照（question-bank.md §二 的 engine_snapshot 结构） */
export function buildSnapshot(hand: string[]): EngineSnapshot {
  const a = analyze14(hand);
  return {
    shanten_before: a.shanten,
    candidates: a.candidates.map((c) => ({
      discard: c.discard,
      shanten_after: c.shantenAfter,
      ukeire_count: c.ukeireCount,
      ukeire_tiles: [...c.ukeireTiles],
    })),
  };
}

/** 校验流水字段（写入题库后题目才允许发布） */
export function buildVerified(): { engine_version: string; checked_at: string } {
  return { engine_version: ENGINE_VERSION, checked_at: new Date().toISOString() };
}

function checkCommon(q: Question, errors: string[]): 13 | 14 | null {
  if (q.schema_version !== 1) errors.push(`schema_version 须为 1，实际 ${q.schema_version}`);
  if (!q.id) errors.push("缺少 id");
  if (!q.level) errors.push("缺少 level");
  if (q.category === undefined || !CATEGORIES.has(q.category))
    errors.push(`category 须为 basic/composite/structure/tenpai/strategy 之一（question-bank.md §九），实际: ${q.category ?? "(缺失)"}`);
  if (!QUESTION_TYPES.has(q.question_type)) errors.push(`未知 question_type: ${q.question_type}`);
  let n: 13 | 14 | null = null;
  try {
    const counts = toCounts(q.hand);
    n = counts.reduce((a, b) => a + b, 0) as 13 | 14;
    if (n !== 13 && n !== 14) errors.push(`手牌须为 13 或 14 张，实际 ${n} 张`);
  } catch (e) {
    errors.push(`手牌非法: ${(e as Error).message}`);
  }
  return n;
}

/**
 * 校验单题。判定规则：
 * - what_to_discard：answer.correct 必须与引擎最优切牌集合完全一致
 *   （correct 有不在最优集合内的 → 拒绝；引擎并列最优未列全 → 同样拒绝，
 *    否则判分会把并列正解标错——PRD A.3 #3）
 * - ukeire_compare：correct 与 options 均须是合法切牌、切后向听相同，
 *   且 correct 进张严格更多（进张并列的牌型不能出比较题）
 * - mentsu_identify：correct 每项 {tiles:[两张], type} 须形状与 type 一致、
 *   且两张都在手牌内（2026-09-02 M3 落地语义校验）
 * - wait_choose：options 绑定切牌，全部切后须 0 向听（听牌留法），
 *   correct 须恰为「进张最多的留法」集合（并列全列，2026-09-02 M3 落地）
 */
export function verifyQuestion(q: Question): VerifyResult {
  const errors: string[] = [];
  const n = checkCommon(q, errors);

  if (q.question_type === "what_to_discard") {
    if (n !== 14) {
      errors.push(`what_to_discard 手牌须为 14 张，实际 ${n ?? "?"} 张`);
    } else if (Array.isArray(q.answer.correct) && q.answer.correct.every((x) => typeof x === "string")) {
      const correct = new Set(q.answer.correct as string[]);
      const best = new Set(bestDiscards(analyze14(q.hand)));
      const notBest = [...correct].filter((d) => !best.has(d));
      const missing = [...best].filter((d) => !correct.has(d));
      if (notBest.length) errors.push(`correct 含非最优切牌 [${notBest.join(" ")}]，引擎最优为 [${[...best].join(" ")}]`);
      if (missing.length) errors.push(`引擎并列最优未列全，缺 [${missing.join(" ")}]（并列必须全列，否则判分出错解）`);
    } else {
      errors.push("answer.correct 须为非空字符串数组");
    }
  }

  if (q.question_type === "ukeire_compare") {
    if (n !== 14) {
      errors.push(`ukeire_compare 手牌须为 14 张，实际 ${n ?? "?"} 张`);
    } else {
      const opts = q.answer.options ?? [];
      const correct = q.answer.correct;
      const discards = opts.map((o) => o?.discard).filter((d): d is string => typeof d === "string");
      if (!Array.isArray(correct) || correct.length !== 1 || typeof correct[0] !== "string") {
        errors.push("ukeire_compare 的 answer.correct 须为单元素字符串数组");
      } else if (discards.length < 2) {
        errors.push("ukeire_compare 的 answer.options 须含 ≥2 个 {discard}");
      } else {
        const byDiscard = new Map(analyze14(q.hand).candidates.map((c) => [c.discard, c]));
        const stat = (d: string) => {
          const c = byDiscard.get(d);
          if (!c) errors.push(`切牌 "${d}" 不在手牌内`);
          return c;
        };
        const cs = discards.map(stat);
        if (cs.every((c): c is NonNullable<typeof c> => !!c)) {
          if (!discards.includes(correct[0])) errors.push(`correct [${correct[0]}] 不在 options 内`);
          const c1 = byDiscard.get(correct[0])!;
          const shantens = new Set(cs.map((c) => c.shantenAfter));
          if (shantens.size > 1) errors.push(`options 切后向听不一致 [${cs.map((c) => c.shantenAfter).join("/")}]，比较题应在同向听层面`);
          for (const c of cs) {
            if (c !== c1 && c.ukeireCount >= c1.ukeireCount) {
              errors.push(`correct ${correct[0]} 进张 ${c1.ukeireCount} 未严格多于 ${c.discard} 的 ${c.ukeireCount}，不能出比较题`);
            }
          }
        }
      }
    }
  }

  if (q.question_type === "mentsu_identify") {
    const correct = q.answer.correct;
    if (!Array.isArray(correct) || correct.length === 0) {
      errors.push("mentsu_identify 的 answer.correct 须为非空数组（{tiles,type}）");
    } else {
      let counts: number[] | null = null;
      try {
        counts = toCounts(q.hand);
      } catch {
        /* 手牌非法已由 checkCommon 记录 */
      }
      // 结构检查：两张、同一 type、形状一致、在手牌内
      const types = new Set<string>();
      const correctKeys = new Set<string>();
      let structural = true;
      correct.forEach((raw, idx) => {
        const c = raw as { tiles?: unknown; type?: unknown };
        if (!c || !Array.isArray(c.tiles) || c.tiles.length !== 2 || !c.tiles.every((t) => typeof t === "string")) {
          errors.push(`correct[${idx}] 须为 {tiles:[两张], type}`);
          structural = false;
          return;
        }
        if (typeof c.type !== "string" || !MENTSU_TYPES.has(c.type)) {
          errors.push(`correct[${idx}] type 须为 ryanmen/kanchan/penchan/pair`);
          structural = false;
          return;
        }
        types.add(c.type);
        const [a, b] = [...(c.tiles as string[])].sort();
        if (mentsuShapeOf(a, b) !== c.type) {
          errors.push(`correct[${idx}] [${a} ${b}] 形状与 type ${c.type} 不符`);
          structural = false;
        }
        if (counts) {
          try {
            const inHand = a === b ? counts[parseTile(a)] >= 2 : counts[parseTile(a)] >= 1 && counts[parseTile(b)] >= 1;
            if (!inHand) errors.push(`correct[${idx}] [${a} ${b}] 不在手牌内`);
            else correctKeys.add(`${a}|${b}`);
          } catch {
            errors.push(`correct[${idx}] 牌张非法 [${a} ${b}]`);
            structural = false;
          }
        }
      });
      // 语义检查（question-bank.md §三 细则）：手牌中该形状的全部两两组合 == correct 集合
      if (structural && counts && types.size === 1) {
        const type = [...types][0];
        const expect = new Set<string>();
        const kinds = counts
          .map((n, i) => ({ i, n }))
          .filter(({ i, n }) => n > 0 && (type === "pair" ? n >= 2 : n >= 1) && i < 27);
        if (type === "pair") {
          for (const { i } of kinds) expect.add(`${TILE_KINDS[i]}|${TILE_KINDS[i]}`);
        } else {
          for (const { i: ai } of kinds) {
            for (const { i: bi } of kinds) {
              if (ai < bi && mentsuShapeOf(TILE_KINDS[ai], TILE_KINDS[bi]) === type) {
                expect.add(`${TILE_KINDS[ai]}|${TILE_KINDS[bi]}`);
              }
            }
          }
        }
        const missing = [...expect].filter((k) => !correctKeys.has(k));
        const extra = [...correctKeys].filter((k) => !expect.has(k));
        if (missing.length) {
          errors.push(
            `手牌中该形状组合未列全，缺 [${missing.map((k) => k.replace("|", " ")).join(" / ")}]（用户点中会误判错）`,
          );
        }
        if (extra.length) {
          errors.push(`correct 含非该形状组合 [${extra.map((k) => k.replace("|", " ")).join(" / ")}]`);
        }
      } else if (types.size > 1) {
        errors.push("correct 各项 type 须一致（一题只认一种搭子形状）");
      }
    }
  }

  if (q.question_type === "wait_choose") {
    if (n !== 14) {
      errors.push(`wait_choose 手牌须为 14 张，实际 ${n ?? "?"} 张`);
    } else {
      const opts = (q.answer.options ?? []) as { value?: unknown; label?: unknown; discard?: unknown }[];
      const correct = q.answer.correct;
      if (!Array.isArray(correct) || correct.length === 0 || !correct.every((x) => typeof x === "string")) {
        errors.push("wait_choose 的 answer.correct 须为非空字符串数组（value 列表）");
      } else if (opts.length < 2) {
        errors.push("wait_choose 的 answer.options 须含 ≥2 个 {value,label,discard}");
      } else {
        const values = new Set<string>();
        let structural = true;
        for (const o of opts) {
          if (typeof o?.value !== "string" || typeof o?.label !== "string" || typeof o?.discard !== "string") {
            errors.push("wait_choose 的 options 每项须含 value/label/discard");
            structural = false;
            break;
          }
          if (values.has(o.value)) {
            errors.push(`wait_choose 的 options value 重复: ${o.value}`);
            structural = false;
            break;
          }
          values.add(o.value);
        }
        if (structural) {
          for (const v of correct as string[]) {
            if (!values.has(v)) {
              errors.push(`correct value "${v}" 不在 options 内`);
              structural = false;
            }
          }
        }
        if (structural) {
          const byDiscard = new Map(analyze14(q.hand).candidates.map((c) => [c.discard, c]));
          const rows: { value: string; discard: string; shantenAfter: number; ukeireCount: number }[] = [];
          for (const o of opts as { value: string; label: string; discard: string }[]) {
            const c = byDiscard.get(o.discard);
            if (!c) {
              errors.push(`选项切牌 "${o.discard}" 不在手牌内`);
              structural = false;
              break;
            }
            rows.push({ value: o.value, discard: o.discard, shantenAfter: c.shantenAfter, ukeireCount: c.ukeireCount });
          }
          if (structural) {
            const allTenpai = rows.every((r) => r.shantenAfter === 0);
            if (!allTenpai) {
              errors.push(
                `听牌留法题的选项切后均须 0 向听，实际 [${rows.map((r) => `${r.value}:${r.shantenAfter}`).join(" ")}]`,
              );
            } else {
              const max = Math.max(...rows.map((r) => r.ukeireCount));
              const bestSet = new Set(rows.filter((r) => r.ukeireCount === max).map((r) => r.value));
              const correctSet = new Set(correct as string[]);
              const missing = [...bestSet].filter((v) => !correctSet.has(v));
              const extra = [...correctSet].filter((v) => !bestSet.has(v));
              if (missing.length) errors.push(`进张最多的留法未列全，缺 [${missing.join(" ")}]（并列必须全列）`);
              if (extra.length) errors.push(`correct 含非最优留法 [${extra.join(" ")}]（进张未严格最多）`);
            }
          }
        }
      }
    }
  }

  return { id: q.id ?? "(无 id)", ok: errors.length === 0, errors };
}

/** 校验整批题：全部通过才 ok；rejected 为被拒绝的题目明细 */
export function verifyQuestionBank(questions: Question[]): {
  ok: boolean;
  total: number;
  passed: number;
  rejected: VerifyResult[];
} {
  const results = questions.map(verifyQuestion);
  const rejected = results.filter((r) => !r.ok);
  return { ok: rejected.length === 0, total: results.length, passed: results.length - rejected.length, rejected };
}
