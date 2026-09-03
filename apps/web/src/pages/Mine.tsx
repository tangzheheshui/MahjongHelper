/** 我的页：用户数据区 + 功能入口列表。
 *  三个数字全部来自 nk.stats 真实答题计数（今日/累计/正确率），不推导不估算。 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { APP_VERSION } from "../lib/meta";
import { loadPlacement, loadStats, loadWrongBook } from "../lib/storage";

export function Mine() {
  const [stats, setStats] = useState(() => loadStats());
  const [placement, setPlacement] = useState(() => loadPlacement());
  const [wrongCount, setWrongCount] = useState(0);

  useEffect(() => {
    setWrongCount(Object.keys(loadWrongBook().entries).length);
    const onStorage = () => {
      setStats(loadStats());
      setPlacement(loadPlacement());
      setWrongCount(Object.keys(loadWrongBook().entries).length);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const overallRate = stats.totalAnswered > 0 ? stats.totalCorrect / stats.totalAnswered : 0;

  const menuItems = [
    {
      icon: "📒",
      iconBg: "var(--vermilion-soft)",
      title: "错题本",
      desc: wrongCount > 0 ? `${wrongCount} 道待复习` : "暂无错题，继续保持",
      badge: wrongCount > 0 ? String(wrongCount) : undefined,
      to: "/wrong-book?from=%2Fmine",
    },
    {
      icon: "📊",
      iconBg: "var(--jade-50)",
      title: "关卡进度",
      desc: "各级最佳成绩、星级与考点入口",
      to: "/levels",
    },
    {
      icon: "📈",
      iconBg: "var(--gold-soft)",
      title: "能力评测",
      desc: placement ? `当前定级：${placement.grade} · L4–L7 四维雷达` : "完成评测后生成能力雷达",
      to: "/eval",
    },
    {
      icon: "⚙️",
      iconBg: "var(--panel-2)",
      title: "设置",
      desc: "题库更新、牌面皮肤、数据管理",
      to: "/settings?from=%2Fmine",
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
            <div className="v">{stats.totalAnswered}</div>
            <div className="k">累计做题</div>
          </div>
          <div className="mine-stat-v2">
            <div className="v">{stats.totalAnswered > 0 ? `${Math.round(overallRate * 100)}%` : "—"}</div>
            <div className="k">总正确率</div>
          </div>
          <div className="mine-stat-v2">
            <div className="v">{stats.todayAnswered}</div>
            <div className="k">今日练习</div>
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
        何切训练 · 离线教学工具 · 无账号系统 · v{APP_VERSION}
      </p>
    </div>
  );
}
