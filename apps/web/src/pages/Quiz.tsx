/** 做题页（web-v1.md §一）：手牌点选 → 判分 → 讲解 → 下一题 → 结算 */

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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

  if (bank && pool.length === 0) {
    return <p className="empty">该级别暂无题目（题库建设中）</p>;
  }
  if (!bank || qs.length === 0) return <p className="empty">题库加载中…</p>;

  const q: Question = qs[Math.min(idx, qs.length - 1)];
  const answeredCount = results.length;

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

  const meta = LEVEL_META[level as keyof typeof LEVEL_META];

  return (
    <div>
      <h2 style={{ fontSize: 17, margin: "0 0 2px" }}>
        {level} {meta?.name}
        <button type="button" className="act" style={{ float: "right", padding: "2px 10px" }} onClick={() => navigate("/")}>
          ← 退出
        </button>
      </h2>
      <p className="sub">第 {Math.min(idx + 1, qs.length)} / {qs.length} 题</p>
      <div className="progressbar">
        <div style={{ width: `${(answeredCount / qs.length) * 100}%` }} />
      </div>

      <QuestionCard key={`${q.id}-${idx}`} q={q} onAnswered={onAnswered} />

      {answeredCount === idx + 1 && (
        <div style={{ marginTop: 12 }}>
          <button type="button" className="act primary" onClick={next}>
            {idx + 1 >= qs.length ? "查看结算" : "下一题"}
          </button>
        </div>
      )}

      {reused && (
        <p className="meta">该关卡题库较少，可能复现已做过的题目（试点题库）</p>
      )}
    </div>
  );
}
