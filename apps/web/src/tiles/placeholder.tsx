/**
 * 占位皮肤（开发期默认，2026-09-02 组合定稿）：
 * - 万/条：v0.8 定稿素材（行楷萬子 + 放大一索），由 scripts/extract-v08-tiles.mjs 从
 *   同目录 tile-samples-v0.8.html 生成到 v08-faces.ts，此处仅渲染；
 * - 饼：丁案「暗沉哑光」（v0.8 画风）+ 实物排布修正（三筒斜排、七筒上斜下四
 *   不重叠、九筒 3×3 小饼），2026-09-02 用户五案选型定案；
 * - 字牌：明朝体文字。
 * 正式牌面美术由用户自筹（requirements.md 2026-08-31 定案），接入时替换本注册项即可。
 */

import type { ReactNode } from "react";
import { registerSkin } from "./skin";
import { V08_FACES } from "./v08-faces";

const C = { G: "#2e8b4a", R: "#c23a2b", B: "#2f4f9e", ink: "#1c2c54" } as const;
const MINCHO = '"Hiragino Mincho ProN","Yu Mincho","Songti SC","Noto Serif CJK SC",serif';

/** 饼（丁案·暗沉哑光）：暗色环 + 米白隔环 + 暗芯，轻投影无高光（2026-09-02 定稿） */
const PIN_C: Record<string, [string, string]> = {
  g: ["#2d6b3a", "#1a4a25"],
  r: ["#a83226", "#701a14"],
  b: ["#2a2a2a", "#111111"],
};
function pin(x: number, y: number, r: number, c: "g" | "r" | "b"): ReactNode {
  const [col, core] = PIN_C[c];
  return (
    <g key={`${x}-${y}-${c}`}>
      <circle cx={x + 1} cy={y + 2} r={r} fill="rgba(0,0,0,.18)" />
      <circle cx={x} cy={y} r={r} fill={col} />
      <circle cx={x} cy={y} r={r * 0.794} fill="#f5f5f0" />
      <circle cx={x} cy={y} r={r * 0.588} fill={col} />
      <circle cx={x} cy={y} r={r * 0.353} fill="#f5f5f0" />
      <circle cx={x} cy={y} r={r * 0.206} fill={core} />
    </g>
  );
}

/** 饼布局 [x,y,色,r]：实物排布（3p 斜排全绿；7p 上三斜排 + 下四 2×2，r15 防重叠；9p 3×3 小饼 r14） */
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

const HONORS: Record<string, [string | null, string | null]> = {
  E: ["東", C.ink], S: ["南", C.ink], W: ["西", C.ink], N: ["北", C.ink],
  h: [null, null], f: ["發", C.G], c: ["中", C.R],
};

function content(kind: string): ReactNode {
  const suit = kind[1];
  // 万/条：v0.8 定稿素材（含壳体内的绝对坐标，直接内联渲染）
  if (suit === "m" || suit === "s") {
    const face = V08_FACES[kind];
    if (face) return <g dangerouslySetInnerHTML={{ __html: face }} />;
  }
  const num = Number(kind[0]);
  if (suit === "p") {
    if (num === 1) {
      // 丁案一饼：暗绿大环 + 米白 + 暗红内环（v0.8 一饼原样）
      return (
        <g>
          <circle cx={61} cy={96} r={36} fill="rgba(0,0,0,.15)" />
          <circle cx={60} cy={94} r={36} fill="#2d6b3a" />
          <circle cx={60} cy={94} r={29} fill="#f5f5f0" />
          <circle cx={60} cy={94} r={22} fill="#a83226" />
          <circle cx={60} cy={94} r={15} fill="#f5f5f0" />
          <circle cx={60} cy={94} r={10} fill="#a83226" />
          <circle cx={60} cy={94} r={5} fill="#701a14" />
        </g>
      );
    }
    return <>{PIN_LAYOUTS[num].map(([x, y, c, r]) => pin(x, y, r, c))}</>;
  }
  const [ch, col] = HONORS[kind] ?? [null, null];
  if (!ch || !col) {
    return <rect x={32} y={36} width={56} height={108} rx={7} fill="none" stroke="#93b1c9" strokeWidth={6} />;
  }
  return (
    <g fontFamily={MINCHO} textAnchor="middle" fontWeight={600}>
      <text x={61} y={122} fontSize={86} fill="rgba(255,255,255,.8)">{ch}</text>
      <text x={60} y={121} fontSize={86} fill={col}>{ch}</text>
    </g>
  );
}

registerSkin({
  name: "placeholder",
  shell: (
    <>
      <rect x={5} y={11} width={110} height={164} rx={13} fill="url(#nk-gSide)" />
      <rect x={5} y={6} width={110} height={165} rx={13} fill="url(#nk-gFace)" />
      <rect x={6.8} y={8} width={106.4} height={161} rx={11.5} fill="none" stroke="rgba(255,255,255,.6)" strokeWidth={1.6} />
      <rect x={9.5} y={11} width={101} height={156} rx={9.5} fill="none" stroke="rgba(115,98,60,.16)" strokeWidth={1} />
    </>
  ),
  content,
});
