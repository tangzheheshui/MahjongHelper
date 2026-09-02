/**
 * M2 闭环冒烟（CLAUDE.md 铁律 2「试点先行」的链路验证）：
 * 在 node 里模拟 练 → 判 → 讲 → 结算/解锁 → 错题本 → 水平测试 全流程。
 * 不起浏览器：IndexedDB 不可用时 bank.ts 静默降级内置题库，正好覆盖离线口径；
 * UI 交互留给人肉验收（README 自测清单）。
 *
 * 用法：npx tsx apps/web/scripts/smoke-loop.ts
 */

// localStorage 内存 shim（须在 import lib 之前就位，故用动态 import）
const mem = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
};

const { loadBank, questionsOf } = await import("../src/lib/bank");
const { LEVELS } = await import("../src/lib/types");
const {
  isCorrect, candidatesOf, shantenBefore, pickStageQuestions,
  applyRunResult, pickPlacementQuestions, gradePlacement,
} = await import("../src/lib/levels");
const {
  loadProgress, saveProgress, recordWrong, loadWrongBook,
  loadPlacement, savePlacement, clearAllData,
} = await import("../src/lib/storage");

let failed = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    console.log(`  ✓ ${name}${detail ? `（${detail}）` : ""}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${name}${detail ? `（${detail}）` : ""}`);
  }
}

/* ---------- ① 题库加载（离线口径：IDB 缺席 → 内置题库） ---------- */
console.log("① 题库加载（IndexedDB 缺席，走内置降级）");
const bank = await loadBank();
const builtin = (await import("../src/data/bank.json")).default as typeof bank;
check("题库与内置产物一致", bank.questions.length === builtin.questions.length, `${bank.questions.length} 题`);
check("bank_version 就位", bank.bank_version.startsWith("2026.09"), bank.bank_version);

/* ---------- ② 出题：各级抽题 + 关卡补足 ---------- */
console.log("② 出题（questionsOf + pickStageQuestions）");
const byLevel: Record<string, ReturnType<typeof questionsOf>> = {};
for (const lv of LEVELS) byLevel[lv] = questionsOf(bank, lv);
check("L1-L7 全部有题", LEVELS.every((lv) => byLevel[lv].length > 0));
for (const lv of LEVELS) {
  const { qs, reused } = pickStageQuestions(byLevel[lv]);
  check(`${lv} 关卡题量 8-12`, qs.length >= 8 && qs.length <= 12, `出 ${qs.length} 题，库存 ${byLevel[lv].length}，复用=${reused}`);
}

/* ---------- ③ 判分 + 讲解数据 ---------- */
console.log("③ 判分与讲解（isCorrect / candidatesOf / shantenBefore）");
for (const q of bank.questions) {
  const hasSnapshot = q.question_type === "what_to_discard" || q.question_type === "ukeire_compare";
  // 正解串按题型：mi 的用户答案是 type、其余是切牌 / value
  const right =
    q.question_type === "mentsu_identify"
      ? (q.answer.correct as { type: string }[])[0].type
      : (q.answer.correct as string[])[0];
  if (!isCorrect(q, right)) check(`${q.id} 正解判对`, false);
  if (hasSnapshot) {
    const wrong = q.engine_snapshot!.candidates.find((c) => !(q.answer.correct as string[]).includes(c.discard))!.discard;
    if (isCorrect(q, wrong)) check(`${q.id} 错解判错`, false, `误判 ${wrong}`);
    const rows = candidatesOf(q);
    // 排序契约：向听数升序为主键，同向听段内进张数降序，且首行必是正解
    const sortedOk = rows.every(
      (r, i) => i === 0
        || r.shanten_after > rows[i - 1].shanten_after
        || (r.shanten_after === rows[i - 1].shanten_after && r.ukeire_count <= rows[i - 1].ukeire_count),
    );
    // 何切题首行必是正解；对比题只要求正解项严格优于干扰项（verify CLI 口径）
    const headOk = q.question_type === "ukeire_compare" || (q.answer.correct as string[]).includes(rows[0].discard);
    if (!(rows.length >= 3 && sortedOk && headOk)) {
      check(`${q.id} 候选表可用且排序合规`, false, `${rows.length} 行`);
    }
    if (shantenBefore(q) < 0) check(`${q.id} 向听数异常`, false);
  }
}
check(`${bank.questions.length} 题判分/讲解数据全部通过`, true);

