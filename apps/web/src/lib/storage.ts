/** 本地存储（web-v1.md §二.3）：全部 localStorage，键前缀 nk. */

import type { Level } from "./types";

/* ---------- 进度 nk.progress ---------- */

export interface LevelProgress {
  unlocked: boolean;
  /** 历史最高正确率（0-1） */
  bestRate?: number;
  stars?: 1 | 2 | 3;
  completedAt?: string;
}

export interface Progress {
  levels: Partial<Record<Level, LevelProgress>>;
}

export function loadProgress(): Progress {
  return readJson("nk.progress", { levels: {} });
}

export function saveProgress(p: Progress) {
  writeJson("nk.progress", p);
}

/* ---------- 错题本 nk.wrong_book ---------- */

export interface WrongEntry {
  id: string;
  level: Level;
  knowledgePoint: string;
  wrongCount: number;
  lastWrongAt: string;
  /** 重做答对的次数（连续答对≥1 即可移出，PRD 答对后移出） */
  redoOkAt?: string;
}

export interface WrongBook {
  entries: Record<string, WrongEntry>;
}

export function loadWrongBook(): WrongBook {
  return readJson("nk.wrong_book", { entries: {} });
}

export function saveWrongBook(w: WrongBook) {
  writeJson("nk.wrong_book", w);
}

/** 做错入本（做题页/水平测试共用）：累加错误次数、清除重做标记 */
export function recordWrong(q: { id: string; level: Level; knowledge_point: string }) {
  const wb = loadWrongBook();
  const e = wb.entries[q.id] ?? {
    id: q.id,
    level: q.level,
    knowledgePoint: q.knowledge_point,
    wrongCount: 0,
    lastWrongAt: "",
  };
  e.wrongCount += 1;
  e.lastWrongAt = new Date().toISOString();
  delete e.redoOkAt;
  wb.entries[q.id] = e;
  saveWrongBook(wb);
}

/* ---------- 水平测试 nk.placement ---------- */

export interface PlacementResult {
  grade: "入门" | "初级" | "中级" | "高级";
  startLevel: Level;
  takenAt: string;
  /** 每级答对/总数 */
  perLevel: Partial<Record<Level, { ok: number; total: number }>>;
}

export function loadPlacement(): PlacementResult | null {
  return readJson<PlacementResult | null>("nk.placement", null);
}

export function savePlacement(p: PlacementResult) {
  writeJson("nk.placement", p);
}

/* ---------- 设置 nk.settings ---------- */

export interface Settings {
  tileSkin: string;
}

export function loadSettings(): Settings {
  return readJson("nk.settings", { tileSkin: "placeholder" });
}

export function saveSettings(s: Settings) {
  writeJson("nk.settings", s);
}

export function clearAllData() {
  for (const k of ["nk.progress", "nk.wrong_book", "nk.placement", "nk.settings"]) {
    localStorage.removeItem(k);
  }
}

/* ---------- 工具 ---------- */

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (fallback === null || typeof parsed !== "object" || parsed === null) return parsed as T;
    return { ...fallback, ...parsed } as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 存储满/隐私模式：静默失败，App 仍可用
  }
}
