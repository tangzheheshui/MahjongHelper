/**
 * 经典皮肤（2026-09-02）：参考用户提供的实物图风格**原创重绘**——
 * 象牙白牌面、靛蓝饼、绿竹（五索中段朱红）、朱红萬/中、一索雀鸟。
 * 全部 SVG 手绘，不复制任何商业游戏素材（web-v1.md 资产许可红线）。
 */

import type { ReactNode } from "react";
import { registerSkin } from "./skin";

const C = {
  ink: "#1f2a3d",      // 万数字 / 雀鸟线稿
  red: "#c8402f",      // 萬 / 中 / 五索红心
  green: "#3a8a4d",    // 竹 / 發
  indigo: "#2f5e9e",   // 饼外环 / 风牌
  face: "#fdfbf2",     // 饼白隔圈
} as const;
const MINCHO = '"Hiragino Mincho ProN","Yu Mincho","Songti SC","Noto Serif CJK SC",serif';

/** 经典饼：靛蓝外环 + 白隔圈 + 绿心 + 白芯（四层同心，扁平套印风） */
function pin(x: number, y: number, r: number): ReactNode {
  return (
    <g key={`${x}-${y}-${r}`}>
      <circle cx={x} cy={y} r={r} fill={C.indigo} />
      <circle cx={x} cy={y} r={r * 0.7} fill={C.face} />
      <circle cx={x} cy={y} r={r * 0.44} fill={C.green} />
      <circle cx={x} cy={y} r={r * 0.16} fill={C.face} />
    </g>
  );
}

/** 经典竹：通体绿（col 可覆盖为朱红），双节 + 高光 */
function stick(x: number, y: number, h: number, col: string = C.green): ReactNode {
  return (
    <g key={`s-${x}-${y}`}>
      <rect x={x} y={y} width={13} height={h} rx={6} fill={col} stroke="rgba(18,34,20,.25)" strokeWidth={1} />
      <rect x={x} y={y + h * 0.3} width={13} height={7} fill="rgba(0,0,0,.16)" />
      <rect x={x} y={y + h * 0.62} width={13} height={7} fill="rgba(0,0,0,.16)" />
      <rect x={x + 2.5} y={y + 3} width={2.2} height={Math.max(4, h - 6)} rx={1.1} fill="rgba(255,255,255,.28)" />
    </g>
  );
}

/** 一索雀鸟（正面雏雀式，居中小幅构图）：耳羽 / 头 / 眼 / 喙 / 翅 / 腹 / 栖枝。
 *  2026-09-02 按用户意见重画：整体居中、体量收敛（不再铺满整牌）、左右对称。 */
function bird(): ReactNode {
  return (
    <g>
      {/* 耳羽（头顶两侧） */}
      <path d="M50 68 L44 52 L58 62 Z" fill={C.green} stroke="rgba(18,34,20,.22)" strokeWidth={0.9} />
      <path d="M70 68 L76 52 L62 62 Z" fill={C.green} stroke="rgba(18,34,20,.22)" strokeWidth={0.9} />
      {/* 头 */}
      <circle cx={60} cy={76} r={15} fill={C.green} stroke="rgba(18,34,20,.25)" strokeWidth={1.2} />
      {/* 身 */}
      <ellipse cx={60} cy={106} rx={23} ry={29} fill={C.green} stroke="rgba(18,34,20,.25)" strokeWidth={1.2} />
      {/* 翅（贴合两侧） */}
      <path d="M40 96 Q31 111 39 126 Q48 115 46 98 Z" fill="#337a44" />
      <path d="M80 96 Q89 111 81 126 Q72 115 74 98 Z" fill="#337a44" />
      {/* 腹 */}
      <ellipse cx={60} cy={114} rx={12} ry={17} fill="#eef4e6" />
      {/* 眼 */}
      <circle cx={53.5} cy={75} r={5.8} fill="#fff" stroke={C.ink} strokeWidth={1.1} />
      <circle cx={66.5} cy={75} r={5.8} fill="#fff" stroke={C.ink} strokeWidth={1.1} />
      <circle cx={54.2} cy={75.8} r={2.6} fill={C.ink} />
      <circle cx={65.8} cy={75.8} r={2.6} fill={C.ink} />
      <circle cx={55} cy={74.6} r={0.8} fill="#fff" />
      <circle cx={66.6} cy={74.6} r={0.8} fill="#fff" />
      {/* 喙 */}
      <path d="M60 84 L56 90 L64 90 Z" fill="#d98a2b" stroke="rgba(90,52,10,.28)" strokeWidth={0.8} />
      {/* 爪 + 栖枝（鸟踩枝上，枝在身下） */}
      <rect x={44} y={140} width={32} height={5.5} rx={2.5} fill="#8a6a3a" />
      <rect x={54} y={133} width={3} height={8} fill={C.ink} />
      <rect x={63} y={133} width={3} height={8} fill={C.ink} />
    </g>
  );
}

