import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { analyze14, bestDiscards, buildSnapshot, buildVerified, verifyQuestion, verifyQuestionBank } from "../src";
import type { Question } from "../src";

const FIXTURE = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "questions-sample.json");
const sample = JSON.parse(readFileSync(FIXTURE, "utf-8")) as Question[];

describe("verifyQuestion · what_to_discard", () => {
  it("最优唯一且 correct 正确 → 通过", () => {
    const r = verifyQuestion(sample.find((q) => q.id === "SAMPLE_001")!);
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it("correct 含非最优切牌 → 拒绝", () => {
    const r = verifyQuestion(sample.find((q) => q.id === "SAMPLE_002")!);
    expect(r.ok).toBe(false);
    expect(r.errors.join("\n")).toContain("非最优");
  });

  it("引擎并列最优未列全 → 拒绝（判分会把并列正解标错）", () => {
    const q = sample.find((x) => x.id === "SAMPLE_003")!;
    // 前提自检：该手牌引擎确实给出两个并列最优
    expect(bestDiscards(analyze14(q.hand))).toEqual(["3p", "7p"]);
    const r = verifyQuestion(q);
    expect(r.ok).toBe(false);
    expect(r.errors.join("\n")).toContain("并列最优未列全");
    expect(r.errors.join("\n")).toContain("7p");
  });
});

describe("verifyQuestion · ukeire_compare", () => {
  it("同向听层面、correct 进张严格更多 → 通过", () => {
    const r = verifyQuestion(sample.find((q) => q.id === "SAMPLE_004")!);
    expect(r.ok).toBe(true);
  });

  it("进张并列的选项 → 拒绝", () => {
    const r = verifyQuestion(sample.find((q) => q.id === "SAMPLE_005")!);
    expect(r.ok).toBe(false);
    expect(r.errors.join("\n")).toContain("未严格多于");
  });
});

describe("verifyQuestion · 结构校验", () => {
  it("wait_choose V1 仅结构校验 → 通过", () => {
    const r = verifyQuestion(sample.find((q) => q.id === "SAMPLE_006")!);
    expect(r.ok).toBe(true);
  });

  it("手牌非法 / schema_version 错 → 拒绝", () => {
    const r = verifyQuestion({
      schema_version: 2,
      id: "BAD_001",
      level: "L1",
      question_type: "what_to_discard",
      hand: ["1m"],
      answer: { correct: ["1m"] },
    });
    expect(r.ok).toBe(false);
    expect(r.errors.join("\n")).toContain("schema_version");
    expect(r.errors.join("\n")).toContain("14 张");
  });
});

describe("verifyQuestionBank", () => {
  it("fixture 汇总：3 通过 3 拒绝", () => {
    const s = verifyQuestionBank(sample);
    expect(s.total).toBe(6);
    expect(s.passed).toBe(3);
    expect(s.ok).toBe(false);
    expect(s.rejected.map((r) => r.id).sort()).toEqual(["SAMPLE_002", "SAMPLE_003", "SAMPLE_005"]);
  });
});

describe("buildSnapshot / buildVerified", () => {
  it("snapshot 与 analyze14 逐字段一致（题库 JSON 内嵌结构）", () => {
    const q = sample.find((x) => x.id === "SAMPLE_001")!;
    const snap = buildSnapshot(q.hand);
    const a = analyze14(q.hand);
    expect(snap.shanten_before).toBe(a.shanten);
    expect(snap.candidates).toHaveLength(a.candidates.length);
    expect(snap.candidates[0]).toEqual({
      discard: a.candidates[0].discard,
      shanten_after: a.candidates[0].shantenAfter,
      ukeire_count: a.candidates[0].ukeireCount,
      ukeire_tiles: a.candidates[0].ukeireTiles,
    });
  });

  it("verified 带引擎版本与时间戳", () => {
    const v = buildVerified();
    expect(v.engine_version).toBe("0.1.0");
    expect(v.checked_at).toBeTruthy();
  });
});
