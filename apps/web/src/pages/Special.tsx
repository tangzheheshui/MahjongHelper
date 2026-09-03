/** 专项页：5 大专项卡片（category 口径，vocabulary.md §二）。
 *  卡片数据全部来自题库真实字段（题数 / 考点数 / 级别跨度）——
 *  无行为统计就展示真实可算的，不做「已练/正确率」估算（requirements.md）。 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { loadBank } from "../lib/bank";
import { SPECIALS, knowledgePointsOfSpecial, levelSpanOf, questionsOfSpecial } from "../lib/specials";
import type { Bank } from "../lib/types";

export function Special() {
  const [bank, setBank] = useState<Bank | null>(null);

  useEffect(() => {
    void loadBank().then(setBank);
  }, []);

  const totalAll = bank?.questions.length ?? 0;

  return (
    <div>
      <h1 className="page-title">专项训练</h1>
      <p className="page-subtitle">按知识领域分类突破 · 共 {SPECIALS.length} 个专项</p>

      <div className="special-grid">
        {SPECIALS.map((sp) => {
          const qs = bank ? questionsOfSpecial(bank.questions, sp.id) : [];
          const total = qs.length;
          const kpCount = bank ? knowledgePointsOfSpecial(bank.questions, sp.id).length : 0;
          const span = bank ? levelSpanOf(bank.questions, sp.id) : "—";
          const percent = totalAll > 0 ? total / totalAll : 0;
          return (
            <Link key={sp.id} className="special-card-v2" to={`/special/${sp.id}`} style={{ textDecoration: "none" }}>
              <div className="sp-icon" style={{ background: `${sp.color}18` }}>{sp.icon}</div>
              <div className="sp-acc" style={{ color: total > 0 ? sp.color : "var(--ink-mute)" }}>
                {total > 0 ? `${total} 题` : "--"}
              </div>
              <div className="sp-title">{sp.name}</div>
              <div className="sp-progress">
                {total > 0 ? `${kpCount} 考点 · ${span}` : "题库建设中"}
              </div>
              <div className="sp-bar">
                <div style={{ width: `${Math.round(percent * 100)}%`, background: sp.color }} />
              </div>
            </Link>
          );
        })}
      </div>

      <p className="filter-result-v2" style={{ marginTop: 16 }}>
        点击专项查看考点明细 · 专项练习不计关卡进度，错题照记错题本
      </p>
    </div>
  );
}
