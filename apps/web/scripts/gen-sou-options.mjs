/**
 * 生成条子（索子）方案选型样张：docs/design/sou-options.html（勿手改，重跑覆盖）。
 * 四案：甲 现行 v0.8（行楷竹+放大幺鸡）/ 乙 原版样张（渐变竹+渐变彩鸟）/
 *       丙 双节竹+正面猫头鹰（classic 皮肤移植）/ 丁 哑光圆棒竹+现行幺鸡（配丁筒气质）。
 * 甲从 docs/design/tile-samples-v0.8.html 原样提取；乙内嵌原版 tile-samples.html 素材；
 * 丙丁共用标准实物排布（2/3 竖排、4 五点、6 上三下三、7 上一下六、8 上四下四、9 三排）。
 *
 * 用法：node apps/web/scripts/gen-sou-options.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

/* ---------- 甲：v0.8 索子原样提取 ---------- */
const v08html = readFileSync(resolve(root, "docs/design/tile-samples-v0.8.html"), "utf8");
const V08_SOU = {};
{
  const re = /<symbol id="s-(\d)s" viewBox="0 0 120 180">([\s\S]*?)<\/symbol>/g;
  let m;
  while ((m = re.exec(v08html)) !== null) V08_SOU[m[1]] = m[2].replace(/<use href="#shell"\s*\/>/g, "").trim();
}
if (Object.keys(V08_SOU).length !== 9) {
  console.error(`✗ v0.8 索子提取不全：${Object.keys(V08_SOU).join(",")}`);
  process.exit(1);
}

/* ---------- 公共壳 ---------- */
const SHELL = `<symbol id="shell" viewBox="0 0 120 180">
  <rect x="5" y="11" width="110" height="164" rx="13" fill="url(#gSide)"/>
  <rect x="5" y="6" width="110" height="165" rx="13" fill="url(#gFace)"/>
  <rect x="5" y="6" width="110" height="165" rx="13" fill="url(#gFaceShade)"/>
  <rect x="6.8" y="8" width="106.4" height="161" rx="11.5" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="1.6"/>
  <rect x="9.5" y="11" width="101" height="156" rx="9.5" fill="none" stroke="rgba(115,98,60,.16)" stroke-width="1"/>
</symbol>`;
const GRAD_BASE = `<linearGradient id="gFace" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#fffdf6"/><stop offset=".55" stop-color="#f5eedb"/><stop offset="1" stop-color="#e7dcc2"/>
</linearGradient>
<linearGradient id="gSide" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#d5cbae"/><stop offset=".45" stop-color="#bfb28f"/><stop offset="1" stop-color="#9a8d6a"/>
</linearGradient>
<linearGradient id="gFaceShade" x1="0" y1="0" x2="1" y2="1">
  <stop offset=".6" stop-color="rgba(95,75,40,0)"/><stop offset="1" stop-color="rgba(95,75,40,.14)"/>
</linearGradient>`;

