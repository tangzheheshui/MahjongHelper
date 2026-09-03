/** 关卡结算（requirements.md）：正确率、耗时、≥80% 解锁下一级 */

import { useEffect, useRef } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import type { QuizRunResult } from "./Quiz";
import { Navbar } from "../components/Navbar";
import { LEVEL_META, PASS_RATE, applyRunResult, nextLevelOf, passRateOf, starsOf } from "../lib/levels";
import { loadProgress, saveProgress } from "../lib/storage";
import type { Level } from "../lib/types";

const PASS_COLOR = "var(--jade-500)";
const FAIL_COLOR = "var(--vermilion)";

export function Result() {
  const { level = "L1", stage = "S1" } = useParams();
  const state = useLocation().state as QuizRunResult | null;
  const applied = useRef(false);

  useEffect(() => {
    if (!state || applied.current) return;
    applied.current = true;
    const { progress } = applyRunResult(loadProgress(), level as Level, state.results);
    saveProgress(progress);
  }, [state, level]);

  if (!state) return <Navigate to="/" replace />;

  const correct = state.results.filter((r) => r.ok).length;
  const total = state.results.length;
  const rate = passRateOf(correct, total);
  const passed = rate >= PASS_RATE;
  const next = nextLevelOf(level as Level);
  const secs = Math.round(state.elapsedMs / 1000);
  const stars = starsOf(rate);
  const color = passed ? PASS_COLOR : FAIL_COLOR;

  // SVG 圆环：周长 2πr = 2π*70 ≈ 439.82
  const R = 70;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - rate);

  return (
    <div>
      <Navbar title="训练结算" subtitle={`${level} ${LEVEL_META[level as Level]?.name ?? ""}`} back={`/levels/${level}`} />
      <div className={`score-card ${passed ? "pass" : "fail"}`}>
        <div className="score-ring">
          <svg width={160} height={160} viewBox="0 0 160 160">
            <circle className="bg" cx={80} cy={80} r={R} />
            <circle
              className="fg"
              cx={80} cy={80} r={R}
              stroke={color}
              strokeDasharray={C}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="num">
            <span className="pct">{Math.round(rate * 100)}%</span>
            <span className="label">正确率</span>
          </div>
        </div>
        <div className="stars-big">
          {"★".repeat(stars)}<span style={{ opacity: .25 }}>{"★".repeat(3 - stars)}</span>
        </div>
        <div className="score-stats">
          <div><b>{correct}</b> / {total} 答对</div>
          <div><b>{Math.floor(secs / 60)}分{secs % 60}秒</b> 用时</div>
        </div>
      </div>

      <div className="panel">
        {passed ? (
          next
            ? <p style={{ margin: 0 }}>🎉 达标！已解锁 <b>{next} {LEVEL_META[next].name}</b></p>
            : <p style={{ margin: 0 }}>🎉 全部通关！你已完成七级训练</p>
        ) : (
          <p style={{ margin: 0 }}>再接再厉：正确率 ≥80% 可解锁下一级。错题已进错题本，重做巩固一下吧。</p>
        )}
      </div>

      <div className="btn-row" style={{ marginTop: 18 }}>
        {passed && next && (
          <Link className="btn primary" to={`/quiz/${next}/S1`}>进入 {next} →</Link>
        )}
        <Link className="btn" to={`/quiz/${level}/${stage}`}>再练一次</Link>
        <Link className="btn" to="/wrong-book">错题本</Link>
        <Link className="btn ghost" to={`/levels/${level}`}>返回关卡</Link>
      </div>
    </div>
  );
}