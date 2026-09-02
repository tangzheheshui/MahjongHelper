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
  mentsuPairOf,
  orderHand,
  shantenBefore,
  tileLabel,
  tilesLabel,
} from "../lib/levels";
import type { MentsuType, Question, WaitOption } from "../lib/types";

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
  const isMi = q.question_type === "mentsu_identify";
  const isWc = q.question_type === "wait_choose";
  const miPair = mentsuPairOf(q);

  const prompt =
    isWtd
      ? sh === 0 ? "切最优牌后听牌" : `切最优牌后 ${sh} 向听`
      : q.question_type === "ukeire_compare"
        ? "两种切法，哪种进张更多？"
        : isMi
          ? "高亮的这两张是什么搭子？"
          : "两种听牌留法，哪种和牌张数更多？";

  return (
    <div className="qcard">
      <p className="sub">
        考点：{q.knowledge_point}
        {isWtd ? "" : isMi ? " · 搭子识别" : " · 二选一"} ·{" "}
        {q.difficulty === "easy" ? "易" : q.difficulty === "medium" ? "中" : "难"}
      </p>
      <p className="shanten-line">{prompt}</p>

      <div className="hand">
        {orderHand(q.hand).map((t, i) => (
          <Tile
            key={`${t}-${i}`}
            id={t}
            size={isWtd || isMi ? 46 : 32}
            selected={(isWtd && picked === t) || (isMi && !judged && miPair.includes(t))}
            onClick={isWtd && !judged ? () => judge(t) : undefined}
          />
        ))}
      </div>

      {!isWtd && !judged && (
        <div>
          {isMi
            ? (Object.keys(MENTSU_TYPE_LABEL) as MentsuType[]).map((t) => (
                <button key={t} type="button" className="act" onClick={() => judge(t)}>
                  {MENTSU_TYPE_LABEL[t]}
                </button>
              ))
            : isWc
              ? ((q.answer.options as WaitOption[]) ?? []).map((o) => (
                  <button key={o.value} type="button" className="act" onClick={() => judge(o.value)}>
                    {o.label}
                  </button>
                ))
              : (q.answer.options ?? []).map((o) => (
                  <button
                    key={o.discard}
                    type="button"
                    className="act"
                    onClick={() => o.discard && judge(o.discard)}
                  >
                    切 {tileLabel(o.discard ?? "")}
                  </button>
                ))}
        </div>
      )}

      {judged && (
        <div className="panel">
          <div className={`verdict ${ok ? "ok" : "ng"}`}>
            {ok
              ? isWtd
                ? `✅ 正确！切 ${picked ? tileLabel(picked) : ""} 是最优解`
                : `✅ 正确！${isMi ? MENTSU_TYPE_LABEL[picked as MentsuType] : picked}`
              : `❌ 应选：${correctLabelOf(q)}${!isMi && correct.length > 1 ? "（并列最优）" : ""}`}
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
      <div className="drawer">
        <button type="button" className="close" onClick={onClose}>关闭 ✕</button>
        <h3>{ok ? "✅ 做对了，确认一下理由" : `📖 为什么是 ${correctLabelOf(q)}`}</h3>
        <p style={{ lineHeight: 1.8, marginTop: 0 }}>{q.explanation.best}</p>

        {showTable && (
          <>
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

        <p className="meta">理论出处：{q.explanation.source}</p>
        <button type="button" className="act primary" onClick={onClose}>继续</button>
      </div>
    </>
  );
}
