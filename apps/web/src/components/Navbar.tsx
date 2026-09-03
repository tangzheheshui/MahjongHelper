/** 沉浸页共享导航栏：返回键 + 居中标题 + 右侧计数 */

import { Link } from "react-router-dom";
import type { ReactNode } from "react";

export function Navbar({
  title,
  subtitle,
  back = "/",
  right,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: string;
  right?: ReactNode;
}) {
  return (
    <header className="navbar">
      <Link to={back} className="nav-back" aria-label="返回">
        <svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" /></svg>
      </Link>
      <div className="nav-title">
        <span className="t">{title}</span>
        {subtitle && <span className="s">{subtitle}</span>}
      </div>
      <div className="nav-right">{right}</div>
    </header>
  );
}
