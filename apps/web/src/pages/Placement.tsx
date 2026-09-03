/** 水平测试（PRD 6.3）：8 题，L4-L7 各 2 题 → 定级 + 推荐起始级。
 *  定级在测完的瞬间落盘（不依赖点哪个退出按钮），返回/关闭都不丢结果。 */

import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { QuestionCard } from "../components/QuestionCard";
import { loadBank } from "../lib/bank";
import { LEVEL_META, gradePlacement, pickPlacementQuestions } from "../lib/levels";
import { loadPlacement, loadProgress, recordAnswer, recordWrong, savePlacement, saveProgress } from "../lib/storage";
import { LEVELS } from "../lib/types";
import type { Bank, Level, Question } from "../lib/types";

export function Placement() {
  const [bank, setBank] = useState<Bank | null>(null);
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState(false);
  const [perLevel, setPerLevel] = useState<Partial<Record<Level, { ok: number; total: number }>>>({});
  const [history, setHistory] = useState(() => loadPlacement());
  const [search] = useSearchParams();
  const from = search.get("from") || "/";

  useEffect(() => {
    loadBank().then(setBank);
  }, []);

  const qs: Question[] = useMemo(() => {
    if (!bank) return [];
    const byLevel: Record<string, Question[]> = {};
    for (const lv of LEVELS) byLevel[lv] = bank.questions.filter((q) => q.level === lv);
    return pickPlacementQuestions(byLevel);
  }, [bank]);

  /** 测完即落盘：定级 + 解锁至起始级（幂等，重渲染不产生副作用差异） */
  useEffect(() => {
    if (!done) return;
    const { grade, startLevel } = gradePlacement(perLevel);
    const result = { grade, startLevel, takenAt: new Date().toISOString(), perLevel };
    savePlacement(result);
    setHistory(result);
    const p = loadProgress();
    const i = LEVELS.indexOf(startLevel);
    for (let k = 0; k <= i; k++) {
      const lv = LEVELS[k];
      p.levels[lv] = p.levels[lv] ?? { unlocked: false };
      p.levels[lv]!.unlocked = true;
    }
    saveProgress(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  if (!bank) return <p className="empty">题库加载中…</p>;

  if (qs.length === 0) {
    return <p className="empty">题库建设中，暂无法测试</p>;
  }

  if (done) {
    const { grade, startLevel } = gradePlacement(perLevel);
    return (
      <div>
        <Navbar title="水平定级" back={from} />
        <div className={`score-card pass`}>
          <div className="score-ring" style={{ width: 140, height: 140 }}>
            <svg width={140} height={140} viewBox="0 0 160 160">
              <circle className="bg" cx={80} cy={80} r={70} />
              <circle className="fg" cx={80} cy={80} r={70} stroke="var(--jade-500)" strokeDasharray={2 * Math.PI * 70} strokeDashoffset={0} />
            </svg>
            <div className="num">
              <span className="pct" style={{ fontSize: 26 }}>{grade}</span>
              <span className="label">水平定级</span>
            </div>
          </div>
          <p style={{ marginTop: 14, marginBottom: 4 }}>推荐从 <b>{startLevel} {LEVEL_META[startLevel].name}</b> 开始训练</p>
        </div>

        <div className="panel">
          <h3>分项正确率</h3>
          {LEVELS.filter((lv) => perLevel[lv]).map((lv) => {
            const s = perLevel[lv]!;
            const pct = s.total === 0 ? 0 : Math.round((s.ok / s.total) * 100);
            return (
              <div key={lv} className="breakdown-row">
                <span className="lv">{lv}</span>
                <span className="label">{LEVEL_META[lv].name}</span>
                <span className="bar"><div style={{ width: `${pct}%` }} /></span>
                <span className="val">{s.ok} / {s.total}</span>
              </div>
            );
          })}
        </div>

        <div className="btn-row">
          <Link className="btn primary" to={`/quiz/${startLevel}/S1?from=${encodeURIComponent(from)}`}>
            开始训练 →
          </Link>
          <Link className="btn ghost" to={from}>{from === "/" ? "返回首页" : "返回"}</Link>
        </div>
      </div>
    );
  }

  const q = qs[Math.min(idx, qs.length - 1)];

  return (
    <div>
      <Navbar
        title="水平测试"
        subtitle="测完推荐起始级别"
        back={from}
        right={<span className="nav-count">{Math.min(idx + 1, qs.length)}<em>/{qs.length}</em></span>}
      />
      <div className="quiz-progress">
        <div className="progressbar">
          <div style={{ width: `${(idx / qs.length) * 100}%` }} />
        </div>
        <p className="meta center" style={{ marginTop: 6, marginBottom: 0 }}>L4–L7 各 2 题{history ? " · 将覆盖上次结果" : ""}</p>
      </div>

      <QuestionCard
        key={`${q.id}-${idx}`}
        q={q}
        onAnswered={(ok) => {
          recordAnswer(ok);
          const s = perLevel[q.level] ?? { ok: 0, total: 0 };
          s.total += 1;
          if (ok) s.ok += 1;
          setPerLevel({ ...perLevel, [q.level]: s });
          // 错题同样进错题本
          if (!ok) recordWrong(q);
          if (idx + 1 >= qs.length) {
            setDone(true);
          } else {
            setIdx(idx + 1);
          }
        }}
      />
    </div>
  );
}
