import { useEffect } from "react";
import { NavLink, Route, Routes, useLocation } from "react-router-dom";
import { TileDefs } from "./components/Tile";
import { checkBankUpdate } from "./lib/bank";
import { Home } from "./pages/Home";
import { Special } from "./pages/Special";
import { SpecialDetail } from "./pages/SpecialDetail";
import { Bank } from "./pages/Bank";
import { Eval } from "./pages/Eval";
import { Mine } from "./pages/Mine";
import { Quiz } from "./pages/Quiz";
import { Result } from "./pages/Result";
import { WrongBook } from "./pages/WrongBook";
import { Placement } from "./pages/Placement";
import { Settings } from "./pages/Settings";
import { Drill } from "./pages/Drill";
import { Levels } from "./pages/Levels";
import { LevelDetail } from "./pages/LevelDetail";

/** 极简线性图标（无依赖） */
const I = {
  home: (
    <svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7v9a2 2 0 0 1-2 2h-4v-6h-6v6H5a2 2 0 0 1-2-2z"/></svg>
  ),
  special: (
    <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
  ),
  bank: (
    <svg viewBox="0 0 24 24"><path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2zM4 19a2 2 0 0 0 2 2h12"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="13" y2="15"/></svg>
  ),
  eval: (
    <svg viewBox="0 0 24 24"><path d="M9 3h6v4l4 7a4 4 0 0 1-4 6H9a4 4 0 0 1-4-6l4-7V3z"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
  ),
  mine: (
    <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>
  ),
};

/** 一级 Tab 页：显示品牌顶栏 + 底部 Tab Bar；
 *  其余（答题/结算/专项详情/测试/关卡详情）为沉浸页：只有各自的 Navbar。
 *  精确匹配——/special/:cat 这类二级页必须走沉浸式，否则双顶栏且无返回。 */
function isTabPage(pathname: string): boolean {
  return ["/", "/special", "/bank", "/eval", "/mine"].includes(pathname);
}

export function App() {
  // 启动静默检查题库增量更新（PRD 6.4）：失败无提示保留本地；成功已刷新题库缓存
  useEffect(() => {
    void checkBankUpdate();
  }, []);

  const location = useLocation();
  const tabbed = isTabPage(location.pathname);

  return (
    <div className={`app ${tabbed ? "tabbed" : "immersive"}`}>
      <TileDefs />

      {tabbed && (
        <header className="topbar">
          <div className="brand">
            <span className="logo">何</span>
            <span className="brand-mark">
              <span>何切训练</span>
              <span className="sub">L1–L7 拆搭进阶</span>
            </span>
          </div>
        </header>
      )}

      <main className="page page-trans" key={location.pathname}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/special" element={<Special />} />
          <Route path="/special/:cat" element={<SpecialDetail />} />
          <Route path="/bank" element={<Bank />} />
          <Route path="/eval" element={<Eval />} />
          <Route path="/mine" element={<Mine />} />
          <Route path="/levels" element={<Levels />} />
          <Route path="/levels/:level" element={<LevelDetail />} />
          <Route path="/drill" element={<Drill />} />
          <Route path="/drill/:kp" element={<Drill />} />
          <Route path="/quiz/:level/:stage" element={<Quiz />} />
          <Route path="/result/:level/:stage" element={<Result />} />
          <Route path="/wrong-book" element={<WrongBook />} />
          <Route path="/placement" element={<Placement />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<p className="empty">页面不存在</p>} />
        </Routes>
      </main>

      {tabbed && (
        <nav className="tabbar" aria-label="主导航">
          <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : undefined)}>
            {I.home}<span>首页</span>
          </NavLink>
          <NavLink to="/special" className={({ isActive }) => (isActive ? "active" : undefined)}>
            {I.special}<span>专项</span>
          </NavLink>
          <NavLink to="/bank" className={({ isActive }) => (isActive ? "active" : undefined)}>
            {I.bank}<span>题库</span>
          </NavLink>
          <NavLink to="/eval" className={({ isActive }) => (isActive ? "active" : undefined)}>
            {I.eval}<span>评测</span>
          </NavLink>
          <NavLink to="/mine" className={({ isActive }) => (isActive ? "active" : undefined)}>
            {I.mine}<span>我的</span>
          </NavLink>
        </nav>
      )}
    </div>
  );
}