/* ---------- 乙：原版样张素材（渐变竹 + 渐变彩鸟，verbatim） ---------- */
const B_GRADS = `<linearGradient id="gStkG" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5cb270"/><stop offset="1" stop-color="#1d6233"/></linearGradient>
<linearGradient id="gStkR" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e05a4a"/><stop offset="1" stop-color="#971b14"/></linearGradient>
<linearGradient id="gStkB" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4d72b8"/><stop offset="1" stop-color="#1e3876"/></linearGradient>
<linearGradient id="gBirdBody" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a5796"/><stop offset="1" stop-color="#1a2a55"/></linearGradient>
<radialGradient id="gBirdHead" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#d8503f"/><stop offset="1" stop-color="#a3201a"/></radialGradient>`;
/** 原版渐变竹（13×112，原点左上）——横缩放 sx 适配短棒 */
function stkB(x, y, h, c) {
  const sy = h / 112;
  const g = { g: "gStkG", r: "gStkR", b: "gStkB" }[c];
  return `<g transform="translate(${x},${y}) scale(1,${sy.toFixed(3)})"><rect width="13" height="112" rx="${(5.5 / sy).toFixed(1)}" fill="url(#${g})"/><rect y="50" width="13" height="13" fill="rgba(10,40,18,.30)"/><rect y="48.6" width="13" height="1.6" fill="rgba(255,255,255,.55)"/><rect y="63.8" width="13" height="1.6" fill="rgba(255,255,255,.45)"/><rect x="3.2" y="7" width="2.2" height="98" rx="1.1" fill="rgba(255,255,255,.28)"/></g>`;
}
const BIRD_B = `<path d="M 50 112 C 40 124 35 136 33 149 C 42 143 49 130 55 117 Z" fill="#b23326"/>
<path d="M 70 112 C 80 124 85 136 87 149 C 78 143 71 130 65 117 Z" fill="#b23326"/>
<path d="M 56 110 C 55 127 56 141 60 153 C 64 141 65 127 64 110 Z" fill="#2e7d46"/>
<path d="M 60 116 L 60 146" stroke="#f0e8d0" stroke-width="1.4" opacity=".8"/>
<rect x="38" y="150" width="44" height="6.5" rx="3.2" fill="#1d5c33"/>
<path d="M 53 118 L 51 149 M 67 118 L 69 149" stroke="#7a5a2e" stroke-width="2" stroke-linecap="round"/>
<ellipse cx="60" cy="93" rx="21" ry="28" fill="url(#gBirdBody)"/>
<ellipse cx="57" cy="101" rx="11.5" ry="15" fill="#efe6cd" opacity=".92"/>
<path d="M 50 82 Q 68 85 73 100 Q 59 98 50 90 Z" fill="#2e7d46"/>
<path d="M 49 92 Q 66 96 71 111 Q 57 108 48 99 Z" fill="#256b3b"/>
<path d="M 55 86 Q 65 89 69 98 M 54 96 Q 63 99 67 108" stroke="#cfe3c8" stroke-width="1" fill="none" opacity=".65"/>
<path d="M 62 66 Q 60 74 58 80 L 70 78 Q 68 70 66 64 Z" fill="#b8382c"/>
<circle cx="68" cy="57" r="11.5" fill="url(#gBirdHead)"/>
<path d="M 63 47 Q 59 41 54 43 M 66 46 Q 64 39 59 38" stroke="#c8412f" stroke-width="2.2" fill="none" stroke-linecap="round"/>
<path d="M 78.5 54.5 L 89 58 L 78.5 61.5 Z" fill="#e2a23e"/>
<circle cx="70.5" cy="54.5" r="2.7" fill="#fdf7ea"/>
<circle cx="71.2" cy="54.8" r="1.3" fill="#241408"/>`;

/* ---------- 丙：classic 皮肤移植（双节竹 + 正面猫头鹰） ---------- */
function stkC(x, y, h, red) {
  const col = red ? "#c8402f" : "#3a8a4d";
  return `<g><rect x="${x}" y="${y}" width="13" height="${h}" rx="6" fill="${col}" stroke="rgba(18,34,20,.25)" stroke-width="1"/><rect x="${x}" y="${(y + h * 0.3).toFixed(1)}" width="13" height="7" fill="rgba(0,0,0,.16)"/><rect x="${x}" y="${(y + h * 0.62).toFixed(1)}" width="13" height="7" fill="rgba(0,0,0,.16)"/><rect x="${x + 2.5}" y="${y + 3}" width="2.2" height="${Math.max(4, h - 6)}" rx="1.1" fill="rgba(255,255,255,.28)"/></g>`;
}
const BIRD_C = `<path d="M44 44 L50 30 L55 42 Z" fill="#3a8a4d" stroke="rgba(18,34,20,.25)" stroke-width="1"/>
<path d="M76 44 L70 30 L65 42 Z" fill="#3a8a4d" stroke="rgba(18,34,20,.25)" stroke-width="1"/>
<circle cx="60" cy="62" r="16" fill="#3a8a4d" stroke="rgba(18,34,20,.25)" stroke-width="1"/>
<ellipse cx="60" cy="104" rx="25" ry="30" fill="#3a8a4d" stroke="rgba(18,34,20,.25)" stroke-width="1"/>
<path d="M38 92 Q30 106 38 122 Q46 110 44 94 Z" fill="#337a44"/>
<path d="M82 92 Q90 106 82 122 Q74 110 76 94 Z" fill="#337a44"/>
<ellipse cx="60" cy="110" rx="14" ry="18" fill="#eef4e6"/>
<circle cx="51.5" cy="60" r="6.4" fill="#fff" stroke="#1f2a3d" stroke-width="1.2"/>
<circle cx="68.5" cy="60" r="6.4" fill="#fff" stroke="#1f2a3d" stroke-width="1.2"/>
<circle cx="52.3" cy="61" r="2.9" fill="#1f2a3d"/>
<circle cx="67.7" cy="61" r="2.9" fill="#1f2a3d"/>
<circle cx="53.3" cy="59.8" r="0.9" fill="#fff"/>
<circle cx="68.7" cy="59.8" r="0.9" fill="#fff"/>
<path d="M60 67 L55 74 L65 74 Z" fill="#d98a2b" stroke="rgba(90,52,10,.3)" stroke-width="0.9"/>
<rect x="44" y="134" width="32" height="5" rx="2.5" fill="#8a6a3a"/>
<rect x="51" y="139" width="3" height="8" fill="#1f2a3d"/>
<rect x="66" y="139" width="3" height="8" fill="#1f2a3d"/>`;

