import { useEffect, useMemo, useState } from "react";
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

  /** 知识点索引：按级分组，点进 /drill/:kp 专项训练（web-v1.md §一） */
  const kpIndex = useMemo(() => {
    if (!bank) return [] as { level: Level; name: string; kps: { kp: string; n: number }[] }[];
    return LEVELS.map((lv) => {
      const counts = new Map<string, number>();
      for (const q of questionsOf(bank, lv)) counts.set(q.knowledge_point, (counts.get(q.knowledge_point) ?? 0) + 1);
      return {
        level: lv,
        name: LEVEL_META[lv].name,
        kps: [...counts.entries()].map(([kp, n]) => ({ kp, n })).sort((a, b) => b.n - a.n),
      };
    }).filter((g) => g.kps.length > 0);
  }, [bank]);

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

      {kpIndex.length > 0 && (
        <section className="panel" style={{ marginTop: 16 }}>
          <h2 style={{ fontSize: 16, margin: "0 0 6px" }}>知识点专项训练</h2>
          <p className="meta" style={{ margin: "0 0 8px" }}>按考点单独练：错题照记错题本，不计关卡进度。</p>
          {kpIndex.map((g) => (
            <details key={g.level} style={{ marginBottom: 4 }}>
              <summary style={{ cursor: "pointer" }}>
                <b>{g.level}</b> {g.name}（{g.kps.length} 个考点）
              </summary>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18, lineHeight: 1.9 }}>
                {g.kps.map(({ kp, n }) => (
                  <li key={kp}>
                    <Link to={`/drill/${encodeURIComponent(kp)}`}>{kp}</Link>
                    <span className="meta">（{n} 题）</span>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </section>
      )}

      <p className="meta" style={{ textAlign: "center" }}>
        {bank ? `题库版本 ${bank.bank_version}` : "题库加载中…"}
        {" · "}通关正确率 ≥80% 解锁下一级
      </p>
    </div>
  );
}
