# Deployment Runbook

## 适用范围

用于单店局域网场景的 backend + kitchen-tablet 部署、更新和回滚。

## 前置条件

- 可访问目标主机
- 已安装 Python/Node/Nginx/systemd（按部署方式）
- 已准备设备 token 与网络地址

## Backend 部署

1. 部署代码到目标目录（示例：`/opt/foodshop/backend`）
2. 安装依赖并验证可启动
3. 配置 systemd：
   - 参考：`backend/deploy/foodshop-backend.service`
4. 配置 Nginx：
   - 参考：`backend/deploy/nginx-foodshop.conf`

关键环境变量：

- `DB_PATH`：SQLite 路径（默认 `backend/data/foodshop.db`）
- `DEVICE_TOKENS`：设备 token 白名单
- `APP_NAME`：应用名（可选）

## Frontend 部署

1. 构建：

```bash
cd kitchen-tablet
npm install
npm run build
```

2. 发布 `dist/` 到静态目录
3. 配置 Nginx 将 `/api`、`/ws` 反代到 backend

## 发布后检查

1. `GET /health` 返回 `{"status":"ok"}`
2. 前端页面可访问且显示在线
3. 状态流转可写入并广播
4. 催单可触发提醒

## 回滚流程

1. 切回上一个可用版本代码/静态资源
2. 重启 backend 服务与 Nginx
3. 验证 health、状态流转、WebSocket

## 失败处理

- 后端起不来：检查 `DB_PATH` 可写、依赖是否齐全
- 前端有页面无数据：检查反向代理和 token
- WebSocket 不稳定：检查 `/ws` 代理升级头配置

## 关联文档

- `docs/troubleshooting.md`
- `backend/deploy/foodshop-backend.service`
- `backend/deploy/nginx-foodshop.conf`
- `kitchen-tablet/DEPLOYMENT.md`
