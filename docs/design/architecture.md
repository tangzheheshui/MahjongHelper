# 架构与技术选型

> 对应 PRD v4.0。本文回答「系统怎么搭、为什么这么搭」。

## 一、总体分层

```
┌─────────────────────────────────────────────────┐
│  应用层  apps/web（React + TS + Vite，PWA）      │
│          做题 / 讲解 / 错题本 / 关卡树 / 水平测试 │
│          M5 起 Capacitor 套同一套代码上 iOS      │
├─────────────────────────────────────────────────┤
│  引擎层  packages/engine（TS，零依赖，纯函数）   │
│          向听数 / 进张枚举 / 最优切牌排序        │
│          + 题库校验 CLI（出题流水线用）          │
├─────────────────────────────────────────────────┤
│  内容层  content/（题库源 JSON + 出题脚本）      │
│          人工出题 → 引擎校验 → 构建 → 发布分片  │
├─────────────────────────────────────────────────┤
│  分发层  server/（纯静态，nginx）               │
│          manifest.json + 题库分片 + 远程配置     │
└─────────────────────────────────────────────────┘
```

关键原则：**引擎与题库从上到下只有一份实现**。Web、PWA、iOS App 消费的是同一个
`packages/engine` 和同一批题库 JSON——上 iOS 时零移植。

## 二、决策记录（ADR 摘要）

### D1 交付路线：Web 先行 + Capacitor 套壳（2026-08-31 定）

- **选定**：React Web → PWA → Capacitor 打包 iOS，一套 UI 代码到底
- **理由**：做题类 App 交互以点选、翻页为主，无重度原生需求；单人开发维护一套代码是刚性约束；
  Capacitor 对 PWA/离线包友好，题库+引擎随包内置即天然离线（满足 PRD「断网全功能可用」）
- **否决项**：
  - React Native/Expo：App UI 需用 RN 组件重写一遍 = 两套 UI，收益（更原生手感）不抵成本
  - SwiftUI 原生：体验天花板，但 UI + 引擎 Swift 移植 + 双语言维护，单人不可行
- **风险与对策**：套壳 App 的原生感依赖 CSS 打磨；麻将牌面用 SVG 自绘（见 web-v1.md）保证跨端一致

### D2 引擎：TS 自研，零依赖（2026-08-31 定）

- **理由**：引擎是 P0 底座（判分 + 讲解数据 + 出题校验三处消费）；算法体量可控（枚举暴力即可，
  详见 engine.md）；零依赖保证浏览器 / iOS WebView / Node CLI 三环境通吃
- **否决项**：
  - 直接用现成库（mahjong-utils 等）作为主引擎：语义细节（进张口径、并列最优处理）不可控，
    出题校验需要「我们说了算」的口径；现成库**用作对拍基准**（PRD 质量约束要求 ≥20 题对拍）
  - Python 引擎（如 pypi mahjong）：web/iOS 用不了，还得二次移植，且引入双实现漂移风险

### D3 服务器：纯静态 JSON（2026-08-31 定）

- **理由**：PRD 联网需求仅题库增量 / 版本检查 / 远程配置，三者都是「服务器→客户端」单向拉取，
  静态文件 + 版本 manifest 全部覆盖；无后端代码 = 无宕机面、无安全面、零维护
- **否决项**：FastAPI 轻服务（参考 BiliParser license-server 风格）——当前没有需要服务端计算或
  状态的场景；若 V2 出现题库管理后台再引入，不影响现在的静态协议

### D4 数据：全本地，无用户系统（继承 PRD）

- 题库缓存与合并结果 → IndexedDB；训练进度 / 错题本 / 测试结果 / 设置 → localStorage
- 无任何上行请求；Capacitor 打包后同样成立（提审隐私问卷简单）

### D5 对拍基准：Python mahjong 库（2026-09-02 定）

