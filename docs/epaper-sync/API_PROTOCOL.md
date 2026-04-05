# E1001 E-Paper Sync: 通信协议与数据格式规范

本项目涉及边缘侧（RDK X5）、云端（Supabase）与硬件侧（e1001）的三方通信。以下是详细的协议规范。

---

## 📡 1. MQTT 控制信令 (Control Channel)

本项目利用 MQTT (Message Queuing Telemetry Transport) 进行异步更新信号下发。

-   **Broker**: `broker.emqx.io` (默认公共测试代理)
-   **Port**: `1883`
-   **Topic**: `e1001/cmd/update`
-   **QoS**: `0` or `1`
-   **Payload (PlainText)**: 下载 RAW 二进制位图的绝对 URL。
    -   *示例*: `http://192.168.1.10:3000/latest.raw`

---

## 🌐 2. HTTP 渲染服务接口 (Data Channel)

RDK X5 后端提供以下 RESTful 接口供调试与数据获取。

### 2.1 触发同步 (Trigger Sync)
-   **Endpoint**: `GET /trigger`
-   **描述**: 手动发起一次 Web 渲染并向 MQTT 下发更新信号。
-   **响应**: HTML 状态页面或报错信息。

### 2.2 位图下载 (Bitmap Download)
-   **Endpoint**: `GET /latest.raw`
-   **描述**: 获取最近一次成功渲染生成的 1-bit 二进制 RAW 文件。
-   **尺寸**: 800x480 分辨率为 48,000 字节 (800 * 480 / 8)。

### 2.3 预览截图 (PNG Preview)
-   **Endpoint**: `GET /latest.png`
-   **描述**: 渲染过程产生的原始 32-bit 彩色 PNG 快照，用于调试 Web 布局。

---

## 🖼 3. 图像二进制格式 (1-bit RAW Encoding)

为了极大地减少 ESP32S3 的解析压力，本项目采用了最基础的位映射格式 (Bitmapping)。

-   **像素排列 (Pixel Order)**: 从左到右，从上到下。
-   **色彩深度 (Bit Depth)**: 1-bit (非黑即白)。
-   **位排列 (Bit Order)**: 每个字节 (Byte) 包含 8 个像素，排列方式为 **MSB First** (最高有效位优先)。
    -   *示例*: `0x80` 代表 1个白色像素后跟 7个黑色像素。
-   **数据映射 (Value Mapping)**:
    -   `1` = 背景色 (通常为白色)
    -   `0` = 前景色 (通常为黑色)

---

## 🤝 4. 渲染就绪信号握手 (__RENDER_READY__)

为确保 Puppeteer 截获的图像已经完全加载（DOM 挂载、Supabase 数据同步、Framer Motion 动画就位），前端必须主动发信号。

1.  **前端设置**: 在 `useEffect` 或核心业务逻辑完成后，执行：
    ```javascript
    window.__RENDER_READY__ = true;
    ```
2.  **后端捕获**: Puppeteer 会探测该变量。若超时 (10s) 未捕获到此信号，后端将强制截图以防死锁，并在日志中警告提示。

---

## ☁️ 5. 实时数据同步 (Supabase Realtime)

RDK X5 后端与 Supabase 的交互基于 PostgreSQL 变更监听 (CDC)。

-   **Channel**: `server_photo_text_sync`
-   **Event**: `postgres_changes`
-   **Schema**: `public`
-   **Table**: `photo_text` (字段包含 `photo`, `text`, `type`, `created_at` 等)

> [!IMPORTANT]
> 当 Supabase 表发生任何变动（INSERT/UPDATE/DELETE）时，RDK X5 会自动延迟 1s 触发 `/trigger` 逻辑。
