/** 设置页（PRD 6.4 / web-v1.md §一）：题库信息、重新测试、清除数据（丢失警告）、关于 */

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loadBank } from "../lib/bank";
import { clearAllData, loadPlacement } from "../lib/storage";
import type { Bank } from "../lib/types";

export function Settings() {
  const [bank, setBank] = useState<Bank | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadBank().then(setBank);
  }, []);

  const placement = loadPlacement();

  function doClear() {
    clearAllData();
    navigate("/");
    location.reload();
  }

  return (
    <div>
      <h2 style={{ fontSize: 17, marginTop: 0 }}>设置</h2>

      <div className="panel">
        <h3 style={{ marginTop: 0 }}>题库</h3>
        <p style={{ fontSize: 14, margin: "4px 0" }}>
          版本 <b>{bank?.bank_version ?? "…"}</b> · 共 {bank?.questions.length ?? 0} 题
        </p>
        <p className="meta" style={{ marginTop: 0 }}>
          联网时启动将静默检查题库增量更新；断网不影响使用（V1 试点题库随 App 内置）。
        </p>
      </div>

      <div className="panel">
        <h3 style={{ marginTop: 0 }}>训练</h3>
        <p style={{ fontSize: 14 }}>
          当前定级：{placement ? `${placement.grade}（${placement.takenAt.slice(0, 10)}）` : "未测试"}
        </p>
        <Link to="/placement" style={{ textDecoration: "none" }} className="act">重新水平测试</Link>
      </div>

      <div className="panel">
        <h3 style={{ marginTop: 0 }}>数据</h3>
        <p className="meta" style={{ marginTop: 0 }}>
          本应用无账号系统，进度、错题本全部仅存本机。卸载 App 或清除浏览器数据会丢失且无法恢复。
        </p>
        {confirmClear ? (
          <div className="warn-box" style={{ marginTop: 10 }}>
            确认清空全部本地数据（进度 / 错题本 / 定级 / 设置）？此操作不可恢复。
            <div style={{ marginTop: 8 }}>
              <button type="button" className="act primary" onClick={doClear}>确认清空</button>
              <button type="button" className="act" onClick={() => setConfirmClear(false)}>取消</button>
            </div>
          </div>
        ) : (
          <button type="button" className="act" style={{ marginTop: 10 }} onClick={() => setConfirmClear(true)}>
            清除全部本地数据
          </button>
        )}
      </div>

      <div className="panel">
        <h3 style={{ marginTop: 0 }}>关于</h3>
        <p className="meta" style={{ marginTop: 0, lineHeight: 1.9 }}>
          nanikiru 何切训练 v0.1（M2 试点）· 单人开发的离线教学工具<br />
          训练内容为通用牌效率（国标 / 日麻通用；不含地方规则变体）。<br />
          判分引擎自研并经第三方对拍验证；题目与讲解全部原创，理论出处逐题标注。<br />
          参考资料清单与版权边界见仓库 docs/references/SOURCES.md。
        </p>
      </div>
    </div>
  );
}
