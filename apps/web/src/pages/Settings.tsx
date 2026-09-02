/** 设置页（PRD 6.4 / web-v1.md §一）：题库信息、重新测试、清除数据（丢失警告）、关于 */

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Tile } from "../components/Tile";
import { loadBank } from "../lib/bank";
import { clearAllData, loadPlacement, loadSettings, saveSettings } from "../lib/storage";
import type { Bank } from "../lib/types";

/** 皮肤清单（皮肤本体在 tiles/ 注册，这里只管展示与选择） */
const SKINS = [
  { name: "placeholder", label: "教学（占位）", desc: "v0.8 行楷萬/索 + 暗沉哑光筒（丁案）" },
  { name: "classic", label: "经典", desc: "参考实物图风格原创重绘：靛蓝饼 / 绿竹 / 一索雀鸟" },
];
const SKIN_PREVIEW = ["1m", "5p", "1s", "E", "c", "h"];

export function Settings() {
  const [bank, setBank] = useState<Bank | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [tileSkin, setTileSkin] = useState(() => loadSettings().tileSkin);
  const navigate = useNavigate();

  useEffect(() => {
    loadBank().then(setBank);
  }, []);

  const placement = loadPlacement();

  function pickSkin(name: string) {
    setTileSkin(name);
    saveSettings({ tileSkin: name });
  }

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
        <h3 style={{ marginTop: 0 }}>牌面皮肤</h3>
        {SKINS.map((s) => (
          <label
            key={s.name}
            style={{
              display: "block",
              border: tileSkin === s.name ? "2px solid var(--accent, #b48a2f)" : "2px solid transparent",
              borderRadius: 10,
              padding: "6px 8px",
              marginBottom: 8,
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 14 }}>
              <input
                type="radio"
                name="tileSkin"
                checked={tileSkin === s.name}
                onChange={() => pickSkin(s.name)}
                style={{ marginRight: 6 }}
              />
              <b>{s.label}</b>
              <span className="meta" style={{ marginLeft: 8 }}>{s.desc}</span>
            </span>
            <span className="hand" style={{ justifyContent: "flex-start", marginTop: 6, display: "flex" }}>
              {SKIN_PREVIEW.map((id) => (
                <Tile key={`${s.name}-${id}`} id={id} size={32} skin={s.name} />
              ))}
            </span>
          </label>
        ))}
        <p className="meta" style={{ margin: 0 }}>立即生效、仅存本机；两套皮肤均为原创 SVG 手绘。</p>
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
