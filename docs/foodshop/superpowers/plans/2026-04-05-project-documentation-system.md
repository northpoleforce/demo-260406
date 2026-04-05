# Project Documentation System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete, maintainable project documentation system covering project-level and module-level guides without changing runtime behavior.

**Architecture:** Keep root and module README files as entry points, and centralize detailed operational knowledge in `docs/` thematic documents. Use existing backend routes and frontend commands as canonical truth, then cross-link all documents through `docs/README.md` and root `README.md`. Apply a final consistency pass to eliminate broken links and duplicated guidance.

**Tech Stack:** Markdown, existing FastAPI/React repo structure, current scripts and config files.

---

### Task 1: Establish documentation map and ownership

**Files:**
- Modify: `README.md`
- Modify: `docs/README.md`
- Reference: `docs/superpowers/specs/2026-04-05-project-documentation-design.md`

- [ ] **Step 1: Add full document inventory to root README**

```markdown
## 文档体系

- 项目导航：`README.md`
- 文档中台：`docs/README.md`
- 模块入口：`backend/README.md`、`kitchen-tablet/README.md`
- 专题文档：`docs/architecture-overview.md`、`docs/api-reference.md`、`docs/development-guide.md`、`docs/deployment-runbook.md`、`docs/testing-strategy.md`、`docs/troubleshooting.md`
```

- [ ] **Step 2: Expand docs README as the canonical doc hub**

```markdown
## 核心专题

1. `architecture-overview.md` — 系统结构与数据流
2. `api-reference.md` — REST/WS 契约与错误码
3. `development-guide.md` — 本地开发与联调
4. `deployment-runbook.md` — 部署、回滚、配置
5. `testing-strategy.md` — 测试分层与执行
6. `troubleshooting.md` — 故障定位与恢复
```

- [ ] **Step 3: Ensure root README and docs README do not duplicate detailed procedures**

Run: `rg "curl|pytest|npm run|systemctl|nginx" README.md docs/README.md -n`  
Expected: only high-level references, no long operational walkthroughs.

- [ ] **Step 4: Commit**

```bash
git add README.md docs/README.md
git commit -m "docs: define documentation map and ownership"
```

### Task 2: Author architecture and API canonical docs

**Files:**
- Create: `docs/architecture-overview.md`
- Create: `docs/api-reference.md`
- Reference: `backend/app/main.py`
- Reference: `backend/app/api/routes_health.py`
- Reference: `backend/app/api/routes_orders.py`
- Reference: `backend/app/api/routes_snapshot.py`
- Reference: `backend/app/api/routes_voice.py`
- Reference: `backend/app/api/ws_store.py`

- [ ] **Step 1: Write architecture-overview with boundaries and flows**

```markdown
# Architecture Overview

## 组件边界
- Edge Backend（FastAPI + SQLite）
- Kitchen Tablet（React + TypeScript）
- Table Display（table.html 页面）
- Real-time Channel（WebSocket）

## 关键数据流
1. 下单/状态流转：UI -> REST -> DB -> WS 广播
2. 催单流程：语音回调 -> 意图判断 -> 催单事件 -> WS 广播
3. 快照恢复：客户端重连 -> GET /api/v1/snapshot
```

- [ ] **Step 2: Write api-reference from current backend routes only**

```markdown
### Health
- `GET /health`

### Orders
- `POST /api/v1/orders`
- `POST /api/v1/orders/{order_id}/state`
- `POST /api/v1/orders/{order_id}/urge`
- `POST /api/v1/orders/{order_id}/items/{item_id}/state`

### Snapshot
- `GET /api/v1/snapshot?since=...`

### Voice
- `POST /api/v1/voice/asr/callback`

### WebSocket
- `WS /ws/store/{store_id}?since_event_id=...`
```

- [ ] **Step 3: Document auth and error semantics**

```markdown
## 鉴权
- Header: `Authorization: Bearer <device_token>`

## 常见错误
- `404`：order not found / order or item not found
- `409`：非法状态迁移或版本冲突
```

- [ ] **Step 4: Validate route accuracy against source files**

Run: `rg "@router\\.(get|post|websocket)\\(" backend/app/api -n`  
Expected: every published endpoint appears in `docs/api-reference.md`.

- [ ] **Step 5: Commit**

```bash
git add docs/architecture-overview.md docs/api-reference.md
git commit -m "docs: add architecture overview and api reference"
```

### Task 3: Author development and testing guides

**Files:**
- Create: `docs/development-guide.md`
- Create: `docs/testing-strategy.md`
- Reference: `backend/README.md`
- Reference: `backend/pyproject.toml`
- Reference: `kitchen-tablet/README.md`
- Reference: `kitchen-tablet/package.json`

- [ ] **Step 1: Write development-guide with backend/frontend setup**

```markdown
## 本地开发

### Backend
- `cd backend`
- `python3 -m pip install -e .[dev]`（或 README 现有依赖安装命令）
- `uvicorn app.main:app --reload --port 8000`

### Kitchen Tablet
- `cd kitchen-tablet`
- `npm install`
- `npm run dev`
```

- [ ] **Step 2: Add integration workflow**

