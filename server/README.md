# server/（静态分发目录）

纯静态分发：`bank/manifest.json` + 按版本目录分片的题库 JSON + `config.json` + `version.json`。
由 `content/build/publish.mjs` 本地产出后上传；**无后端代码**。上传走 `./deploy.sh`（**tar over ssh**，
Windows Git Bash 与 Linux 通用，不依赖 rsync）。
网络行为、本地存储的完整需求见 [requirements.md](../docs/requirements.md)；题库 Schema 见
[content/schema/question.schema.json](../content/schema/question.schema.json)。

## 目录结构与 URL

```
server/                        # 部署到独立子域 https://mahjonghelper.tangzheheshui.cn/ 根（App 与题库同源静态）
├── bank/
│   ├── manifest.json          # 题库版本清单（客户端更新入口，最后上传；no-cache）
│   └── v{bank_version}/       # 旧版本目录保留；回滚 = manifest 指回旧目录
│       ├── L1.json … L7.json  # 分级分片：{ level, questions }（不含版本号，immutable）
├── config.json                # 远程配置（功能开关），拉不到用内置默认
├── version.json               # App 最新版本号（M5 iOS 检查用）
```

```
https://mahjonghelper.tangzheheshui.cn/                      # Web App 本体（静态托管，同源）
https://mahjonghelper.tangzheheshui.cn/bank/manifest.json    # 题库更新入口
https://mahjonghelper.tangzheheshui.cn/bank/v{version}/L1.json … L7.json
https://mahjonghelper.tangzheheshui.cn/config.json           # 远程配置
https://mahjonghelper.tangzheheshui.cn/version.json          # App 版本号
```

**客户端只认 `manifest.levels[].file` 给的路径**，不推断目录名——回滚 = 服务器端把 manifest
指回旧目录，客户端无感知。

## manifest.json 格式（publish.mjs 生成）

```jsonc
{
  "schema_version": 1,
  "bank_version": "2026.09.5-pilot",   // 数值比较（compareVersion，非字典序）
  "published_at": "2026-09-02T12:00:00Z",
  "levels": [
    { "level": "L1", "file": "v2026.09.5-pilot/L1.json", "count": 8, "sha256": "…" }
  ]
}
```

分片文件 `{ "level": "L1", "questions": […] }` **不含 bank_version**——同一批
`content/questions/` 直接产出，与 App 内置出厂题库同源同构。版本号刻意留在 manifest 而不写进
分片正文：同内容跨版本字节一致 → sha256 不变 → 客户端只拉真正变化的分级（否则每发一版全部
级哈希都变，增量退化为全量）。

**单点版本号**：`content/build/version.mjs` 的 `CURRENT_BANK_VERSION` 是唯一版本源——
`roll-bank.mjs`（打包出厂题库进 App）与 `publish.mjs`（发布服务器分片）都引它，保证
**App 内置 = 服务器当前**，换内容只 bump 这一处。当前值 `2026.09.5-pilot`。

## 发布

在 repo 根执行：

```bash
npm run bank:verify                             # 1) 校验题库（correct ⊆ 引擎最优，快照注入）
# 改 content/build/version.mjs 的 CURRENT_BANK_VERSION   # 2) bump（单点版本）
npm run bank:roll                                # 3) 重滚 App 出厂题库
npm run bank:publish                             # 4) 产出分片 + manifest（写后自动自检：
                                                #    sha↔落盘、count、分片正文不含版本号；失败即报错）
bash server/deploy.sh                         # 5) 一键发布（tar over ssh，先数据后指针）
```

- **同版本防呆**：`publish.mjs` 若发现 `server/bank` 已存在同版本 manifest 而内容哈希变了 →
  拒绝发布（提示先 bump version.mjs）。同版本覆盖 = 客户端 `compareVersion` 判等 → 永远收不到
  更新，是最隐蔽的发布事故。
- manifest/config 缓存 `no-cache`，分片 `immutable` → 见 `nginx.conf.sample`
- 一键发布：`./deploy.sh [user@host:path]`（构建 + 校验 + 分片 + 上传，**tar over ssh** 不依赖 rsync，
  Windows/Linux 通用；先数据后指针）。默认目标已填 `ubuntu@mahjonghelper.tangzheheshui.cn:/var/www/mahjonghelper`

## 自测（改 client 更新逻辑后必跑）

- `npm run e2e:update`：node http 干跑 manifest→增量→sha 校验纯逻辑链路
- `npm run e2e:bank`：内存 fake-indexedDB 跑真实 loadBank/checkBankUpdate（IDB 层）

## 上线状态（2026-09-03，A 裁定：独立子域）

- 服务器 = `ubuntu@193.112.26.217`（腾讯云**境外**节点，静态站免 ICP 备案；.cn 若解析到**境内**
  服务器须备案才能开 80/443）
- tangzheheshui.cn 根已被同服其他项目占用（BiliParser / wms，见 docs/decisions.md）→ nanikiru 落
  独立子域 `mahjonghelper.tangzheheshui.cn`（PWA 需独立 origin，互不干扰、app 零改造）
- 上线剩余动作：
  1. **加 DNS A 记录 `mahjonghelper` → `193.112.26.217`**（唯一需用户动手的一步）
  2. 服务器装 certbot；套 `nginx.conf.sample` 放 sites-available/mahjonghelper 并启用
  3. `certbot certonly --webroot -w /var/www/certbot -d mahjonghelper.tangzheheshui.cn` 签证书，
     取消 sample 里证书两行注释后 reload
  4. 跑 `./deploy.sh`（构建 + 校验 + 分片 + rsync 到 /var/www/mahjonghelper）
