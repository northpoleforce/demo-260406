# e1001 E-Paper Sync: 极简主义电子纸同步方案

![EpaperSync Banner](https://img.shields.io/badge/Platform-RDK_X5%20%7C%20ESP32S3-blue)
![License](https://img.shields.io/badge/License-MIT-green)
![Status](https://img.shields.io/badge/Status-Development-orange)

这是一个基于 **RDK X5 (边缘侧)** 与 **reTerminal E1001 (硬件侧)** 的高性能电子纸同步方案。通过服务端无头渲染 (SSR) 技术与 Floyd-Steinberg 图像抖动算法，实现了 Web 前端与 800x480 分辨率墨水屏的完美像素级同步。

## 🌟 核心特性

- **降维打击式渲染**：利用无头浏览器 (Puppeteer) 直接截图网页，e1001 仅充当“哑终端”显示像素。
- **极致视觉质量**：应用 Floyd-Steinberg 抖动算法，在 1-bit (黑白) 屏幕上呈现出细腻的伪灰阶效果。
- **高度解耦**：前端使用 React/Next.js 开发，修改 UI 无需重新刷录设备固件。
- **边缘侧高效分发**：在 RDK X5 上完成高强度图像处理，减轻 ESP32S3 的负担。

## 🏗 项目架构 (Monorepo)

```text
.
├── e1001-firmware/       # 设备端固件 (ESP32S3 + Arduino)
│   └── EpaperSync/       # 墨水屏驱动与 MQTT 信令监听
├── rdk-edge/             # 边缘处理端 (Node.js + Web)
│   ├── backend/          # 无头渲染服务器 (Puppeteer + Sharp)
│   └── frontend/         # 菜单/UI 前端 (也支持 Vercel 部署)
├── docs/                 # 核心技术文档
└── scripts/              # 自动化运维脚本
```

## 🚀 快速上手 (Quick Start)

### 1. 边缘侧部署 (RDK X5)
在 RDK X5 终端中一键启动同步流水线：
```bash
npm run install:all # 安装所有依赖
npm run sync        # 启动后端渲染器与前端 UI
```

### 2. 硬件端烧录 (e1001)
使用 Arduino IDE 打开 `e1001-firmware/EpaperSync/EpaperSync.ino`，配置好 WiFi 后进行烧录。

## 📚 详细文档

为了深入了解本项目，请参阅以下专业指南：

- 🛠 **[快速环境搭建指南](./docs/SETUP_GUIDE.md)**: 如何快速在 RDK X5 与 ESP32 上跑通系统。
- 📐 **[核心架构设计](./docs/ARCHITECTURE.md)**: 跨端同步的深度原理解析。
- 📡 **[通信协议规范](./docs/API_PROTOCOL.md)**: MQTT 主题、HTTP 接口与图像 RAW 格式。
- 🚢 **[生产部署手册](./docs/DEPLOYMENT.md)**: 针对 Vercel 与长期运行服务的优化。

## 🤝 贡献与反馈

欢迎提交 PR 或 Issue。本项目诞生于 Hackathon 创意探索，旨在寻找最简单、最优雅的墨水屏内容联动方案。
