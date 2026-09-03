/**
 * 题库版本号单点（M4，server/README.md）：
 * App 内置出厂题库（roll-bank.mjs）与服务器发布分片（publish.mjs）必须同源同版本，
 * 换内容只 bump 这里一处，然后重跑 roll-bank + publish。
 *
 * 格式：YYYY.MM.N[-suffix]，数值比较（客户端 compareVersion 解析点分数字段，非字典序）。
 * 当前值 = 难度试点批 + B站精选首题（2026-09-03；09.6 虽未发布但可能已种进
 * 本机浏览器 IndexedDB，同版本改内容不会触发重播种，故再 bump）。
 */
export const CURRENT_BANK_VERSION = "2026.09.7";
