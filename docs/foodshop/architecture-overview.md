# Architecture Overview

## 适用范围

本文描述 Foodshop MVP 的系统边界、核心组件和关键数据流，面向研发、测试和部署人员。

## 系统边界

- **系统内**：订单状态流转、催单闭环、快照同步、WebSocket 广播
- **系统外**：支付、会员、库存、外卖平台

## 组件与职责

1. **Backend (`backend/`)**
   - FastAPI 提供 REST + WebSocket
   - SQLite（WAL）保存订单与审计数据
   - 处理语音回调与催单事件落库
2. **Kitchen Tablet (`kitchen-tablet/`)**
   - 后厨看板与状态流转交互
   - 通过 REST 操作状态，通过 WebSocket 接收事件
3. **Table Page (`kitchen-tablet/table.html`)**
   - 桌牌端入口页，展示本桌状态
4. **Realtime Bus**
   - 服务端基于 `EventBus` 广播 `order.updated` / `urge.created`
   - 支持基于 `since_event_id` 的事件重放

## 状态模型

- 主状态：`queued -> cooking -> ready -> served`
- 催单标记：`urge_requested` 与主状态并存，不覆盖主状态
- 并发保护：订单状态变更使用 `version` 乐观锁

## 关键数据流

### 1. 订单状态流转

1. 前端调用 `POST /api/v1/orders/{order_id}/state`
2. 后端校验 token、状态迁移合法性和版本号
3. SQLite 更新订单状态并写审计日志
4. 通过 WebSocket 广播 `order.updated`

### 2. 催单流程（主动）

1. 前端调用 `POST /api/v1/orders/{order_id}/urge`
2. 后端设置 `urge_requested` 并写入 `urge_events`
3. 广播 `urge.created`

### 3. 催单流程（语音回调）

1. 语音服务回调 `POST /api/v1/voice/asr/callback`
2. 后端记录 `asr_calls`
3. 文本命中催单意图时，触发 `urge.created`

### 4. 重连恢复

1. 客户端重连 WebSocket
2. 使用 `GET /api/v1/snapshot?since=...` 拉增量/全量
3. 以 `event_id` 去重并收敛状态

## 安全与配置

- 鉴权：`Authorization: Bearer <token>`
- Token 来源：`DEVICE_TOKENS`
- 数据库路径：`DB_PATH`

## 关联文档

- `docs/api-reference.md`
- `docs/development-guide.md`
- `docs/deployment-runbook.md`
- `docs/testing-strategy.md`
