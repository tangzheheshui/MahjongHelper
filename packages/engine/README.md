# packages/engine

麻将牌效率引擎：向听数 / 进张枚举 / 最优切牌分析 / 题库校验。
**零运行时依赖、纯函数**，跑在浏览器 / PWA / Capacitor iOS / Node CLI。

需求与验收：[docs/requirements/engine.md](../../docs/requirements/engine.md)

## 结构

```
packages/engine/
├── src/
│   ├── tiles.ts     # 牌编解码（34 种 ↔ "3m" 字符串）、Counts、随机手牌
│   ├── shanten.ts   # 标准形向听数（13/14 张）
│   ├── analyze.ts   # analyze14 / analyze13：切牌候选 + 进张表
│   └── verify.ts    # verifyQuestion / buildSnapshot：题库校验（纯函数）
├── bin/verify.ts    # 题库校验 CLI（文件 IO 薄壳）
├── scripts/         # 对拍工具链（duipai-export.ts + duipai.py）
└── tests/           # golden 用例集 + 结构族 + 校验测试 + 随机自洽
```

## 常用命令

```bash
npm test -w @nanikiru/engine          # vitest：golden + 族 + 校验 + 随机自洽
npm run typecheck -w @nanikiru/engine
npm run verify -w @nanikiru/engine -- content/questions/L1.json   # 题库校验（只读）
npm run verify -w @nanikiru/engine -- content/questions/L1.json --write  # 校验通过后写入快照
npm run duipai -w @nanikiru/engine    # 第三方对拍（需 pip install mahjong）
```

- verify CLI：`answer.correct` 必须与引擎最优切牌集合**完全一致**（含并列全列），
  不一致的题拒绝入库（退出码 1）；`--write` 写入 `engine_snapshot` / `verified` 流水字段
- 对拍：固定种子批次（golden + 随机）与 Python mahjong 库逐项比对，
  报告产出至 `docs/references/duipai-report.md`（M1④）
- CLI 与脚本经根目录 devDependency `tsx` 运行；引擎本身不引入任何运行时依赖
