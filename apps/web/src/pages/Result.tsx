/** 关卡结算（PRD 6.2）：正确率、耗时、≥80% 解锁下一级 */

import { useEffect, useRef } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import type { QuizRunResult } from "./Quiz";
import { LEVEL_META, PASS_RATE, applyRunResult, nextLevelOf, passRateOf, starsOf } from "../lib/levels";
import { loadProgress, saveProgress } from "../lib/storage";
import type { Level } from "../lib/types";

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

  return (
    <div>
      <h2 style={{ fontSize: 17 }}>{level} {LEVEL_META[level as Level]?.name} · 结算</h2>
      <div className={`score-big ${passed ? "ok" : "ng"}`}>
        {Math.round(rate * 100)}%
      </div>
      <p style={{ textAlign: "center", margin: 0 }}>
        答对 {correct} / {total} · 用时 {Math.floor(secs / 60)}分{secs % 60}秒
        {" · "}<span className="stars">{"★".repeat(starsOf(rate))}{"☆".repeat(3 - starsOf(rate))}</span>
      </p>

      <div className="panel">
        {passed
          ? next
            ? <p style={{ margin: 0 }}>🎉 达标！已解锁 <b>{next} {LEVEL_META[next].name}</b></p>
            : <p style={{ margin: 0 }}>🎉 全部通关！你已完成七级训练</p>
          : <p style={{ margin: 0 }}>再接再厉：正确率 ≥80% 可解锁下一级。错题已进错题本，重做巩固一下吧。</p>}
      </div>

      <div style={{ marginTop: 16 }}>
        {passed && next && (
          <Link className="act" to={`/quiz/${next}/S1`} style={{ textDecoration: "none" }}>进入 {next} →</Link>
        )}
        <Link className="act" to={`/quiz/${level}/${stage}`} style={{ textDecoration: "none" }}>再练一次</Link>
        <Link className="act" to="/wrong-book" style={{ textDecoration: "none" }}>错题本</Link>
        <Link className="act" to="/" style={{ textDecoration: "none" }}>首页</Link>
      </div>
    </div>
  );
}
