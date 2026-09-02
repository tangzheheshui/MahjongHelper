/**
 * <Tile>：全站唯一的牌面组件（web-v1.md §二.1）。
 * 尺寸档：手牌 46、讲解表格 22、大图 96——SVG 矢量无损，一套资产通吃。
 */

import type { MouseEventHandler } from "react";
import { getSkin } from "../tiles/skin";
import { loadSettings } from "../lib/storage";
import "./skin-loader";

export type TileSize = 22 | 32 | 46 | 64 | 96;

export interface TileProps {
  id: string;
  size?: TileSize;
  selected?: boolean;
  dimmed?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  title?: string;
  /** 皮肤覆盖（设置页预览用）；缺省读 nk.settings.tileSkin */
  skin?: string;
}

/** 解析当前皮肤：设置值未注册时回落 placeholder（皮肤删除/改名不致白屏） */
function resolveSkin(override?: string) {
  const name = override ?? loadSettings().tileSkin ?? "placeholder";
  try {
    return getSkin(name);
  } catch {
    return getSkin("placeholder");
  }
}

export function TileDefs() {
  return (
    <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden>
      <defs>
        <linearGradient id="nk-gFace" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fffdf6" />
          <stop offset=".55" stopColor="#f5eedb" />
          <stop offset="1" stopColor="#e7dcc2" />
        </linearGradient>
        <linearGradient id="nk-gSide" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d5cbae" />
          <stop offset=".45" stopColor="#bfb28f" />
          <stop offset="1" stopColor="#9a8d6a" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Tile({ id, size = 46, selected, dimmed, onClick, title, skin }: TileProps) {
  const sk = resolveSkin(skin);
  const h = Math.round(size * 1.5);
  return (
    <button
      type="button"
      className={`tile${selected ? " sel" : ""}${dimmed ? " dim" : ""}${onClick ? " clickable" : ""}`}
      onClick={onClick}
      title={title ?? id}
      aria-label={title ?? id}
    >
      <svg width={size} height={h} viewBox="0 0 120 180" aria-hidden>
        {sk.shell}
        {sk.content(id)}
      </svg>
    </button>
  );
}
