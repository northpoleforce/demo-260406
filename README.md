# 边缘 AI 智能餐饮交互系统 × 电子纸同步方案

[![Platform](https://img.shields.io/badge/Platform-RDK_X5_%7C_ESP32S3_%7C_Web-blue)](.)
[![License](https://img.shields.io/badge/License-MIT-green)](.)
[![Status](https://img.shields.io/badge/Status-Hackathon_Demo-orange)](.)

本仓库是 **2026 深圳 Hackathon** 参赛项目的统一代码仓库（Monorepo），整合了两套紧密协同的子系统：

| 子系统 | 目录 | 核心功能 |
|---|---|---|
| 🖥 **电子纸同步方案** | [`epaper-sync/`](./epaper-sync/) | RDK X5 边缘渲染 + ESP32S3 墨水屏驱动，将 Web UI 像素级同步到 800×480 e-ink 屏 |
| 🍽 **餐饮交互系统** | [`foodshop/`](./foodshop/) | FastAPI 后端 + 后厨平板 Web 前端，实现订单状态实时同步与语音催单闭环 |

---

## 🏗 仓库结构

```text
project/
├── epaper-sync/              # 电子纸同步子系统（RDK X5 + e1001）
│   ├── firmware/             #   ESP32S3 Arduino 固件（墨水屏驱动 + MQTT）
│   ├── edge-server/          #   边缘处理服务（Puppeteer 渲染 + Next.js 前端）
│   │   ├── backend/          #     无头渲染服务器
│   │   └── frontend/         #     菜单/UI 前端（支持 Vercel 部署）
│   └── scripts/              #   自动化运维脚本
│
├── foodshop/                 # 餐饮交互子系统
│   ├── backend/              #   FastAPI + SQLite 后端服务
│   ├── kitchen-tablet/       #   后厨平板 Web 前端（Vite + React）
│   └── prd.md                #   产品需求文档
│
└── docs/                     # 统一技术文档库
    ├── PRD.md                #   产品需求文档（完整版）
    ├── epaper-sync/          #   电子纸同步相关文档
    └── foodshop/             #   餐饮系统相关文档
```

---

## 🚀 快速启动

你可以通过以下**任一方式**一键启动所有后端与前端服务：

### 方法一：极简模式 (推荐)
在项目根目录直接运行：
```bash
npm start
```
> 这将调用 `dev.sh` 脚本，自动执行环境检查、依赖安装（如果缺失）并启动所有 4 个核心服务。

### 方法二：开发者模式
如果你已经安装过依赖，想直接看到彩色分屏日志：
```bash
npm run dev
```

### 方法三：手动分步启动
如果需要调试特定模块：
```bash
# 1. 安装所有依赖
npm run install:all

# 2. 启动核心服务
npm run start:foodshop-backend   # 餐饮后端 (Port: 8000)
npm run start:kitchen-tablet     # 后厨平板 (Port: 5173)
npm run start:epaper-backend     # 电子纸渲染 (Port: 3000)
npm run start:epaper-frontend    # 电子纸 UI   (Port: 3001)

# 3. 触发电子纸全手动/自动同步
npm run sync:epaper
```

---

## 📚 文档导航

| 文档 | 路径 |
|---|---|
| 产品需求文档（PRD） | [`docs/PRD.md`](./docs/PRD.md) |
| 电子纸同步架构设计 | [`docs/epaper-sync/ARCHITECTURE.md`](./docs/epaper-sync/ARCHITECTURE.md) |
| 电子纸通信协议规范 | [`docs/epaper-sync/API_PROTOCOL.md`](./docs/epaper-sync/API_PROTOCOL.md) |
| 电子纸部署手册 | [`docs/epaper-sync/DEPLOYMENT.md`](./docs/epaper-sync/DEPLOYMENT.md) |
| 餐饮系统架构总览 | [`docs/foodshop/architecture-overview.md`](./docs/foodshop/architecture-overview.md) |
| 餐饮系统接口契约 | [`docs/foodshop/api-reference.md`](./docs/foodshop/api-reference.md) |
| 餐饮系统部署手册 | [`docs/foodshop/deployment-runbook.md`](./docs/foodshop/deployment-runbook.md) |

---

## 🤝 贡献与反馈

本项目诞生于 Hackathon 创意探索。欢迎提交 PR 或 Issue。
