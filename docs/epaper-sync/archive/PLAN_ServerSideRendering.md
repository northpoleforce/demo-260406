# 基于服务端渲染的 e1001 墨水屏同步方案设计 (Server-Side Rendering & Dithering)

## 1. 架构理念 (Architecture Vision)
本方案的核心设计思想是**“降维打击”与“极致解耦”**。
不要求资源受限的 MCU（e1001）去理解复杂的现代前端架构（DOM / CSS / JS），而是将渲染重重担全部转移至计算力充沛的云端/边缘服务器。e1001 仅被抽象为一个**“可以通过网络接收位图流并推送到屏幕”的哑终端 (Dumb Display)**。

### 1.1 核心数据流向
`后端数据变化 -> 触发云端无头浏览器重绘 -> 截取 DOM 快照 -> 图像降维二值化(抖动算法) -> 生成 Raw 二进制流 -> MQTT 通知 + HTTP 拉取 -> e1001 驱动屏幕刷新`

---

## 2. 系统各层详细设计

### 2.1 云端渲染节点 (Render Node)
这部分是整个方案的心脏，负责把“网页”变成“像素”。
*   **技术栈推荐**：Node.js + Playwright / Puppeteer + Sharp (图像处理库)
*   **核心步骤**：
    1.  **视口锁定**：初始化无头浏览器时，将 `viewport` 严格锁定为 e1001 屏幕的确切分辨率（例如假设为 800x480 或者由横竖屏决定）。这样网页前端在编写时，直接按照这个容器尺寸写 CSS，实现 1:1 像素映射。
    2.  **触发渲染**：通过 RESTful API、MQTT 或 Webhook。当确认网页数据已更新（可通过等待特定的 DOM 元素渲染完毕 `networkidle`）时，执行截图。
    3.  **图像降维过滤 (Dithering)**：
        *   截图获得的是 24-bit 的全彩 PNG。但这无法直接在墨水屏显示。
        *   使用 **Sharp** 库将图像转换为灰度图。
        *   应用 **Floyd-Steinberg 抖动算法**：将灰度图转换为 1-bit（非黑即白）的图像。此算法通过将像素量化误差分配给相邻像素，能够在只有黑白两色的墨水屏上表现出优异的视觉灰度（类似旧报纸由于墨点分布产生的灰度感）。
    4.  **数据流打包**：将 1-bit 像素数组（每 8 个像素拼成 1 个 byte）打包生成 `.raw` 二进制文件。

### 2.2 通信协议设计 (Data Delivery)
因为全屏位图文件相对较大（如 800x480/8 = 48KB），直接全量用 MQTT 推包可能会遇到包大小限制且不稳定。
**推荐采用“推拉结合”的双通道策略**：
*   **控制通道 (MQTT)**：服务器渲染和打包完成后，向 Topic `e1001/control/render` 发送一条短小消息：`{"action": "update", "url": "http://server-ip/latest_screen.raw", "md5": "xxx"}`。
*   **数据通道 (HTTP)**：e1001 收到 MQTT 信号后，通过 HTTP GET 请求去下载这个 `.raw` 二进制文件。同时可以校验 MD5 防止文件损坏。

### 2.3 边缘侧 e1001 固件设计 (Firmware Design)
固件逻辑将被极大简化，只需专注于网络通信与屏幕底层驱动。
*   **依赖库**：`TFT_eSPI` / 定制的 E-Paper 库、`WiFiClient`、`HTTPClient`、`PubSubClient` (用于 MQTT)。
*   **执行逻辑 (伪代码)**：
    ```cpp
    void onMqttMessage(String payload) {
        if(payload.action == "update") {
            downloadRawImage(payload.url);
        }
    }
    
    void downloadRawImage(String url) {
        HTTPClient http;
        http.begin(url);
        int httpCode = http.GET();
        if(httpCode == HTTP_CODE_OK) {
            WiFiClient * stream = http.getStreamPtr();
            // 直接利用 TFT_eSPI 或底层接口，边流式读取内容，边推送进 FrameBuffer 或直接刷屏
            // 避免 48KB 将 MCU 内存撑爆 (Stream-to-Screen)
            epaper.pushImageFromStream(0, 0, WIDTH, HEIGHT, stream); 
            epaper.update(); // 触发全屏硬件刷新
        }
    }
    ```

---

## 3. 方案的“高明”与“妥协” (Dialectical Analysis)

### 3.1 绝妙的优势 (Pros)
1.  **所见即所得**：无论网页加了阴影、圆角、甚至复杂的 Echarts 曲线图，统统能够降维打击成黑白位图完美呈现，无需在硬件端去生写 C++ UI 绘图代码。
2.  **前端生态复用**：可以利用丰富的 Web 生态（React, Vue, TailwindCSS）极速堆叠出极其华丽的控制面板。
3.  **完全解耦与热更新**：随时更换网页皮肤或排版结构，e1001 终端**一行 C++ 代码都不用改**，也就意味着设备一旦部署到现场，几乎永远不需要再做 OTA 固件升级。

### 3.2 必须直面的妥协 (Cons & Mitigation)
1.  **响应延迟高**：从后台数据变动 -> 浏览器截图 -> 抖动处理 -> 传输 -> 全局刷屏，这套流程耗时一般在秒级（2s - 5s 浮动）。
    *   *缓解策略*：仅适用于“状态面板”或“慢速监控屏”场景（如天气预报、次日日程表、会议室占用状态），**不能**用于“秒表倒计时”这种需要高频刷新的场景。
2.  **屏幕寿命与视觉闪烁**：传过去的图片属于整张的新图，必然触发电子墨水屏的全局刷新（Global Refresh），屏幕会经历“全黑->全白->出图像”过程，闪烁一次并消耗一定的硬件寿命。
    *   *缓解策略*：在后端加入**内容哈希对比机制**。只有当后端发现截屏提取出的位图 `.raw` 文件的哈希值与上一次**确实不同**时，才向 e1001 发送更新通知指令。避免无效刷屏。

## 4. 后续探索建议
如果要实现上述方案，我们可以从以下几个步骤起步试错：
1. 编写一段最小化的 Puppeteer 辅助脚本，固定输出 1张 `.raw` 测试格式，并人工拷贝进去跑通显示。
2. 开发能够按一定规则截获特定 DIV 布局的能力。
3. 建立包含 MQTT 和 HTTP 通讯的 C++ e1001 项目骨架。
