/**
 * 生成筒子方案选型样张：docs/design/pin-options.html（勿手改，重跑本脚本覆盖）。
 * 五案：甲 铜钱菊纹（原版）/ 乙 平色宽环（v0.6）/ 丙 立体高光（v0.7）/
 *       丁 暗沉哑光（v0.8 样张原样）/ 戊 现行 App 版（对照基准）。
 * 甲–丁共用 v0.8 的排布与配色编排；戊用 App 现行布局与统一蓝红配色。
 *
 * 用法：node apps/web/scripts/gen-pin-options.mjs
 */

import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

/* ---------- 公共：壳（与 v0.8 / App 一致） ---------- */
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

/* ---------- 排布与配色编排（甲乙丙丁共用，2026-09-02 按实物修正）：[x, y, 色, r] ----------
 * 修正点：3p 斜排（实物为左上→右下对角线，全绿）；7p 上三斜排 + 下四 2×2，r 缩到 15
 * 消除重叠；9p 3×3 用小饼 r14（列距 28=2r 相切，不出内框）。其余沿用 v0.8。 */
const LAYOUT = {
  2: [[60, 60, "g", 17], [60, 128, "g", 17]],
  3: [[42, 48, "g", 17], [60, 94, "g", 17], [78, 140, "g", 17]],
  4: [[38, 60, "g", 17], [82, 60, "b", 17], [38, 128, "b", 17], [82, 128, "g", 17]],
  5: [[38, 56, "g", 17], [82, 56, "b", 17], [60, 94, "r", 17], [38, 132, "b", 17], [82, 132, "g", 17]],
  6: [[38, 50, "g", 17], [82, 50, "g", 17], [38, 94, "r", 17], [82, 94, "r", 17], [38, 138, "r", 17], [82, 138, "r", 17]],
  7: [[42, 34, "g", 15], [60, 58, "g", 15], [78, 82, "g", 15], [40, 114, "r", 15], [80, 114, "r", 15], [40, 146, "r", 15], [80, 146, "r", 15]],
  8: [[38, 42, "b", 17], [82, 42, "b", 17], [38, 76, "b", 17], [82, 76, "b", 17], [38, 110, "b", 17], [82, 110, "b", 17], [38, 144, "b", 17], [82, 144, "b", 17]],
  9: [[32, 44, "b", 14], [60, 44, "b", 14], [88, 44, "b", 14], [32, 94, "r", 14], [60, 94, "r", 14], [88, 94, "r", 14], [32, 144, "g", 14], [60, 144, "g", 14], [88, 144, "g", 14]],
};

/* ---------- App 现行布局（戊）：[x, y, r] ---------- */
const APP = {
  1: [[60, 94, 40]],
  2: [[60, 52, 27], [60, 136, 27]],
  3: [[42, 50, 24], [60, 94, 24], [78, 138, 24]],
  4: [[41, 58, 24], [79, 58, 24], [41, 132, 24], [79, 132, 24]],
  5: [[40, 54, 22], [80, 54, 22], [60, 94, 25], [40, 134, 22], [80, 134, 22]],
  6: [[44, 52, 18], [76, 52, 18], [44, 94, 18], [76, 94, 18], [44, 136, 18], [76, 136, 18]],
  7: [[42, 44, 17], [60, 40, 17], [78, 44, 17], [40, 102, 17], [80, 102, 17], [40, 140, 17], [80, 140, 17]],
  8: [[34, 56, 12], [57, 56, 12], [80, 56, 12], [103, 56, 12], [34, 132, 12], [57, 132, 12], [80, 132, 12], [103, 132, 12]],
  9: [[40, 46, 14], [60, 46, 14], [80, 46, 14], [40, 94, 14], [60, 94, 14], [80, 94, 14], [40, 142, 14], [60, 142, 14], [80, 142, 14]],
};

const PETAL = `<path id="apetal" d="M 0 -4.4 C 2.3 -6.4 2.5 -9.8 0 -12.3 C -2.5 -9.8 -2.3 -6.4 0 -4.4 Z"/>
<path id="apetalL" d="M 0 -9 C 4.8 -13.5 5.2 -20.5 0 -25.5 C -5.2 -20.5 -4.8 -13.5 0 -9 Z"/>`;

