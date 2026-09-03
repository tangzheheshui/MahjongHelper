/** 专项训练分类：与题库 `category` 字段一一对应（question-bank.md §九）。
 *  5 组 = 词汇库大分类（vocabulary.md §二）的 App 映射：一+三 / 二 / 五 / 四 / 六+七。
 *  按 q.category 精确筛选，不做 knowledge_point 关键词猜测（自由文本会漂移、且一题多投）。 */

import type { Category, Question } from "./types";

export interface SpecialMeta {
  id: Category;
  name: string;
  desc: string;
  icon: string;
  color: string;
  /** 词汇库大分类坐标（vocabulary.md §二），详情页展示溯源 */
  domain: string;
}

/** 教学顺序：基础 → 复合形 → 整手 → 听牌 → 取舍（与七级关卡的递进一致） */
export const SPECIALS: SpecialMeta[] = [
  {
    id: "basic",
    name: "搭子与进张",
    desc: "认搭子与雀头、算进张张数、比搭子价值",
    icon: "🔧",
    color: "#27AE60",
    domain: "词汇库大分类：一 构成单位 + 三 进度与度量",
  },
  {
    id: "composite",
    name: "复合形与长连",
    desc: "帽子、中膨、两嵌、四连五连的读法与切法",
    icon: "🧩",
    color: "#B9770E",
    domain: "词汇库大分类：二 复合形/重叠块",
  },
  {
    id: "structure",
    name: "整手拆搭",
    desc: "五搭子满员、对子过剩、拆搭顺序与整序",
    icon: "🏗️",
    color: "#2471A3",
    domain: "词汇库大分类：五 整手组织",
  },
  {
    id: "tenpai",
    name: "听牌与留法",
    desc: "听牌形式优劣、留法选择、听牌升级",
    icon: "👂",
    color: "#7D3C98",
    domain: "词汇库大分类：四 听牌与待ち",
  },
  {
    id: "strategy",
    name: "取舍与不倒退",
    desc: "不倒退原则、愚形让位、并列时的抉择",
    icon: "⚖️",
    color: "#922B21",
    domain: "词汇库大分类：六 取舍规则 + 七 边界概念",
  },
];

export function specialOf(id: string | undefined): SpecialMeta | undefined {
  return SPECIALS.find((s) => s.id === id);
}

/** 按专项筛选题目（q.category 精确匹配） */
export function questionsOfSpecial(questions: Question[], id: Category): Question[] {
  return questions.filter((q) => q.category === id);
}

/** 某专项的题目总数 */
export function totalOfSpecial(questions: Question[], id: Category): number {
  return questionsOfSpecial(questions, id).length;
}

/** 某专项覆盖的考点（knowledge_point → 题数，按题数降序） */
export function knowledgePointsOfSpecial(questions: Question[], id: Category): { kp: string; n: number }[] {
  const counts = new Map<string, number>();
  for (const q of questionsOfSpecial(questions, id)) {
    counts.set(q.knowledge_point, (counts.get(q.knowledge_point) ?? 0) + 1);
  }
  return [...counts.entries()].map(([kp, n]) => ({ kp, n })).sort((a, b) => b.n - a.n);
}

/** 某专项覆盖的级别跨度：["L3","L5"] → "L3-L5"，单级 → "L3" */
export function levelSpanOf(questions: Question[], id: Category): string {
  const span = questionsOfSpecial(questions, id).map((q) => q.level).sort();
  if (span.length === 0) return "—";
  return span[0] === span[span.length - 1] ? span[0] : `${span[0]}-${span[span.length - 1]}`;
}
