# Development Guide

## 适用范围

本指南用于本地开发、联调和常见开发约定。

## 前置条件

- Python 3.9+
- Node.js 18+
- npm 9+

## 本地启动

### Backend

```bash
cd backend
python3 -m pip install fastapi uvicorn pydantic httpx pytest pytest-asyncio
uvicorn app.main:app --reload --port 8000
```

### Kitchen Tablet

```bash
cd kitchen-tablet
cp .env.example .env
npm install
npm run dev
```

前端默认地址：`http://localhost:3000`

## 前端环境变量

- `VITE_API_URL`：后端 HTTP 地址
- `VITE_WS_URL`：后端 WebSocket 地址
- `VITE_DEVICE_TOKEN`：设备 token
- `VITE_USE_MOCK`：是否使用本地 mock（后端未就绪可开启）

## 推荐联调流程

1. 启动 backend（8000）
2. 配置前端 `.env` 指向 backend
3. 打开前端并完成一次状态流转
4. 观察 WebSocket 是否收到 `order.updated`
5. 调用催单接口并确认提醒

## 目录约定

- 后端业务代码：`backend/app/`
- 后端测试：`backend/app/tests/`
- 前端源码：`kitchen-tablet/src/`
- 项目专题文档：`docs/`

## 常见问题

- `401 invalid token`：检查 `VITE_DEVICE_TOKEN` 与后端 `DEVICE_TOKENS`
- 前端在线但无更新：检查 `VITE_WS_URL` 和代理配置

## 关联文档

- `docs/api-reference.md`
- `docs/testing-strategy.md`
- `docs/troubleshooting.md`
