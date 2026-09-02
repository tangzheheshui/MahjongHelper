/** 知识点专项训练（web-v1.md §一）：按 knowledge_point 过滤组卷，乱序不补量；
 *  错题照记错题本，但不写关卡进度（练的是考点不是通关）。入口在首页知识点索引。 */

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
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

  if (bank && pool.length === 0) {
    return (
      <div>
        <p className="empty">没有找到该知识点的题目</p>
        <Link to="/" className="act">← 回首页</Link>
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
      <h2 style={{ fontSize: 16, margin: "0 0 2px" }}>
        专项：{kp}
        <button type="button" className="act" style={{ float: "right", padding: "2px 10px" }}>
          <Link to="/" style={{ color: "inherit", textDecoration: "none" }}>← 退出</Link>
        </button>
      </h2>
      <p className="sub">第 {Math.min(idx + 1, list.length)} / {list.length} 题 · 不计关卡进度</p>

      {done ? (
        <div className="panel">
          <p style={{ margin: 0 }}>
            完成：{okCount} / {list.length}（{Math.round((okCount / list.length) * 100)}%）
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button type="button" className="act primary" onClick={restart}>再来一组</button>
            <Link to="/" className="act">回首页</Link>
          </div>
        </div>
      ) : (
        <>
          <div className="progressbar">
            <div style={{ width: `${(results.length / list.length) * 100}%` }} />
          </div>
          <QuestionCard key={`${q.id}-${idx}-${round}`} q={q} onAnswered={onAnswered} />
          {results.length === idx + 1 && (
            <div style={{ marginTop: 12 }}>
              <button type="button" className="act primary" onClick={next}>
                {idx + 1 >= list.length ? "看结果" : "下一题"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
