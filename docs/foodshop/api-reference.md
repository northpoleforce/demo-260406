# API Reference

## 适用范围

本文是当前后端接口的权威参考，路径与请求结构基于 `backend/app/api/*.py` 和 `backend/app/schemas/*.py`。

## 鉴权

除非特别说明，接口需要 Header：

```http
Authorization: Bearer <device_token>
```

缺少或非法 token 返回 `401`。

## 错误语义

- `401`：`missing token` / `invalid token`
- `404`：资源不存在（如 `order not found`）
- `409`：版本冲突或非法状态迁移

## REST API

### Health

#### `GET /health`

- 鉴权：否
- 响应：

```json
{
  "status": "ok"
}
```

### Snapshot

#### `GET /api/v1/snapshot?since=<iso8601>`

- 鉴权：是
- 参数：
  - `since`（可选）：时间戳，不传则返回全量
- 响应：

```json
{
  "orders": [],
  "timestamp": "2026-04-05T00:00:00+00:00",
  "is_full": true
}
```

### Orders

#### `POST /api/v1/orders`

- 鉴权：是
- 请求体：

```json
{
  "table_id": "A1",
  "items": [
    { "dish_name": "宫保鸡丁", "qty": 1 }
  ]
}
```

- 响应：创建后的订单快照（含 `items`）

#### `POST /api/v1/orders/{order_id}/state`

- 鉴权：是
- 请求体：

```json
{
  "target_state": "cooking",
  "operator": "kitchen-tablet-001",
  "version": 1
}
```

- 响应：更新后的订单快照

#### `POST /api/v1/orders/{order_id}/urge`

- 鉴权：是
- 请求体：

```json
{
  "source": "voice",
  "confidence": 0.92,
  "request_id": "req-123",
  "asr_provider": "mock-asr",
  "asr_latency_ms": 320
}
```

- 响应：

```json
{
  "accepted": true,
  "reason": null
}
```

#### `POST /api/v1/orders/{order_id}/items/{item_id}/state`

- 鉴权：是
- 请求体：

```json
{
  "target_state": "ready",
  "operator": "kitchen-tablet-001"
}
```

- 响应：更新后的订单快照

### Voice

#### `POST /api/v1/voice/asr/callback`

- 鉴权：是
- 请求体：

```json
{
  "request_id": "req-123",
  "table_id": "A1",
  "order_id": "ORD-0001",
  "text": "帮我催一下菜",
  "confidence": 0.88,
  "provider": "mock-asr",
  "latency_ms": 450
}
```

- 响应（接受催单）：

```json
{
  "received": true,
  "accepted": true
}
```

- 响应（非催单意图）：

```json
{
  "received": true,
  "accepted": false,
  "reason": "non-urge-intent"
}
```

## WebSocket

### `WS /ws/store/{store_id}?since_event_id=<event_id>`

- 客户端可发送 `ping`，服务端返回 `pong`
- 主要事件：
  - `order.updated`
  - `urge.created`

## 关联文档

- `docs/architecture-overview.md`
- `docs/development-guide.md`
- `backend/README.md`
