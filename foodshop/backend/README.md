# Foodshop Backend

FastAPI + SQLite（WAL）后端，负责订单状态流转、快照同步、催单事件与实时广播。

## 目录职责

- `app/`：后端应用代码
- `migrations/`：数据库迁移脚本
- `deploy/`：systemd 与 nginx 样例
- 运行时 SQLite：由 `DB_PATH` 控制

## 快速启动

```bash
cd backend
python3 -m pip install fastapi uvicorn pydantic httpx pytest pytest-asyncio
uvicorn app.main:app --reload --port 8000
```

## 快速测试

```bash
cd backend
python3 -m pytest -q
```

## 鉴权

```text
Authorization: Bearer kitchen-tablet-001
```

可通过环境变量覆盖：

```bash
export DEVICE_TOKENS="kitchen-tablet-001,table-device-001"
```

## 详细文档

- 架构总览：`../docs/architecture-overview.md`
- 接口契约：`../docs/api-reference.md`
- 开发指南：`../docs/development-guide.md`
- 部署手册：`../docs/deployment-runbook.md`
- 测试策略：`../docs/testing-strategy.md`
- 故障排查：`../docs/troubleshooting.md`
