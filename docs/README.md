# 📚 技术文档中心

本目录汇总了两个子系统的所有核心技术文档。

## 文档索引

### 🍽 餐饮交互系统（foodshop）

| 文档 | 说明 |
|---|---|
| [PRD.md](./PRD.md) | 完整产品需求文档 |
| [foodshop/architecture-overview.md](./foodshop/architecture-overview.md) | 系统架构总览 |
| [foodshop/architecture-decision.md](./foodshop/architecture-decision.md) | 架构选型记录（ADR） |
| [foodshop/api-reference.md](./foodshop/api-reference.md) | REST + WebSocket 接口契约 |
| [foodshop/development-guide.md](./foodshop/development-guide.md) | 本地开发指南 |
| [foodshop/deployment-runbook.md](./foodshop/deployment-runbook.md) | 生产部署手册 |
| [foodshop/testing-strategy.md](./foodshop/testing-strategy.md) | 测试策略 |
| [foodshop/troubleshooting.md](./foodshop/troubleshooting.md) | 故障排查手册 |
| [foodshop/solution1-technical-blueprint.md](./foodshop/solution1-technical-blueprint.md) | 技术蓝图 |
| [foodshop/solution1-6week-delivery-plan.md](./foodshop/solution1-6week-delivery-plan.md) | 六周交付计划 |

### 🖥 电子纸同步方案（epaper-sync / e1001）

| 文档 | 说明 |
|---|---|
| [epaper-sync/ARCHITECTURE.md](./epaper-sync/ARCHITECTURE.md) | 跨端同步核心架构 |
| [epaper-sync/API_PROTOCOL.md](./epaper-sync/API_PROTOCOL.md) | MQTT 主题、HTTP 接口与 RAW 图像格式 |
| [epaper-sync/SETUP_GUIDE.md](./epaper-sync/SETUP_GUIDE.md) | RDK X5 与 ESP32 环境搭建指南 |
| [epaper-sync/DEPLOYMENT.md](./epaper-sync/DEPLOYMENT.md) | Vercel + 长期运行服务部署 |

## 推荐阅读顺序

1. `PRD.md` — 了解整体产品目标
2. `foodshop/architecture-overview.md` — 理解餐饮系统设计
3. `epaper-sync/ARCHITECTURE.md` — 理解电子纸同步原理
4. 各自子系统的 `SETUP_GUIDE` / `development-guide` — 搭建本地开发环境
