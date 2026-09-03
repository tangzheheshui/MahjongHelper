# nanikiru（何切）

麻将「拆搭 / 何切」专项训练教学 App：题库练习 + 即时判分讲解 + 七级分类进阶。
**内容为主、核心功能离线可用、无用户系统**（不注册、不登录、不收集行为数据）。
训练**通用牌效率**（4 面子 + 1 雀头、136 张纯组合数学），国标 / 日麻均适用。

## 核心功能

- 判分引擎：向听数 / 进张 / 最优切牌（`packages/engine`，零依赖纯函数）
- 做题闭环：判分 → 三段式讲解 → 错题本 → 关卡树 → 水平测试定级
- 七级进阶题库 + 专项训练 5 分类（68 题，实时增量更新）
- PWA：断网全功能可用；题库增量拉取 / 版本检查 / 远程配置

## 快速启动

```bash
npm install                 # 安装（npm workspaces：packages/* + apps/*）
npm run dev -w @nanikiru/web    # 开发服务器
npm test                    # 引擎 golden + 自测（全量自检用 npm run selfcheck）
```

Node ≥ 20。TypeScript 单语言；引擎零依赖、纯函数（浏览器 / PWA / Capacitor iOS / Node 通吃）。

## 目录结构

```
nanikiru/
├── docs/                   # 需求 / 决策 / 题库规范 / 词库 / 版权 / 理论书
├── packages/engine/        # TS 引擎 + golden 测试 + 题库校验 CLI
├── apps/web/               # React + TS + Vite + PWA 前端
├── content/                # 题库源 JSON + 出题 / 构建脚本（版本单点 version.mjs）
└── server/                 # 静态发布目录 + 部署脚本（操作见 server/README.md）
```

## 文档

- [docs/requirements.md](docs/requirements.md) — 需求方向盘：里程碑、七级分类、题型、页面路由、本地存储
- [docs/decisions.md](docs/decisions.md) — 决策记录（改代码 / 改口径前先查，别推翻已定结论）
- [docs/vocabulary.md](docs/vocabulary.md) — 词库：术语主名 / 大分类 / 词条 / 专项分类上位口径
- [content/schema/question.schema.json](content/schema/question.schema.json) — 题库 Schema（机器校验 `npm run bank:verify`）
- [docs/references/SOURCES.md](docs/references/SOURCES.md) — 参考资料清单与版权红线
- [docs/theory/foundation.md](docs/theory/foundation.md) — 理论书《麻将拆搭入门》（讲解风格蓝本）

## 上线与发布

Web 静态部署 + 题库增量更新协议见 [server/README.md](server/README.md)（含 nginx / deploy 模板、
上线三步）。iOS（M5）：同一套代码 Capacitor 打包。