/* ---------- 丁：哑光圆棒竹（配丁筒）+ 现行幺鸡 ---------- */
function stkD(x, y, h, red) {
  const col = red ? "#a83226" : "#2d6b3a";
  const band = red ? "#701a14" : "#1a4a25";
  return `<g><rect x="${x + 1}" y="${y + 2}" width="13" height="${h}" rx="6" fill="rgba(0,0,0,.18)"/><rect x="${x}" y="${y}" width="13" height="${h}" rx="6" fill="${col}"/><rect x="${x}" y="${(y + h * 0.3).toFixed(1)}" width="13" height="4.5" fill="${band}" opacity=".55"/><rect x="${x}" y="${(y + h * 0.62).toFixed(1)}" width="13" height="4.5" fill="${band}" opacity=".55"/><rect x="${x + 2.5}" y="${y + 3.5}" width="2" height="${Math.max(3, h - 7)}" rx="1" fill="#f5f5f0" opacity=".5"/></g>`;
}
const BIRD_D = V08_SOU[1].replace(/<\/?g[^>]*>|<!--[\s\S]*?-->/g, "").trim(); // 现行幺鸡内容（哑光配色本就同丁）

/* ---------- 标准实物排布（乙丙丁共用）：[x, y, h] ---------- */
const LAYOUT = {
  2: [[45.5, 30, 120], [68.5, 30, 120]],
  3: [[29.5, 30, 120], [53.5, 30, 120], [77.5, 30, 120]],
  4: [[40, 30, 58], [67, 30, 58], [40, 92, 58], [67, 92, 58]],
  5: [[40, 30, 58], [67, 30, 58], [53.5, 61, 58], [40, 92, 58], [67, 92, 58]],
  6: [[31, 30, 58], [53.5, 30, 58], [76, 30, 58], [31, 92, 58], [53.5, 92, 58], [76, 92, 58]],
  7: [[53.5, 22, 60], [31, 88, 34], [53.5, 88, 34], [76, 88, 34], [31, 128, 34], [53.5, 128, 34], [76, 128, 34]],
  8: [[26.5, 30, 58], [44.5, 30, 58], [62.5, 30, 58], [80.5, 30, 58], [26.5, 92, 58], [44.5, 92, 58], [62.5, 92, 58], [80.5, 92, 58]],
  9: [[31, 26, 40], [53.5, 26, 40], [76, 26, 40], [31, 70, 40], [53.5, 70, 40], [76, 70, 40], [31, 114, 40], [53.5, 114, 40], [76, 114, 40]],
};
const ROT = ["g", "r", "b"]; // 乙的绿红蓝轮换

function souB(n) {
  if (n === 1) return BIRD_B;
  return LAYOUT[n].map(([x, y, h], i) => stkB(x, y, h, ROT[i % 3])).join("");
}
function souC(n) {
  if (n === 1) return BIRD_C;
  return LAYOUT[n].map(([x, y, h], i) => stkC(x, y, h, n === 5 && i === 2)).join("");
}
function souD(n) {
  if (n === 1) return BIRD_D;
  return LAYOUT[n].map(([x, y, h], i) => stkD(x, y, h, n === 5 && i === 2)).join("");
}
function souA(n) {
  return V08_SOU[n];
}

/* ---------- 组装 ---------- */
const OPTIONS = [
  { key: "a", name: "甲 · 现行 v0.8", tag: "行楷书法竹 + 放大幺鸡（现用，基准）", desc: "App 当前这一套：#005529 行楷路径竹、一索为放大 1.35 倍斜向幺鸡。", sou: souA, grads: "" },
  { key: "b", name: "乙 · 原版样张", tag: "渐变竹（绿红蓝轮换）+ 渐变彩鸟，最华丽", desc: "最早样张的索子：渐变圆角竹、绿红蓝轮换、中带白线；一索红头青身彩鸟带羽纹和栖枝。", sou: souB, grads: B_GRADS },
  { key: "c", name: "丙 · 双节竹 + 猫头鹰", tag: "classic 皮肤移植：圆角双节棒 + 正面猫头鹰", desc: "圆角棒双竹节 + 侧高光，全绿五索中段朱红；一索为正面小猫头鹰（耳羽、大眼、栖枝）。", sou: souC, grads: "" },
  { key: "d", name: "丁 · 哑光圆棒竹", tag: "配丁筒同气质：暗绿平色 + 米白高光 + 轻投影", desc: "哑光圆角棒（暗绿 #2d6b3a、节环暗色、米白高光丝），五索中段暗红；一索沿用现行幺鸡（配色本就同为暗哑色系）。", sou: souD, grads: "" },
];

