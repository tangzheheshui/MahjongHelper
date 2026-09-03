/** 做题页（web-v1.md §一）：手牌点选 → 判分 → 讲解 → 下一题 → 结算 */

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { QuestionCard } from "../components/QuestionCard";
import { loadBank, questionsOf } from "../lib/bank";
import { LEVEL_META, pickStageQuestions } from "../lib/levels";
import { recordWrong } from "../lib/storage";
import type { Bank, Question } from "../lib/types";

export interface QuizRunResult {
  level: string;
  stage: string;
  results: { id: string; ok: boolean; answer: string }[];
  elapsedMs: number;
  reused: boolean;
}

export function Quiz() {
  const { level = "L1", stage = "S1" } = useParams();
  const navigate = useNavigate();
  const [bank, setBank] = useState<Bank | null>(null);
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState<QuizRunResult["results"]>([]);
  const startedAt = useMemo(() => Date.now(), [level, stage]);

  useEffect(() => {
    loadBank().then(setBank);
  }, []);

  const pool = useMemo(() => (bank ? questionsOf(bank, level) : []), [bank, level]);
  const { qs, reused } = useMemo(() => pickStageQuestions(pool), [pool]);

  const meta = LEVEL_META[level as keyof typeof LEVEL_META];

  const navbar = (
    <Navbar
      title={`${level} ${meta?.name ?? ""}`}
      subtitle="拆搭进阶"
      back={`/levels/${level}`}
      right={<span className="nav-count">{Math.min(idx + 1, qs.length || 1)}<em>/{qs.length}</em></span>}
    />
  );

  if (bank && pool.length === 0) {
    return (
      <div>
        {navbar}
        <p className="empty"><span className="emoji">🀄</span>该级别暂无题目（题库建设中）</p>
      </div>
    );
  }
  if (!bank || qs.length === 0) return <p className="empty">题库加载中…</p>;

  const q: Question = qs[Math.min(idx, qs.length - 1)];
  const answeredCount = results.length;
  const total = qs.length;
  const pct = Math.round((answeredCount / total) * 100);

  function onAnswered(ok: boolean, answer: string) {
    setResults((r) => [...r, { id: q.id, ok, answer }]);
    if (!ok) recordWrong(q);
  }

  function next() {
    if (idx + 1 >= qs.length) {
      const run: QuizRunResult = {
        level, stage, results,
        elapsedMs: Date.now() - startedAt,
        reused,
      };
      navigate(`/result/${level}/${stage}`, { state: run });
    } else {
      setIdx(idx + 1);
    }
  }

  return (
    <div>
      {navbar}
      <div className="quiz-progress">
        <div className="progressbar">
          <div style={{ width: `${pct}%` }} />
        </div>
      </div>

      <QuestionCard key={`${q.id}-${idx}`} q={q} onAnswered={onAnswered} />

      {answeredCount === idx + 1 && (
        <div className="sticky-cta">
          <button type="button" className="btn-block" onClick={next}>
            {idx + 1 >= qs.length ? "查看结算" : "下一题"} <span style={{ marginLeft: 4 }}>→</span>
          </button>
        </div>
      )}

      {reused && (
        <p className="meta center">该关卡题库较少，可能复现已做过的题目（试点题库）</p>
      )}
    </div>
  );
}
