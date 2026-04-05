# Foodshop

边缘 AI 餐饮交互系统的仓库总入口。

## 目录职责

- `backend/`：FastAPI + SQLite 后端服务、迁移和部署样例
- `kitchen-tablet/`：后厨平板前端、桌牌页和前端构建配置
- `docs/`：架构决策、技术蓝图和交付计划

## 推荐阅读顺序

1. `docs/README.md`
2. `backend/README.md`
3. `kitchen-tablet/README.md`

## 文档体系

- 架构总览：`docs/architecture-overview.md`
- 接口契约：`docs/api-reference.md`
- 开发指南：`docs/development-guide.md`
- 部署手册：`docs/deployment-runbook.md`
- 测试策略：`docs/testing-strategy.md`
- 故障排查：`docs/troubleshooting.md`
- 架构决策与规划：`docs/architecture-decision.md`、`docs/solution1-technical-blueprint.md`、`docs/solution1-6week-delivery-plan.md`

## 文件导航

| 路径 | 作用 |
|---|---|
| `backend/app/` | 后端应用代码 |
| `backend/migrations/` | 数据库迁移 SQL |
| `backend/deploy/` | systemd 和 nginx 部署样例 |
| `backend/backend/data/` | 运行时 SQLite 文件（由 `DB_PATH` 决定） |
| `kitchen-tablet/src/` | 前端源码 |
| `kitchen-tablet/public/` | 静态资源 |
| `kitchen-tablet/table.html` | 桌牌入口页 |
| `docs/architecture-decision.md` | 架构选型记录 |
| `docs/solution1-technical-blueprint.md` | 技术蓝图 |
| `docs/solution1-6week-delivery-plan.md` | 六周交付计划 |

## 约定

- 运行说明放在各自模块的 `README.md`
- 专题文档（架构/API/开发/部署/测试/排障）放在 `docs/`
- 状态总结文件只做摘要，不重复写完整操作手册
