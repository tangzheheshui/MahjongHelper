/** 设置页（PRD 6.4 / web-v1.md §一）：iOS 分组 cell 风格 —— 题库、皮肤、训练、数据、关于 */

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Tile } from "../components/Tile";
import { checkBankUpdate, loadBank } from "../lib/bank";
import { clearAllData, loadPlacement, loadSettings, saveSettings } from "../lib/storage";
import type { Bank } from "../lib/types";
import type { BankUpdateResult } from "../lib/bank";

/** 皮肤清单（皮肤本体在 tiles/ 注册，这里只管展示与选择） */
const SKINS = [{ name: "placeholder", label: "教学（占位）", desc: "v0.8 行楷萬/索 + 暗沉哑光筒（丁案）" }];
const SKIN_PREVIEW = ["1m", "5p", "1s", "E", "c", "h"];

export function Settings() {
  const [bank, setBank] = useState<Bank | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [tileSkin, setTileSkin] = useState(() => loadSettings().tileSkin);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<BankUpdateResult | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadBank().then(setBank);
  }, []);

  async function doCheck() {
    setChecking(true);
    setResult(null);
    try {
      const r = await checkBankUpdate();
      setResult(r);
      setBank(await loadBank()); // 更新成功 / 本地已最新：就地刷新版本与题数
    } finally {
      setChecking(false);
    }
  }

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
      <div className="section-head" style={{ marginTop: 6 }}>
        <h2>设置</h2>
        <span className="hint">本机存储 · 无账号系统</span>
      </div>

      {/* —— 训练 —— */}
      <div className="group-label">训练</div>
      <div className="group">
        <Link className="cell" to="/placement">
          <span className="ico">🧭</span>
          <span className="label">水平测试</span>
          <span className="val">
            {placement ? `${placement.grade} · ${placement.takenAt.slice(0, 10)}` : "未测试"}
          </span>
          <span className="chev">›</span>
        </Link>
        <Link className="cell" to="/wrong-book">
          <span className="ico">📕</span>
          <span className="label">错题本</span>
          <span className="val">答对即移出</span>
          <span className="chev">›</span>
        </Link>
      </div>

      {/* —— 题库 —— */}
      <div className="group-label">题库</div>
      <div className="group">
        <div className="cell static">
          <span className="ico">📚</span>
          <span className="label">当前版本</span>
          <span className="val">{bank ? `${bank.bank_version} · ${bank.questions.length} 题` : "加载中…"}</span>
        </div>
        <button type="button" className="cell" onClick={doCheck} disabled={checking}>
          <span className="ico">🔄</span>
          <span className="label">{checking ? "检查中…" : "检查并更新题库"}</span>
          <span className="chev">›</span>
        </button>
      </div>
      <p className="group-note">
        联网时启动将静默检查增量更新；断网不影响使用（V1 试点题库随 App 内置），失败自动保留本地、下次再试。
        {result && (
          <>
            <br />
            <b style={{ color: "var(--jade-600)" }}>
              {result.status === "updated"
                ? `✓ 已更新至 ${result.to}：净增 ${result.added} 题`
                : result.status === "up_to_date"
                  ? `✓ 已是最新（${bank?.bank_version ?? ""}）`
                  : "检查失败（离线或服务器不可用），保持本地题库"}
            </b>
          </>
        )}
      </p>

      {/* —— 牌面皮肤 —— */}
      <div className="group-label">牌面皮肤</div>
      <div className="group group-body">
        <div className="skin-grid">
          {SKINS.map((s) => (
            <label key={s.name} className={`skin-card ${tileSkin === s.name ? "selected" : ""}`}>
              <input
                type="radio"
                name="tileSkin"
                checked={tileSkin === s.name}
                onChange={() => pickSkin(s.name)}
                style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
              />
              <span className="info">
                <span className="label">{s.label}</span>
                <span className="desc">{s.desc}</span>
              </span>
              <span className="preview">
                {SKIN_PREVIEW.map((id) => (
                  <Tile key={`${s.name}-${id}`} id={id} size={22} skin={s.name} />
                ))}
              </span>
            </label>
          ))}
        </div>
        <p className="group-note" style={{ marginTop: 10, marginBottom: 2 }}>立即生效、仅存本机；两套皮肤均为原创 SVG 手绘。</p>
      </div>

      {/* —— 数据 —— */}
      <div className="group-label">数据</div>
      <div className="group">
        <button type="button" className="cell danger" onClick={() => setConfirmClear(true)}>
          <span className="ico">🗑️</span>
          <span className="label">清除全部本地数据</span>
          <span className="chev">›</span>
        </button>
      </div>
      <p className="group-note">进度、错题本、定级全部仅存本机。卸载或清除浏览器数据会丢失且无法恢复。</p>
      {confirmClear && (
        <div className="warn-box" style={{ marginTop: 10 }}>
          <b>⚠ 确认清空全部本地数据</b>（进度 / 错题本 / 定级 / 设置）？此操作不可恢复。
          <div className="btn-row">
            <button type="button" className="btn danger" onClick={doClear}>确认清空</button>
            <button type="button" className="btn" onClick={() => setConfirmClear(false)}>取消</button>
          </div>
        </div>
      )}

      {/* —— 关于 —— */}
      <div className="group-label">关于</div>
      <div className="group">
        <div className="cell static">
          <span className="ico">ℹ️</span>
          <span className="label">版本</span>
          <span className="val">v0.1（M2 试点）</span>
        </div>
      </div>
      <p className="group-note">
        nanikiru 何切训练 · 单人开发的离线教学工具。训练内容为通用牌效率（国标 / 日麻通用；不含地方规则变体）。
        判分引擎自研并经第三方对拍验证；题目与讲解全部原创，理论出处逐题标注，版权边界见仓库 docs/references/SOURCES.md。
      </p>
    </div>
  );
}
