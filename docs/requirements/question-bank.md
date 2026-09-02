# 题库数据结构与出题流水线（content/）

> 对应 PRD §5（训练分类体系）、附录 A（题库建设计划、单题结构、出题规范）。
> 题库是内容资产，独立于 App 发版演进——结构定错代价最高，本文是唯一权威定义。

## 一、四种题型（PRD 5.5）

| question_type | 说明 | 占比 |
|---|---|---|
| `what_to_discard` | 14 张选切牌（何切，核心题型） | ≥70% |
| `ukeire_compare` | 给定两种切法，判断哪种进张更多 | ~15% |
| `mentsu_identify` | 找出搭子并分类（两面/嵌张/边张/对子） | ~10% |
| `wait_choose` | 听牌形式优劣选择（双碰/嵌张/单骑…） | ~5% |

## 二、单题 Schema v1（PRD A.2 的工程化扩展）

```jsonc
{
  "schema_version": 1,
  "id": "L4_012",                      // 全局唯一：{级别}_{序号}
  "level": "L4",                       // L1-L7，对应 PRD 5.2 七级分类
  "knowledge_point": "两嵌 vs 嵌张取舍", // 考察点（PRD A.3 #1，必填，用于水平测试抽题与错题归类）
  "question_type": "what_to_discard",
  "difficulty": "medium",              // easy | medium | hard（PRD A.3 #5）

  "hand": ["1m","2m","3m","5m","6m","3p","4p","5p","6p","7p","8p","2s","2s","4s"],

  "answer": {                          // 按题型变化，见 §三
    "correct": ["4s"],                 // 数组：允许并列最优
    "options": null                    // what_to_discard 时 null（选项即 14 张牌）
  },

  // 引擎快照：出题时由 verify CLI 写入，讲解与判分直接消费，客户端不再实时算
  "engine_snapshot": {
    "shanten_before": 1,
    "candidates": [
      { "discard": "4s", "shanten_after": 1, "ukeire_count": 16, "ukeire_tiles": ["3s","6s"] }
    ]
  },

  // 讲解三段式（PRD 7.3 / A.3 #4）：最优解 + 进张对比 + 理论出处，缺一不可
  "explanation": {
    "best": "切 4s。保留 …",
    "ukeire_table": [                  // 前几名候选的进张对比，渲染成表
      { "discard": "4s", "ukeire_count": 16, "note": "两面 3s/6s 共 8 张×2" }
    ],
    "source": "79博客·牌效率3「浮牌理论」/ Riichi Book I Ch4"
  },

  "verified": { "engine_version": "…", "checked_at": "…" }  // 校验流水，无此字段不得发布
}
```

## 三、answer 按题型

| question_type | answer 结构 |
|---|---|
| `what_to_discard` | `{ correct: string[] }`（并列最优全列） |
| `ukeire_compare` | `{ correct: ["3p"], options: [{discard:"3p"},{discard:"4p"}] }` |
| `mentsu_identify` | `{ correct: [{tiles:["3p","4p"], type:"ryanmen"}] }` |
| `wait_choose` | `{ correct: ["shanpon"], options: [...] }` |

## 四、文件组织与版本

```
content/
├── schema/question.schema.json      # JSON Schema，CI 里校验全部题目
├── questions/
│   ├── L1.json … L7.json            # 按级分文件（= 发布分片粒度）
├── templates/                        # 出题模板：按 knowledge_point 的牌型骨架
└── build/                            # 构建脚本：校验 → 汇总 → 产出 server/ 分片 + manifest
```

- **manifest.json**（发布产物，M4）：`{ schema_version, bank_version, published_at,
  levels: [{level, file, count, sha256}] }`，客户端据此增量拉取。协议、分片格式与发布
  流程见 architecture.md §五；生成脚本 `content/build/publish.mjs`，版本号单点见
  `content/build/version.mjs`（与 App 内置出厂题库同源，须一致 bump）
- 出厂题库（App 内置）与服务器题库同源同构，构建时从同一批 `content/questions/` 产出

## 五、出题流水线（PRD A.3 的落地）

```
① 选题：从「考察点清单」挑知识点（每级知识点清单先建表，防遗漏经典牌型）
② 出题：人工构造手牌（可先用脚本按模板随机生成候选，人工挑选改编——题目不是随机直出）
③ 校验：engine verify CLI → correct ⊆ 引擎最优集合，engine_snapshot 自动写入
④ 讲解：人工写三段式，source 必须指向 docs/references/ 清单内的资料章节
⑤ 入库：content/questions/LX.json + 过 schema 校验
⑥ 构建：build 脚本产出分片 + manifest → rsync 上服务器
```

### 试点批次（M2，2026-09-02 入库）

首批 **28 题**（L1×4 / L2×4 / L3×4 / L4×5 / L5×4 / L6×3 / L7×4）全过 verify CLI，
`engine_snapshot` 已由 `--write` 注入，bank_version `2026.09.0-pilot`。
出题工具链实测可用：`content/build/probe.ts`（探引擎数字）→ 写 `content/questions/LX.json`
→ `npx tsx packages/engine/bin/verify.ts content/questions/*.json --write` →
`node content/build/roll-bank.mjs`（产出 `apps/web/src/data/bank.json`）。

试点批的出题口径（M3 扩量沿用）：

- 手牌与讲解全部原创；知识点对齐 `LEVEL_META` 各级主题，source 只标章节定位
- 刻意保留**并列最优**题（切法等价时全列 correct），教「并列不算错」
- L6 用「不倒退正解 + 倒退边界例」呈现向听倒退专题，边界例讲解如实标注权衡，不装确定论

## 六、题量与排期（PRD A.1）

**2026-09-01 用户决定：V1 起步题量 = 每级 ≥10 题（共 ≥70 题）先上线跑通，后续再补齐；
下表 200 题为完整目标（PRD A.1 不变）。** 起步批次 = 七级 × 10 题，出题流水线同 §五。

| 级别 | 完整目标 | 起步批 | 关卡（完整目标） |
|---|---|---|---|
| L1 基本形与搭子识别 | 30 | 10 | 3×10 |
| L2 搭子价值与进张计算 | 35 | 10 | 3×约12 |
| L3 复合形与多面张 | 30 | 10 | 3×10 |
| L4 五搭子原理与拆搭 | 40 | 10 | 4×10 |
| L5 一向听与听牌选择 | 30 | 10 | 3×10 |
| L6 改良与向听倒退 | 20 | 10 | 2×10 |
| L7 综合判断（含攻守） | 15 | 10 | 2×约8 |
| **合计** | **200** | **70** | — |

> 内容红线：题目手牌与讲解全部原创（CLAUDE.md 版权红线）；经典牌型覆盖度用
> 「考察点清单」勾稽，不用题数凑。

**分布 QA（M3，2026-09-02 加）**：`node content/build/report-distribution.mjs`
（`npm run bank:dist`）只读对照 PRD A.1 打印每级题量 / 题型 / 难度与缺口，起步批
（七级每级 ≥10）达标退出码 0。2026-09-02 试点批复盘信号：题型仅 what_to_discard 22 +
ukeire_compare 6（**缺 mentsu_identify / wait_choose**），难度 hard 16 偏高——起步扩量应
easy/medium 打底，四种题型按 §一 占比补齐。
