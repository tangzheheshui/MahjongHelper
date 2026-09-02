import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { analyze14, bestDiscards, buildSnapshot, buildVerified, mentsuShapeOf, verifyQuestion, verifyQuestionBank } from "../src";
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

describe("verifyQuestion · mentsu_identify（M3 语义校验）", () => {
  it("形状与 type 一致且在手牌内 → 通过", () => {
    const r = verifyQuestion(sample.find((q) => q.id === "SAMPLE_007")!);
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it("漏列合法组合（456s 里 45/56 都是两面）→ 拒绝", () => {
    const r = verifyQuestion(sample.find((q) => q.id === "SAMPLE_008")!);
    expect(r.ok).toBe(false);
    expect(r.errors.join("\n")).toContain("未列全");
    expect(r.errors.join("\n")).toContain("5s 6s");
  });

  it("类型标错（嵌张写成两面）→ 拒绝", () => {
    const r = verifyQuestion({
      schema_version: 1,
      id: "BAD_MI_002",
      level: "L1",
      question_type: "mentsu_identify",
      hand: ["1m", "1m", "1m", "9m", "9m", "9m", "5m", "4p", "4p", "4p", "8p", "8p", "3s", "5s"],
      answer: { correct: [{ tiles: ["3s", "5s"], type: "ryanmen" }] },
    });
    expect(r.ok).toBe(false);
    expect(r.errors.join("\n")).toContain("形状与 type ryanmen 不符");
  });

  it("边张与两面的分界：12/89 是 penchan，23/78 才是 ryanmen", () => {
    expect(mentsuShapeOf("1p", "2p")).toBe("penchan");
    expect(mentsuShapeOf("8s", "9s")).toBe("penchan");
    expect(mentsuShapeOf("2p", "3p")).toBe("ryanmen");
    expect(mentsuShapeOf("7s", "8s")).toBe("ryanmen");
    expect(mentsuShapeOf("3m", "5m")).toBe("kanchan");
    expect(mentsuShapeOf("9m", "9m")).toBe("pair");
    expect(mentsuShapeOf("1m", "1p")).toBeNull();
    expect(mentsuShapeOf("3m", "8m")).toBeNull();
    expect(mentsuShapeOf("E", "S")).toBeNull();
  });

  it("tiles 不在手牌内 → 拒绝", () => {
    const r = verifyQuestion({
      schema_version: 1,
      id: "BAD_MI_001",
      level: "L1",
      question_type: "mentsu_identify",
      hand: ["1m", "2m", "3m", "4m", "5m", "6m", "7p", "8p", "9p", "2s", "3s", "6s", "6s", "9s"],
      answer: { correct: [{ tiles: ["4s", "6s"], type: "kanchan" }] },
    });
    expect(r.ok).toBe(false);
    expect(r.errors.join("\n")).toContain("不在手牌内");
  });
});

describe("verifyQuestion · wait_choose（M3 语义校验）", () => {
  it("两选项均听牌、correct 进张严格最多 → 通过", () => {
    const r = verifyQuestion(sample.find((q) => q.id === "SAMPLE_006")!);
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it("correct 选了进张少的留法 → 拒绝", () => {
    const r = verifyQuestion(sample.find((q) => q.id === "SAMPLE_009")!);
    expect(r.ok).toBe(false);
    expect(r.errors.join("\n")).toContain("非最优留法");
  });

  it("选项切后非听牌 → 拒绝", () => {
    const r = verifyQuestion({
      schema_version: 1,
      id: "BAD_WC_001",
      level: "L5",
      question_type: "wait_choose",
      hand: ["1m", "2m", "3m", "4p", "5p", "6p", "9p", "9p", "2s", "2s", "3s", "7s", "8s", "9s"],
      answer: {
        correct: ["a"],
        options: [
          { value: "a", label: "切 2条 · 留两面听", discard: "2s" },
          { value: "b", label: "切 1万 · 退一向听", discard: "1m" },
        ],
      },
    });
    expect(r.ok).toBe(false);
    expect(r.errors.join("\n")).toContain("0 向听");
  });
});

describe("verifyQuestion · 结构校验", () => {
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
  it("fixture 汇总：4 通过 5 拒绝", () => {
    const s = verifyQuestionBank(sample);
    expect(s.total).toBe(9);
    expect(s.passed).toBe(4);
    expect(s.ok).toBe(false);
    expect(s.rejected.map((r) => r.id).sort()).toEqual([
      "SAMPLE_002",
      "SAMPLE_003",
      "SAMPLE_005",
      "SAMPLE_008",
      "SAMPLE_009",
    ]);
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
