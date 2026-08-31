# nanikiru（何切）

麻将「拆搭 / 何切」专项训练教学 App：题库练习 + 即时判分讲解 + 七级分类进阶。
**内容为主、核心功能离线可用、无用户系统**（不注册、不登录、不收集行为数据）。

> 产品需求：[docs/prd/PRD_麻将拆搭练习教学App_v4.md](docs/prd/PRD_麻将拆搭练习教学App_v4.md)（v4.0，2026-08-31）

## 已定技术决策（2026-08-31）

| 决策点 | 结论 | 理由 |
|---|---|---|
| 交付路线 | **Web 先行 → Capacitor 套壳上 iOS** | 一套 React UI 同时覆盖浏览器 / PWA / App Store；做题类 App 无重度原生交互，套壳体验足够 |
| 前端 | React 18 + TypeScript + Vite | 生态最大；引擎、业务逻辑、UI 全部 TS，无二次实现 |
| 引擎 | TS 自研零依赖库（`packages/engine`） | 向听数 + 进张计算是 P0 底座，必须离线、必须可控；web 与 iOS 复用同一份 |
| 服务器 | 纯静态 JSON（nginx 托管） | PRD 联网需求只有题库增量更新 / 版本检查 / 远程配置，静态文件 + manifest 全部满足，零后端代码 |
| 数据 | 全部本地（IndexedDB + localStorage） | 无用户系统、无上行数据；卸载即丢失，需在设置页提示 |

被否的选项及理由见 [docs/design/architecture.md](docs/design/architecture.md) 的决策记录。

## 文档索引

| 文档 | 回答什么 | 什么时候看 |
|---|---|---|
| [docs/prd/](docs/prd/) | 产品要做什么（PRD 原文） | 对需求有疑问时 |
| [docs/design/architecture.md](docs/design/architecture.md) | 怎么实现的：分层、目录、演进路线、决策记录 | 动手写代码前 |
| [docs/requirements/engine.md](docs/requirements/engine.md) | 进张计算引擎要做什么、怎么验收 | 写引擎前 |
| [docs/requirements/question-bank.md](docs/requirements/question-bank.md) | 题库数据结构、出题规范、内容生产线 | 出题 / 改题库前 |
| [docs/requirements/web-v1.md](docs/requirements/web-v1.md) | Web V1 的页面、交互、本地存储 | 写前端前 |
| [docs/operations/server.md](docs/operations/server.md) | 静态服务器怎么部署、更新协议怎么走 | 部署 / 更新题库时 |
| [docs/references/SOURCES.md](docs/references/SOURCES.md) | 参考资料清单、来源、版权边界 | 出题查理论出处时 |

## 目录结构

```
nanikiru/
├── docs/                  # 全部规划文档 + 参考资料（PDF）
│   ├── prd/               # PRD 原文
│   ├── requirements/      # 引擎 / 题库 / Web 各自的需求
│   ├── design/            # 架构与决策
│   ├── operations/        # 部署运维
│   └── references/        # 79博客 PDF、Riichi Book 1 PDF、来源清单
├── packages/engine/       # TS 引擎：向听数 + 进张计算 + 题库校验 CLI（M1）
├── apps/web/              # React + TS + Vite 前端，PWA（M2）
├── content/               # 题库源 JSON + 出题工作流脚本（M3）
└── server/                # 静态文件目录结构 + 部署脚本（M4）
```

## 路线图

| 里程碑 | 内容 | 状态 |
|---|---|---|
| M0 | 规划与骨架：本仓库结构 + 全套文档 + 参考资料入库 | ✅ 2026-08-31 |
| M1 | 引擎：向听数 / 进张计算 / 最优切牌排序 + golden 测试 + 第三方对拍 ≥20 题 | ⬜ |
| M2 | Web V1：做题闭环（判分 / 讲解 / 错题本 / 关卡树），内置 20~30 题样例库 | ⬜ |
| M3 | 内容建设：起步每级 ≥10 题（共 ≥70）先上线，后续补至 200（PRD 目标） | ⬜ |
| M4 | 上线 Web / PWA，服务器静态部署 + 题库增量更新跑通 | ⬜ |
| M5 | Capacitor 打包 iOS，App Store 提审 | ⬜ |
| M6 | V2 规划（复盘 / 赖子变体等，PRD 明确不进 V1） | ⬜ |

## 版权红线

商业出版物（《麻将学习·牌效率》G·ウザク、《何切300》《何切301》）**不下载盗版、不复制原文表述**，
仅参考其理论框架与出题思路；本项目所有题目手牌、讲解文案均为原创。详见
[docs/references/SOURCES.md](docs/references/SOURCES.md)。
