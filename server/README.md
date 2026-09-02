# server/（M4 静态分发目录）

纯静态分发：`bank/manifest.json` + 按版本目录分片的题库 JSON + `config.json` + `version.json`。
由 `content/build/publish.mjs` 本地产出后 rsync 上传；无后端代码。

## 目录结构

```
server/
├── bank/                      # 发布产物（gitignore）：publish.mjs 生成
│   ├── manifest.json          # 版本清单（客户端更新入口，最后上传）
│   └── v{bank_version}/       # 旧版本目录保留，回滚 = manifest 指回旧目录
│       ├── L1.json … L7.json  # 分级分片：{ level, questions }（不含版本号，见 architecture §五）
├── config.json                # 远程配置（功能开关），拉不到用内置默认
└── version.json               # App 最新版本号（M5 iOS 检查用）
```

## 发布

```bash
npx tsx packages/engine/bin/verify.ts content/questions --write   # 1) 校验并注入快照
# 改 content/build/version.mjs 的 CURRENT_BANK_VERSION              # 2) bump（单点版本）
node content/build/roll-bank.mjs                                   # 3) 重滚 App 出厂题库
node content/build/publish.mjs                                     # 4) 产出分片 + manifest（写后自动自检：
                                                                    #    sha↔落盘、count、分片正文不含版本号；失败即报错）
rsync -av server/ user@server:/var/www/nanikiru/                   # 5) 上传（manifest 最后）
```

协议与客户端行为详见 [architecture.md §五](../docs/design/architecture.md)。

- 缓存策略示例：`nginx.conf.sample`（manifest/config `no-cache`，分片 immutable）
- 一键发布示例：`deploy.sh [user@host:path]`（构建 + 校验 + 分片 + rsync，先数据后指针）
- 自测：`npx tsx apps/web/scripts/e2e-update.ts`（node http 干跑全链路）、
  `npx tsx apps/web/scripts/e2e-bank.ts`（IDB 层集成）
- 便捷命令（repo 根）：`npm run bank:publish` / `bank:roll` / `bank:verify` / `e2e:update`
