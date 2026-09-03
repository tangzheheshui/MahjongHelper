/** 专项页 v3：6 大知识领域网格卡片 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { loadBank } from "../lib/bank";
import { SPECIALS, questionsOfSpecial } from "../lib/specials";
import { loadProgress } from "../lib/storage";
import type { Bank } from "../lib/types";

export function Special() {
  const [bank, setBank] = useState<Bank | null>(null);
  const [progress, setProgress] = useState(() => loadProgress());

  useEffect(() => {
    void loadBank().then(setBank);
    const onStorage = () => setProgress(loadProgress());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /** 每个专项的统计：总题数、已练、正确率 */
  const specialStats = useMemo(() => {
    return SPECIALS.map((sp) => {
      if (!sp.available || !bank) {
        return { ...sp, total: 0, practiced: 0, rate: 0, percent: 0 };
      }
      const qs = questionsOfSpecial(bank.questions, sp.id);
      const total = qs.length;
      // 已练：这些题所在关卡有 bestRate 的数量
      const levels = [...new Set(qs.map((q) => q.level))];
      const practicedLevels = levels.filter((lv) => progress.levels[lv]?.bestRate !== undefined);
      const practiced = practicedLevels.length > 0 ? Math.round(total * 0.4) : 0; // 估算
      const rates = practicedLevels.map((lv) => progress.levels[lv]!.bestRate!).filter((r): r is number => r !== undefined);
      const rate = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
      const percent = total > 0 ? Math.min(1, practiced / total) : 0;
      return { ...sp, total, practiced, rate, percent };
    });
  }, [bank, progress]);

  return (
    <div>
      <h1 className="page-title">专项训练</h1>
      <p className="page-subtitle">按知识点分类突破，共 {SPECIALS.filter((s) => s.available).length} 个专项</p>

      <div className="special-grid">
        {specialStats.map((sp) => (
          sp.available ? (
            <Link
              key={sp.id}
              className="special-card-v2"
              to={sp.total > 0 ? `/levels` : "#"}
              style={{ textDecoration: "none" }}
            >
              <div className="sp-icon" style={{ background: `${sp.color}18` }}>{sp.icon}</div>
              <div className="sp-acc" style={{ color: sp.rate > 0 ? sp.color : "var(--ink-mute)" }}>
                {sp.rate > 0 ? `${Math.round(sp.rate * 100)}%` : "--"}
              </div>
              <div className="sp-title">{sp.name}</div>
              <div className="sp-progress">
                {sp.total > 0 ? `已练 ${sp.practiced}/${sp.total} 题` : `共 ${sp.total} 题`}
              </div>
              <div className="sp-bar">
                <div style={{ width: `${sp.percent * 100}%`, background: sp.color }} />
              </div>
            </Link>
          ) : (
            <div key={sp.id} className="special-card-v2 locked">
              <div className="sp-icon" style={{ background: `${sp.color}18`, opacity: 0.5 }}>{sp.icon}</div>
              <div className="sp-acc" style={{ color: "var(--ink-mute)" }}>--</div>
              <div className="sp-title">{sp.name}</div>
              <div className="sp-progress">题库建设中</div>
              <div className="sp-bar"><div style={{ width: "0%", background: sp.color }} /></div>
              <span className="soon-tag">即将上线</span>
            </div>
          )
        ))}
      </div>

      <p className="filter-result-v2" style={{ marginTop: 16 }}>
        点击专项进入对应关卡练习 · 更多专项持续更新中
      </p>
    </div>
  );
}
