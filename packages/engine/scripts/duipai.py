# -*- coding: utf-8 -*-
"""对拍复算：用 Python mahjong 库独立计算批次内全部手牌，与引擎导出结果比对。

口径（与 docs/requirements/engine.md 一致）：
- 向听数 = 标准形（4 面子 + 1 雀头），用 mahjong.shanten.Shanten.calculate_shanten_for_regular_hand，
  不含七对 / 国士（引擎 V1 同口径）
- 进张张数 = 4 − 手内该牌张数；判定 = 摸牌后向听数 ≤ 切牌后向听数 − 1（听牌时即和了牌）

用法：python packages/engine/scripts/duipai.py
输入：scripts/out/duipai-batch.json（先跑 duipai-export.ts）
产物：docs/references/duipai-report.md（人读报告）+ docs/references/duipai-results.json（机读明细）
"""

import json
import sys
from datetime import date
from importlib.metadata import version as pkg_version
from pathlib import Path

from mahjong.shanten import Shanten

sys.stdout.reconfigure(encoding="utf-8")

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
BATCH_PATH = HERE / "out" / "duipai-batch.json"
REPORT_PATH = REPO / "docs" / "references" / "duipai-report.md"
RESULTS_PATH = REPO / "docs" / "references" / "duipai-results.json"

SH = Shanten()

# 牌名 → 34 下标（与引擎 tile_order 一致）
_SUIT = {"m": 0, "p": 9, "s": 18}
_HONOR = {"E": 27, "S": 28, "W": 29, "N": 30, "h": 31, "f": 32, "c": 33}


def tile_index(t: str) -> int:
    if t in _HONOR:
        return _HONOR[t]
    return _SUIT[t[1]] + int(t[0]) - 1


def to_counts(hand: list[str]) -> list[int]:
    c = [0] * 34
    for t in hand:
        c[tile_index(t)] += 1
    return c


def shanten(counts: list[int]) -> int:
    return SH.calculate_shanten_for_regular_hand(counts)


def ukeire(counts13: list[int], s: int) -> tuple[list[int], int, dict[int, int]]:
    """13 张 counts 的进张：返回（牌种下标表, 总张数, 各牌剩余张数）"""
    tiles, total, remaining = [], 0, {}
    for j in range(34):
        rem = 4 - counts13[j]
        if rem <= 0:
            continue
        counts13[j] += 1
        s14 = shanten(counts13)
        counts13[j] -= 1
        if s14 <= s - 1:
            tiles.append(j)
            total += rem
            remaining[j] = rem
    return tiles, total, remaining


def names(idxs) -> list[str]:
    return sorted(tile_to_name(i) for i in idxs)


