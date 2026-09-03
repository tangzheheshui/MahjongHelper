/** Drill 页组合回归（2026-09-03 用户报告 bug「B站题选了牌之后没有给解析，
 * 直接到本轮完成度结算页」）：
 *  根因：done 按「答题数 == 题数」即时判定，答完最后一题立刻卸载 QuestionCard
 *  换结算面板——单题专项（B站精选当时只有 L4_011 一题）等于永远看不到解析。
 *  修复：结算改为点「看结果」驱动（idx 走过末位才算 done）。
 *
 *  用单题专项（cat=bili）做用例：答完这题 = 答完最后一题，正是抢跑路径——
 *  旧代码下本用例必挂（结算面板顶掉卡片），新代码下卡片保留、讲解可看。
 *  全链路真实渲染：loadBank → IndexedDB（内存 fake，见 scripts/fake-idb.ts）。 */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { installFakeIdb } from "../../scripts/fake-idb";
import { Drill } from "./Drill";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;

beforeEach(() => {
  document.body.innerHTML = "";
  localStorage.clear();
  installFakeIdb(); // 每用例换内存 IDB（loadBank → nk.bank 种内置题库全链路）
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
});

async function renderDrill(url: string) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(
      <MemoryRouter initialEntries={[url]}>
        <Drill />
      </MemoryRouter>,
    );
  });
}

/** 轮询等待异步状态落地（loadBank 走 IDB，需 flush 微任务队列） */
async function waitFor(cond: () => boolean, what: string, ms = 3000) {
  const t0 = Date.now();
  while (!cond()) {
    if (Date.now() - t0 > ms)
      throw new Error(`等待超时：${what}\nBODY: ${document.body.innerHTML.slice(0, 300)}`);
    await act(async () => {});
    await new Promise((r) => setTimeout(r, 10));
  }
}

function click(el: Element) {
  act(() => el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })));
}

function btn(pattern: string): HTMLButtonElement {
  const b = [...document.querySelectorAll("button")].find((x) => x.textContent?.includes(pattern));
  if (!b) throw new Error(`找不到按钮「${pattern}」`);
  return b;
}

describe("Drill 专项训练（用户 bug 回归：结算不许抢跑）", () => {
  it("答完最后一题：卡片与解析入口保留，点「看结果」才进结算", async () => {
    // B站精选（cat=bili）当前恰为单题组——答完即「最后一题」，正是用户报告的场景
    await renderDrill("/drill?cat=bili");
    await waitFor(() => document.querySelector(".hand .tile") !== null, "题目加载");

    click(document.querySelector(".hand .tile")!);

    // 答完不许立刻结算：判分条在、结算面板不在
    await waitFor(() => document.querySelector(".verdict") !== null, "判分条");
    expect(document.body.textContent).not.toContain("本轮完成度");

    // 解析可看（bug 的核心断言）
    click(btn("查看讲解"));
    const drawer = document.querySelector(".drawer");
    expect(drawer).not.toBeNull();
    expect(drawer!.textContent).toContain("博主答案");

    // 关掉抽屉 → 点「看结果」才结算
    click(document.querySelector(".drawer .close")!);
    click(btn("看结果"));
    await waitFor(() => document.body.textContent!.includes("本轮完成度"), "结算面板");
  });
});
