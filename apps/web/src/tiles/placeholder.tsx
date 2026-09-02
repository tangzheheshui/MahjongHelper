/**
 * 占位皮肤（开发期）：docs/demo/what-to-discard.html 的程序化牌面移植。
 * 正式牌面美术由用户自筹（web-v1.md 2026-08-31 定案），接入时替换本注册项即可。
 */

import type { ReactNode } from "react";
import { registerSkin } from "./skin";

const C = { G: "#2e8b4a", R: "#c23a2b", B: "#2f4f9e", ink: "#1c2c54" } as const;
const MINCHO = '"Hiragino Mincho ProN","Yu Mincho","Songti SC","Noto Serif CJK SC",serif';

function pin(x: number, y: number, r: number, col: string): ReactNode {
  return (
    <g key={`${x}-${y}-${r}`}>
      <circle cx={x} cy={y} r={r} fill={col} stroke="rgba(0,0,0,.25)" />
      <circle cx={x + r * 0.28} cy={y - r * 0.3} r={r * 0.24} fill="rgba(255,255,255,.35)" />
    </g>
  );
}

function stick(x: number, y: number, h: number, col: string): ReactNode {
  return (
    <g key={`s-${x}-${y}`}>
      <rect x={x} y={y} width={13} height={h} rx={5.5} fill={col} stroke="rgba(0,0,0,.2)" />
      <rect x={x} y={y + h / 2 - 6} width={13} height={12} fill="rgba(0,0,0,.18)" />
      <rect x={x + 2.5} y={y + 4} width={2} height={h - 8} rx={1} fill="rgba(255,255,255,.3)" />
    </g>
  );
}

function manGlyph(numChar: string): ReactNode {
  return (
    <g fontFamily={MINCHO} textAnchor="middle" fontWeight={600}>
      <text x={60.8} y={52} fontSize={34} fill="rgba(255,255,255,.85)">{numChar}</text>
      <text x={60} y={51} fontSize={34} fill={C.ink}>{numChar}</text>
      <text x={60.9} y={146} fontSize={70} fill="rgba(255,255,255,.8)">萬</text>
      <text x={60} y={145} fontSize={70} fill="#bc3226">萬</text>
    </g>
  );
}

/** 饼：每张牌的圆点布局 [x,y,r,色] */
const PIN_LAYOUTS: Record<number, [number, number, number, string][]> = {
  1: [[60, 94, 38, C.B], [60, 94, 22, "#f4eed9"], [60, 94, 14, C.R]],
  2: [[60, 54, 28, C.G], [60, 134, 28, C.R]],
  3: [[42, 50, 24, C.B], [60, 94, 24, C.R], [78, 138, 24, C.B]],
  4: [[42, 58, 24, C.B], [78, 58, 24, C.B], [42, 130, 24, C.G], [78, 130, 24, C.G]],
  5: [[40, 56, 22, C.G], [80, 56, 22, C.G], [60, 94, 24, C.R], [40, 132, 22, C.G], [80, 132, 22, C.G]],
  6: [[44, 52, 18, C.G], [76, 52, 18, C.G], [44, 94, 18, C.G], [76, 94, 18, C.G], [44, 136, 18, C.G], [76, 136, 18, C.G]],
  7: [[42, 44, 17, C.G], [60, 40, 17, C.G], [78, 44, 17, C.G], [40, 102, 17, C.R], [80, 102, 17, C.R], [40, 140, 17, C.R], [80, 140, 17, C.R]],
  8: [[34, 56, 12, C.B], [57, 56, 12, C.B], [80, 56, 12, C.B], [103, 56, 12, C.B], [34, 132, 12, C.B], [57, 132, 12, C.B], [80, 132, 12, C.B], [103, 132, 12, C.B]],
  9: [[40, 46, 14, C.G], [60, 46, 14, C.G], [80, 46, 14, C.G], [40, 94, 14, C.R], [60, 94, 14, C.R], [80, 94, 14, C.R], [40, 142, 14, C.B], [60, 142, 14, C.B], [80, 142, 14, C.B]],
};

/** 索：棒布局 [x,y,h]，色按索引轮换 绿红蓝 */
const SOU_LAYOUTS: Record<number, [number, number, number][]> = {
  2: [[53, 30, 120], [73, 30, 120]],
  3: [[42, 30, 120], [60, 30, 120], [78, 30, 120]],
  4: [[40, 30, 58], [79, 30, 58], [40, 92, 58], [79, 92, 58]],
  5: [[40, 30, 58], [79, 30, 58], [60, 61, 58], [40, 92, 58], [79, 92, 58]],
  6: [[36, 30, 58], [60, 30, 58], [84, 30, 58], [36, 92, 58], [60, 92, 58], [84, 92, 58]],
  7: [[36, 26, 46], [60, 22, 46], [84, 26, 46], [40, 84, 46], [58, 96, 46], [76, 108, 46], [94, 120, 46]],
  8: [[33, 30, 58], [57, 30, 58], [81, 30, 58], [105, 30, 58], [33, 92, 58], [57, 92, 58], [81, 92, 58], [105, 92, 58]],
  9: [[40, 30, 40], [69, 30, 40], [98, 30, 40], [40, 82, 40], [69, 82, 40], [98, 82, 40], [40, 134, 40], [69, 134, 40], [98, 134, 40]],
};

const HONORS: Record<string, [string | null, string | null]> = {
  E: ["東", C.ink], S: ["南", C.ink], W: ["西", C.ink], N: ["北", C.ink],
  h: [null, null], f: ["發", C.G], c: ["中", C.R],
};

function content(kind: string): ReactNode {
  const suit = kind[1];
  const num = Number(kind[0]);
  if (suit === "m") return manGlyph("一二三四五六七八九"[num - 1]);
  if (suit === "p") return <>{PIN_LAYOUTS[num].map(([x, y, r, col]) => pin(x, y, r, col))}</>;
  if (suit === "s") {
    if (num === 1) {
      return (
        <g>
          {pin(60, 66, 16, C.R)}{pin(48, 88, 14, C.B)}{pin(72, 88, 14, C.B)}
          {pin(56, 110, 14, C.G)}{pin(66, 116, 13, C.G)}{pin(46, 116, 13, C.G)}
          {stick(53, 132, 30, C.G)}
        </g>
      );
    }
    const cols = [C.G, C.R, C.B];
    return <>{SOU_LAYOUTS[num].map(([x, y, h], i) => stick(x, y, h, cols[i % 3]))}</>;
  }
  const [ch, col] = HONORS[kind] ?? [null, null];
  if (!ch || !col) {
    return <rect x={32} y={36} width={56} height={108} rx={7} fill="none" stroke="rgba(72,94,146,.25)" strokeWidth={2.2} />;
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
