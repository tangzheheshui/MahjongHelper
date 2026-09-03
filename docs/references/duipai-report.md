# 引擎第三方对拍报告（Python mahjong 库）

- 日期：2026-09-02（复算脚本运行日）
- 引擎版本：@nanikiru/engine 0.1.0（本仓库 `packages/engine`）
- 对拍基准：[mahjong](https://github.com/MahjongRepository/mahjong)（PyPI）v2.0.0，MIT 许可
- 口径：双方均为标准形向听（4 面子 + 1 雀头，不含七对/国士）；进张张数 = 4 − 手内该牌张数
- 方法：同一批手牌，引擎侧由 `scripts/duipai-export.ts` 导出结果，
  Python 侧用 `mahjong.shanten.Shanten.calculate_shanten_for_regular_hand` 独立复算后逐项比对

## 批次

共 151 手：golden 教材锚定 11 手 + 固定种子随机 140 手；13 张 90 手、14 张 61 手。
随机手牌为 136 张牌池不放回抽样（种子 20260902），可复现。

## 比对项

| 手牌 | 比对内容 |
|---|---|
| 13 张 | 向听数；进张牌种集合；进张总张数；每张进张的剩余张数与摸后向听数 |
| 14 张 | 候选切牌集合；最优切后向听数；每种切牌的切后向听数、进张总张数、进张牌种集合 |

## 结果

**全部一致：151/151 手，0 差异。** ✅

## 明细与复现

逐手 verdict 见 [`duipai-results.json`](duipai-results.json)（与本报告同目录）。

```bash
npx tsx packages/engine/scripts/duipai-export.ts   # 引擎侧导出批次
python packages/engine/scripts/duipai.py           # mahjong 侧复算 + 生成本报告
```

> M1 DoD 要求对拍 ≥20 题（对拍口径与命令见 `packages/engine/README.md`）：本批 151 手超量覆盖。
