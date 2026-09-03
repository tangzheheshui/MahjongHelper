/**
 * 单题作答组件：手牌点选 / 选项点选 → 判分 → 三段式讲解抽屉。
 * 被 Quiz（关卡）、WrongBook（重做）、Placement（测试）三处复用。
 */

import { useState } from "react";
import { Tile } from "./Tile";
import {
  MENTSU_TYPE_LABEL,
  candidatesOf,
  correctLabelOf,
  isCorrect,
  mentsuPairKey,
  mentsuTypeOf,
  orderHand,
  shantenBefore,
  tileLabel,
  tilesLabel,
} from "../lib/levels";
import type { Question, WaitOption } from "../lib/types";

export interface QuestionCardProps {
  q: Question;
  /** 作答后回调（ok=是否正确，answer=用户答案） */
  onAnswered?: (ok: boolean, answer: string) => void;
}

function difficultyClass(d: Question["difficulty"]) {
  return d === "easy" ? "diff-easy" : d === "medium" ? "diff-medium" : "diff-hard";
}
function difficultyLabel(d: Question["difficulty"]) {
  return d === "easy" ? "易" : d === "medium" ? "中" : "难";
}

export function QuestionCard({ q, onAnswered }: QuestionCardProps) {
  const [picked, setPicked] = useState<string | null>(null);
  const [miSel, setMiSel] = useState<string[]>([]);
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

  /** mi：从 14 张里点选两张组成题目要求的搭子（再点取消；选第三张换掉最早那张） */
  function toggleMi(t: string) {
    if (judged) return;
    const next = miSel.includes(t) ? miSel.filter((x) => x !== t) : miSel.length >= 2 ? [miSel[1], t] : [...miSel, t];
    setMiSel(next);
    if (next.length === 2) judge(mentsuPairKey(next));
  }

  const sh = shantenBefore(q);
  const isWtd = q.question_type === "what_to_discard";
  const isMi = q.question_type === "mentsu_identify";
  const isWc = q.question_type === "wait_choose";
  const miType = mentsuTypeOf(q);

  const prompt =
    isWtd
      ? sh === 0
        ? <>切出<b> 最优牌 </b>，<b>听牌</b>。</>
        : <>切出<b> 最优牌 </b>，进入 <b>{sh} 向听</b>。</>
      : q.question_type === "ukeire_compare"
        ? "两种切法，哪种进张更多？"
        : isMi
          ? <>从手牌中点选两张，组成一个【{miType ? MENTSU_TYPE_LABEL[miType] : "搭子"}】。</>
          : "两种听牌留法，哪种和牌张数更多？";

  return (
    <div className="qcard">
      <div className="qhead">
        <span className="chip kp">{q.knowledge_point}</span>
        {!isWtd && <span className="chip">{isMi ? `已选 ${miSel.length}/2` : "二选一"}</span>}
        <span className={`chip ${difficultyClass(q.difficulty)}`}>{difficultyLabel(q.difficulty)}</span>
      </div>
      <p className="shanten-line">{prompt}</p>

      <div className="hand-panel">
        <div className="hand">
          {orderHand(q.hand).map((t, i) => (
            <Tile
              key={`${t}-${i}`}
              id={t}
              size={isWtd || isMi ? 44 : 32}
              selected={(isWtd && picked === t) || (isMi && miSel.includes(t))}
              onClick={isWtd && !judged ? () => judge(t) : isMi && !judged ? () => toggleMi(t) : undefined}
            />
          ))}
        </div>
      </div>

      {!isWtd && !judged && (
        <div className="options">
          {isMi ? null : isWc
            ? ((q.answer.options as WaitOption[]) ?? []).map((o) => (
                <button key={o.value} type="button" className="opt-card" onClick={() => judge(o.value)}>
                  <span className="label">{o.label}</span>
                </button>
              ))
            : (q.answer.options ?? []).map((o) => (
                <button
                  key={o.discard}
                  type="button"
                  className="opt-card"
                  onClick={() => o.discard && judge(o.discard)}
                >
                  <Tile id={o.discard ?? ""} size={32} />
                  <span className="label">切 {tileLabel(o.discard ?? "")}</span>
                  <span className="meta">→</span>
                </button>
              ))}
        </div>
      )}

      {judged && (
        <div className={`verdict ${ok ? "ok" : "ng"}`}>
          <span className="icon">{ok ? "✅" : "❌"}</span>
          <div>
            {ok
              ? isWtd
                ? <>正确！切 <span className="ans">{picked ? tileLabel(picked) : ""}</span> 是最优解。</>
                : <>正确！{isMi ? tilesLabel(miSel) : picked}</>
              : <>应选：<span className="ans">{correctLabelOf(q)}</span>{!isMi && correct.length > 1 ? "（并列最优）" : ""}</>}
          </div>
          <button type="button" className="btn ghost" style={{ marginLeft: "auto" }} onClick={() => setShowExp(true)}>
            查看讲解 →
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
  // mi/wc 无切牌快照语义（web-v1.md §二.5a）：讲解只走文案与出处，不显示进张对比表
  const showTable =
    q.question_type === "what_to_discard" || q.question_type === "ukeire_compare";
  const cands = candidatesOf(q);
  const top = cands.slice(0, 8);
  const bestShanten = top[0]?.shanten_after ?? 0;
  const bestUkeire = top[0]?.ukeire_count ?? 0;
  const notes = (q.explanation.ukeire_table ?? []).filter((r) => r.note);
  void picked;

  return (
    <>
      <div className="drawer-mask" onClick={onClose} />
      <div className="drawer" role="dialog" aria-label="讲解">
        <div className="handle" />
        <h3>
          <span>{ok ? "✅ 做对了，确认一下理由" : `📖 为什么是 ${correctLabelOf(q)}`}</span>
          <button type="button" className="close" onClick={onClose} aria-label="关闭">✕</button>
        </h3>
        <div className="exp-text">{q.explanation.best}</div>

        {showTable && (
          <>
            <h3 style={{ fontSize: 14, marginTop: 18 }}>进张对比（前 8 候选）</h3>
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
                        <Tile id={c.discard} size={22} /> {tileLabel(c.discard)}
                      </td>
                      <td>{c.shanten_after === 0 ? "听牌" : `${c.shanten_after} 向听`}</td>
                      <td>{c.ukeire_count} 张</td>
                      <td style={{ color: "var(--ink-dim)" }}>{tilesLabel(c.ukeire_tiles) || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {notes.length > 0 && (
              <p className="meta">{notes.map((r) => `${tileLabel(r.discard)}：${r.note}`).join("；")}</p>
            )}
          </>
        )}

        <p className="meta" style={{ marginTop: 14 }}>理论出处：{q.explanation.source}</p>
        <div className="btn-row">
          <button type="button" className="btn primary" onClick={onClose}>继续下一题</button>
        </div>
      </div>
    </>
  );
}