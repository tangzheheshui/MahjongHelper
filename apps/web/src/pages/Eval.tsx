/** 评测页：能力评测入口 + 最近一次评测结果。
 *  雷达 = 最近一次水平测试 L4-L7 的真实每级正确率（placement.perLevel），
 *  综合得分 = 该次测试总答对/总题数——不造系数，没测过就不显示。 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { loadPlacement } from "../lib/storage";
import type { PlacementResult } from "../lib/storage";
import { LEVEL_META } from "../lib/levels";
import { LEVELS } from "../lib/types";
import type { Level } from "../lib/types";

/** 水平测试覆盖的级（web-v1.md §一：L4-L7 各 2 题） */
const EVAL_LEVELS = LEVELS.filter((l) => ["L4", "L5", "L6", "L7"].includes(l));

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
    <svg viewBox="0 0 56 56" width={56} height={56}>
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

  /** 4 维 = L4-L7 各级真实正确率（0-1）；该级没做到题则 0 */
  const abilityValues = EVAL_LEVELS.map((lv) => {
    const s = placement?.perLevel?.[lv];
    return s && s.total > 0 ? s.ok / s.total : 0;
  });

  /** 综合得分 = 该次测试总答对 / 总题数 */
  const overall = (() => {
    if (!placement) return 0;
    let ok = 0, total = 0;
    for (const lv of LEVELS) {
      const s = placement.perLevel?.[lv];
      if (s) { ok += s.ok; total += s.total; }
    }
    return total > 0 ? ok / total : 0;
  })();

  return (
    <div>
      <h1 className="page-title">能力评测</h1>
      <p className="page-subtitle">快速摸底 · 定级 + 推荐起始关卡</p>

      {/* 评测介绍卡 */}
      <section className="eval-intro-v2">
        <div className="ei-icon">🧪</div>
        <h2>水平测试</h2>
        <p>
          8 题何切（L4–L7 各 2 题，级内随机抽），按各级正确率定级，
          并生成 L4–L7 四维能力雷达与推荐起始关卡。
        </p>
        <div className="eval-meta-v2">
          <div className="em"><span className="v">8</span>题目数量</div>
          <div className="em"><span className="v">~3</span>预计分钟</div>
          <div className="em"><span className="v">4</span>能力维度</div>
        </div>
        <Link className="eval-cta-v2" to="/placement?from=%2Feval">
          {placement ? "重新评测" : "▶ 开始水平测试"}
        </Link>
      </section>

      {/* 最近一次评测 */}
      <h3 className="eval-history-title">📋 最近一次评测</h3>
      {placement ? (
        <div className="eval-history-list-v2">
          <div className="eval-history-item-v2">
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
                定级：{placement.grade} · 推荐起始 {placement.startLevel} {LEVEL_META[placement.startLevel].name}
              </div>
              <div className="ei-desc" style={{ marginTop: 2 }}>
                {EVAL_LEVELS.map((lv) => {
                  const s = placement.perLevel?.[lv];
                  return `${lv} ${s && s.total > 0 ? Math.round((s.ok / s.total) * 100) : 0}%`;
                }).join(" · ")}
              </div>
            </div>
            <div className="eval-score-v2">
              <div className="v">{Math.round(overall * 100)}</div>
              <div className="k">综合得分</div>
            </div>
          </div>
        </div>
      ) : (
        <p className="empty">
          <span className="emoji">📊</span>
          还没有评测记录，完成首次评测后生成能力雷达
        </p>
      )}
    </div>
  );
}