/* ---------- 甲 · 铜钱菊纹（原版 tile-samples.html） ---------- */
const A_GRADS = ["g", "r", "b"]
  .flatMap((c) => {
    const hi = { g: ["#4aa35e", "#1c6b33", "#37914c", "#145220"], r: ["#e05a4b", "#9c1d16", "#cd4234", "#7f150f"], b: ["#4665ab", "#1c2f66", "#33549b", "#16264f"] }[c];
    const ring = { g: "15,40,20", r: "60,10,5", b: "12,22,58" }[c];
    return [
      `<radialGradient id="ag${c}" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="${hi[0]}"/><stop offset="1" stop-color="${hi[1]}"/></radialGradient>`,
      `<radialGradient id="ag${c}2" cx=".4" cy=".35" r=".85"><stop offset="0" stop-color="${hi[2]}"/><stop offset="1" stop-color="${hi[3]}"/></radialGradient>`,
      `<g id="a-p${c}"><circle r="17.5" fill="url(#ag${c})"/><circle r="17.5" fill="none" stroke="rgba(${ring},.4)" stroke-width="1"/><circle r="13.2" fill="#f4eed9"/><circle r="13.2" fill="none" stroke="rgba(${ring},.14)" stroke-width=".8"/><g fill="url(#ag${c}2)">${[45, 90, 135, 180, 225, 270, 315].map((d) => `<use href="#apetal" transform="rotate(${d})"/>`).join("")}<use href="#apetal"/></g><circle r="4.6" fill="#f4eed9"/><circle r="2.6" fill="url(#ag${c})"/></g>`,
    ];
  })
  .join("\n");
function pinA(n) {
  if (n === 1)
    return `<circle cx="60" cy="94" r="36" fill="url(#agb)"/><circle cx="60" cy="94" r="36" fill="none" stroke="rgba(12,22,58,.4)" stroke-width="1.2"/><circle cx="60" cy="94" r="27.5" fill="#f4eed9"/><circle cx="60" cy="94" r="27.5" fill="none" stroke="rgba(12,22,58,.14)" stroke-width=".8"/><g fill="url(#agb2)" transform="translate(60,94)">${[36, 72, 108, 144, 180, 216, 252, 288, 324].map((d) => `<use href="#apetalL" transform="rotate(${d})"/>`).join("")}<use href="#apetalL"/></g><circle cx="60" cy="94" r="9.5" fill="#f4eed9"/><circle cx="60" cy="94" r="6" fill="url(#agr)"/><circle cx="58.2" cy="92.2" r="1.8" fill="rgba(255,255,255,.5)"/>`;
  return LAYOUT[n].map(([x, y, c, r]) => `<use href="#a-p${c}" transform="translate(${x},${y}) scale(${(r / 17.5).toFixed(3)})"/>`).join("");
}

/* ---------- 乙 · 平色宽环（v0.6） ---------- */
const B_COL = { g: ["#2e7d3e", "#1a5a2a"], r: ["#c83030", "#8a1a1a"], b: ["#2a2a2a", "#111111"] };
function pinB(n) {
  if (n === 1) {
    const [c, d] = B_COL.b;
    return `<circle cx="60" cy="94" r="36" fill="${c}"/><circle cx="60" cy="94" r="28.5" fill="#ffffff"/><circle cx="60" cy="94" r="21" fill="${c}"/><circle cx="60" cy="94" r="12.6" fill="#ffffff"/><circle cx="60" cy="94" r="7" fill="${B_COL.r[0]}"/><circle cx="60" cy="94" r="3.6" fill="${d}"/>`;
  }
  return LAYOUT[n].map(([x, y, c, r]) => `<g transform="translate(${x},${y})"><circle r="${r}" fill="${B_COL[c][0]}"/><circle r="${(r * 0.794).toFixed(1)}" fill="#ffffff"/><circle r="${(r * 0.588).toFixed(1)}" fill="${B_COL[c][0]}"/><circle r="${(r * 0.353).toFixed(1)}" fill="#ffffff"/><circle r="${(r * 0.206).toFixed(1)}" fill="${B_COL[c][1]}"/></g>`).join("");
}

