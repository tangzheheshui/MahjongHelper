/** 关卡抽题回归（2026-09-03 bug：L5 库存涨到 15 后单局全量倒出，超 requirements「每关 8-12」上限）：
 *  库存 > 12 必须随机抽 12；库存不足 8 循环补足并标 reused。 */

import { describe, expect, it } from "vitest";
import { pickStageQuestions } from "./levels";
import type { Question } from "./types";

function fakeQ(id: string): Question {
  return {
    schema_version: 1,
    id,
    level: "L5",
    knowledge_point: `考点-${id}`,
    category: "tenpai",
    question_type: "what_to_discard",
    difficulty: "hard",
    hand: ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "1s", "2s", "3s", "4s", "5s"],
    answer: { correct: ["1m"] },
    explanation: { best: "测试题", source: "测试" },
  };
}

describe("pickStageQuestions（每关 8-12 题）", () => {
  it("库存 15 题 → 单局恰出 12 题，不补量", () => {
    const { qs, reused } = pickStageQuestions(Array.from({ length: 15 }, (_, i) => fakeQ(`q${i}`)));
    expect(qs).toHaveLength(12);
    expect(reused).toBe(false);
    expect(new Set(qs.map((q) => q.id)).size).toBe(12); // 不重复
  });

  it("库存 5 题 → 循环补足到 8 并标 reused", () => {
    const { qs, reused } = pickStageQuestions(Array.from({ length: 5 }, (_, i) => fakeQ(`q${i}`)));
    expect(qs).toHaveLength(8);
    expect(reused).toBe(true);
  });

  it("库存 10 题 → 原样 10 题", () => {
    const { qs, reused } = pickStageQuestions(Array.from({ length: 10 }, (_, i) => fakeQ(`q${i}`)));
    expect(qs).toHaveLength(10);
    expect(reused).toBe(false);
  });

  it("专项口径 min=1：库存 1 题不补量", () => {
    const { qs, reused } = pickStageQuestions([fakeQ("only")], 1);
    expect(qs).toHaveLength(1);
    expect(reused).toBe(false);
  });
});
