/** 知识点专项训练（web-v1.md §一）：三种组卷口径——
 *  /drill/:kp          按 knowledge_point 精确匹配（单考点）
 *  /drill?cat=&from=   按 category 过滤（整组专项，question-bank.md §九）
 *  /drill?id=&from=    单题练习（题库页卡片直达）
 *  乱序不补量、上限 12；错题照记错题本，但不写关卡进度。
 *  返回键回来源页（from 参数），不再写死 /levels。 */

import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { QuestionCard } from "../components/QuestionCard";
import { loadBank } from "../lib/bank";
import { pickStageQuestions } from "../lib/levels";
import { questionsOfSpecial, specialOf } from "../lib/specials";
import { recordAnswer, recordWrong } from "../lib/storage";
import type { Bank, Question } from "../lib/types";

export function Drill() {
  const { kp = "" } = useParams();
  const [search] = useSearchParams();
  const cat = search.get("cat") ?? "";
  const id = search.get("id") ?? "";
  const from = search.get("from") ?? "";
  const [bank, setBank] = useState<Bank | null>(null);
  const [round, setRound] = useState(0); // 「再来一组」时重抽（换个题序）
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState<{ id: string; ok: boolean }[]>([]);

  useEffect(() => {
    loadBank().then(setBank);
  }, []);

  const sp = specialOf(cat);
  const back = from || (id ? "/bank" : kp ? "/levels" : "/special");
  const backLabel = from
    ? from.startsWith("/special/")
      ? "返回专项"
      : from.startsWith("/levels")
        ? "返回关卡"
        : from.startsWith("/bank")
          ? "返回题库"
          : "返回"
    : id
      ? "返回题库"
      : kp
        ? "返回关卡"
        : "返回专项";

  const pool = useMemo(() => {
    if (!bank) return [];
    if (id) return bank.questions.filter((q) => q.id === id);
    if (kp) return bank.questions.filter((q) => q.knowledge_point === kp);
    if (sp) return questionsOfSpecial(bank.questions, sp.id);
    return [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bank, kp, cat, id]);
  // min=1：不补量（该口径有几题练几题），只用它的洗牌
  const { qs } = useMemo(() => pickStageQuestions(pool, 1), [pool, round]);
  const list = qs.slice(0, 12);

  const navbar = (
    <Navbar
      title={id ? "单题练习" : "专项训练"}
      subtitle={id ? "" : kp || (sp ? `${sp.name} · 整组乱序` : "")}
      back={back}
      right={<span className="nav-count">{Math.min(idx + 1, list.length || 1)}<em>/{list.length}</em></span>}
    />
  );

  if (bank && pool.length === 0) {
    return (
      <div>
        {navbar}
        <p className="empty">{id ? "没有找到该题目（可能已被题库更新移除）" : kp ? "没有找到该知识点的题目" : "该专项暂无题目"}</p>
        <p className="center"><Link to={back} className="btn">← {backLabel}</Link></p>
      </div>
    );
  }
  if (!bank || list.length === 0) return <p className="empty">题库加载中…</p>;

  const q: Question = list[Math.min(idx, list.length - 1)];
  const done = results.length === list.length;
  const okCount = results.filter((r) => r.ok).length;

  function onAnswered(ok: boolean) {
    recordAnswer(ok);
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
            <Link to={back} className="btn ghost">{backLabel}</Link>
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
