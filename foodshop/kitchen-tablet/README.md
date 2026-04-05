# 后厨平板操作界面

基于 React + TypeScript + Vite 的后厨平板前端。

## 目录职责

- `src/`：前端业务代码
- `public/`：静态资源
- `dist/`：构建产物
- `table.html`：桌牌入口页
- `PROJECT_SUMMARY.md`：项目状态摘要
- `DEPLOYMENT.md` / `USER_MANUAL.md`：历史部署和使用说明

## 快速开始

```bash
cd kitchen-tablet
cp .env.example .env
npm install
npm run dev
```

开发访问：

- 后厨看板：`http://localhost:3000`
- 桌牌页：`http://localhost:3000/table.html?table=A1`

生产构建：

```bash
npm run build
```

## 环境变量

```env
VITE_API_URL=http://192.168.1.100:8000
VITE_WS_URL=ws://192.168.1.100:8000/ws/store/default
VITE_DEVICE_TOKEN=kitchen-tablet-001
VITE_USE_MOCK=true
```

## 详细文档

- 架构总览：`../docs/architecture-overview.md`
- 接口契约：`../docs/api-reference.md`
- 开发指南：`../docs/development-guide.md`
- 部署手册：`../docs/deployment-runbook.md`
- 测试策略：`../docs/testing-strategy.md`
- 故障排查：`../docs/troubleshooting.md`
