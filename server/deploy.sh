#!/usr/bin/env bash
# nanikiru 发布脚本（M4）。2026-09-03：独立子域 mahjonghelper.tangzheheshui.cn（A 裁定，
# tangzheheshui.cn 根已被同服其他项目占用）；SSH 用户 ubuntu@（免密 sudo）。
# 上传用 tar over ssh——Windows Git Bash / Linux 通用，不依赖 rsync。
# 顺序保证「先数据后指针」：App 壳 + 分片先上传，manifest/config/version 最后。
# 用法：server/deploy.sh [user@host:/var/www/mahjonghelper]
set -euo pipefail

DEST="${1:-ubuntu@mahjonghelper.tangzheheshui.cn:/var/www/mahjonghelper}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOST="${DEST%%:*}"
REMOTE="${DEST#*:}"

echo "① 构建 Web（含出厂题库，version 单点 content/build/version.mjs）…"
(cd "$ROOT/apps/web" && npm run build)

echo "② 校验题库 + 发布分片（含同版本防呆，内容变未 bump 会拒发）…"
npx tsx "$ROOT/packages/engine/bin/verify.ts" "$ROOT/content/questions"
node "$ROOT/content/build/publish.mjs"

echo "③ 上传 App 壳（docroot 先清空，等价 rsync --delete）…"
ssh "$HOST" "sudo mkdir -p '$REMOTE' && sudo chown -R \$(id -un) '$REMOTE' && rm -rf '$REMOTE'/*"
tar -C "$ROOT/apps/web/dist" -cf - . | ssh "$HOST" "tar -C '$REMOTE' -xf -"

echo "④ 上传题库分片目录（不含 manifest，旧版本目录保留供回滚）…"
ssh "$HOST" "mkdir -p '$REMOTE/bank'"
tar -C "$ROOT/server/bank" --exclude=manifest.json -cf - . | ssh "$HOST" "tar -C '$REMOTE/bank' -xf -"

echo "⑤ 最后上传 manifest 指针 + 远程配置 …"
scp -q "$ROOT/server/bank/manifest.json" "$HOST:$REMOTE/bank/"
scp -q "$ROOT/server/config.json" "$ROOT/server/version.json" "$HOST:$REMOTE/"

echo "✓ 发布完成。回滚：把服务器端 $REMOTE/bank/manifest.json 指回旧 v{version} 目录即可。"
