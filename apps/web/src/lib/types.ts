/** 题库数据类型（content/questions Schema v1 的消费端视图，question-bank.md §二） */

export type Level = "L1" | "L2" | "L3" | "L4" | "L5" | "L6" | "L7";
export const LEVELS: Level[] = ["L1", "L2", "L3", "L4", "L5", "L6", "L7"];

export type QuestionType = "what_to_discard" | "ukeire_compare" | "mentsu_identify" | "wait_choose";

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
  question_type: QuestionType;
  difficulty: "easy" | "medium" | "hard";
  hand: string[];
  answer: {
    correct: string[];
    options?: { discard?: string }[] | null;
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
