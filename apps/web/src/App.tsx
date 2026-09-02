import { Link, Route, Routes } from "react-router-dom";
import { TileDefs } from "./components/Tile";
import { Home } from "./pages/Home";
import { Quiz } from "./pages/Quiz";
import { Result } from "./pages/Result";
import { WrongBook } from "./pages/WrongBook";
import { Placement } from "./pages/Placement";
import { Settings } from "./pages/Settings";

export function App() {
  return (
    <div className="app">
      <TileDefs />
      <header className="topbar">
        <Link to="/" className="brand">何切训练</Link>
        <nav className="topnav">
          <Link to="/wrong-book">错题本</Link>
          <Link to="/placement">水平测试</Link>
          <Link to="/settings">设置</Link>
        </nav>
      </header>
      <main className="page">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/quiz/:level/:stage" element={<Quiz />} />
          <Route path="/result/:level/:stage" element={<Result />} />
          <Route path="/wrong-book" element={<WrongBook />} />
          <Route path="/placement" element={<Placement />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<p className="empty">页面不存在</p>} />
        </Routes>
      </main>
    </div>
  );
}
