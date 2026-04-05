# E1001 E-Paper Sync: 生产环境部署手册

本项目支持在边缘侧（RDK X5）和云端（Vercel）进行部署。本指南将帮助你优化生产环境的运行稳定性与性能。

---

## ☁️ 1. 云端部署 (Vercel)

`rdk-edge/frontend` 是一个标准的 Next.js 项目，特别适合部署在 Vercel 上。

### 1. 部署配置 (Vercel Dashboard)
在 Vercel 导入此项目仓库时，必须配置以下选项：

-   **Framework Preset**: `Next.js`
-   **Root Directory**: `rdk-edge/frontend` (必须指定为子目录)
-   **Environment Variables**: 在 Vercel 仪表板添加以下变量：
    -   `NEXT_PUBLIC_SUPABASE_URL`
    -   `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    -   `NEXT_PUBLIC_SUPABASE_TABLE_NAME`

### 2. 构建与运行 (Build & Run)
部署完成后，Vercel 将提供一个公共预览 URL (例如 `https://your-project.vercel.app`)。请将此 URL 配置进 RDK X5 的 `backend/index.js`，或作为测试目标。

---

## 🔌 2. 边缘侧部署 (RDK X5)

在 RDK X5 上，由于涉及后台截图任务，建议作为系统服务运行。

### 1. 启动脚本优化 (scripts/run_epaper_sync.sh)
请确保该脚本具有可执行权限，并配置了正确的端口。

```bash
chmod +x scripts/run_epaper_sync.sh
./scripts/run_epaper_sync.sh
```

### 2. 使用 PM2 守护进程 (推荐)
为了防止渲染服务器因 Puppeteer 内存泄漏或异常而崩溃，建议使用 **PM2** 进行监控管理。

```bash
# 在 rdk-edge/backend 目录下安装 pm2
sudo npm install pm2 -g

# 启动后端服务
pm2 start index.js --name "epaper-relay-server"

# 启动前端服务 (若 RDK X5 也要跑前端)
cd ../frontend
pm2 start "npm run dev -- -p 3001" --name "epaper-web-ui"

# 保存配置并设置开机启动
pm2 save
pm2 startup
```

---

## ⚡ 3. 性能优化建议 (Performance Tuning)

### 3.1 渲染延迟优化
-   **延迟触发 (Debounce)**：后端在监听到 Supabase 变动后，可以根据业务需求设置 `setTimeout` 延迟 1~2 秒再截图，防止在数据还没完全写入时截到半透明状态的旧数据。
-   **无头模式切换**：在 RDK X5 环境下，通过配置 `headless: "new"` 模式可以获得更快的启动速度。

### 3.2 节省带宽与防止无效刷屏
-   **哈希比对 (Content Hashing)**：后端在生成 `.raw` 位图后，可以对二进制内容进行计算哈希值，只有当内容确实发生变化时再发送 MQTT 信令通知 ESP32S3 刷新。
-   **图片缓存**：由于墨水屏只需要图片，如果你的业务场景数据变化极慢，可以将生成的 `.raw` 文件永久缓存，直接返回给设备。

---

## 🛡️ 4. 安全说明 (Security)

-   **MQTT 公共 Broker**: `broker.emqx.io` 仅推荐用于开发和 Hackathon **Demo**。在真实的生产部署中，必须使用私有的、带有用户名及密码加密校验的 MQTT 服务（如 EMQX Cloud 或 Mosquitto）。
-   **端口保护**: 确保 RDK X5 的 `3000` (后端) 与 `3001` (前端) 端口在防火墙策略下仅对受信任的内网设备开放。
