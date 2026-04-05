# Troubleshooting

## 适用范围

用于排查开发和部署阶段常见故障，优先恢复“状态流转 + 实时同步”主链路。

## 快速诊断顺序

1. `GET /health` 是否正常
2. 前端 token 是否通过鉴权
3. WebSocket 是否连接且可 `ping/pong`
4. 状态更新是否写入数据库并广播

## 常见故障

### 1. 401 鉴权失败

现象：接口返回 `missing token` 或 `invalid token`。  
处理：

1. 检查前端 `VITE_DEVICE_TOKEN`
2. 检查后端 `DEVICE_TOKENS`
3. 确认请求头格式 `Authorization: Bearer <token>`

### 2. 状态更新返回 409

现象：`invalid transition` 或 `version conflict`。  
处理：

1. 校验目标状态是否符合 `queued -> cooking -> ready -> served`
2. 使用最新 `version` 重试
3. 必要时先拉一次 snapshot

### 3. 前端在线但数据不更新

处理：

1. 检查 `VITE_WS_URL`
2. 检查 Nginx `/ws` 代理升级头
3. 用 `ping` 验证 WebSocket 连通
4. 使用 `GET /api/v1/snapshot` 兜底同步

### 4. 语音回调无催单事件

处理：

1. 确认 `/api/v1/voice/asr/callback` 入参完整
2. 检查文本是否被识别为催单意图
3. 检查 `order_id` 是否存在

### 5. 服务重启后数据异常

处理：

1. 检查 `DB_PATH` 是否指向正确文件
2. 确认数据库目录可写
3. 检查是否误清理 SQLite 文件

## 关联文档

- `docs/deployment-runbook.md`
- `docs/api-reference.md`
- `backend/README.md`
