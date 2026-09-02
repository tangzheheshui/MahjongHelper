/**
 * 题库版本号单点（M4，architecture.md §五）：
 * App 内置出厂题库（roll-bank.mjs）与服务器发布分片（publish.mjs）必须同源同版本，
 * 换内容只 bump 这里一处，然后重跑 roll-bank + publish。
 *
 * 格式：YYYY.MM.N[-suffix]，数值比较（客户端 compareVersion 解析点分数字段，非字典序）。
 * 当前值 = M3 试点题库版本（2026-09-02 定）。
 */
export const CURRENT_BANK_VERSION = "2026.09.3-pilot";
