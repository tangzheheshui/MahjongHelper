/** 知识点专项训练（web-v1.md §一）：按 knowledge_point 过滤组卷，乱序不补量；
 *  错题照记错题本，但不写关卡进度（练的是考点不是通关）。入口在首页知识点索引。 */

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { QuestionCard } from "../components/QuestionCard";
import { loadBank } from "../lib/bank";
import { pickStageQuestions } from "../lib/levels";
import { recordWrong } from "../lib/storage";
import type { Bank, Question } from "../lib/types";

export function Drill() {
  const { kp = "" } = useParams();
  const [bank, setBank] = useState<Bank | null>(null);
  const [round, setRound] = useState(0); // 「再来一组」时重抽（换个题序）
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState<{ id: string; ok: boolean }[]>([]);

  useEffect(() => {
    loadBank().then(setBank);
  }, []);

  const pool = useMemo(
    () => (bank ? bank.questions.filter((q) => q.knowledge_point === kp) : []),
    [bank, kp],
  );
  // min=1：不补量（该考点有几题练几题），只用它的洗牌
  const { qs } = useMemo(() => pickStageQuestions(pool, 1), [pool, round]);
  const list = qs.slice(0, 12);

  const navbar = (
    <Navbar
      title="专项训练"
      subtitle={kp}
      back="/levels"
      right={<span className="nav-count">{Math.min(idx + 1, list.length || 1)}<em>/{list.length}</em></span>}
    />
  );

  if (bank && pool.length === 0) {
    return (
      <div>
        {navbar}
        <p className="empty">没有找到该知识点的题目</p>
        <p className="center"><Link to="/levels" className="btn">← 返回关卡</Link></p>
      </div>
    );
  }
  if (!bank || list.length === 0) return <p className="empty">题库加载中…</p>;

  const q: Question = list[Math.min(idx, list.length - 1)];
  const done = results.length === list.length;
  const okCount = results.filter((r) => r.ok).length;

  function onAnswered(ok: boolean) {
    setResults((r) => [...r, { id: q.id, ok }]);
    if (!ok) recordWrong(q);
  }

  function next() {
    setIdx((i) => i + 1);
  }

  function restart() {
    setRound((r) => r + 1);
    setIdx(0);
    setResults([]);
  }

  return (
    <div>
      {navbar}
      <div className="quiz-progress">
        <div className="progressbar">
          <div style={{ width: `${(results.length / list.length) * 100}%` }} />
        </div>
        <p className="meta center" style={{ marginTop: 6, marginBottom: 0 }}>不计关卡进度 · 错题照记错题本</p>
      </div>

      {done ? (
        <div className="panel center">
          <div style={{ fontSize: 36, fontWeight: 800, color: okCount === list.length ? "var(--jade-600)" : "var(--ink)", margin: "8px 0" }}>
            {okCount} / {list.length}
          </div>
          <p className="meta">本轮完成度 {Math.round((okCount / list.length) * 100)}%</p>
          <div className="btn-row" style={{ justifyContent: "center" }}>
            <button type="button" className="btn primary" onClick={restart}>再来一组</button>
            <Link to="/levels" className="btn ghost">返回关卡</Link>
          </div>
        </div>
      ) : (
        <>
          <QuestionCard key={`${q.id}-${idx}-${round}`} q={q} onAnswered={onAnswered} />
          {results.length === idx + 1 && (
            <div className="sticky-cta">
              <button type="button" className="btn-block" onClick={next}>
                {idx + 1 >= list.length ? "看结果" : "下一题"} →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
