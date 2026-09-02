/**
 * 一次性代码生成：从同目录 tile-samples-v0.8.html 提取「行楷萬子 + 索子」牌面，
 * 产出 apps/web/src/tiles/v08-faces.ts（占位皮肤万/条直接渲染这份定稿素材）。
 *
 * 用法：node apps/web/scripts/extract-v08-tiles.mjs
 * 规则：只提取 w-1m..w-9m 与 s-1s..s-9s 符号的内部标记，剥掉 <use href="#shell"/>；
 *       提取物不得再引用任何 id（断言，防止悄悄引入全局依赖）。
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const html = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "tile-samples-v0.8.html"), "utf8");

const symbolRe = /<symbol id="([ws])-(\d)([ms])" viewBox="0 0 120 180">([\s\S]*?)<\/symbol>/g;
const faces = {};
let m;
while ((m = symbolRe.exec(html)) !== null) {
  const kind = `${m[2]}${m[3]}`; // 如 "1m" / "3s"
  const inner = m[4].replace(/<use href="#shell"\s*\/>/g, "").trim();
  const dangling = inner.match(/href="#|url\(#/);
  if (dangling) {
    console.error(`✗ ${kind} 仍引用 id（${dangling[0]}…），需先在样张中内联`);
    process.exit(1);
  }
  faces[kind] = inner;
}

const missing = ["1m","2m","3m","4m","5m","6m","7m","8m","9m","1s","2s","3s","4s","5s","6s","7s","8s","9s"].filter((k) => !faces[k]);
if (missing.length) {
  console.error(`✗ 缺少符号：${missing.join(", ")}`);
  process.exit(1);
}

const body = Object.entries(faces)
  .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`)
  .join("\n");

const out = `/** 自动生成：apps/web/scripts/extract-v08-tiles.mjs ← apps/web/scripts/tile-samples-v0.8.html，勿手改。
 * 内容为 v0.8 定稿的行楷萬子与索子牌面（平色 SVG 路径，无全局 id 依赖）；
 * 饼面与字牌不在素材内，由占位皮肤代码绘制。 */
export const V08_FACES: Record<string, string> = {
${body}
};
`;

const target = resolve(root, "apps/web/src/tiles/v08-faces.ts");
writeFileSync(target, out, "utf8");
console.log(`✓ 提取 ${Object.keys(faces).length} 个牌面 → ${target}（${(out.length / 1024).toFixed(1)} KiB）`);
