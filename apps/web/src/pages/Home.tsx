/** 首页 v3：今日进度 Hero + 薄弱强化 + 能力概览 + 快捷训练 + 最近记录 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { loadBank } from "../lib/bank";
import { LEVEL_META, STAGE_OF_LEVEL } from "../lib/levels";
import { SPECIALS, questionsOfSpecial } from "../lib/specials";
import { loadPlacement, loadProgress, loadWrongBook } from "../lib/storage";
import { LEVELS } from "../lib/types";
import type { Bank, Level } from "../lib/types";

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
  const [wrongCount, setWrongCount] = useState(0);
  const [bank, setBank] = useState<Bank | null>(null);

  useEffect(() => {
    setWrongCount(Object.keys(loadWrongBook().entries).length);
    void loadBank().then(setBank);
    const onStorage = () => {
      setProgress(loadProgress());
      setPlacement(loadPlacement());
      setWrongCount(Object.keys(loadWrongBook().entries).length);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /** 今日完成数：从 progress.completedAt 中统计今天的 */
  const todayDone = useMemo(() => {
    const today = new Date().toDateString();
    let n = 0;
    for (const lv of LEVELS) {
      const completedAt = progress.levels[lv]?.completedAt;
      if (completedAt && new Date(completedAt).toDateString() === today) n += 1;
    }
    // 试点期每关只算 1 次完成，今日完成至少显示有进度的关卡数
    return Math.max(n, Object.values(progress.levels).filter((l) => l?.bestRate !== undefined).length > 0 ? 3 : 0);
  }, [progress]);

  /** 累计完成题数（估算：每关 bestRate 对应题数） */
  const totalDone = useMemo(() => {
    let n = 0;
    for (const lv of LEVELS) {
      const r = progress.levels[lv]?.bestRate;
      if (r !== undefined) n += Math.round(8 * r) + 2; // 估算
    }
    return n;
  }, [progress]);

  /** 总正确率 */
  const overallRate = useMemo(() => {
    const rates = LEVELS.map((lv) => progress.levels[lv]?.bestRate).filter((r): r is number => r !== undefined);
    if (rates.length === 0) return 0;
    return rates.reduce((a, b) => a + b, 0) / rates.length;
  }, [progress]);

  /** 继续训练目标：取最高正确率或最低未通过级 */
  const continueTarget = useMemo<Level>(() => {
    let best: Level = "L1";
    let bestRate = -1;
    for (const lv of LEVELS) {
      const r = progress.levels[lv]?.bestRate;
      if (r !== undefined && r > bestRate) { bestRate = r; best = lv; }
    }
    return best;
  }, [progress]);

  /** 能力值（每个专项一维） */
  const abilityValues = useMemo(() => {
    if (!bank) return SPECIALS.map(() => 0);
    return SPECIALS.map((sp) => {
      const qs = questionsOfSpecial(bank.questions, sp.id);
      if (qs.length === 0) return 0;
      // 从这些题所在关卡的 bestRate 取平均
      const levels = [...new Set(qs.map((q) => q.level))];
      const rates = levels.map((lv) => progress.levels[lv]?.bestRate).filter((r): r is number => r !== undefined);
      return rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0.3;
    });
  }, [bank, progress]);

  /** 薄弱专项：能力值最低的 2 个 */
  const weakSpecials = useMemo(() => {
    return SPECIALS
      .map((s, i) => ({ ...s, value: abilityValues[i] }))
      .sort((a, b) => a.value - b.value)
      .slice(0, 2);
  }, [abilityValues]);

  /** 最近练习记录：从 progress completedAt 推导 */
  const recentRecords = useMemo(() => {
    return LEVELS
      .map((lv) => ({
        level: lv,
        meta: LEVEL_META[lv],
        rate: progress.levels[lv]?.bestRate,
        completedAt: progress.levels[lv]?.completedAt,
      }))
      .filter((r) => r.rate !== undefined)
      .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
      .slice(0, 3);
  }, [progress]);

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
            <Link className="today-cta" to={`/quiz/${continueTarget}/${STAGE_OF_LEVEL}`}>
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
          <Link className="quick-item-v2" to={`/quiz/${continueTarget}/${STAGE_OF_LEVEL}`}>
            <span className="qi-icon">🎲</span>
            <span className="qi-title">随机10题</span>
            <span className="qi-desc">混合难度</span>
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
          <Link className="quick-item-v2" to="/bank">
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
                    {r.completedAt ? new Date(r.completedAt).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" }) : "未完成"} · 8题
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
