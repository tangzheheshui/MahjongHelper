/** 水平测试（PRD 6.3）：约 10 题覆盖 L1-L7 → 定级 + 推荐起始级 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { QuestionCard } from "../components/QuestionCard";
import { loadBank } from "../lib/bank";
import { LEVEL_META, gradePlacement, pickPlacementQuestions } from "../lib/levels";
import { loadPlacement, loadProgress, recordWrong, savePlacement, saveProgress } from "../lib/storage";
import { LEVELS } from "../lib/types";
import type { Bank, Level, Question } from "../lib/types";

export function Placement() {
  const [bank, setBank] = useState<Bank | null>(null);
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState(false);
  const [perLevel, setPerLevel] = useState<Partial<Record<Level, { ok: number; total: number }>>>({});
  const [history, setHistory] = useState(() => loadPlacement());

  useEffect(() => {
    loadBank().then(setBank);
  }, []);

  const qs: Question[] = useMemo(() => {
    if (!bank) return [];
    const byLevel: Record<string, Question[]> = {};
    for (const lv of LEVELS) byLevel[lv] = bank.questions.filter((q) => q.level === lv);
    return pickPlacementQuestions(byLevel);
  }, [bank]);

  if (!bank) return <p className="empty">题库加载中…</p>;

  if (qs.length === 0) {
    return <p className="empty">题库建设中，暂无法测试</p>;
  }

  if (done) {
    const { grade, startLevel } = gradePlacement(perLevel);
    return (
      <div>
        <div className="score-big ok">{grade}</div>
        <p style={{ textAlign: "center" }}>推荐从 <b>{startLevel} {LEVEL_META[startLevel].name}</b> 开始训练</p>
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>分项</h3>
          {LEVELS.filter((lv) => perLevel[lv]).map((lv) => {
            const s = perLevel[lv]!;
            return (
              <p key={lv} style={{ margin: "4px 0", fontSize: 13 }}>
                {lv} {LEVEL_META[lv].name}：{s.ok} / {s.total}
              </p>
            );
          })}
        </div>
        <div style={{ marginTop: 16 }}>
          <Link
            className="act primary"
            to={`/quiz/${startLevel}/S1`}
            style={{ textDecoration: "none" }}
            onClick={() => {
              // 定级即解锁至起始级（含），此前级别视为可跳过
              const p = loadProgress();
              const i = LEVELS.indexOf(startLevel);
              for (let k = 0; k <= i; k++) {
                const lv = LEVELS[k];
                p.levels[lv] = p.levels[lv] ?? { unlocked: false };
                p.levels[lv]!.unlocked = true;
              }
              saveProgress(p);
              const result = { grade, startLevel, takenAt: new Date().toISOString(), perLevel };
              savePlacement(result);
              setHistory(result);
            }}
          >
            开始训练 →
          </Link>
          <Link className="act" to="/" style={{ textDecoration: "none" }}>返回首页</Link>
        </div>
      </div>
    );
  }

  const q = qs[Math.min(idx, qs.length - 1)];

  return (
    <div>
      <h2 style={{ fontSize: 17, margin: "0 0 2px" }}>水平测试</h2>
      <p className="sub">
        第 {Math.min(idx + 1, qs.length)} / {qs.length} 题 · 覆盖 L1-L7，测完推荐起始级别
        {history ? "（将覆盖上次结果）" : ""}
      </p>
      <div className="progressbar">
        <div style={{ width: `${(idx / qs.length) * 100}%` }} />
      </div>

      <QuestionCard
        key={`${q.id}-${idx}`}
        q={q}
        onAnswered={(ok) => {
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