```markdown
## 联调流程
1. 启动 backend（8000）
2. 配置 kitchen-tablet `.env` 的 `VITE_API_URL` 和 `VITE_WS_URL`
3. 打开 `http://localhost:3000`
4. 验证状态流转与 WebSocket 消息同步
```

- [ ] **Step 3: Write testing-strategy with exact commands**

```markdown
## 测试分层
- Backend 单元/集成：`cd backend && python3 -m pytest -q`
- Frontend 构建校验：`cd kitchen-tablet && npm run build`
```

- [ ] **Step 4: Add quality gates and failure interpretation**

```markdown
## 通过标准
- 后端 pytest 无失败
- 前端 TypeScript + Vite 构建成功

## 常见失败
- ImportError: 缺少 Python 依赖
- TypeScript error: 接口字段与后端响应不匹配
```

- [ ] **Step 5: Commit**

```bash
git add docs/development-guide.md docs/testing-strategy.md
git commit -m "docs: add development and testing guides"
```

### Task 4: Author deployment and troubleshooting runbooks

**Files:**
- Create: `docs/deployment-runbook.md`
- Create: `docs/troubleshooting.md`
- Reference: `backend/deploy/foodshop-backend.service`
- Reference: `backend/deploy/nginx-foodshop.conf`
- Reference: `kitchen-tablet/DEPLOYMENT.md`

- [ ] **Step 1: Write deployment-runbook for backend and frontend**

```markdown
## Backend Deployment
1. 安装依赖并部署代码到目标主机
2. 配置 systemd：`backend/deploy/foodshop-backend.service`
3. 配置反向代理：`backend/deploy/nginx-foodshop.conf`

## Frontend Deployment
1. `cd kitchen-tablet && npm run build`
2. 发布 `dist/` 到静态服务目录
3. 配置 `/api` 与 `/ws` 反向代理到 backend
```

- [ ] **Step 2: Add rollback and configuration notes**

```markdown
## 回滚
- 回滚到上一个已验证版本
- 重启 backend 服务并恢复前端静态目录

## 配置关键项
- `DB_PATH`：SQLite 文件路径
- `DEVICE_TOKENS`：设备 token 白名单
```

- [ ] **Step 3: Write troubleshooting decision tree**

```markdown
## 故障排查

### 前端无法连接后端
1. 检查 `VITE_API_URL`/`VITE_WS_URL`
2. 检查 CORS 与反向代理
3. 检查 token 是否在 `DEVICE_TOKENS` 中

### 状态不同步
1. 检查 WebSocket 是否持续连接
2. 触发 `GET /api/v1/snapshot` 同步
3. 检查后端日志与数据库写入状态
```

- [ ] **Step 4: Commit**

```bash
git add docs/deployment-runbook.md docs/troubleshooting.md
git commit -m "docs: add deployment runbook and troubleshooting guide"
```

### Task 5: Align module readmes to new doc center

**Files:**
- Modify: `backend/README.md`
- Modify: `kitchen-tablet/README.md`
- Modify: `kitchen-tablet/PROJECT_SUMMARY.md`

- [ ] **Step 1: Keep module READMEs concise and operational**

```markdown
## 详细文档
- 系统架构：`../docs/architecture-overview.md`
- API 契约：`../docs/api-reference.md`
- 开发指南：`../docs/development-guide.md`
- 部署与排障：`../docs/deployment-runbook.md`、`../docs/troubleshooting.md`
```

- [ ] **Step 2: Ensure PROJECT_SUMMARY remains status-only**

```markdown
> 本文档用于项目状态摘要；安装、运行、联调、部署以 `README.md` 和 `../docs/` 专题文档为准。
```

- [ ] **Step 3: Remove duplicated deep-dive content from module README files**

Run: `rg "## 核心功能说明|## 性能指标|## 部署要求|## API 集成" kitchen-tablet/README.md backend/README.md -n`  
Expected: module README keeps essentials and links to docs center.

- [ ] **Step 4: Commit**

```bash
git add backend/README.md kitchen-tablet/README.md kitchen-tablet/PROJECT_SUMMARY.md
git commit -m "docs: align module readmes with docs center"
```

### Task 6: Consistency pass and final validation

**Files:**
- Review: `README.md`
- Review: `docs/README.md`
- Review: `docs/architecture-overview.md`
- Review: `docs/api-reference.md`
- Review: `docs/development-guide.md`
- Review: `docs/deployment-runbook.md`
- Review: `docs/testing-strategy.md`
- Review: `docs/troubleshooting.md`
- Review: `backend/README.md`
- Review: `kitchen-tablet/README.md`

- [ ] **Step 1: Verify all doc links resolve to existing files**

Run: `rg "\\]\\(([^)]+)\\)" README.md docs backend/README.md kitchen-tablet/README.md -n`  
Expected: every linked file exists in repository.

- [ ] **Step 2: Verify terminology consistency**

Run: `rg "催单|快照|状态流转|WebSocket" README.md docs backend/README.md kitchen-tablet/README.md -n`  
Expected: terms are used consistently without conflicting definitions.

- [ ] **Step 3: Verify no stale endpoint paths**

Run: `rg "/api/v1|/health|/ws/store" docs/*.md -n`  
Expected: all API paths match backend route definitions.

- [ ] **Step 4: Commit**

```bash
git add README.md docs backend/README.md kitchen-tablet/README.md kitchen-tablet/PROJECT_SUMMARY.md
git commit -m "docs: finalize complete documentation system"
```