def tile_to_name(i: int) -> str:
    if i >= 27:
        return list(_HONOR)[i - 27]
    suit = "mps"[i // 9]
    return f"{i % 9 + 1}{suit}"


def check_case13(case: dict) -> list[str]:
    diffs = []
    eng = case["engine"]
    c = to_counts(case["hand"])
    s = shanten(c)
    if s != eng["shanten"]:
        diffs.append(f"向听数: 引擎 {eng['shanten']} vs mahjong {s}")
    tiles, total, remaining = ukeire(c, s)
    if names(tiles) != sorted(eng_adv_tiles(eng)):
        diffs.append(f"进张牌种: 引擎 {sorted(eng_adv_tiles(eng))} vs mahjong {names(tiles)}")
    if total != eng["ukeireCount"]:
        diffs.append(f"进张总张数: 引擎 {eng['ukeireCount']} vs mahjong {total}")
    for adv in eng["advances"]:
        j = tile_index(adv["tile"])
        if j in remaining:
            if remaining[j] != adv["remaining"]:
                diffs.append(f"{adv['tile']} 剩余张数: 引擎 {adv['remaining']} vs mahjong {remaining[j]}")
            c[j] += 1
            if shanten(c) != adv["shantenAfter"]:
                diffs.append(f"{adv['tile']} 摸后向听: 引擎 {adv['shantenAfter']} vs mahjong {shanten(c)}")
            c[j] -= 1
        else:
            diffs.append(f"{adv['tile']} 引擎认为是进张，mahjong 不认为")
    return diffs


def eng_adv_tiles(eng: dict) -> list[str]:
    return [a["tile"] for a in eng["advances"]]


def check_case14(case: dict) -> list[str]:
    diffs = []
    eng = case["engine"]
    c = to_counts(case["hand"])
    py_cands = {}
    for d in range(34):
        if c[d] == 0:
            continue
        c[d] -= 1
        s = shanten(c)
        tiles, total, _ = ukeire(c, s)
        c[d] += 1
        py_cands[d] = (s, total, set(tiles))
    eng_cands = {tile_index(x["discard"]): x for x in eng["candidates"]}
    if set(py_cands) != set(eng_cands):
        diffs.append(
            f"候选切牌集合: 引擎 {sorted(names(set(eng_cands)))} vs mahjong {sorted(names(set(py_cands)))}"
        )
    best = min(v[0] for v in py_cands.values())
    if best != eng["bestShanten"]:
        diffs.append(f"最优切后向听: 引擎 {eng['bestShanten']} vs mahjong {best}")
    for d, (s, total, tiles) in py_cands.items():
        e = eng_cands.get(d)
        if e is None:
            continue
        if s != e["shantenAfter"]:
            diffs.append(f"切{tile_to_name(d)}后向听: 引擎 {e['shantenAfter']} vs mahjong {s}")
        if total != e["ukeireCount"]:
            diffs.append(f"切{tile_to_name(d)}进张总张数: 引擎 {e['ukeireCount']} vs mahjong {total}")
        if names(tiles) != sorted(e["ukeireTiles"]):
            diffs.append(
                f"切{tile_to_name(d)}进张牌种: 引擎 {sorted(e['ukeireTiles'])} vs mahjong {names(tiles)}"
            )
    return diffs


def main() -> None:
    batch = json.loads(BATCH_PATH.read_text(encoding="utf-8"))
    results = []
    for case in batch["cases"]:
        if case["engine"]["kind"] == "13":
            diffs = check_case13(case)
        else:
            diffs = check_case14(case)
        results.append(
            {"id": case["id"], "source": case["source"], "kind": case["engine"]["kind"], "ok": not diffs, "diffs": diffs}
        )

    bad = [r for r in results if not r["ok"]]
    n13 = sum(1 for r in results if r["kind"] == "13")
    n14 = sum(1 for r in results if r["kind"] == "14")
    ng = sum(1 for r in results if r["source"] == "golden")
    nr = sum(1 for r in results if r["source"] == "random")

    mahjong_ver = pkg_version("mahjong")
    results_doc = {
        "schema_version": 1,
        "generated_at": batch["generated_at"],
        "engine_version": batch["engine_version"],
        "mahjong_version": mahjong_ver,
        "totals": {"cases": len(results), "hand13": n13, "hand14": n14, "golden": ng, "random": nr, "mismatch": len(bad)},
        "cases": results,
    }
    RESULTS_PATH.write_text(json.dumps(results_doc, ensure_ascii=False, indent=1), encoding="utf-8")

    lines = [
        "# 引擎第三方对拍报告（Python mahjong 库）",
        "",
        f"- 日期：{date.today().isoformat()}（复算脚本运行日）",
        f"- 引擎版本：@nanikiru/engine {batch['engine_version']}（本仓库 `packages/engine`）",
        f"- 对拍基准：[mahjong](https://github.com/MahjongRepository/mahjong)（PyPI）v{mahjong_ver}，MIT 许可",
        "- 口径：双方均为标准形向听（4 面子 + 1 雀头，不含七对/国士）；进张张数 = 4 − 手内该牌张数",
        "- 方法：同一批手牌，引擎侧由 `scripts/duipai-export.ts` 导出结果，",
        "  Python 侧用 `mahjong.shanten.Shanten.calculate_shanten_for_regular_hand` 独立复算后逐项比对",
        "",
        "## 批次",
        "",
        f"共 {len(results)} 手：golden 教材锚定 {ng} 手 + 固定种子随机 {nr} 手；13 张 {n13} 手、14 张 {n14} 手。",
        "随机手牌为 136 张牌池不放回抽样（种子 20260902），可复现。",
        "",
        "## 比对项",
        "",
        "| 手牌 | 比对内容 |",
        "|---|---|",
        "| 13 张 | 向听数；进张牌种集合；进张总张数；每张进张的剩余张数与摸后向听数 |",
        "| 14 张 | 候选切牌集合；最优切后向听数；每种切牌的切后向听数、进张总张数、进张牌种集合 |",
        "",
        "## 结果",
        "",
    ]
    if not bad:
        lines.append(f"**全部一致：{len(results)}/{len(results)} 手，0 差异。** ✅")
    else:
        lines.append(f"**发现 {len(bad)} 手不一致：** ❌")
        lines.append("")
        lines.append("| 用例 | 来源 | 差异 |")
        lines.append("|---|---|---|")
        for r in bad:
            lines.append(f"| {r['id']} | {r['source']} | {'；'.join(r['diffs'])} |")
    lines += [
        "",
        "## 明细与复现",
        "",
        f"逐手 verdict 见 [`duipai-results.json`]({RESULTS_PATH.name})（与本报告同目录）。",
        "",
        "```bash",
        "npx tsx packages/engine/scripts/duipai-export.ts   # 引擎侧导出批次",
        "python packages/engine/scripts/duipai.py           # mahjong 侧复算 + 生成本报告",
        "```",
        "",
        "> M1 DoD（docs/requirements/engine.md §三.2）要求对拍 ≥20 题：本批 151 手超量覆盖。",
    ]
    REPORT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(f"对拍完成：{len(results)} 手，不一致 {len(bad)} 手")
    for r in bad:
        print(f"  {r['id']}: {r['diffs']}")
    print(f"报告 → {REPORT_PATH}")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