/* ---------- 丙 · 立体高光（v0.7） ---------- */
const C_GRADS = [
  `<radialGradient id="cgG" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#4ab85e"/><stop offset="1" stop-color="#1c6b33"/></radialGradient>`,
  `<radialGradient id="cgR" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#e8685a"/><stop offset="1" stop-color="#9c1d16"/></radialGradient>`,
  `<radialGradient id="cgB" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#5a5a5a"/><stop offset="1" stop-color="#1a1a1a"/></radialGradient>`,
].join("\n");
const C_MAP = { g: ["cgG", "#1a5a2a"], r: ["cgR", "#8a1a1a"], b: ["cgB", "#141414"] };
function pinC(n) {
  const one = (x, y, c, r) => {
    const [g, d] = C_MAP[c];
    return `<g transform="translate(${x},${y})"><circle r="${r}" fill="rgba(0,0,0,0.28)" transform="translate(1.5,2.5)"/><circle r="${r}" fill="url(#${g})"/><circle r="${(r * 0.794).toFixed(1)}" fill="#ffffff"/><circle r="${(r * 0.588).toFixed(1)}" fill="url(#${g})"/><circle r="${(r * 0.353).toFixed(1)}" fill="#ffffff"/><circle r="${(r * 0.206).toFixed(1)}" fill="${d}"/><ellipse cx="${(-r * 0.235).toFixed(1)}" cy="${(-r * 0.294).toFixed(1)}" rx="${(r * 0.294).toFixed(1)}" ry="${(r * 0.176).toFixed(1)}" fill="rgba(255,255,255,0.5)"/></g>`;
  };
  if (n === 1) {
    const [g, d] = C_MAP.b;
    return `<circle cx="61.5" cy="96.5" r="36" fill="rgba(0,0,0,0.28)"/><circle cx="60" cy="94" r="36" fill="url(#${g})"/><circle cx="60" cy="94" r="28.5" fill="#ffffff"/><circle cx="60" cy="94" r="21" fill="url(#${g})"/><circle cx="60" cy="94" r="12.6" fill="#ffffff"/><circle cx="60" cy="94" r="7" fill="${B_COL.r[0]}"/><circle cx="60" cy="94" r="3.6" fill="${d}"/><ellipse cx="48" cy="76" rx="11" ry="6.5" fill="rgba(255,255,255,0.5)"/>`;
  }
  return LAYOUT[n].map(([x, y, c, r]) => one(x, y, c, r)).join("");
}

/* ---------- 丁 · 暗沉哑光（v0.8 样张原样） ---------- */
const D_COL = { g: ["#2d6b3a", "#1a4a25"], r: ["#a83226", "#701a14"], b: ["#2a2a2a", "#111111"] };
const D_PRIMS = ["g", "r", "b"]
  .map(
    (c) =>
      `<g id="d-p${c}"><circle r="17" fill="rgba(0,0,0,0.18)" transform="translate(1,2)"/><circle r="17" fill="${D_COL[c][0]}"/><circle r="13.5" fill="#f5f5f0"/><circle r="10" fill="${D_COL[c][0]}"/><circle r="6" fill="#f5f5f0"/><circle r="3.5" fill="${D_COL[c][1]}"/></g>`
  )
  .join("\n");
function pinD(n) {
  if (n === 1)
    return `<circle cx="61" cy="96" r="36" fill="rgba(0,0,0,0.15)"/><circle cx="60" cy="94" r="36" fill="#2d6b3a"/><circle cx="60" cy="94" r="29" fill="#f5f5f0"/><circle cx="60" cy="94" r="22" fill="#a83226"/><circle cx="60" cy="94" r="15" fill="#f5f5f0"/><circle cx="60" cy="94" r="10" fill="#a83226"/><circle cx="60" cy="94" r="5" fill="#701a14"/>`;
  return LAYOUT[n].map(([x, y, c, r]) => `<use href="#d-p${c}" transform="translate(${x},${y}) scale(${(r / 17).toFixed(3)})"/>`).join("");
}

