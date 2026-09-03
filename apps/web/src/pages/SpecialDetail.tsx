/** 专项详情：专项名片（含大分类溯源）+ 开始专项练习 + 考点 chips（进单考点 Drill）。
 *  数据全部来自题库真实字段（requirements.md）。 */

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { loadBank } from "../lib/bank";
import { knowledgePointsOfSpecial, levelSpanOf, questionsOfSpecial, specialOf } from "../lib/specials";
import { LEVEL_META } from "../lib/levels";
import type { Bank } from "../lib/types";

export function SpecialDetail() {
  const { cat = "" } = useParams();
  const [bank, setBank] = useState<Bank | null>(null);

  useEffect(() => {
    loadBank().then(setBank);
  }, []);

  const sp = specialOf(cat);

  /** 该专项各级题数（卡片行） */
  const byLevel = useMemo(() => {
    if (!bank || !sp) return [] as { level: string; name: string; n: number }[];
    const counts = new Map<string, number>();
    for (const q of questionsOfSpecial(bank.questions, sp.id)) {
      counts.set(q.level, (counts.get(q.level) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([level, n]) => ({ level, name: LEVEL_META[level as keyof typeof LEVEL_META]?.name ?? level, n }));
  }, [bank, sp]);

  const kps = useMemo(
    () => (bank && sp ? knowledgePointsOfSpecial(bank.questions, sp.id) : []),
    [bank, sp],
  );

  if (!sp) {
    return (
      <>
        <Navbar title="专项" back="/special" />
        <p className="empty">专项不存在</p>
      </>
    );
  }

  const navbar = (
    <Navbar
      title={`专项 · ${sp.name}`}
      subtitle={sp.desc}
      back="/special"
    />
  );

  if (!bank) return <>{navbar}<p className="empty">题库加载中…</p></>;

  const qs = questionsOfSpecial(bank.questions, sp.id);
  const span = levelSpanOf(bank.questions, sp.id);
  const drillFrom = encodeURIComponent(`/special/${sp.id}`);

  return (
    <div>
      {navbar}

      {/* 专项名片 */}
      <section className="panel">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="sp-icon" style={{ background: `${sp.color}18`, width: 44, height: 44, fontSize: 22 }}>
            {sp.icon}
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20 }}>{sp.name}</h1>
            <p className="meta" style={{ margin: "2px 0 0" }}>{sp.desc}</p>
          </div>
        </div>
        <p className="meta" style={{ marginTop: 10 }}>{sp.domain}</p>
        <p className="meta" style={{ marginTop: 4 }}>
          {qs.length > 0 ? `共 ${qs.length} 题 · ${kps.length} 考点 · 覆盖 ${span}` : "题库建设中"}
        </p>
        {qs.length > 0 && (
          <Link className="btn-block lv-cta" to={`/drill?cat=${sp.id}&from=${drillFrom}`}>
            开始专项练习 <span>→</span>
          </Link>
        )}
      </section>

      {/* 各级分布 */}
      {byLevel.length > 0 && (
        <>
          <div className="section-head" style={{ marginTop: 18 }}>
            <h2>关卡分布</h2>
            <span className="hint">该专项题目所在级</span>
          </div>
          <div className="kp-chips">
            {byLevel.map(({ level, name, n }) => (
              <Link key={level} className="kp-chip" to={`/levels/${level}`}>
                {level} {name}<span className="n">· {n}</span>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* 考点明细 */}
      {kps.length > 0 && (
        <>
          <div className="section-head" style={{ marginTop: 18 }}>
            <h2>考点明细</h2>
            <span className="hint">{kps.length} 考点 · 按考点单练</span>
          </div>
          <div className="kp-chips">
            {kps.map(({ kp, n }) => (
              <Link key={kp} className="kp-chip" to={`/drill/${encodeURIComponent(kp)}?from=${drillFrom}`}>
                {kp}<span className="n">· {n}</span>
              </Link>
            ))}
          </div>
          <p className="meta" style={{ marginTop: 10 }}>专项训练不计关卡进度，错题照记错题本。</p>
        </>
      )}
    </div>
  );
}