const symbols = OPTIONS.flatMap((o) =>
  [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<symbol id="${o.key}-${n}s" viewBox="0 0 120 180"><use href="#shell"/>${o.sou(n)}</symbol>`)
).join("\n");

const row = (key, w, cls) => {
  const items = [1, 2, 3, 4, 5, 6, 7, 8, 9]
    .map((n) => `<figure><svg${cls} width="${w}" height="${Math.round(w * 1.5)}" viewBox="0 0 120 180"><use href="#${key}-${n}s"/></svg>${cls ? "" : `<figcaption class="cap">${n}s</figcaption>`}</figure>`)
    .join("\n");
  return `<div class="row${cls ? " small" : ""}">\n${items}\n</div>`;
};

const sections = OPTIONS.map(
  (o) => `<section>
  <h2>${o.name} <span class="tag">${o.tag}</span></h2>
  <p class="desc">${o.desc}</p>
${row(o.key, 84, "")}
${row(o.key, 24, "small")}
</section>`
).join("\n");

const html = `<!doctype html>
<html lang="zh">
<head>
<meta charset="utf-8">
<title>条子方案选型 · 四案对比（2026-09-02）</title>
<style>
  body { font-family: -apple-system,"PingFang SC","Helvetica Neue",sans-serif; background:#efece3; color:#3a352c; margin:0; padding:36px 44px; }
  h1 { font-size:20px; margin:0 0 4px; }
  .sub { color:#8a8374; font-size:13px; margin:0 0 6px; }
  .note { background:#f5f0e2; border:1px solid #e0d8c0; border-radius:8px; padding:12px 18px; margin:16px 0 30px; font-size:13px; line-height:1.9; color:#5a5346; }
  section { margin-bottom:44px; }
  h2 { font-size:15px; font-weight:600; color:#5a5346; margin:0 0 4px; display:flex; align-items:center; gap:8px; border-left:3px solid #b8a87a; padding-left:10px; }
  h2 .tag { font-weight:400; color:#9b9484; font-size:12px; }
  .desc { font-size:12.5px; color:#7b7466; margin:0 0 14px 21px; line-height:1.8; }
  .row { display:flex; align-items:flex-end; gap:12px; flex-wrap:wrap; }
  .row.small { gap:5px; margin-top:10px; }
  figure { margin:0; display:flex; flex-direction:column; align-items:center; }
  .cap { font-size:11px; color:#7b7466; margin-top:6px; letter-spacing:1px; }
  .t84 { filter: drop-shadow(0 4px 6px rgba(45,36,15,.35)); }
  footer { font-size:12px; color:#a09a8b; border-top:1px solid #ddd8c8; padding-top:14px; line-height:1.8; }
</style>
</head>
<body>

<h1>条子方案选型</h1>
<p class="sub">四案对比 · 2026-09-02 · 每案 1s–9s + 24px 小尺寸行（讲解表格里的实际观感）</p>

<div class="note">
  <b>怎么选：</b>看大图挑风格，再看下方 24px 小图确认做题时不糊。回复「甲/乙/丙/丁」即可，只换条子（含一索），万/筒不动。<br>
  乙丙丁共用标准实物排布（2/3 竖排、4 五点、5 二一中二、6 上三下三、7 上一下六、8 上四下四、9 三排）；甲为 v0.8 原样排布。
</div>

${sections}

<footer>
  本文件由 apps/web/scripts/gen-sou-options.mjs 生成（勿手改，重跑覆盖）。壳体与万/筒（丁案）均为定稿，本页只比条子。<br>
  素材出自仓库样张与皮肤代码（tile-samples.html / v0.8 / classic.tsx）及新设计，全部自绘原创。
</footer>

<svg width="0" height="0" style="position:absolute" aria-hidden="true">
<defs>
${GRAD_BASE}
${SHELL}
${OPTIONS.filter((o) => o.grads).map((o) => o.grads).join("\n")}
${symbols}
</defs>
</svg>

</body>
</html>
`;

const target = resolve(root, "docs/design/sou-options.html");
writeFileSync(target, html, "utf8");
console.log(`✓ 生成 ${OPTIONS.length} 案 × 9 张 → ${target}（${(html.length / 1024).toFixed(1)} KiB）`);