- **结论**：M1④ 第三方对拍基准 = PyPI [`mahjong`](https://github.com/MahjongRepository/mahjong)（MIT），
  用其 `calculate_shanten_for_regular_hand` 复算标准形向听。已执行 151 手
  （golden 教材锚定 11 + 固定种子随机 140），**0 差异**；报告与逐手明细见
  `docs/references/duipai-report.md` / `duipai-results.json`（复现：`npm run duipai -w @nanikiru/engine`）
- **背景**：原候选 npm `mahjong-utils` 发布损坏（安装即失败），2026-09-01 弃用
- **边界**：Python 侧仅存在于校验工具链（`packages/engine/scripts/duipai.py`），不进引擎依赖、
  不进产品代码——D2「引擎零依赖」红线不破；CLAUDE.md「不用 Python 写业务」同样不破

## 三、monorepo 布局（npm workspaces）

```
nanikiru/
├── package.json              # workspaces: ["packages/*", "apps/*"]
├── packages/engine/          # M1：向听数/进张引擎 + golden 测试 + 校验 CLI
├── apps/web/                 # M2：React + TS + Vite + vite-plugin-pwa
├── content/                  # M3：题库源 JSON、出题模板、构建脚本（node）
└── server/                   # M4：静态站点目录（manifest + 分片 + config），rsync 上传
```

## 四、离线与更新策略

- **内置**：App 构建时打包「出厂题库」（M2 起约 20~30 题，M3 后全量），断网即可做题
- **增量**：启动时静默拉 `manifest.json` → 比对 `bank_version` → 只下载变化的分级分片 →
  合并进 IndexedDB；失败静默，下次启动重试（PRD 6.4）
- **远程配置**：`config.json` 拉不到就用内置默认值

## 五、静态服务器与发布（M4）

> 结论见 D3：无后端代码，nginx 托管纯静态 JSON。以下 URL 结构与发布流程在 M4 落地时启用。
> （原独立文档 docs/operations/server.md 于 2026-09-02 并入本节。）

**URL 结构**

```
https://tangzheheshui.cn/                              # Web App 本体（静态托管，同源）
https://tangzheheshui.cn/bank/manifest.json            # 题库版本清单（客户端更新入口）
https://tangzheheshui.cn/bank/v{bank_version}/L1.json … L7.json   # 题库分片（按版本目录，天然支持回滚）
https://tangzheheshui.cn/config.json                   # 远程配置（功能开关）
https://tangzheheshui.cn/version.json                  # App 最新版本号（M5 iOS 用）
```

> 版本目录记法 `v{N}` 具体化为 `v{bank_version}`（如 `v2026.09.2-pilot`）。
> **客户端只认 manifest `levels[].file` 给的路径**，不推断目录名——回滚 = 服务器端把
> manifest 指回旧目录，客户端无感知。

**manifest.json 格式**（由 `content/build/publish.mjs` 生成，Schema 权威见 question-bank.md §四）：

```jsonc
{
  "schema_version": 1,
  "bank_version": "2026.09.2-pilot",   // 与 App 内置出厂题库同源的版本号（见下「单点版本」）
  "published_at": "2026-09-02T12:00:00Z",
  "levels": [
    { "level": "L1", "file": "v2026.09.2-pilot/L1.json", "count": 10, "sha256": "…" }
  ]
}
```

分片文件内容：`{ "level": "L1", "questions": […] }`，**不含 bank_version**——同一批
`content/questions/` 直接产出，与 App 内置出厂题库同源同构。刻意把版本号留在 manifest
而不写进分片正文：同内容跨版本字节一致 → sha256 不变 → 客户端只拉真正变化的分级
（否则每发一版全部级哈希都变，增量退化为全量）。

**客户端拉取行为**（PRD 6.4 / web-v1.md §2.4，2026-09-02 定稿）：

- 触发：App 启动静默检查一次 + 设置页「检查并更新题库」手动触发（同一代码路径，失败无提示保留旧题库）
- 步骤：GET `bank/manifest.json`（超时 3s，AbortController）→ 用 `compareVersion` 比对新旧
  `bank_version`（数值比较，非字典序）→ 有新版本按 `levels[].sha256` 比对**本地已应用的
  每级哈希**，只下载变化分片 → 校验下载分片 sha256 逐字节对上 → 解析按 `level` 归并
  （该级整组替换、manifest 缺省的级删除）→ 写入 IndexedDB 同一 store → 任一步失败静默保留
  旧题库、下次启动重试。全程无上行数据。
- **首拉全量、此后增量**：全新安装只种入内置出厂题库，本地没有「已应用分片哈希表」，
  第一次远程更新不知道内置每级哈希 → 全量拉一遍（200 题 ≈300KB，可接受）；此后每次只拉
  哈希变化的级。
- 客户端持久化两个 IDB key：`merged`（当前全量题库 = 内置 + 远程归并结果，Bank 结构）、
  `update_state`（`{ bank_version, levels: {级: 已应用 sha256} }`）。

**单点版本号**：`content/build/version.mjs` 的 `CURRENT_BANK_VERSION` 是唯一版本源——
`roll-bank.mjs`（打包出厂题库进 App）与 `publish.mjs`（发布服务器分片）都引它，
**保证 App 内置 = 服务器当前，换内容只 bump 这一处**。当前值 `2026.09.5-pilot`。

**发布（操作流程）**：

```bash
# 1) 内容入库（出题人）→ content/questions/LX.json；过 engine verify CLI（verify.ts --write 注入快照）
npx tsx packages/engine/bin/verify.ts content/questions --write
# 2) bump 单点版本号 content/build/version.mjs（仅此一处）
# 3) 重滚 App 出厂题库（若同时要发 App 包）
node content/build/roll-bank.mjs
# 4) 产出 server/bank/v{version}/ 分片 + manifest（累加 v{version} 目录，旧目录保留）
node content/build/publish.mjs
# 5) 上传（可整段走 server/deploy.sh；先数据后指针，客户端不会拿到 404 分片）
rsync -av server/ user@tangzheheshui.cn:/var/www/nanikiru/
```

- **同版本防呆**（2026-09-02 加）：`publish.mjs` 若发现 `server/bank` 已存在同版本 manifest
  而内容哈希变了 → 拒绝发布（提示先 bump version.mjs）。同版本覆盖 = 客户端 `compareVersion`
  判等 → 永远收不到更新，是最隐蔽的发布事故。
- manifest 最后上传；回滚 = 服务器端把 manifest 指回旧版本目录（旧分片目录不删）
- 缓存策略见 `server/nginx.conf.sample`（manifest/config `no-cache`，分片 immutable）
- 容量：200 题 × ≈1.5KB ≈ 300KB，单级分片 ≤60KB——静态方案无压力
- e2e 干跑：`npx tsx apps/web/scripts/e2e-update.ts` 本地 http 服务模拟
  「服务器 v1→v2 发布 → 客户端首拉全量 / 再发单级变更只拉该级」全链路（M4 DoD 自测）

**域名已定（2026-09-03 用户裁定）：`tangzheheshui.cn`**。剩三步实操（均在用户侧）：
① DNS A 记录指向服务器 IP；② 服务器装 nginx 后套用 `server/nginx.conf.sample`
（端口 80 的 ACME 验证 + 跳转块已备好，`certbot --webroot` 签 Let's Encrypt 后取消证书两行注释）；
③ 首次发布跑 `server/deploy.sh`（按真实 SSH 用户改脚本默认值）。
**备案提示**：.cn 域名解析到**境内**服务器须 ICP 备案才能开放 80/443；境外服务器
（含香港）免备案，静态小站直连可达性可接受，先境外后视情况迁国内/CDN。
Cache-Control 策略已定稿并给出 `server/nginx.conf.sample`；客户端增量更新代码与 e2e 干跑已落地（2026-09-02）。

## 六、风险清单

| 风险 | 影响 | 对策 |
|---|---|---|
| 引擎口径与教材结论不一致 | 判分争议、题库返工 | golden 用例集先建（教材例题手抄结论），出题必须过引擎校验；第三方对拍 ≥20 题 |
| 牌面渲染跨端不一致（字体差异） | iOS 上 Unicode 麻将字符缺字/样式差 | V1 就用 SVG 自绘牌面，不依赖系统字体 |
| 200 题人工产能 | M3 拖期 | 先出 L1~L4（占比 67%），L5~L7 随后补；出题脚本自动生成候选牌型 + 引擎预校验降低人工量 |
| Capacitor 套壳提审 | App Store 拒审风险 | 内容型 + 离线完整体验，非纯网站搬运；M5 前预留 WebView 白屏、启动图等打磨时间 |
