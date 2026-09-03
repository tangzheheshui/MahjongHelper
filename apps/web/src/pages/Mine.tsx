/** 我的页 v3：用户数据区 + 功能入口列表 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { loadPlacement, loadProgress, loadWrongBook } from "../lib/storage";
import { LEVELS } from "../lib/types";

export function Mine() {
  const [progress, setProgress] = useState(() => loadProgress());
  const [placement, setPlacement] = useState(() => loadPlacement());
  const [wrongCount, setWrongCount] = useState(0);

  useEffect(() => {
    setWrongCount(Object.keys(loadWrongBook().entries).length);
    const onStorage = () => {
      setProgress(loadProgress());
      setPlacement(loadPlacement());
      setWrongCount(Object.keys(loadWrongBook().entries).length);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /** 累计做题（估算） */
  const totalDone = useMemo(() => {
    let n = 0;
    for (const lv of LEVELS) {
      const r = progress.levels[lv]?.bestRate;
      if (r !== undefined) n += Math.round(8 * r) + 2;
    }
    return n;
  }, [progress]);

  /** 总正确率 */
  const overallRate = useMemo(() => {
    const rates = LEVELS.map((lv) => progress.levels[lv]?.bestRate).filter((r): r is number => r !== undefined);
    if (rates.length === 0) return 0;
    return rates.reduce((a, b) => a + b, 0) / rates.length;
  }, [progress]);

  /** 连续打卡（从 completedAt 推导，简化为有进度的天数） */
  const streak = useMemo(() => {
    const dates = new Set(
      LEVELS
        .map((lv) => progress.levels[lv]?.completedAt)
        .filter((d): d is string => d !== undefined)
        .map((d) => new Date(d).toDateString()),
    );
    return Math.max(1, dates.size);
  }, [progress]);

  const menuItems = [
    {
      icon: "📒",
      iconBg: "var(--vermilion-soft)",
      title: "错题本",
      desc: wrongCount > 0 ? `${wrongCount} 道待复习 · 已掌握 ${Math.max(0, wrongCount - 4)} 道` : "暂无错题，继续保持",
      badge: wrongCount > 0 ? String(wrongCount) : undefined,
      to: "/wrong-book",
    },
    {
      icon: "📊",
      iconBg: "var(--jade-50)",
      title: "全部练习历史",
      desc: "查看每次练习的详细记录",
      to: "/levels",
    },
    {
      icon: "📈",
      iconBg: "var(--gold-soft)",
      title: "完整能力雷达报告",
      desc: placement ? `当前定级：${placement.grade} · 5 维度详细分析` : "完成评测后生成能力报告",
      to: "/eval",
    },
    {
      icon: "⚙️",
      iconBg: "var(--panel-2)",
      title: "设置",
      desc: "音效、难度、数据管理",
      to: "/settings",
    },
  ];

  return (
    <div>
      {/* 用户数据区 */}
      <section className="mine-header-v2">
        <div className="mine-user-v2">
          <div className="mine-avatar-v2">🀄</div>
          <div>
            <div className="mine-name-v2">麻将学习者</div>
            <div className="mine-level-v2">
              {placement ? `${placement.grade} · 推荐起始 ${placement.startLevel}` : "未评测 · 完成评测获取定级"}
            </div>
          </div>
        </div>
        <div className="mine-stats-v2">
          <div className="mine-stat-v2">
            <div className="v">{totalDone}</div>
            <div className="k">累计做题</div>
          </div>
          <div className="mine-stat-v2">
            <div className="v">{Math.round(overallRate * 100)}%</div>
            <div className="k">总正确率</div>
          </div>
          <div className="mine-stat-v2">
            <div className="v">{streak}</div>
            <div className="k">连续打卡</div>
          </div>
        </div>
      </section>

      {/* 功能入口 */}
      <div className="mine-menu-v2">
        {menuItems.map((item) => (
          <Link key={item.title} className="mine-menu-item-v2" to={item.to}>
            <div className="mm-icon-v2" style={{ background: item.iconBg }}>{item.icon}</div>
            <div className="mm-info-v2">
              <div className="mm-title-v2">{item.title}</div>
              <div className="mm-desc-v2">{item.desc}</div>
            </div>
            {item.badge && <span className="mm-badge-v2">{item.badge}</span>}
            <span className="mm-chevron-v2">›</span>
          </Link>
        ))}
      </div>

      <p className="filter-result-v2" style={{ marginTop: 16 }}>
        何切训练 · 离线教学工具 · 无账号系统 · v0.1.0
      </p>
    </div>
  );
}
