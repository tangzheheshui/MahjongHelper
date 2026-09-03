/** 专项训练分类（6 大知识领域）：按题库 knowledge_point 关键词筛选。
 *  碰杠处理、金钩钓识别当前题库暂无对应题，标记为即将上线。 */

import type { Question } from "./types";

export interface SpecialMeta {
  id: string;
  name: string;
  desc: string;
  icon: string;
  color: string;
  /** 匹配 knowledge_point 的关键词（任一命中即归入该专项） */
  keywords?: string[];
  /** 题库中是否有对应题目 */
  available: boolean;
}

export const SPECIALS: SpecialMeta[] = [
  {
    id: "daida",
    name: "拆搭基础",
    desc: "搭子识别、进张计算、拆搭取舍",
    icon: "🔧",
    color: "#27AE60",
    keywords: ["搭子", "拆搭", "嵌张", "两面", "边张", "雀头", "浮牌", "进张", "块"],
    available: true,
  },
  {
    id: "duizi",
    name: "对子处理",
    desc: "对子过剩、雀头选择、重叠合并",
    icon: "👥",
    color: "#B9770E",
    keywords: ["对子", "雀头"],
    available: true,
  },
  {
    id: "tingpai",
    name: "听牌判断",
    desc: "一向听、听牌形式、待牌识别",
    icon: "👂",
    color: "#2471A3",
    keywords: ["听牌", "一向听"],
    available: true,
  },
  {
    id: "penggang",
    name: "碰杠处理",
    desc: "副露判断、碰杠取舍（即将上线）",
    icon: "🎯",
    color: "#922B21",
    available: false,
  },
  {
    id: "jingoudiao",
    name: "金钩钓识别",
    desc: "金钩钓听牌形识别（即将上线）",
    icon: "🎣",
    color: "#7D3C98",
    available: false,
  },
  {
    id: "duomian",
    name: "复杂多面听",
    desc: "复合形、多面张、改良与倒退",
    icon: "🌀",
    color: "#566573",
    keywords: ["复合", "五连", "四连", "多面", "长连", "帽子", "改良", "倒退", "并列"],
    available: true,
  },
];

/** 按专项筛选题目 */
export function questionsOfSpecial(questions: Question[], specialId: string): Question[] {
  const sp = SPECIALS.find((s) => s.id === specialId);
  if (!sp || !sp.available || !sp.keywords) return [];
  return questions.filter((q) =>
    sp.keywords!.some((kw) => q.knowledge_point.includes(kw)),
  );
}

/** 某专项的题目总数 */
export function totalOfSpecial(questions: Question[], specialId: string): number {
  return questionsOfSpecial(questions, specialId).length;
}
