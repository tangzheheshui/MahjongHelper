/** 题库数据类型（schema v1 的消费端视图，源结构见 content/schema/question.schema.json） */

export type Level = "L1" | "L2" | "L3" | "L4" | "L5" | "L6" | "L7";
export const LEVELS: Level[] = ["L1", "L2", "L3", "L4", "L5", "L6", "L7"];

export type QuestionType = "what_to_discard" | "ukeire_compare" | "mentsu_identify" | "wait_choose";

/** 专项分类（vocabulary.md §二）：词汇库大分类的 App 5 组映射，每题恰属一组；
 *  bili = B站 来源标签（第 6 组「B站精选」，不属知识分类，2026-09-03） */
export type Category = "basic" | "composite" | "structure" | "tenpai" | "strategy" | "bili";
export const CATEGORIES: Category[] = ["basic", "composite", "structure", "tenpai", "strategy", "bili"];

/** 搭子类型（mentsu_identify；枚举 + 语义校验见 engine verify） */
export type MentsuType = "ryanmen" | "kanchan" | "penchan" | "pair";

export interface MentsuAnswer {
  tiles: string[];
  type: MentsuType;
}

/** wait_choose 的选项（requirements.md）：label 展示、value 判分、discard 绑定切牌 */
export interface WaitOption {
  value: string;
  label: string;
  discard?: string;
}

export interface UkeireRow {
  discard: string;
  shanten_after: number;
  ukeire_count: number;
  ukeire_tiles: string[];
}

export interface Question {
  schema_version: number;
  id: string;
  level: Level;
  knowledge_point: string;
  category: Category;
  question_type: QuestionType;
  difficulty: "easy" | "medium" | "hard";
  hand: string[];
  answer: {
    /** wtd/uc/wc：切牌或 value 字符串；mi：{tiles,type} 数组 */
    correct: string[] | MentsuAnswer[];
    options?: { discard?: string }[] | WaitOption[] | null;
  };
  engine_snapshot?: {
    shanten_before: number;
    candidates: UkeireRow[];
  };
  explanation: {
    best: string;
    ukeire_table?: { discard: string; ukeire_count: number; note?: string }[];
    source: string;
  };
  verified?: { engine_version: string; checked_at: string };
}

export interface Bank {
  bank_version: string;
  generated_at: string;
  questions: Question[];
}
