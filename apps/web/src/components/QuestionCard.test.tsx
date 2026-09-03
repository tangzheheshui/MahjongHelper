/** 用户报告 bug 的回归测试（2026-09-03 起的铁律：用户提过的 bug 必须有用例锁住）：
 *  ① 「查看解析 页面看不到、位置不对」——讲解抽屉必须 portal 到 document.body，
 *     不得留在 .qcard / .page-trans 里（transform 包含块会把 position:fixed 困住）；
 *  ② 「（B站题）选了牌之后没有给解析」——判分后点「查看讲解」必须弹出抽屉，
 *     且讲解正文 / 进张对比表 / 理论出处齐全（用 L4_011 真实形状：4 张并列 correct）。 */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { QuestionCard } from "./QuestionCard";
import type { Question } from "../lib/types";

// React 18 act 环境标记（createRoot 同步渲染断言用）
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;

beforeEach(() => {
  document.body.innerHTML = "";
  localStorage.clear();
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
});

function render(q: Question) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root!.render(<QuestionCard q={q} />));
}

function click(el: Element) {
  act(() => el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })));
}

function textBtn(pattern: string): HTMLButtonElement {
  const btn = [...document.querySelectorAll("button")].find((b) => b.textContent?.includes(pattern));
  if (!btn) throw new Error(`找不到按钮「${pattern}」，页面按钮：${[...document.querySelectorAll("button")].map((b) => b.textContent).join(" | ")}`);
  return btn;
}

/** L4_011（B站·两对半）同形测试题：4 张并列 correct + 讲解 + 引擎快照 */
const qBili: Question = {
  schema_version: 1,
  id: "L4_011",
  level: "L4",
  knowledge_point: "两对半：对子过剩四张并列",
  category: "bili",
  question_type: "what_to_discard",
  difficulty: "medium",
  hand: ["3m", "3m", "4m", "5m", "6m", "7m", "2s", "3s", "6s", "6s", "7s", "7s", "9s", "9s"],
  answer: { correct: ["3m", "6s", "7s", "9s"] },
  engine_snapshot: {
    shanten_before: 2,
    candidates: [
      { discard: "3m", shanten_after: 2, ukeire_count: 33, ukeire_tiles: ["2m", "5m", "8m", "1s", "4s", "5s", "6s", "7s", "8s", "9s"] },
      { discard: "6s", shanten_after: 2, ukeire_count: 33, ukeire_tiles: ["2m", "3m", "5m", "8m", "1s", "4s", "5s", "7s", "8s", "9s"] },
      { discard: "7s", shanten_after: 2, ukeire_count: 33, ukeire_tiles: ["2m", "3m", "5m", "8m", "1s", "4s", "5s", "6s", "8s", "9s"] },
      { discard: "9s", shanten_after: 2, ukeire_count: 33, ukeire_tiles: ["2m", "3m", "5m", "8m", "1s", "4s", "5s", "6s", "7s", "8s"] },
    ],
  },
  explanation: {
    best: "博主答案：打 6条——视频从引挂与打点的角度选它。引擎答案：3万、6条、7条、9条 四张并列最优，各 33 张进张。",
    source: "B站·『两对半牌型』",
  },
};

describe("QuestionCard 讲解抽屉（用户 bug 回归）", () => {
  it("选牌判分后出现「查看讲解」，点击弹出讲解抽屉且内容完整", () => {
    render(qBili);

    // 判分前：无抽屉、无 verdict
    expect(document.querySelector(".drawer")).toBeNull();

    // 点手牌第一张（3万 ∈ correct，判对）
    const tile = document.querySelector(".hand .tile");
    expect(tile).not.toBeNull();
    click(tile!);

    // bug ② 关键断言：verdict 出现且带「查看讲解」按钮
    expect(document.querySelector(".verdict")).not.toBeNull();
    click(textBtn("查看讲解"));

    const drawer = document.querySelector(".drawer");
    expect(drawer).not.toBeNull();
    // 讲解正文（双答案文案）在抽屉里
    expect(drawer!.textContent).toContain("博主答案");
    expect(drawer!.textContent).toContain("引擎答案");
    // 进张对比表 + 出处
    expect(drawer!.textContent).toContain("进张对比");
    expect(drawer!.textContent).toContain("两对半牌型");
  });

  it("bug ①：抽屉必须挂在 document.body（portal），不被卡片的 transform 包含块困住", () => {
    render(qBili);
    click(document.querySelector(".hand .tile")!);
    click(textBtn("查看讲解"));

    const drawer = document.querySelector(".drawer");
    expect(drawer).not.toBeNull();
    expect(drawer!.closest(".qcard")).toBeNull(); // 不在卡片内
    expect(drawer!.parentElement).toBe(document.body); // portal 到 body
    expect(document.querySelector(".drawer-mask")).not.toBeNull(); // 遮罩同层
  });

  it("切错牌（拆 23条）也必须给解析：verdict 显示应选四张并列", () => {
    render(qBili);
    // orderHand 后手牌顺序：3m3m4m5m6m7m | 2s3s | 6s6s7s7s9s9s → 2条 是第 7 张（索引 6），切它非最优
    const tiles = document.querySelectorAll(".hand .tile");
    click(tiles[6]);
    const verdict = document.querySelector(".verdict");
    expect(verdict).not.toBeNull();
    expect(verdict!.textContent).toContain("并列最优");
    expect(verdict!.textContent).toContain("3万");
    click(textBtn("查看讲解"));
    expect(document.querySelector(".drawer")).not.toBeNull();
  });
});
