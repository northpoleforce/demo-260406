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

安装所有子项目依赖后，可通过根目录 `package.json` 统一管理：

```bash
# 安装所有依赖
npm run install:all

# 启动餐饮后端（FastAPI）
npm run start:foodshop-backend

# 启动后厨平板前端（Vite Dev Server）
npm run start:kitchen-tablet

# 启动电子纸边缘渲染服务
npm run start:epaper-backend

# 启动电子纸前端 UI
npm run start:epaper-frontend

# 一键启动电子纸同步全链路
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
