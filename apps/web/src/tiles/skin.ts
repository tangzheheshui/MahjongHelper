/**
 * 牌面皮肤插槽（web-v1.md §二.1）：所有页面只消费 <Tile>，
 * 皮肤注册表可整体替换——正式美术资产接入只动这里，不碰页面代码。
 */

import type { ReactNode } from "react";

export interface TileSkin {
  /** 皮肤名（设置/调试用） */
  name: string;
  /** 牌体（120×180 viewBox 内的壳，含厚度与高光；渐变等全局 defs 由 TileDefs 提供） */
  shell: ReactNode;
  /** 34 种牌面内容（120×180 viewBox 内） */
  content(kind: string): ReactNode;
}

const registry = new Map<string, TileSkin>();

export function registerSkin(skin: TileSkin) {
  registry.set(skin.name, skin);
}

export function getSkin(name: string): TileSkin {
  const s = registry.get(name);
  if (!s) throw new Error(`未注册的牌面皮肤: ${name}`);
  return s;
}
