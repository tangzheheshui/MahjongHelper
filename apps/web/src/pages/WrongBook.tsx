/** 错题本（PRD 6.2 / web-v1.md §一）：按级分组、重做、答对移出 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { QuestionCard } from "../components/QuestionCard";
import { loadBank } from "../lib/bank";
import { LEVEL_META } from "../lib/levels";
import { loadWrongBook, saveWrongBook } from "../lib/storage";
import { LEVELS } from "../lib/types";
import type { Bank, Level } from "../lib/types";

const LV_CLASS: Record<Level, string> = {
  L1: "l1", L2: "l2", L3: "l3", L4: "l4", L5: "l5", L6: "l6", L7: "l7",
};

export function WrongBook() {
  const [bank, setBank] = useState<Bank | null>(null);
  const [wb, setWb] = useState(() => loadWrongBook());
  const [redoId, setRedoId] = useState<string | null>(null);

  useEffect(() => {
    loadBank().then(setBank);
  }, []);

  const entries = Object.values(wb.entries);
  if (entries.length === 0 && !redoId) {
    return (
      <div className="empty">
        <span className="emoji">🎉</span>
        错题本是空的，继续保持！
        <div style={{ marginTop: 18 }}>
          <Link to="/" className="btn primary">回首页训练</Link>
        </div>
      </div>
    );
  }

  const redoQ = bank?.questions.find((q) => q.id === redoId);

  function onRedoAnswered(ok: boolean) {
    if (!redoId) return;
    const book = loadWrongBook();
    const e = book.entries[redoId];
    if (!e) return;
    if (ok) {
      // 答对移出（PRD：答对后移出错题本）
      delete book.entries[redoId];
    } else {
      e.wrongCount += 1;
      e.lastWrongAt = new Date().toISOString();
    }
    saveWrongBook(book);
    setWb(book);
    setRedoId(null);
  }

  return (
    <div>
      <div className="section-head">
        <h2>错题本</h2>
        <span className="hint">共 {entries.length} 题 · 答对即移出</span>
      </div>

      {redoQ ? (
        <div className="panel">
          <p className="sub">重做：答对即移出错题本</p>
          <QuestionCard key={redoQ.id} q={redoQ} onAnswered={onRedoAnswered} />
          <div className="btn-row">
            <button type="button" className="btn ghost" onClick={() => setRedoId(null)}>稍后再做</button>
          </div>
        </div>
      ) : (
        LEVELS.map((lv) => {
          const list = entries.filter((e) => e.level === lv);
          if (list.length === 0) return null;
          return (
            <div key={lv} style={{ marginBottom: 14 }}>
              <div className="kp-group-head">
                <span className={`level-badge ${LV_CLASS[lv]}`} style={{ width: 24, height: 24, fontSize: 11 }}>{lv}</span>
                <span>{LEVEL_META[lv].name}</span>
                <span style={{ color: "var(--ink-dim)", fontWeight: 500, fontSize: 11, marginLeft: "auto" }}>{list.length} 题</span>
              </div>
              {list.map((e) => (
                <div key={e.id} className="wb-entry">
                  <span className="info">
                    <span className="kp">{e.knowledgePoint}</span>
                    <div className="meta-row">错 {e.wrongCount} 次 · 最近 {e.lastWrongAt.slice(0, 10)}</div>
                  </span>
                  <span className="wrong-count">×{e.wrongCount}</span>
                  <button type="button" className="btn primary" style={{ padding: "8px 14px" }} onClick={() => setRedoId(e.id)}>重做</button>
                </div>
              ))}
            </div>
          );
        })
      )}
    </div>
  );
}