function manGlyph(numChar: string): ReactNode {
  return (
    <g fontFamily={MINCHO} textAnchor="middle" fontWeight={600}>
      <text x={60} y={52} fontSize={34} fill={C.ink}>{numChar}</text>
      <text x={60} y={148} fontSize={72} fill={C.red}>萬</text>
    </g>
  );
}

/** 饼布局 [x,y,r]（几何沿用实物惯例：3 斜排 / 5 梅花 / 7 上三下四 / 9 九宫） */
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

/** 索布局 [x,y,h]；五索中段那根传朱红（index 2 为中棒） */
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

const HONORS: Record<string, [string | null, string]> = {
  E: ["東", C.indigo], S: ["南", C.indigo], W: ["西", C.indigo], N: ["北", C.indigo],
  h: [null, C.indigo], f: ["發", C.green], c: ["中", C.red],
};

function content(kind: string): ReactNode {
  const suit = kind[1];
  const num = Number(kind[0]);
  if (suit === "m") return manGlyph("一二三四五六七八九"[num - 1]);
  if (suit === "p") return <>{PIN_LAYOUTS[num].map(([x, y, r]) => pin(x, y, r))}</>;
  if (suit === "s") {
    if (num === 1) return bird();
    return (
      <>
        {SOU_LAYOUTS[num].map(([x, y, h], i) => stick(x, y, h, num === 5 && i === 2 ? C.red : C.green))}
      </>
    );
  }
  const [ch, col] = HONORS[kind] ?? [null, C.ink];
  if (!ch) {
    return <rect x={34} y={38} width={52} height={104} rx={8} fill="none" stroke="#8ea9c4" strokeWidth={6.5} />;
  }
  return (
    <g fontFamily={MINCHO} textAnchor="middle" fontWeight={600}>
      <text x={60} y={123} fontSize={88} fill={col}>{ch}</text>
    </g>
  );
}

registerSkin({
  name: "classic",
  shell: (
    <>
      <defs>
        <linearGradient id="nk2-gFace" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#fffef9" />
          <stop offset=".7" stopColor="#f8f3e4" />
          <stop offset="1" stopColor="#efe8d4" />
        </linearGradient>
        <linearGradient id="nk2-gSide" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e4dcc4" />
          <stop offset=".5" stopColor="#cfc4a6" />
          <stop offset="1" stopColor="#b3a684" />
        </linearGradient>
      </defs>
      <rect x={4} y={12} width={112} height={164} rx={16} fill="url(#nk2-gSide)" />
      <rect x={4} y={6} width={112} height={165} rx={16} fill="url(#nk2-gFace)" />
      <rect x={6.4} y={8.4} width={107.2} height={162} rx={14} fill="none" stroke="rgba(255,255,255,.75)" strokeWidth={1.6} />
      <rect x={9.6} y={11.6} width={100.8} height={154.5} rx={11} fill="none" stroke="rgba(110,94,58,.14)" strokeWidth={1} />
    </>
  ),
  content,
});
