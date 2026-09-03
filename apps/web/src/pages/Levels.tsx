/** 关卡列表（Tab 二级入口）：L1–L7 卡片，点进各自的关卡详情页 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { loadBank, questionsOf } from "../lib/bank";
import { LEVEL_META } from "../lib/levels";
import { loadProgress } from "../lib/storage";
import { LEVELS } from "../lib/types";
import type { Bank, Level } from "../lib/types";

const LV_CLASS: Record<Level, string> = {
  L1: "l1", L2: "l2", L3: "l3", L4: "l4", L5: "l5", L6: "l6", L7: "l7",
};

export function Levels() {
  const [bank, setBank] = useState<Bank | null>(null);
  const [progress, setProgress] = useState(() => loadProgress());

  useEffect(() => {
    loadBank().then(setBank);
  }, []);

  /** 自测期关卡全开（requirements.md，2026-09-02 用户裁定）：网页自测不做解锁门槛；
   *  达标解锁逻辑（applyRunResult）保留仅旁路——上线前翻回 false 恢复门控。 */
  const ALL_LEVELS_OPEN = true;

  function unlocked(lv: Level): boolean {
    if (ALL_LEVELS_OPEN) return true;
    if (lv === "L1") return true;
    return progress.levels[lv]?.unlocked === true;
  }

  return (
    <div>
      <div className="section-head" style={{ marginTop: 6 }}>
        <h2>七级关卡</h2>
        <span className="hint">每关 8-12 题 · 通关 ≥80% 解锁下一级</span>
      </div>
      <div className="level-grid">
        {LEVELS.map((lv) => {
          const meta = LEVEL_META[lv];
          const p = progress.levels[lv];
          const count = bank ? questionsOf(bank, lv).length : 0;
          const rate = p?.bestRate;
          const stars = p?.stars ?? 0;
          const fillPct = Math.round((rate ?? 0) * 100);
          const isLocked = !unlocked(lv);
          const inner = (
            <>
              <span className={`level-badge ${LV_CLASS[lv]}`}>{lv}</span>
              <span className="desc">
                <span className="name">
                  {meta.name}
                  {isLocked && <span className="lock">🔒 未解锁</span>}
                </span>
                <span className="kp">
                  {meta.desc}{count > 0 ? ` · ${count} 题` : " · 题库待建"}
                </span>
              </span>
              <span className="meta">
                {stars > 0 ? <span style={{ color: "var(--gold)", letterSpacing: 1 }}>{"★".repeat(stars)}<span style={{ opacity: .35 }}>{"★".repeat(3 - stars)}</span></span> : <span style={{ color: "var(--ink-mute)" }}>未开始</span>}
                <div className="stat-bar"><div style={{ width: `${fillPct}%` }} /></div>
                <span>{rate !== undefined ? `${Math.round(rate * 100)}%` : "—"}</span>
              </span>
              <span className="chev">{isLocked ? "🔒" : "›"}</span>
            </>
          );
          return !isLocked && count > 0 ? (
            <Link key={lv} className={`level-card ${LV_CLASS[lv]}`} to={`/levels/${lv}`}>{inner}</Link>
          ) : (
            <div key={lv} className={`level-card locked ${LV_CLASS[lv]}`}>{inner}</div>
          );
        })}
      </div>
    </div>
  );
}
