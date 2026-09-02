/** 错题本（PRD 6.2 / web-v1.md §一）：按级分组、重做、答对移出 */

import { useEffect, useState } from "react";
import { QuestionCard } from "../components/QuestionCard";
import { loadBank } from "../lib/bank";
import { LEVEL_META } from "../lib/levels";
import { loadWrongBook, saveWrongBook } from "../lib/storage";
import { LEVELS } from "../lib/types";
import type { Bank, Level } from "../lib/types";

export function WrongBook() {
  const [bank, setBank] = useState<Bank | null>(null);
  const [wb, setWb] = useState(() => loadWrongBook());
  const [redoId, setRedoId] = useState<string | null>(null);

  useEffect(() => {
    loadBank().then(setBank);
  }, []);

  const entries = Object.values(wb.entries);
  if (entries.length === 0 && !redoId) {
    return <p className="empty">错题本是空的，继续保持 👍</p>;
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
      <h2 style={{ fontSize: 17, margin: "0 0 12px" }}>错题本（{entries.length}）</h2>

      {redoQ ? (
        <div className="panel">
          <p className="sub">重做：答对即移出错题本</p>
          <QuestionCard key={redoQ.id} q={redoQ} onAnswered={onRedoAnswered} />
          <button type="button" className="act" onClick={() => setRedoId(null)}>稍后再做</button>
        </div>
      ) : (
        LEVELS.map((lv) => {
          const list = entries.filter((e) => e.level === lv);
          if (list.length === 0) return null;
          return (
            <div key={lv} style={{ marginBottom: 18 }}>
              <h3 style={{ fontSize: 14, color: "var(--ink-dim)" }}>
                {lv} {LEVEL_META[lv].name}
              </h3>
              {list.map((e) => (
                <div key={e.id} className="panel" style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px" }}>
                  <span style={{ flex: 1 }}>
                    {e.knowledgePoint}
                    <span className="meta" style={{ marginTop: 0 }}> 错 {e.wrongCount} 次 · {e.lastWrongAt.slice(0, 10)}</span>
                  </span>
                  <button type="button" className="act" onClick={() => setRedoId(e.id)}>重做</button>
                </div>
              ))}
            </div>
          );
        })
      )}
    </div>
  );
}
