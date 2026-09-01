"use strict";
var NKEngine = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key2 of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key2) && key2 !== except)
          __defProp(to, key2, { get: () => from[key2], enumerable: !(desc = __getOwnPropDesc(from, key2)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // packages/engine/src/index.ts
  var index_exports = {};
  __export(index_exports, {
    ENGINE_VERSION: () => ENGINE_VERSION,
    TILE_KINDS: () => TILE_KINDS,
    analyze13: () => analyze13,
    analyze14: () => analyze14,
    bestDiscards: () => bestDiscards,
    countsToHand: () => countsToHand,
    isWin: () => isWin,
    parseTile: () => parseTile,
    randomHand13: () => randomHand13,
    shanten: () => shanten,
    shanten13: () => shanten13,
    shanten14: () => shanten14,
    tileToStr: () => tileToStr,
    toCounts: () => toCounts
  });

  // packages/engine/src/tiles.ts
  var TILE_KINDS = [
    ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `${n}m`),
    ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `${n}p`),
    ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `${n}s`),
    "E",
    "S",
    "W",
    "N",
    "h",
    "f",
    "c"
  ];
  var KIND_INDEX = new Map(
    TILE_KINDS.map((s, i) => [s, i])
  );
  function parseTile(s) {
    const i = KIND_INDEX.get(s);
    if (i === void 0) throw new Error(`\u975E\u6CD5\u724C\u540D: "${s}"`);
    return i;
  }
  function tileToStr(i) {
    const s = TILE_KINDS[i];
    if (s === void 0) throw new Error(`\u975E\u6CD5\u724C\u4E0B\u6807: ${i}`);
    return s;
  }
  function toCounts(hand, expected) {
    const counts = new Array(34).fill(0);
    for (const s of hand) {
      const i = parseTile(s);
      counts[i] += 1;
      if (counts[i] > 4) throw new Error(`\u724C "${s}" \u8D85\u8FC7 4 \u5F20`);
    }
    const total = counts.reduce((a, b) => a + b, 0);
    if (expected !== void 0 && total !== expected) {
      throw new Error(`\u624B\u724C\u5F20\u6570\u4E3A ${total}\uFF0C\u671F\u671B ${expected}`);
    }
    return counts;
  }
  function countsToHand(counts) {
    const hand = [];
    for (let i = 0; i < 34; i++) {
      for (let k = 0; k < counts[i]; k++) hand.push(tileToStr(i));
    }
    return hand;
  }
  function randomHand13(rand) {
    const pool = [];
    for (let i = 0; i < 34; i++) for (let k = 0; k < 4; k++) pool.push(i);
    const hand = [];
    for (let n = 0; n < 13; n++) {
      const j = n + Math.floor(rand() * (pool.length - n));
      [pool[n], pool[j]] = [pool[j], pool[n]];
      hand.push(pool[n]);
    }
    return hand.map(tileToStr);
  }

  // packages/engine/src/shanten.ts
  var INF = 99;
  var SUIT_RANGES = [
    [0, 9],
    [9, 9],
    [18, 9],
    [27, 7]
  ];
  function decomposeSuit(src, len) {
    const counts = src.slice();
    const hasRun = len === 9;
    const results = [];
    function rec(i, m, t, p) {
      while (i < len && counts[i] === 0) i++;
      if (i >= len) {
        results.push({ m, t, p });
        return;
      }
      if (counts[i] >= 3) {
        counts[i] -= 3;
        rec(i, m + 1, t, p);
        counts[i] += 3;
      }
      if (hasRun && i + 2 < len && counts[i + 1] > 0 && counts[i + 2] > 0) {
        counts[i]--;
        counts[i + 1]--;
        counts[i + 2]--;
        rec(i, m + 1, t, p);
        counts[i]++;
        counts[i + 1]++;
        counts[i + 2]++;
      }
      if (counts[i] >= 2) {
        counts[i] -= 2;
        rec(i, m, t, p + 1);
        counts[i] += 2;
      }
      if (counts[i] >= 2) {
        counts[i] -= 2;
        rec(i, m, t + 1, p);
        counts[i] += 2;
      }
      if (hasRun && i + 1 < len && counts[i + 1] > 0) {
        counts[i]--;
        counts[i + 1]--;
        rec(i, m, t + 1, p);
        counts[i]++;
        counts[i + 1]++;
      }
      if (hasRun && i + 2 < len && counts[i + 2] > 0) {
        counts[i]--;
        counts[i + 2]--;
        rec(i, m, t + 1, p);
        counts[i]++;
        counts[i + 2]++;
      }
      counts[i]--;
      rec(i, m, t, p);
      counts[i]++;
    }
    rec(0, 0, 0, 0);
    return prune(results);
  }
  function prune(list) {
    const sorted = [...list].sort(
      (a, b) => b.m - a.m || b.t - a.t || b.p - a.p
    );
    const out = [];
    for (const s of sorted) {
      if (out.some((o) => o.m >= s.m && o.t >= s.t && o.p >= s.p)) continue;
      out.push(s);
    }
    return out;
  }
  function shanten(counts) {
    let states = [{ m: 0, t: 0, p: 0 }];
    for (const [start, len] of SUIT_RANGES) {
      const part = decomposeSuit(counts.slice(start, start + len), len);
      const merged = [];
      for (const a of states) {
        for (const b of part) {
          const m = a.m + b.m;
          if (m > 4) continue;
          merged.push({ m, t: a.t + b.t, p: Math.min(a.p + b.p, 1) });
        }
      }
      states = prune(merged);
      if (states.length === 0) return INF;
    }
    let best = INF;
    for (const s of states) {
      const t = Math.min(s.t, 4 - s.m);
      const head = s.p > 0 ? 1 : 0;
      const v = 8 - 2 * s.m - t - head;
      if (v < best) best = v;
    }
    return best;
  }
  function suitAllSets(counts, i, end) {
    while (i < end && counts[i] === 0) i++;
    if (i === end) return true;
    if (counts[i] >= 3) {
      counts[i] -= 3;
      const ok = suitAllSets(counts, i, end);
      counts[i] += 3;
      if (ok) return true;
    }
    if (end - i > 2 && counts[i + 1] > 0 && counts[i + 2] > 0) {
      counts[i]--;
      counts[i + 1]--;
      counts[i + 2]--;
      const ok = suitAllSets(counts, i, end);
      counts[i]++;
      counts[i + 1]++;
      counts[i + 2]++;
      if (ok) return true;
    }
    return false;
  }
  function isWin(counts) {
    const c = counts.slice();
    for (let i = 0; i < 34; i++) {
      if (c[i] >= 2) {
        c[i] -= 2;
        let ok = true;
        for (const [start, len] of SUIT_RANGES) {
          if (!suitAllSets(c, start, start + len)) {
            ok = false;
            break;
          }
        }
        c[i] += 2;
        if (ok) return true;
      }
    }
    return false;
  }
  var cache = /* @__PURE__ */ new Map();
  function key(c) {
    return c.join("");
  }
  function memoGet(k) {
    return cache.get(k);
  }
  function memoSet(k, v) {
    if (cache.size > 2e5) cache.clear();
    cache.set(k, v);
  }
  function shanten13(counts) {
    const k = key(counts);
    const hit = memoGet(k);
    if (hit !== void 0) return hit;
    const v = shanten(counts);
    memoSet(k, v);
    return v;
  }
  function shanten14(counts) {
    const k = key(counts);
    const hit = memoGet(k);
    if (hit !== void 0) return hit;
    let v;
    if (isWin(counts)) {
      v = -1;
    } else {
      v = INF;
      for (let i = 0; i < 34; i++) {
        if (counts[i] === 0) continue;
        counts[i]--;
        const s = shanten13(counts);
        counts[i]++;
        if (s < v) v = s;
      }
    }
    memoSet(k, v);
    return v;
  }

  // packages/engine/src/analyze.ts
  function analyze14(hand) {
    const counts = toCounts(hand, 14);
    const candidates = [];
    for (let d = 0; d < 34; d++) {
      if (counts[d] === 0) continue;
      counts[d]--;
      const s = shanten13(counts);
      const ukeireTiles = [];
      let ukeireCount = 0;
      for (let j = 0; j < 34; j++) {
        const remaining = 4 - counts[j];
        if (remaining <= 0) continue;
        counts[j]++;
        const s14 = shanten14(counts);
        counts[j]--;
        if (s14 <= s - 1) {
          ukeireTiles.push(tileToStr(j));
          ukeireCount += remaining;
        }
      }
      counts[d]++;
      candidates.push({
        discard: tileToStr(d),
        shantenAfter: s,
        ukeireCount,
        ukeireTiles
      });
    }
    candidates.sort(
      (a, b) => a.shantenAfter - b.shantenAfter || b.ukeireCount - a.ukeireCount
    );
    return { shanten: candidates[0]?.shantenAfter ?? 99, candidates };
  }
  function analyze13(hand) {
    const counts = toCounts(hand, 13);
    const s = shanten13(counts);
    const advances = [];
    let ukeireCount = 0;
    for (let j = 0; j < 34; j++) {
      const remaining = 4 - counts[j];
      if (remaining <= 0) continue;
      counts[j]++;
      const s14 = shanten14(counts);
      counts[j]--;
      if (s14 <= s - 1) {
        advances.push({
          tile: tileToStr(j),
          remaining,
          shantenAfter: s14
        });
        ukeireCount += remaining;
      }
    }
    return { shanten: s, advances, ukeireCount };
  }
  function bestDiscards(analysis) {
    const best = analysis.candidates[0];
    if (!best) return [];
    return analysis.candidates.filter((c) => c.shantenAfter === best.shantenAfter && c.ukeireCount === best.ukeireCount).map((c) => c.discard);
  }
  var ENGINE_VERSION = "0.1.0";
  return __toCommonJS(index_exports);
})();
