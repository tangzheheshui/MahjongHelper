/** 首页 v3：今日进度 Hero + 薄弱强化 + 能力概览 + 快捷训练 + 最近记录 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { loadBank, questionsOf } from "../lib/bank";
import { LEVEL_META, STAGE_OF_LEVEL, nextTrainingLevel } from "../lib/levels";
import { SPECIALS, questionsOfSpecial } from "../lib/specials";
import { loadPlacement, loadProgress, loadStats, loadWrongBook } from "../lib/storage";
import { LEVELS } from "../lib/types";
import type { Bank, Level } from "../lib/types";

/** 今日练习的展示目标（软目标，只影响环的满刻度，无打卡/连击机制） */
const DAILY_GOAL = 10;

/** 能力雷达（专项数即维度数，从各关卡 bestRate 推导） */
function RadarMini({ values }: { values: number[] }) {
  const cx = 40, cy = 40, R = 30;
  const n = values.length;
  const point = (i: number, r: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  };
  const rings = [1, 0.66, 0.33].map((f) =>
    Array.from({ length: n }, (_, i) => point(i, R * f).join(",")).join(" "),
  );
  const dataPoints = values.map((v, i) => point(i, R * Math.max(0, Math.min(1, v))).join(",")).join(" ");
  return (
    <svg viewBox="0 0 80 80" width="80" height="80">
      {rings.map((pts, i) => (
        <polygon key={i} points={pts} fill="none" stroke="#e0d7be" strokeWidth="0.8" />
      ))}
      <polygon points={dataPoints} fill="rgba(45,106,79,.25)" stroke="#2d6a4f" strokeWidth="1.5" />
      {values.map((v, i) => {
        const [x, y] = point(i, R * Math.max(0, Math.min(1, v)));
        return <circle key={i} cx={x} cy={y} r="2" fill="#2d6a4f" />;
      })}
    </svg>
  );
}

