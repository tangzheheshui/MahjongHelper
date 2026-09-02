/**
 * 题库校验（engine.md §三.4、question-bank.md §五③）：
 * 出题流水线的关卡——correct 必须落在引擎最优集合内，不一致的题拒绝入库。
 *
 * verifyQuestion 为纯函数（bin/verify.ts 只做文件 IO）；
 * buildSnapshot 生成题库 JSON 里的 engine_snapshot / verified 字段。
 */

import { analyze14, bestDiscards, ENGINE_VERSION } from "./analyze";
import { toCounts } from "./tiles";

/** 题库单题（校验所需的最小子集，完整 Schema 见 content/schema/，M3 落地） */
export interface Question {
  schema_version: number;
  id: string;
  level: string;
  knowledge_point?: string;
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
 * - mentsu_identify / wait_choose：V1 仅做结构校验（题型语义校验 M3 随题库一起落地）
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

  if (q.question_type === "mentsu_identify" || q.question_type === "wait_choose") {
    if (q.answer.correct === undefined || q.answer.correct === null) {
      errors.push(`${q.question_type} 缺少 answer.correct`);
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
