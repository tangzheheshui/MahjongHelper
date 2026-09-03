#!/usr/bin/env bash
# nanikiru 发布脚本（M4）。域名 tangzheheshui.cn（2026-09-03 定）——
# 按真实 SSH 用户改默认值（如 root@ / ubuntu@）后使用。
# 顺序保证「先数据后指针」：App 壳 + 分片先上传，manifest/config/version 最后。
# 用法：server/deploy.sh [user@host:/var/www/nanikiru]
set -euo pipefail

DEST="${1:-user@tangzheheshui.cn:/var/www/nanikiru}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "① 构建 Web（含出厂题库，version 单点 content/build/version.mjs）…"
(cd "$ROOT/apps/web" && npm run build)

echo "② 校验题库 + 发布分片（含同版本防呆，内容变未 bump 会拒发）…"
npx tsx "$ROOT/packages/engine/bin/verify.ts" "$ROOT/content/questions"
node "$ROOT/content/build/publish.mjs"

echo "③ 上传 App 壳（dist）…"
rsync -av --delete "$ROOT/apps/web/dist/" "$DEST/"

echo "④ 上传题库分片目录（不含 manifest，旧版本目录保留供回滚）…"
rsync -av --exclude=manifest.json "$ROOT/server/bank/" "$DEST/bank/"

echo "⑤ 最后上传 manifest 指针 + 远程配置 …"
rsync -av "$ROOT/server/bank/manifest.json" "$DEST/bank/"
rsync -av "$ROOT/server/config.json" "$ROOT/server/version.json" "$DEST/"

echo "✓ 发布完成。回滚：把服务器端 $DEST/bank/manifest.json 指回旧 v{version} 目录即可。"
