# server/（M4 待建）

纯静态分发目录：`bank/manifest.json` + 按版本分片的题库 JSON + `config.json`。
由 `content/build` 产出，rsync 上传；无后端代码。

协议与部署：[docs/operations/server.md](../docs/operations/server.md)
