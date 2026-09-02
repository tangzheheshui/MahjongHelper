/**
 * 手牌记法 → SVG 牌面图（docs/theory/foundation.md 牌例配图用）。
 * 皮肤在 tile-skin.ts（换牌面只动那一个文件，然后逐例重跑本命令即可）。
 *
 * 用法：npx tsx content/build/hand-svg.ts -o docs/theory/assets/ex2-1.svg "1m 2m 3m …" [--mark 5s] [--h 64]
 *   --mark <牌>  给指定牌加高亮描边（标正确答案 / 被讨论的牌）
 *   --h <像素>   显示高度，默认 64（SVG 矢量，预览可放大）
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { skinDefs, shell, tileFace } from "./tile-skin";

const args = process.argv.slice(2);
let out = "";
let handStr = "";
let mark = "";
let dispH = 64;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "-o") out = args[++i];
  else if (args[i] === "--mark") mark = args[++i];
  else if (args[i] === "--h") dispH = Number(args[++i]);
  else if (!handStr) handStr = args[i];
}

if (!out || !handStr) {
  console.error('用法: npx tsx content/build/hand-svg.ts -o <输出.svg> "1m 2m 3m …" [--mark 5s] [--h 64]');
  process.exit(2);
}

const hand = handStr.trim().split(/\s+/);
const GAP = 12;
const STEP = 120 + GAP;
const totalW = hand.length * STEP - GAP;

const tiles = hand
  .map((kind, i) => {
    const x = i * STEP;
    const hi = kind === mark
      ? `\n<rect x="4" y="4" width="112" height="172" rx="15" fill="none" stroke="#d97706" stroke-width="5"/>`
      : "";
    return `<g transform="translate(${x},0)">${shell()}
${tileFace(kind)}${hi}</g>`;
  })
  .join("\n");

const dispW = Math.round((dispH / 180) * totalW);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} 180" width="${dispW}" height="${dispH}">
${skinDefs()}
${tiles}
</svg>
`;

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, svg, "utf8");
console.log(`已生成 ${out}（${hand.length} 张，显示 ${dispW}×${dispH}${mark ? `，标记 ${mark}` : ""}）`);
