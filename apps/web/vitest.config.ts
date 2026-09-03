/** Web 侧单测（2026-09-03 起）：jsdom 环境，覆盖用户报告 bug 的回归用例。
 *  引擎侧测试仍在 packages/engine（node 环境），两边各跑各的 vitest。 */
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
