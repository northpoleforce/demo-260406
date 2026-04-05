# E1001 E-Paper Sync: 快速环境搭建指南

本项目由两个核心组件组成：**RDK X5 边缘渲染端** 与 **e1001 电子纸终端**。请按照以下步骤分别搭建环境。

---

## 🏗 第一步：边缘处理端搭建 (RDK X5)

RDK X5 运行 Node.js 环境，负责加载网页并生成墨水屏专用的位图流。

### 1. 安装系统依赖 (Linux)
由于 RDK X5 运行无头浏览器 (Puppeteer)，需要安装 Chrome/Chromium 及其必需的系统库。

```bash
sudo apt-get update
sudo apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libgconf-2-4 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils
```

### 2. 配置环境变量
在 `rdk-edge/frontend` 目录中创建 `.env.local` 文件，配置 Supabase 的访问密钥。

```ini
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SUPABASE_TABLE_NAME=photo_text
```

### 3. 安装 Node 依赖与启动
在项目根目录运行以下命令：

```bash
# 安装所有子项目依赖
npm run install:all

# 启动全自动同步助手 (默认端口: 3000 和 3001)
npm run sync
```

---

## 🔌 第二步：硬件终端烧录 (e1001)

ESP32S3 负责接收 MQTT 信令并驱动 E-Paper 屏幕展示内容。

### 1. Arduino IDE 配置
- **开发板选择**：`XIAO ESP32S3` 或 `reTerminal E1001`。
- **安装必需库**：
    - `TFT_eSPI` (需按照 Seeed 官方指南配置 `User_Setup.h`)
    - `PubSubClient` (用于 MQTT 通信)
    - `ArduinoJson` (用于消息解析)
    - `WiFi` (ESP32 自带)
    - `HTTPClient` (ESP32 自带)

### 2. 配置 Firmware 源代码
打开 `e1001-firmware/EpaperSync/EpaperSync.ino`，修改以下宏定义：

```cpp
const char *ssid = "your-wifi-ssid";
const char *password = "your-wifi-password";
const char *mqtt_server = "broker.emqx.io"; // 或你自己的 MQTT Broker
```

### 3. 烧录与调试
将 ESP32S3 连接到电脑，点击 **Upload**。烧录成功后，开启 **Serial Monitor (115200)** 观察设备是否成功连接 WiFi 并订阅 MQTT 主题。

---

## 🛠 故障排除 (Troubleshooting)

- **无法启动 Puppeteer?**：请确认已按照“安装系统依赖”部分安装了 Chrome 运行环境，并确保你不是在 `root` 用户下运行（或是为 Puppeteer 开启 `--no-sandbox` 参数）。
- **屏幕无刷新?**：请检查 MQTT 代理是否通畅。可通过 `rdk-edge/backend` 的输出查看是否已成功发出 `e1001/cmd/update` 信号。
- **图片偏移?**：请确保 Web 前端的容器尺寸 (800x480) 与 `rdk-edge/backend/index.js` 中的 `SCREEN_WIDTH/HEIGHT` 严格对应。
