/** 题库页 v3：难度 + 标签双维度筛选，题目卡片列表 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { loadBank } from "../lib/bank";
import { tileLabel } from "../lib/levels";
import type { Bank, Question } from "../lib/types";

type Difficulty = "all" | "easy" | "medium" | "hard";
type TagFilter = "all" | "daida" | "tingpai" | "duizi" | "jingoudiao";

const DIFF_LABEL: Record<Difficulty, string> = {
  all: "全部", easy: "简单", medium: "中等", hard: "困难",
};

const TAG_LABEL: Record<TagFilter, string> = {
  all: "全部", daida: "拆搭", tingpai: "听牌", duizi: "对子", jingoudiao: "金钩钓",
};

/** 从知识点推导标签 */
function tagOf(q: Question): TagFilter {
  const kp = q.knowledge_point;
  if (kp.includes("金钩钓")) return "jingoudiao";
  if (kp.includes("听牌") || kp.includes("一向听")) return "tingpai";
  if (kp.includes("对子") || kp.includes("雀头")) return "duizi";
  if (kp.includes("搭子") || kp.includes("拆搭") || kp.includes("嵌张") || kp.includes("两面") || kp.includes("边张")) return "daida";
  return "all";
}

/** 题面简述（从知识点生成） */
function questionBrief(q: Question): string {
  const typeMap: Record<string, string> = {
    what_to_discard: "选择应该打出的牌",
    ukeire_compare: "比较进张数，选择最优切牌",
    mentsu_identify: "识别手牌中的搭子类型",
    wait_choose: "选择听牌形式",
  };
  return typeMap[q.question_type] ?? q.knowledge_point;
}

export function Bank() {
  const [bank, setBank] = useState<Bank | null>(null);
  const [diff, setDiff] = useState<Difficulty>("all");
  const [tag, setTag] = useState<TagFilter>("all");

  useEffect(() => {
    void loadBank().then(setBank);
  }, []);

  const filtered = useMemo(() => {
    if (!bank) return [];
    return bank.questions.filter((q) => {
      if (diff !== "all" && q.difficulty !== diff) return false;
      if (tag !== "all" && tagOf(q) !== tag) return false;
      return true;
    });
  }, [bank, diff, tag]);

  return (
    <div>
      <h1 className="page-title">题库</h1>
      <p className="page-subtitle">按难度和标签筛选题目 · 共 {bank?.questions.length ?? 0} 题</p>

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
          <span className="fl-label">标签</span>
          {(Object.keys(TAG_LABEL) as TagFilter[]).map((t) => (
            <button
              key={t}
              className={`filter-chip-v2 ${tag === t ? "active" : ""}`}
              onClick={() => setTag(t)}
            >
              {TAG_LABEL[t]}
            </button>
          ))}
        </div>
      </div>

      {/* 题目列表 */}
      {filtered.length > 0 ? (
        <div className="question-list-v2">
          {filtered.slice(0, 30).map((q) => (
            <Link
              key={q.id}
              className="question-card-v2"
              to={`/quiz/${q.level}/S1`}
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
                  <span className="q-tag kp">{TAG_LABEL[tagOf(q)]}</span>
                  <span className="q-tag kp">{q.level}</span>
                </div>
                <div className="question-text-v2">{questionBrief(q)}</div>
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
