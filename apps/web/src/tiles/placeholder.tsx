/**
 * 占位皮肤（开发期默认，2026-09-02 组合定稿）：
 * - 万/条：v0.8 定稿素材（行楷萬子 + 放大一索），由 extract-v08-tiles.mjs 从
 *   docs/design/tile-samples-v0.8.html 生成到 v08-faces.ts，此处仅渲染；
 * - 饼：当日重绘的「外环 + 白隔圈 + 红心」同心圆纹；
 * - 字牌：明朝体文字。
 * 正式牌面美术由用户自筹（web-v1.md 2026-08-31 定案），接入时替换本注册项即可。
 */

import type { ReactNode } from "react";
import { registerSkin } from "./skin";
import { V08_FACES } from "./v08-faces";

const C = { G: "#2e8b4a", R: "#c23a2b", B: "#2f4f9e", ink: "#1c2c54" } as const;
const MINCHO = '"Hiragino Mincho ProN","Yu Mincho","Songti SC","Noto Serif CJK SC",serif';

/** 饼（2026-09-02 重绘）：「外环 + 白隔圈 + 红心」同心圆纹，双色统一，向实物饼牌看齐 */
function pin(x: number, y: number, r: number, col: string = C.B): ReactNode {
  return (
    <g key={`${x}-${y}-${r}`}>
      <circle cx={x} cy={y} r={r} fill={col} stroke="rgba(22,28,48,.3)" strokeWidth={Math.max(1.4, r * 0.09)} />
      <circle cx={x} cy={y} r={r * 0.66} fill="#f7f1de" />
      <circle cx={x} cy={y} r={r * 0.46} fill={C.R} />
      <circle cx={x - r * 0.18} cy={y - r * 0.22} r={r * 0.12} fill="rgba(255,255,255,.45)" />
    </g>
  );
}

/** 饼：圆点布局 [x,y,r]（颜色统一：靛蓝外环 + 红心） */
const PIN_LAYOUTS: Record<number, [number, number, number][]> = {
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
  if (suit === "p") return <>{PIN_LAYOUTS[num].map(([x, y, r]) => pin(x, y, r))}</>;
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
