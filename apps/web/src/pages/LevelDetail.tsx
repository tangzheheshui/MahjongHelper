/** 关卡详情（三级页）：关卡名片 + 开始训练 CTA + 该级知识点专项入口 */

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { loadBank, questionsOf } from "../lib/bank";
import { LEVEL_META, STAGE_OF_LEVEL } from "../lib/levels";
import { loadProgress } from "../lib/storage";
import { LEVELS } from "../lib/types";
import type { Bank, Level } from "../lib/types";

const LV_CLASS: Record<Level, string> = {
  L1: "l1", L2: "l2", L3: "l3", L4: "l4", L5: "l5", L6: "l6", L7: "l7",
};

function isLevel(v: string | undefined): v is Level {
  return !!v && (LEVELS as string[]).includes(v);
}

export function LevelDetail() {
  const { level } = useParams();
  const [bank, setBank] = useState<Bank | null>(null);
  const [progress] = useState(() => loadProgress());

  useEffect(() => {
    loadBank().then(setBank);
  }, []);

  if (!isLevel(level)) {
    return (
      <>
        <Navbar title="关卡" back="/levels" />
        <p className="empty">关卡不存在</p>
      </>
    );
  }

  const meta = LEVEL_META[level];
  const p = progress.levels[level];
  const count = bank ? questionsOf(bank, level).length : 0;
  const rate = p?.bestRate;
  const stars = p?.stars ?? 0;

  /** 该级知识点（含题数） */
  const kps = useMemo(() => {
    if (!bank) return [] as { kp: string; n: number }[];
    const counts = new Map<string, number>();
    for (const q of questionsOf(bank, level)) counts.set(q.knowledge_point, (counts.get(q.knowledge_point) ?? 0) + 1);
    return [...counts.entries()].map(([kp, n]) => ({ kp, n })).sort((a, b) => b.n - a.n);
  }, [bank, level]);

  return (
    <div>
      <Navbar title={`${level} · ${meta.name}`} subtitle="拆搭进阶" back="/levels" />

      {/* 关卡名片 */}
      <section className={`lv-hero ${LV_CLASS[level]}`}>
        <span className={`lv-hero-badge ${LV_CLASS[level]}`}>{level}</span>
        <div className="lv-hero-info">
          <h1>{meta.name}</h1>
          <p>{meta.desc}</p>
          <div className="lv-hero-stats">
            <span className="stars">{"★".repeat(stars)}<span style={{ opacity: .3 }}>{"★".repeat(3 - stars)}</span></span>
            <span className="dot">·</span>
            <span>{rate !== undefined ? `最佳 ${Math.round(rate * 100)}%` : "未挑战"}</span>
            <span className="dot">·</span>
            <span>{count > 0 ? `${count} 题` : "题库待建"}</span>
          </div>
        </div>
      </section>

      {count > 0 && (
        <Link className="btn-block lv-cta" to={`/quiz/${level}/${STAGE_OF_LEVEL}`}>
          {rate !== undefined ? "再练一关" : "开始训练"} <span>→</span>
        </Link>
      )}

      {kps.length > 0 && (
        <>
          <div className="section-head" style={{ marginTop: 22 }}>
            <h2>知识点专项</h2>
            <span className="hint">{kps.length} 考点 · 按考点单练</span>
          </div>
          <div className="kp-chips">
            {kps.map(({ kp, n }) => (
              <Link key={kp} className="kp-chip" to={`/drill/${encodeURIComponent(kp)}?from=${encodeURIComponent(`/levels/${level}`)}`}>
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