/* ---------- 戊 · 现行 App 版（placeholder.tsx 移植） ---------- */
function pinE(n) {
  const one = (x, y, r) =>
    `<g><circle cx="${x}" cy="${y}" r="${r}" fill="#2f4f9e" stroke="rgba(22,28,48,.3)" stroke-width="${Math.max(1.4, r * 0.09)}"/><circle cx="${x}" cy="${y}" r="${(r * 0.66).toFixed(1)}" fill="#f7f1de"/><circle cx="${x}" cy="${y}" r="${(r * 0.46).toFixed(1)}" fill="#c23a2b"/><circle cx="${(x - r * 0.18).toFixed(1)}" cy="${(y - r * 0.22).toFixed(1)}" r="${(r * 0.12).toFixed(1)}" fill="rgba(255,255,255,.45)"/></g>`;
  return APP[n].map(([x, y, r]) => one(x, y, r)).join("");
}

/* ---------- 组装 ---------- */
const OPTIONS = [
  { key: "a", name: "甲 · 铜钱菊纹", tag: "最早一版：径向渐变环 + 8 花瓣 + 芯点，最华丽", desc: "外环渐变绿/红/蓝黑，象牙环内一圈八瓣菊花纹，中央色芯。1p 为十瓣大菊纹蓝饼红芯。", pin: pinA, grads: A_GRADS + "\n" + PETAL },
  { key: "b", name: "乙 · 平色宽环", tag: "v0.6：纯平色 + 纯白隔环，最干净", desc: "无渐变、无投影、无高光，颜色明快（亮绿/亮红/蓝黑），五层宽环对比强。", pin: pinB, grads: "" },
  { key: "c", name: "丙 · 立体高光", tag: "v0.7：径向渐变 + 投影 + 左上高光，有体积感", desc: "在乙的环结构上加径向渐变、下方投影和左上高光椭圆，最「塑料牌」的立体感。", pin: pinC, grads: C_GRADS },
  { key: "d", name: "丁 · 暗沉哑光", tag: "v0.8 样张原样：暗色 + 米白 + 轻投影，最沉稳", desc: "暗绿/暗红/蓝黑 + 米白隔环，去掉高光只留轻投影，与 v0.8 万/索同一气质。", pin: pinD, grads: D_PRIMS },
  { key: "e", name: "戊 · 现行 App 版", tag: "2026-09-02 线上：统一靛蓝外环 + 红心（对比基准）", desc: "即当前这版，放在这里做对照。排布也与甲–丁不同（较早期布局）。", pin: pinE, grads: "" },
];

const symbols = OPTIONS.flatMap((o) =>
  [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<symbol id="${o.key}-${n}p" viewBox="0 0 120 180"><use href="#shell"/>${o.pin(n)}</symbol>`)
).join("\n");

const row = (key, w, cls) => {
  const items = [1, 2, 3, 4, 5, 6, 7, 8, 9]
    .map((n) => `<figure><svg${cls} width="${w}" height="${Math.round(w * 1.5)}" viewBox="0 0 120 180"><use href="#${key}-${n}p"/></svg>${cls ? "" : `<figcaption class="cap">${n}p</figcaption>`}</figure>`)
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
<title>筒子方案选型 · 五案对比（2026-09-02）</title>
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

<h1>筒子方案选型</h1>
<p class="sub">五案对比 · 2026-09-02 · 每案 1p–9p + 24px 小尺寸行（讲解表格里的实际观感）</p>

<div class="note">
  <b>怎么选：</b>看大图挑风格，再看每案下方 24px 小图确认做题时不糊。回复「甲/乙/丙/丁」即可，只换饼面，万/条（v0.8 定稿）不动。<br>
  甲乙丙丁共用 v0.8 的排布与配色编排（3p 红二绿、9p 黑红绿三段等）；戊是 App 当前版本（统一靛蓝红心），仅作对照。
</div>

${sections}

<footer>
  本文件由 apps/web/scripts/gen-pin-options.mjs 生成（勿手改，重跑覆盖）。壳体/万/条均为 v0.8 定稿，本页只比饼面。<br>
  方案素材均出自仓库历史样张（tile-samples.html / v0.6 / v0.7 / v0.8）与现行 App 代码，全部自绘原创。
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

const target = resolve(root, "docs/design/pin-options.html");
writeFileSync(target, html, "utf8");
console.log(`✓ 生成 ${OPTIONS.length} 案 × 9 张 → ${target}（${(html.length / 1024).toFixed(1)} KiB）`);
