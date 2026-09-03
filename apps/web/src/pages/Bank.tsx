/** 题库页：难度 + 专项分类（category 字段，question-bank.md §九）双维筛选。
 *  卡片直达单题练习（/drill?id=）；支持 ?difficulty= 预选（首页「极限挑战」入口）。 */

import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { loadBank } from "../lib/bank";
import { tileLabel } from "../lib/levels";
import { SPECIALS } from "../lib/specials";
import type { Bank, Category } from "../lib/types";

type Difficulty = "all" | "easy" | "medium" | "hard";
type CatFilter = "all" | Category;

const DIFF_LABEL: Record<Difficulty, string> = {
  all: "全部", easy: "简单", medium: "中等", hard: "困难",
};

export function Bank() {
  const [bank, setBank] = useState<Bank | null>(null);
  const [search] = useSearchParams();
  const initialDiff = search.get("difficulty");
  const [diff, setDiff] = useState<Difficulty>(
    initialDiff === "easy" || initialDiff === "medium" || initialDiff === "hard" ? initialDiff : "all",
  );
  const [cat, setCat] = useState<CatFilter>("all");

  useEffect(() => {
    void loadBank().then(setBank);
  }, []);

  const catLabel = useMemo(() => {
    const m = new Map<string, string>([["all", "全部"], ...SPECIALS.map((s) => [s.id, s.name] as [string, string])]);
    return (c: string) => m.get(c) ?? "全部";
  }, []);

  const filtered = useMemo(() => {
    if (!bank) return [];
    return bank.questions.filter((q) => {
      if (diff !== "all" && q.difficulty !== diff) return false;
      if (cat !== "all" && q.category !== cat) return false;
      return true;
    });
  }, [bank, diff, cat]);

  const fromBank = encodeURIComponent("/bank");

  return (
    <div>
      <h1 className="page-title">题库</h1>
      <p className="page-subtitle">按难度和专项筛选题目 · 共 {bank?.questions.length ?? 0} 题</p>

      {/* 筛选栏 */}
      <div className="filter-bar-v2">
        <div className="filter-row-v2">
          <span className="fl-label">难度</span>
          {(Object.keys(DIFF_LABEL) as Difficulty[]).map((d) => (
            <button
              key={d}
              className={`filter-chip-v2 ${diff === d ? "active" : ""}`}
              onClick={() => setDiff(d)}
            >
              {DIFF_LABEL[d]}
            </button>
          ))}
        </div>
        <div className="filter-row-v2">
          <span className="fl-label">专项</span>
          <button
            className={`filter-chip-v2 ${cat === "all" ? "active" : ""}`}
            onClick={() => setCat("all")}
          >
            全部
          </button>
          {SPECIALS.map((s) => (
            <button
              key={s.id}
              className={`filter-chip-v2 ${cat === s.id ? "active" : ""}`}
              onClick={() => setCat(s.id)}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* 题目列表：点卡片 = 练这道题（不再是开该级随机组卷） */}
      {filtered.length > 0 ? (
        <div className="question-list-v2">
          {filtered.slice(0, 30).map((q) => (
            <Link
              key={q.id}
              className="question-card-v2"
              to={`/drill?id=${q.id}&from=${fromBank}`}
            >
              <div className="tile-preview">
                {q.hand.slice(0, 3).map((t, i) => (
                  <span key={i} className={`mini-tile ${i === 2 ? "red" : ""}`}>
                    {tileLabel(t).slice(0, 2)}
                  </span>
                ))}
              </div>
              <div className="question-info-v2">
                <div className="question-tags-v2">
                  <span className={`q-tag ${q.difficulty}`}>
                    {q.difficulty === "easy" ? "简单" : q.difficulty === "medium" ? "中等" : "困难"}
                  </span>
                  <span className="q-tag kp">{catLabel(q.category)}</span>
                  <span className="q-tag kp">{q.level}</span>
                </div>
                <div className="question-text-v2">{q.knowledge_point}</div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="empty">
          <span className="emoji">🔍</span>
          没有符合条件的题目
        </p>
      )}

      {filtered.length > 0 && (
        <div className="filter-result-v2">
          共筛选出 {filtered.length} 题{filtered.length > 30 ? "，显示前 30 题" : ""}
        </div>
      )}
    </div>
  );
}
