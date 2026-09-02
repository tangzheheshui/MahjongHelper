/**
 * 理论书《麻将拆搭入门》全部例题配图一键重生成（docs/theory/foundation.md 例题索引的落地脚本）。
 * 换牌面皮肤：改 tile-skin.ts 后重跑本脚本即可（--mark 高亮各例正解牌）。
 *
 * 用法：npx tsx content/build/gen-book-svg.mjs
 */

import { execFileSync } from "node:child_process";

// [文件名后缀, 手牌（万→筒→条排序）, 高亮牌（正解；并列时标首个，正文说明并列）]
const examples = [
  ["1-1_认雀头", "1m 1m 2m 3m 1p 2p 3p 4p 5p 6p 9p 7s 8s 9s", "9p"],
  ["1-2_刻子也是面子", "4m 4m 4m 5p 6p 7p 7p 8p 9p 2s 3s 6s 6s 9s", "9s"],
  ["1-3_嵌张只等中间", "1m 2m 3m 4m 5m 6m 1p 7p 8p 9p 3s 5s 7s 7s", "1p"],
  ["1-4_双碰二加二", "1m 2m 3m 4m 5m 6m 9m 7p 8p 9p 4s 4s 6s 6s", "9m"],
  ["2-1_浮牌先走", "1m 2m 3m 4m 5m 6m 9m 7p 8p 9p 1s 2s 4s 5s", "9m"],
  ["2-2_都听牌比张数", "1m 2m 3m 4m 5m 6m 9m 7p 8p 9p 4s 5s 5s 6s", "5s"],
  ["2-3_雀头在手", "1m 2m 3m 4m 5m 6m 9m 5p 5p 9p 4s 5s 7s 8s", "9m"],
  ["2-4_对子第三张", "1m 2m 3m 4m 5m 6m 4p 4p 6p 6p 5s 7s 8s 9p", "9p"],
  ["3-1_帽子形", "1m 1m 2m 3m 4p 5p 6p 9p 9p 5s 5s 7s 8s 9s", "1m"],
  ["3-2_四连", "1m 2m 3m 4m 5m 6m 7p 8p 9p 3s 4s 5s 6s 9s", "9s"],
  ["3-3_亚两面", "1m 2m 3m 4m 5m 6m 1p 2p 3p 9p 3s 4s 5s 5s", "9p"],
  ["3-4_两嵌", "1m 2m 3m 4m 5m 6m 9m 1p 3p 5p 4s 5s 7s 7s", "9m"],
  ["3-5_并集", "1m 2m 3m 9m 5p 6p 7p 8p 9p 2s 3s 4s 5s 6s", "9m"],
  ["4-1_四对子", "2m 2m 5m 6m 7m 3p 3p 4p 5p 9p 9p 8s 8s 9s", "3p"],
  ["4-2_块数刚好", "1m 2m 3m 4m 5m 6m 1p 2p 9p 6s 6s 7s 8s 9s", "9p"],
  ["4-3_拆最差", "1m 2m 3m 5m 6m 7m 2p 4p 6p 6p 3s 4s 7s 8s", "2p"],
  ["4-4_满员并列", "1m 2m 3m 9m 2p 3p 5p 5p 2s 3s 5s 6s 7s 8s", "9m"],
  ["5-1_五连三面", "1m 2m 3m 9m 4p 5p 6p 3s 4s 5s 6s 7s 9s 9s", "9m"],
  ["5-2a_好形一向听", "1m 2m 3m 4m 5m 6m 9m 7p 8p 9p 4s 5s 7s 8s", "9m"],
  ["5-2b_愚形一向听", "1m 2m 3m 4m 5m 6m 9m 7p 8p 9p 1s 3s 4s 6s", "9m"],
  ["5-3_听牌升级", "1m 2m 3m 4m 5m 6m 5p 5p 7p 8p 9p 2s 4s 5s", "2s"],
  ["5-4_切端不切中", "1m 2m 3m 4p 5p 6p 7s 8s 9s 3s 4s 5s 5s 6s", "5s"],
  ["6-1_不倒退", "1m 2m 3m 4p 5p 6p 9p 9p 2s 2s 3s 7s 8s 9s", "2s"],
  ["6-2_差听也不退", "1m 2m 3m 9m 4p 5p 6p 6p 6p 7s 8s 9s 2s 4s", "9m"],
  ["6-3_并列单骑", "2m 3m 4m 5m 6m 7m 9m 1p 2p 3p 5s 6s 7s 9s", "9m"],
  ["7-1_并列都给对", "1m 1m 2m 4m 5m 6m 4p 5p 6p 9p 9p 7s 8s 9s", "1m"],
  ["7-2_毕业考", "2m 3m 4m 9m 5p 6p 7p 9p 9p 1s 2s 3s 6s 7s", "9m"],
  ["7-3_尺子量到并列就停", "2m 3m 4m 5m 6m 7m 1p 7p 8p 3s 4s 6s 6s 9m", "9m"],
];

for (const [name, tiles, mark] of examples) {
  execFileSync(
    process.execPath,
    [
      "node_modules/tsx/dist/cli.mjs",
      "content/build/hand-svg.ts",
      "-o",
      `docs/theory/assets/书例${name}.svg`,
      tiles,
      "--mark",
      mark,
    ],
    { stdio: "inherit" },
  );
}
console.log(`共生成 ${examples.length} 张`);
