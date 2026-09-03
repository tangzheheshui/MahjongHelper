/** 评测页 v3：能力评测介绍 + 历史评测记录 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { loadPlacement } from "../lib/storage";
import type { PlacementResult } from "../lib/storage";

/** 缩略雷达图 */
function RadarThumb({ values, color = "#2d6a4f" }: { values: number[]; color?: string }) {
  const cx = 28, cy = 28, R = 20;
  const n = values.length;
  const point = (i: number, r: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  };
  const rings = [1, 0.5].map((f) =>
    Array.from({ length: n }, (_, i) => point(i, R * f).join(",")).join(" "),
  );
  const dataPoints = values.map((v, i) => point(i, R * Math.max(0, Math.min(1, v))).join(",")).join(" ");
  return (
    <svg viewBox="0 0 56 56" width="56" height="56">
      {rings.map((pts, i) => (
        <polygon key={i} points={pts} fill="none" stroke="#e0d7be" strokeWidth="0.8" />
      ))}
      <polygon points={dataPoints} fill={`${color}33`} stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

export function Eval() {
  const [placement, setPlacement] = useState<PlacementResult | null>(null);

  useEffect(() => {
    setPlacement(loadPlacement());
    const onStorage = () => setPlacement(loadPlacement());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /** 从 placement 推导 4 维能力值（入门/初级/中级/高级对应 L1-L7） */
  const abilityValues = (() => {
    if (!placement) return [0.3, 0.3, 0.3, 0.3];
    const gradeScore: Record<string, number> = { "入门": 0.4, "初级": 0.55, "中级": 0.7, "高级": 0.85 };
    const base = gradeScore[placement.grade] ?? 0.5;
    return [base, base * 0.9, base * 0.8, base * 0.7];
  })();

  return (
    <div>
      <h1 className="page-title">能力评测</h1>
      <p className="page-subtitle">全面摸底，生成专属能力雷达</p>

      {/* 评测介绍卡 */}
      <section className="eval-intro-v2">
        <div className="ei-icon">🧪</div>
        <h2>全套能力摸底</h2>
        <p>
          30 题综合评测，覆盖拆搭、听牌、对子、碰杠、金钩钓五大维度，
          生成你的专属能力雷达图与提升建议。
        </p>
        <div className="eval-meta-v2">
          <div className="em"><span className="v">30</span>题目数量</div>
          <div className="em"><span className="v">~15</span>预计分钟</div>
          <div className="em"><span className="v">5</span>能力维度</div>
        </div>
        <Link className="eval-cta-v2" to="/placement">
          ▶ 开始能力评测
        </Link>
      </section>

      {/* 历史评测记录 */}
      <h3 className="eval-history-title">📋 历史评测记录</h3>
      {placement ? (
        <div className="eval-history-list-v2">
          <Link className="eval-history-item-v2" to="/placement">
            <div className="eval-radar-mini-v2">
              <RadarThumb values={abilityValues} />
            </div>
            <div className="eval-info-v2">
              <div className="ei-date">
                {new Date(placement.takenAt).toLocaleDateString("zh-CN", {
                  year: "numeric", month: "2-digit", day: "2-digit",
                })}
              </div>
              <div className="ei-desc">
                定级：{placement.grade} · 推荐起始 {placement.startLevel}
              </div>
            </div>
            <div className="eval-score-v2">
              <div className="v">{Math.round(abilityValues.reduce((a, b) => a + b, 0) / abilityValues.length * 100)}</div>
              <div className="k">综合得分</div>
            </div>
          </Link>
        </div>
      ) : (
        <p className="empty">
          <span className="emoji">📊</span>
          还没有评测记录，完成首次评测后生成能力雷达
        </p>
      )}

      <p className="filter-result-v2" style={{ marginTop: 16 }}>
        评测历史记录功能持续完善中 · 更多维度分析即将上线
      </p>
    </div>
  );
}