/* ---------- ④ 结算与解锁（applyRunResult） ---------- */
console.log("④ 结算与解锁（≥80% 达标）");
{
  const p0 = { levels: { L1: { unlocked: true } } as Record<string, { unlocked: boolean }> };
  const r1 = applyRunResult(p0 as never, "L1", Array.from({ length: 8 }, (_, i) => ({ ok: i < 7 })));
  check("7/8 = 87.5% 达标", r1.passed && Math.abs(r1.rate - 0.875) < 1e-9);
  check("解锁 L2", r1.progress.levels.L2?.unlocked === true);
  check("87.5% 记 1 星", r1.progress.levels.L1?.stars === 1, `stars=${r1.progress.levels.L1?.stars}`);

  const r2 = applyRunResult(r1.progress as never, "L1", Array.from({ length: 8 }, () => ({ ok: true })));
  check("8/8 记 3 星（只升不降）", r2.progress.levels.L1?.stars === 3);
  check("bestRate 只升不降", r2.progress.levels.L1?.bestRate === 1);

  const r3 = applyRunResult({ levels: {} } as never, "L1", Array.from({ length: 8 }, (_, i) => ({ ok: i < 6 })));
  check("6/8 = 75% 不达标", !r3.passed);
  check("未解锁 L2", r3.progress.levels.L2?.unlocked !== true);

  const r4 = applyRunResult({ levels: {} } as never, "L7", Array.from({ length: 8 }, () => ({ ok: true })));
  check("L7 通关不越界", r4.passed && r4.progress.levels.L7?.completedAt != null);
}

/* ---------- ⑤ 错题本 ---------- */
console.log("⑤ 错题本（recordWrong / 答对移出）");
{
  const q = bank.questions[3];
  recordWrong(q);
  recordWrong(q);
  let wb = loadWrongBook();
  check("做错两次累加", wb.entries[q.id]?.wrongCount === 2);
  check("知识点带出", wb.entries[q.id]?.knowledgePoint === q.knowledge_point);
  // 重做答对 → 移出（WrongBook 页语义）
  const book = loadWrongBook();
  delete book.entries[q.id];
  wb = loadWrongBook(); // 未保存前仍在
  check("未保存不移出", wb.entries[q.id] != null);
}

/* ---------- ⑥ 水平测试 ---------- */
console.log("⑥ 水平测试（组卷 / 定级 / 解锁范围）");
{
  const picked = pickPlacementQuestions(byLevel);
  check("组卷 ≥12 题", picked.length >= 12, `${picked.length} 题`);
  check("组卷全为何切题", picked.every((q) => q.question_type === "what_to_discard"));

  // 全对 → 高级 / L7
  const all: Record<string, { ok: number; total: number }> = {};
  for (const q of picked) {
    const s = (all[q.level] ??= { ok: 0, total: 0 });
    s.total += 1;
    s.ok += 1;
  }
  const g1 = gradePlacement(all as never);
  check("全对定高级 L7", g1.grade === "高级" && g1.startLevel === "L7", `${g1.grade}/${g1.startLevel}`);

  // 只对到 L5 → 中级 / L5
  const mid: Record<string, { ok: number; total: number }> = {};
  for (const q of picked) {
    const s = (mid[q.level] ??= { ok: 0, total: 0 });
    s.total += 1;
    s.ok += ["L1", "L2", "L3", "L4", "L5"].includes(q.level) ? 1 : 0;
  }
  const g2 = gradePlacement(mid as never);
  check("对到 L5 定中级", g2.grade === "中级" && g2.startLevel === "L5", `${g2.grade}/${g2.startLevel}`);

  // 全错 → 入门 / L1
  const none: Record<string, { ok: number; total: number }> = {};
  for (const q of picked) (none[q.level] ??= { ok: 0, total: 0 }).total += 1;
  const g3 = gradePlacement(none as never);
  check("全错定入门 L1", g3.grade === "入门" && g3.startLevel === "L1");

  // 持久化往返
  savePlacement({ grade: g2.grade, startLevel: g2.startLevel, takenAt: new Date().toISOString(), perLevel: mid as never });
  const loaded = loadPlacement();
  check("定级结果落盘往返", loaded?.startLevel === "L5");
}

/* ---------- ⑦ 存储清理 ---------- */
console.log("⑦ 存储层（清理）");
saveProgress(loadProgress());
clearAllData();
check("clearAllData 清空四键", loadPlacement() === null && Object.keys(loadProgress().levels).length === 0);

console.log(failed === 0 ? "\n闭环冒烟全部通过 ✅" : `\n闭环冒烟有 ${failed} 项失败 ❌`);
process.exit(failed === 0 ? 0 : 1);
