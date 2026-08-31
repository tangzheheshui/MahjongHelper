# 服务器方案（纯静态）

> 对应 PRD §7.4（联网与数据存储）。结论（D3）：无后端代码，nginx 托管静态 JSON。

## 一、URL 结构

```
https://<域名>/                        # Web App 本体（M4 起，静态托管，同源）
https://<域名>/bank/manifest.json      # 题库版本清单（客户端更新入口）
https://<域名>/bank/v{N}/L1.json … L7.json   # 题库分片（按版本目录，天然支持回滚）
https://<域名>/config.json             # 远程配置（功能开关）
https://<域名>/version.json            # App 最新版本号（M5 iOS 用）
```

## 二、更新协议（客户端行为）

```
启动 → GET bank/manifest.json（超时 3s，失败静默结束）
     → 比对本地 bank_version
     → 有新版本：按 levels[].file 下载变化分片（校验 sha256）
     → 合并写入 IndexedDB，更新本地 bank_version
     → 任何一步失败：静默，保留旧题库，下次启动重试（PRD 6.4）
```

- `config.json` 拉不到 → 用内置默认值（PRD 7.4）
- 全程无上行数据：服务器日志里只有匿名静态资源请求，满足「不收集用户行为」

## 三、发布题库（操作流程）

```bash
# 本地
node content/build/index.ts            # 校验全量题目 → 产出 server/bank/v{N+1}/ + 更新 manifest
rsync -av server/ user@server:/var/www/nanikiru/   # 增量上传（新版本目录 + 新 manifest）
```

- manifest 最后上传（先数据后指针，客户端不会拿到 404 分片）
- 回滚 = 服务器端把 manifest 指回旧版本目录

## 四、待办（M4 前确认）

- [ ] 服务器归属与域名：用现有服务器哪个站点 / 是否新域名 + HTTPS 证书
- [ ] Cache-Control 策略：manifest `no-cache`，分片 `immutable`（带版本路径可长缓存）
- [ ] 国内可达性（若主要用户在国内，静态资源放国内机器或 CDN）

## 五、容量预估

200 题 × 约 1.5KB/题 ≈ 300KB；单级分片 ≤ 60KB——静态方案容量无任何压力。
