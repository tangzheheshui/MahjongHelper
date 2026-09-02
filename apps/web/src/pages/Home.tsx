import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { loadBank, questionsOf } from "../lib/bank";
import { LEVEL_META, STAGE_OF_LEVEL } from "../lib/levels";
import { loadPlacement, loadProgress } from "../lib/storage";
import { LEVELS } from "../lib/types";
import type { Bank, Level } from "../lib/types";

export function Home() {
  const [bank, setBank] = useState<Bank | null>(null);
  const [progress, setProgress] = useState(() => loadProgress());
  const [placement, setPlacement] = useState(() => loadPlacement());

  useEffect(() => {
    loadBank().then(setBank);
  }, []);

  /** 自测期关卡全开（web-v1.md §一，2026-09-02 用户裁定）：网页自测不做解锁门槛；
   *  达标解锁逻辑（applyRunResult）保留仅旁路——上线前翻回 false 恢复门控。 */
  const ALL_LEVELS_OPEN = true;

  function unlocked(lv: Level): boolean {
    if (ALL_LEVELS_OPEN) return true;
    if (lv === "L1") return true;
    return progress.levels[lv]?.unlocked === true;
  }

  return (
    <div>
      {placement && (
        <div className="panel" style={{ padding: "12px 16px", marginTop: 0 }}>
          当前定级：<b>{placement.grade}</b> · 推荐起始 <b>{placement.startLevel}</b>
          （{placement.takenAt.slice(0, 10)} 测试）
        </div>
      )}

      <div className="level-grid">
        {LEVELS.map((lv) => {
          const meta = LEVEL_META[lv];
          const p = progress.levels[lv];
          const count = bank ? questionsOf(bank, lv).length : 0;
          const inner = (
            <>
              <span className="lv">{lv}</span>
              <span className="desc">
                <div className="name">{meta.name}</div>
                <div className="kp">{meta.desc}{count > 0 ? ` · ${count} 题` : " · 题库待建"}</div>
              </span>
              <span className="stat">
                {p?.stars ? <span className="stars">{"★".repeat(p.stars)}{"☆".repeat(3 - p.stars)}</span> : ""}
                <br />
                {unlocked(lv) ? (p?.bestRate !== undefined ? `最高 ${Math.round(p.bestRate * 100)}%` : "未开始") : "🔒 未解锁"}
              </span>
            </>
          );
          return unlocked(lv) && count > 0 ? (
            <Link key={lv} className="level-card" to={`/quiz/${lv}/${STAGE_OF_LEVEL}`}>{inner}</Link>
          ) : (
            <div key={lv} className="level-card locked">{inner}</div>
          );
        })}
      </div>

      <p className="meta" style={{ textAlign: "center" }}>
        {bank ? `题库版本 ${bank.bank_version}` : "题库加载中…"}
        {" · "}通关正确率 ≥80% 解锁下一级
      </p>
    </div>
  );
}