export function Home() {
  const [progress, setProgress] = useState(() => loadProgress());
  const [placement, setPlacement] = useState(() => loadPlacement());
  const [stats, setStats] = useState(() => loadStats());
  const [wrongCount, setWrongCount] = useState(0);
  const [bank, setBank] = useState<Bank | null>(null);

  useEffect(() => {
    setWrongCount(Object.keys(loadWrongBook().entries).length);
    void loadBank().then(setBank);
    const onStorage = () => {
      setProgress(loadProgress());
      setPlacement(loadPlacement());
      setStats(loadStats());
      setWrongCount(Object.keys(loadWrongBook().entries).length);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /** 今日/累计/正确率：全部来自 nk.stats 的真实答题计数 */
  const todayDone = stats.todayAnswered;
  const totalDone = stats.totalAnswered;
  const overallRate = stats.totalAnswered > 0 ? stats.totalCorrect / stats.totalAnswered : 0;

  /** 继续训练目标：最低的未开始/未达标级（练得最好的级不需要被推荐） */
  const continueTarget = useMemo<Level>(() => nextTrainingLevel(progress), [progress]);

  /** 能力值（每个专项一维）：该专项题目所在关卡 bestRate 的平均；没练过就是 0，不造假基线 */
  const abilityValues = useMemo(() => {
    if (!bank) return SPECIALS.map(() => 0);
    return SPECIALS.map((sp) => {
      const qs = questionsOfSpecial(bank.questions, sp.id);
      if (qs.length === 0) return 0;
      const levels = [...new Set(qs.map((q) => q.level))];
      const rates = levels.map((lv) => progress.levels[lv]?.bestRate).filter((r): r is number => r !== undefined);
      return rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
    });
  }, [bank, progress]);

  /** 薄弱专项：能力值最低的 2 个 */
  const weakSpecials = useMemo(() => {
    return SPECIALS
      .map((s, i) => ({ ...s, value: abilityValues[i] }))
      .sort((a, b) => a.value - b.value)
      .slice(0, 2);
  }, [abilityValues]);

  /** 最近练习记录：从 progress completedAt 推导（题数取该级题库真实库存） */
  const recentRecords = useMemo(() => {
    return LEVELS
      .map((lv) => ({
        level: lv,
        meta: LEVEL_META[lv],
        rate: progress.levels[lv]?.bestRate,
        completedAt: progress.levels[lv]?.completedAt,
        count: bank ? questionsOf(bank, lv).length : 0,
      }))
      .filter((r) => r.rate !== undefined)
      .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
      .slice(0, 3);
  }, [progress, bank]);

  const ringPercent = Math.min(1, todayDone / DAILY_GOAL);
  const circumference = 2 * Math.PI * 34;

  return (
    <div>
      {/* 今日进度 Hero */}
      <section className="today-hero">
        <div className="today-hero-row">
          <div className="ring-progress">
            <svg width="84" height="84">
              <circle cx="42" cy="42" r="34" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="6" />
              <circle
                cx="42" cy="42" r="34" fill="none"
                stroke="#c7941d" strokeWidth="6" strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - ringPercent)}
              />
            </svg>
            <div className="ring-center">
              <span className="ring-num">{todayDone}/{DAILY_GOAL}</span>
              <span className="ring-unit">今日目标</span>
            </div>
          </div>
          <div className="today-hero-info">
            <div className="label">今日训练进度</div>
            <h2>{continueTarget} · {LEVEL_META[continueTarget].name}</h2>
            <div className="today-stats">
              <div className="ts"><div className="v">{Math.max(0, DAILY_GOAL - todayDone)}</div><div className="k">剩余待做</div></div>
              <div className="ts"><div className="v">{totalDone}</div><div className="k">累计完成</div></div>
              <div className="ts"><div className="v">{Math.round(overallRate * 100)}%</div><div className="k">正确率</div></div>
            </div>
            <Link className="today-cta" to={`/quiz/${continueTarget}/${STAGE_OF_LEVEL}?from=%2F`}>
              ▶ 开始今日训练
            </Link>
          </div>
        </div>
      </section>

      {/* 薄弱强化 */}
      <section className="weak-card">
        <div className="wc-head">
          <h3>🎯 薄弱强化</h3>
        </div>
        <div className="weak-items">
          <Link className="weak-item" to="/wrong-book">
            <span className="wi-icon">📒</span>
            <span className="wi-title">错题本</span>
            <span className="wi-desc">{wrongCount > 0 ? `${wrongCount} 道待复习` : "暂无错题"}</span>
          </Link>
          <Link className="weak-item" to="/special">
            <span className="wi-icon">⚡</span>
            <span className="wi-title">薄弱专项</span>
            <span className="wi-desc">{weakSpecials.length > 0 ? weakSpecials[0].name : "自动识别弱项"}</span>
          </Link>
        </div>
      </section>

      {/* 能力概览 */}
      <Link className="ability-card" to="/eval">
        <div className="radar-mini">
          <RadarMini values={abilityValues} />
        </div>
        <div className="ability-info">
          <h3>能力概览</h3>
          <p>
            {abilityValues.some((v) => v > 0)
              ? `${SPECIALS[abilityValues.indexOf(Math.max(...abilityValues))].name}较强，${SPECIALS[abilityValues.indexOf(Math.min(...abilityValues.filter((v) => v > 0)))]?.name ?? "基础"}有待提升`
              : "完成评测后生成能力雷达"}
          </p>
          <span className="ability-link">前往评测看完整报告 →</span>
        </div>
      </Link>

      {/* 快捷训练 */}
      <section className="quick-section">
        <div className="section-head" style={{ margin: "18px 2px 10px" }}>
          <h2>⚡ 快捷训练</h2>
        </div>
        <div className="quick-scroll">
          <Link className="quick-item-v2" to={`/quiz/${continueTarget}/${STAGE_OF_LEVEL}?from=%2F`}>
            <span className="qi-icon">🎲</span>
            <span className="qi-title">练 {continueTarget}</span>
            <span className="qi-desc">{LEVEL_META[continueTarget].name}</span>
          </Link>
          <Link className="quick-item-v2" to="/special/structure">
            <span className="qi-icon">🔧</span>
            <span className="qi-title">整手拆搭</span>
            <span className="qi-desc">满员与拆搭顺序</span>
          </Link>
          <Link className="quick-item-v2" to="/special/tenpai">
            <span className="qi-icon">👂</span>
            <span className="qi-title">听牌判断</span>
            <span className="qi-desc">听牌形式与留法</span>
          </Link>
          <Link className="quick-item-v2" to="/bank?difficulty=hard">
            <span className="qi-icon">🔥</span>
            <span className="qi-title">极限挑战</span>
            <span className="qi-desc">困难题筛选</span>
          </Link>
        </div>
      </section>

      {/* 最近练习记录 */}
      <section className="record-card">
        <div className="rc-head">
          <h3>📝 最近练习</h3>
          <Link className="more" to="/mine">查看全部 →</Link>
        </div>
        {recentRecords.length > 0 ? (
          <div className="record-list">
            {recentRecords.map((r) => (
              <div className="record-item" key={r.level}>
                <div className="ri-icon">🀄</div>
                <div className="ri-info">
                  <div className="ri-name">{r.level} · {r.meta.name}</div>
                  <div className="ri-meta">
                    {r.completedAt ? new Date(r.completedAt).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" }) : "未完成"} · {r.count}题
                  </div>
                </div>
                <div className="ri-acc">{Math.round((r.rate ?? 0) * 100)}%</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty" style={{ padding: "24px 0" }}>
            <span className="emoji">📋</span>
            还没有练习记录，开始第一关吧
          </p>
        )}
      </section>
    </div>
  );
}
