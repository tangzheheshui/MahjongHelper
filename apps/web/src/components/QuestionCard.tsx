/**
 * 单题作答组件：手牌点选 / 选项点选 → 判分 → 三段式讲解抽屉。
 * 被 Quiz（关卡）、WrongBook（重做）、Placement（测试）三处复用。
 */

import { useState } from "react";
import { Tile } from "./Tile";
import { candidatesOf, isCorrect, shantenBefore } from "../lib/levels";
import type { Question } from "../lib/types";

export interface QuestionCardProps {
  q: Question;
  /** 作答后回调（ok=是否正确，answer=用户答案） */
  onAnswered?: (ok: boolean, answer: string) => void;
  /** 重做场景：换 key 整卡重挂载即可清状态 */
}

export function QuestionCard({ q, onAnswered }: QuestionCardProps) {
  const [picked, setPicked] = useState<string | null>(null);
  const [judged, setJudged] = useState(false);
  const [showExp, setShowExp] = useState(false);

  const ok = judged && picked !== null ? isCorrect(q, picked) : false;
  const correct = q.answer.correct;

  function judge(answer: string) {
    if (judged) return;
    setPicked(answer);
    setJudged(true);
    onAnswered?.(isCorrect(q, answer), answer);
  }

  const sh = shantenBefore(q);
  const isWtd = q.question_type === "what_to_discard";

  return (
    <div className="qcard">
      <p className="sub">
        考点：{q.knowledge_point}
        {isWtd ? "" : " · 二选一"} ·{" "}
        {q.difficulty === "easy" ? "易" : q.difficulty === "medium" ? "中" : "难"}
      </p>
      <p className="shanten-line">
        {isWtd
          ? sh === 0 ? "切最优牌后听牌" : `切最优牌后 ${sh} 向听`
          : "两种切法，哪种进张更多？"}
      </p>

      <div className="hand">
        {q.hand.map((t, i) => (
          <Tile
            key={`${t}-${i}`}
            id={t}
            size={isWtd ? 46 : 32}
            selected={isWtd && picked === t}
            onClick={isWtd && !judged ? () => judge(t) : undefined}
          />
        ))}
      </div>

      {!isWtd && !judged && (
        <div>
          {(q.answer.options ?? []).map((o) => (
            <button
              key={o.discard}
              type="button"
              className="act"
              onClick={() => o.discard && judge(o.discard)}
            >
              切 {o.discard}
            </button>
          ))}
        </div>
      )}

      {judged && (
        <div className="panel">
          <div className={`verdict ${ok ? "ok" : "ng"}`}>
            {ok
              ? `✅ 正确！${picked} 是最优解`
              : `❌ 应切：${correct.join(" / ")}${correct.length > 1 ? "（并列最优）" : ""}`}
          </div>
          <button type="button" className="act" onClick={() => setShowExp(true)}>
            查看讲解
          </button>
        </div>
      )}

      {showExp && (
        <ExplanationDrawer q={q} picked={picked} ok={ok} onClose={() => setShowExp(false)} />
      )}
    </div>
  );
}

/** 三段式讲解（PRD 7.3 / A.3 #4）：最优解 + 进张对比表 + 理论出处 */
function ExplanationDrawer({
  q,
  picked,
  ok,
  onClose,
}: {
  q: Question;
  picked: string | null;
  ok: boolean;
  onClose: () => void;
}) {
  const cands = candidatesOf(q);
  const top = cands.slice(0, 8);
  const bestShanten = top[0]?.shanten_after ?? 0;
  const bestUkeire = top[0]?.ukeire_count ?? 0;
  const notes = (q.explanation.ukeire_table ?? []).filter((r) => r.note);

  return (
    <>
      <div className="drawer-mask" onClick={onClose} />
      <div className="drawer">
        <button type="button" className="close" onClick={onClose}>关闭 ✕</button>
        <h3>{ok ? "✅ 做对了，确认一下理由" : `📖 为什么切 ${q.answer.correct.join(" / ")}`}</h3>
        <p style={{ lineHeight: 1.8, marginTop: 0 }}>{q.explanation.best}</p>

        <h3>进张对比（前 8 候选）</h3>
        <table className="cmp">
          <thead>
            <tr><th>切牌</th><th>切后</th><th>进张</th><th>进张种类</th></tr>
          </thead>
          <tbody>
            {top.map((c) => {
              const isBest = c.shanten_after === bestShanten && c.ukeire_count === bestUkeire;
              const isMine = picked === c.discard;
              return (
                <tr key={c.discard} className={isMine ? "me" : undefined}>
                  <td className={isBest ? "best" : undefined}>
                    <Tile id={c.discard} size={22} /> {c.discard}
                  </td>
                  <td>{c.shanten_after === 0 ? "听牌" : `${c.shanten_after} 向听`}</td>
                  <td>{c.ukeire_count} 张</td>
                  <td style={{ color: "var(--ink-dim)" }}>{c.ukeire_tiles.join(" ") || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {notes.length > 0 && (
          <p className="meta">{notes.map((r) => `${r.discard}：${r.note}`).join("；")}</p>
        )}

        <p className="meta">理论出处：{q.explanation.source}</p>
        <button type="button" className="act primary" onClick={onClose}>继续</button>
      </div>
    </>
  );
}
