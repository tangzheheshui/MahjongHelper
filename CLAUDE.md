# CLAUDE.md

麻将「何切」训练教学 App（nanikiru）。单人开发，内容为主、离线优先、无用户系统。

## 必读

- 需求唯一来源：[docs/requirements.md](docs/requirements.md)（里程碑、分类、题型、UI、存储）
- 决策记录：[docs/decisions.md](docs/decisions.md)——改代码前先看，别推翻已定结论；
  已否掉的选项不再重提
- 词库与术语主名：[docs/vocabulary.md](docs/vocabulary.md)；题库 Schema = `content/schema/question.schema.json`
  + `npm run bank:verify`（机器管，出题前跑）

## 常用命令

```bash
npm run dev -w @nanikiru/web    # Web 开发服务器
npm test                        # 引擎 golden + 自测（全量：npm run selfcheck）
npm run bank:verify             # 题库全量校验（correct ⊆ 引擎最优 + 快照）
npm run bank:dist               # 题量分布 QA
npm run e2e:smoke               # 做题闭环冒烟（改 lib 层后必跑）
npm run e2e:update / e2e:bank   # 题库更新链自测（改 bank.ts / update.ts 后必跑）
npm run typecheck               # 引擎 + Web 类型检查
```

上线三步与发布命令见 [server/README.md](server/README.md)。

## 工作约定

- **文档先行**：改需求 / 加功能，先改 `docs/` 对应文档（需求 / 行为 → requirements.md；决策 → decisions.md；
  术语词库 → vocabulary.md），再写代码
- 全部文档、注释、commit message 用中文
- 技术栈：TypeScript 单语言（引擎 / 前端 / 内容脚本），Node ≥ 20；不用 Python 写业务
- 引擎（`packages/engine`）保持**零依赖、纯函数**：它要同时跑在浏览器、PWA、Capacitor iOS 里
- 题库 JSON 是内容不是代码：改题走 `content/`，Schema = `content/schema/question.schema.json`，
  入库前跑 `npm run bank:verify`；换内容只 bump `content/build/version.mjs` 一处再重跑 roll-bank + publish

## 内容红线（出题 / 讲解纪律：机器管不住的硬规则，写文案、出题前必读）

**讲解用词（禁用同义词不得出现在正文与讲解）**：胡牌→和了；卡张→嵌张；单吊→单骑；对倒→双碰；
组牌→面子；三同→刻子；将→雀头；塔子→搭子；拆塔→拆搭；受入 / 有效牌→进张；孤张 / 孤儿牌→浮牌
（仅 L1 识别语境保留「孤张」）；复合型→复合牌；退向听→向听倒退。术语主名 / 别名权威见
[docs/vocabulary.md](docs/vocabulary.md)。

**记法**：展示层（App / 讲解 / 理论书）一律中文记法 `123万 456筒 789条`，顺序 万→筒→条、同花色升序；
禁 `1m / 2p` 泄漏；牌例编号 `例 2-3` = 第 2 章第 3 例。

**数字纪律**：题面 / 讲解的向听数、进张张数必须来自引擎核验输出或题库 `engine_snapshot`
（复用标注 `复用 LX_###`），禁止心算——要数字先跑 `npx tsx content/build/probe.ts`。

**口径与 V1 判定边界**（实现 = 引擎 + golden，唯一裁判）：
- 和了形 = 4 面子 + 1 雀头；进张张数 = 4 − 手内该牌张数；最优切牌先比向听数再比进张数，并列全返回
- 七对 / 国士不进主流程，只标注；改良不进判分（只进讲解，张数相同才用）
- 向听倒退的切法**永不为 correct**；打点 / 安全 / 攻守不进判分，只进讲解
- 题面与配图不用字牌；讲解不引入他家可见牌推论（不出现「可能被吃所以剩不了几张」类表述）

**出处格式**：`79博客·牌效率2『有效牌和张数』` / `Riichi Book I Ch4` / `（框架）G·ウザク 分类骨架`；
不给ウザ克标页码式引用（不持原书）；出处须落在 `SOURCES.md` §五 勾稽表内。

**新题入库前（查重双闸）**：`content/build/skeleton-check`（骨架撞车 → 直接否决）+ `content/build/nearcheck`
（考点近亲 → 提醒人工取舍），全过再 `bank:verify`。考点库存 = `content/questions/` 题库 JSON 本身，
不另设索引（题量分布 QA：`npm run bank:dist`）。

## 工作节奏与完成定义（防弯路的铁律）

1. **顺序由「改不动」到「随便改」**：引擎语义 → 题库 Schema → 做题闭环 → 内容批量 → 上线 → iOS。
   引擎错会污染全部题目，Schema 错意味着存量题库返工，UI 永远可以重画——先锁死前两者。
2. **试点先行**：任何批量生产（题库、关卡）之前，先用试点批次跑通
   「出题→校验→讲解→判分→错题」全链路，链路验证通过才允许扩量。
3. **golden 用例是引擎的宪法**：改引擎行为必须先补 golden 用例再改实现；用例只增不删
   （删除需在 commit 里说明理由）。
4. **一次只推进一个里程碑**：开工先列任务清单，完成定义（DoD）达标才切下一个：
   - M1 引擎：golden ≥50 全绿 + 第三方对拍 ≥20 题有报告 + verify CLI 可用（✅ 2026-09-02）
   - M2 Web 闭环：断网状态走通 练→判→讲→错题→解锁 全流程（试点题库），PWA 可安装（✅ 2026-09-02）
   - M3 内容：起步批七级 68 题（L1-L3 ≥8、L4-L7 ≥10）全过 schema + 引擎校验，四题型齐
     （✅ 2026-09-03；200 题为完整目标，扩量走「已踩考点结构变体」，见 decisions.md）
   - M4 上线：真实跑通一次「旧题库→manifest→增量更新」（工程全落地，剩用户侧上线三步，见 server/README）
   - M5 iOS：TestFlight 自用通过后提审
5. **持续优化走两条既定通道**：内容优化 = 题库版本迭代（不碰代码）；行为优化 = 先改文档再改代码。
   里程碑收尾三件事：README 路线图打勾、相关 docs 同步、自测通过后汇报。

## 版权红线（不可越过）

- 不下载、不引用《麻将学习·牌效率》《何切300》《何切301》等商业出版物的盗版电子版与原文表述
- 题目手牌组合、讲解文案全部原创；理论出处只标注章节定位（如「79博客·牌效率2」）
- 允许使用的参考资料清单见 `docs/references/SOURCES.md`，不在清单内的资料先补录清单再用

## 数据与隐私约定

- 无用户系统：不上传任何用户数据，不做埋点 / 统计 / 个性化
- 联网仅限：题库增量更新、版本检查、远程配置；失败必须静默降级到本地
