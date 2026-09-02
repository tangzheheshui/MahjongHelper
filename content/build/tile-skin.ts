/**
 * 牌面皮肤（文档图生成用）：34 种牌的纯 SVG 字符串绘制。
 * 与 App 占位皮肤保持同步（2026-09-02 定稿）：
 * - 万/条：直接复用 apps/web/src/tiles/v08-faces.ts（v0.8 行楷萬/索定稿素材，单一数据源）；
 * - 筒：丁案「暗沉哑光」+ 实物排布（3p 斜排、7p 上斜下四、9p 3×3 小饼），
 *   几何与 apps/web/src/tiles/placeholder.tsx 逐数对齐——改排布时两处同改；
 * - 字牌：明朝体，白板蓝框。
 *
 * 换牌面 = 只改本文件 + App 侧皮肤文件（CLAUDE.md 版权红线：牌面一律自绘，不描摹商业游戏资产）。
 * 重新生成全部文档图：跑 content/build/gen-book-svg.mjs（理论书 28 例清单的落地脚本）。
 */

import { V08_FACES } from "../../apps/web/src/tiles/v08-faces";

const C = { G: "#2e8b4a", R: "#c23a2b", B: "#2f4f9e", ink: "#1c2c54" } as const;
const MINCHO =
  '"Hiragino Mincho ProN","Yu Mincho","Songti SC","Noto Serif CJK SC",serif';

/** 全局 defs（渐变），每个生成的 SVG 文件内嵌一份 */
export function skinDefs(): string {
  return `<defs>
<linearGradient id="nk-gFace" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#fffdf6"/><stop offset=".55" stop-color="#f5eedb"/><stop offset="1" stop-color="#e7dcc2"/>
</linearGradient>
<linearGradient id="nk-gSide" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#d5cbae"/><stop offset=".45" stop-color="#bfb28f"/><stop offset="1" stop-color="#9a8d6a"/>
</linearGradient>
</defs>`;
}

/** 牌体壳（120×180 viewBox 内） */
export function shell(): string {
  return `<rect x="5" y="11" width="110" height="164" rx="13" fill="url(#nk-gSide)"/>
<rect x="5" y="6" width="110" height="165" rx="13" fill="url(#nk-gFace)"/>
<rect x="6.8" y="8" width="106.4" height="161" rx="11.5" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="1.6"/>
<rect x="9.5" y="11" width="101" height="156" rx="9.5" fill="none" stroke="rgba(115,98,60,.16)" stroke-width="1"/>`;
}

/** 筒（丁案·暗沉哑光）：暗色环 + 米白隔环 + 暗芯，轻投影无高光 */
const PIN_C: Record<string, [string, string]> = {
  g: ["#2d6b3a", "#1a4a25"],
  r: ["#a83226", "#701a14"],
  b: ["#2a2a2a", "#111111"],
};
function pin(x: number, y: number, r: number, c: "g" | "r" | "b"): string {
  const [col, core] = PIN_C[c];
  return `<circle cx="${x + 1}" cy="${y + 2}" r="${r}" fill="rgba(0,0,0,.18)"/>
<circle cx="${x}" cy="${y}" r="${r}" fill="${col}"/>
<circle cx="${x}" cy="${y}" r="${(r * 0.794).toFixed(1)}" fill="#f5f5f0"/>
<circle cx="${x}" cy="${y}" r="${(r * 0.588).toFixed(1)}" fill="${col}"/>
<circle cx="${x}" cy="${y}" r="${(r * 0.353).toFixed(1)}" fill="#f5f5f0"/>
<circle cx="${x}" cy="${y}" r="${(r * 0.206).toFixed(1)}" fill="${core}"/>`;
}

/** 筒布局 [x,y,色,r]：实物排布（与 placeholder.tsx 对齐） */
const PIN_LAYOUTS: Record<number, [number, number, "g" | "r" | "b", number][]> = {
  2: [[60, 60, "g", 17], [60, 128, "g", 17]],
  3: [[42, 48, "g", 17], [60, 94, "g", 17], [78, 140, "g", 17]],
  4: [[38, 60, "g", 17], [82, 60, "b", 17], [38, 128, "b", 17], [82, 128, "g", 17]],
  5: [[38, 56, "g", 17], [82, 56, "b", 17], [60, 94, "r", 17], [38, 132, "b", 17], [82, 132, "g", 17]],
  6: [[38, 50, "g", 17], [82, 50, "g", 17], [38, 94, "r", 17], [82, 94, "r", 17], [38, 138, "r", 17], [82, 138, "r", 17]],
  7: [[42, 34, "g", 15], [60, 58, "g", 15], [78, 82, "g", 15], [40, 114, "r", 15], [80, 114, "r", 15], [40, 146, "r", 15], [80, 146, "r", 15]],
  8: [[38, 42, "b", 17], [82, 42, "b", 17], [38, 76, "b", 17], [82, 76, "b", 17], [38, 110, "b", 17], [82, 110, "b", 17], [38, 144, "b", 17], [82, 144, "b", 17]],
  9: [[32, 44, "b", 14], [60, 44, "b", 14], [88, 44, "b", 14], [32, 94, "r", 14], [60, 94, "r", 14], [88, 94, "r", 14], [32, 144, "g", 14], [60, 144, "g", 14], [88, 144, "g", 14]],
};

/** 一筒（丁案）：暗绿大环 + 米白 + 暗红内环（v0.8 一饼原样） */
function pin1(): string {
  return `<circle cx="61" cy="96" r="36" fill="rgba(0,0,0,.15)"/>
<circle cx="60" cy="94" r="36" fill="#2d6b3a"/>
<circle cx="60" cy="94" r="29" fill="#f5f5f0"/>
<circle cx="60" cy="94" r="22" fill="#a83226"/>
<circle cx="60" cy="94" r="15" fill="#f5f5f0"/>
<circle cx="60" cy="94" r="10" fill="#a83226"/>
<circle cx="60" cy="94" r="5" fill="#701a14"/>`;
}

const HONORS: Record<string, [string | null, string | null]> = {
  E: ["東", C.ink], S: ["南", C.ink], W: ["西", C.ink], N: ["北", C.ink],
  h: [null, null], f: ["發", C.G], c: ["中", C.R],
};

/** 牌面内容（120×180 viewBox 内），kind 如 "3m" / "7p" / "E" */
export function tileFace(kind: string): string {
  const suit = kind[1];
  const num = Number(kind[0]);
  // 万/条：v0.8 定稿素材（绝对坐标 SVG，直接内联）
  if (suit === "m" || suit === "s") {
    const face = V08_FACES[kind];
    if (face) return face;
  }
  if (suit === "p") {
    if (num === 1) return pin1();
    return PIN_LAYOUTS[num].map(([x, y, c, r]) => pin(x, y, r, c)).join("\n");
  }
  const [ch, col] = HONORS[kind] ?? [null, null];
  if (!ch || !col) {
    return `<rect x="32" y="36" width="56" height="108" rx="7" fill="none" stroke="#93b1c9" stroke-width="6"/>`;
  }
  return `<g font-family='${MINCHO}' text-anchor="middle" font-weight="600">
<text x="61" y="122" font-size="86" fill="rgba(255,255,255,.8)">${ch}</text>
<text x="60" y="121" font-size="86" fill="${col}">${ch}</text>
</g>`;
}
