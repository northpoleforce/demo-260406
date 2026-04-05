# Server (SSR 端) 架构与功能分析文档

本项目是一个专为 **E1001 墨水屏同步** 设计的 **Headless SSR (无头浏览器服务端渲染)** 引擎。它利用现代 Web 技术及后端图像处理能力，将动态网页（HTML/JS）实时转换为低功耗嵌入式设备可直接使用的原始二进制格式。

## 1. 文件夹结构说明 (Folder Structure)

```text
Server/
├── index.js           # 核心服务端逻辑 (Express + Puppeteer + Sharp + MQTT)
├── package.json       # 项目依赖与配置 (puppeteer, sharp, mqtt, express)
├── public/            # 静态资源与中间产物目录
│   ├── target.html    # 电子墨水屏显示模板 (HTML/CSS 设计)
│   └── latest.raw     # (自动生成) 经过转换的 e1001 专有 1-bit 二进制图像数据
└── node_modules/      # 依赖库目录 (运行环境)
```

---

## 2. 核心组件与功能 (Core Components & Functions)

### A. 无头浏览器渲染层 (Puppeteer)
*   **功能**: 在服务端启动一个 Invisible Chrome (无头浏览器)，加载 `target.html`。
*   **意义**: 解耦了前端设计与嵌入式硬件。屏幕设计师可以使用熟悉的 CSS Flexbox、Grid 等所有现代 Web 布局特性，甚至可以运行 JS 获取实时数据 (如天气、金价、时间)，而不必受限于 MCU 简陋的绘图库。

### B. 图像降维与压缩中心 (Sharp)
*   **功能**:
    1.  将浏览器截取的 PNG/JPG 快照转换为符合 `e1001` 分辨率 (800x480) 的灰度图像。
    2.  应用阈值二值化 (Thresholding)，将彩色/灰阶像素转换为 0 (黑) 或 255 (白)。
    3.  **位打包 (Bit Packing)**: 将 1-Byte/像素的数据压缩为 1-Bit/像素。例如，800x480 个像素最终被打包成一个约 48,000 Bytes 的 RAW 文件。
*   **核心实现**: 按 MSB (最高有效位) 在前的原则将像素填充进 Buffer。

### C. 跨端信令下推 (MQTT Client)
*   **功能**: 通过公有的 MQTT Broker 发送更新指令。
*   **通讯流程**:
    1.  `/trigger` 接口被访问。
    2.  Server 生成 `latest.raw`。
    3.  Server 获取本地 IP 并生成下载链接。
    4.  通过 MQTT 主题 `e1001/cmd/update` 推送该 URL。

---

## 3. 核心工作流 (End-to-End Workflow)

1.  **触发 (Trigger)**: 用户或定时任务访问 `http://server:3000/trigger`。
2.  **渲染 (Render)**: Puppeteer 加载 `public/target.html` 并执行其内部 JS。
3.  **截图 (Capture)**: 截取 800x480 分辨率的屏幕视频存储到内存。
4.  **转换 (Process)**: Sharp 将截图压缩并二值化，生成 `latest.raw` 静态文件。
5.  **广播 (Signal)**: MQTT 向外广播：“嘿，e1001，我已经准备好了最新的图像，请从 `http://[IP]:3000/latest.raw` 下载”。
6.  **同步 (Sync)**: 硬件端 (e1001) 收到指令，通过 HTTP 拉取 RAW 数据并刷屏。

---

## 4. 技术栈优势

*   **设计解耦**: 所有的排版都在标准的 HTML 页面里完成。
*   **动态展示**: 可以在 `target.html` 里编写 JavaScript，抓取实时接口数据。
*   **低功耗友好**: 复杂的图像重采样与压缩工作都由服务器完成，终端硬件仅需简单的 Buffer 拷贝。

---

## 5. 快速开始 (Quick Start)

为了方便开发与调试，我们提供了自动化脚本：

### A. 启动服务端
运行以下脚本，它会自动检查依赖并启动 Node.js 服务：
```bash
./start_server.sh
```

### B. 手动触发同步
当你修改了 `public/target.html` 或是想强制硬件刷屏时，可以使用以下脚本：
```bash
./trigger_sync.sh
```

---

## 6. 进阶使用技巧 (Usage)

1. **界面调试**: 在浏览器直接访问 `http://localhost:3000/target.html`，开启开发者工具进行 CSS 布局调试。由于 Puppeteer 使用的是 Chrome 内核，你在浏览器看到的效果与墨水屏最终显示的渲染效果具有高度的一致性。
2. **实时触发**: 你可以在服务器上的定时任务 (Cron) 中配置调用 `trigger_sync.sh`，实现每 15 分钟自动更新屏幕。
3. **网络配置**: 如果 `e1001` 无法下载图片，请确保服务器与硬件处于同一局域网，并且防火墙已放行 `3000` 端口。

---
> [!TIP]
> 每次执行 `trigger_sync.sh` 后，你可以检查 `Server/public/latest.raw` 文件的时间戳，确认渲染流程是否成功闭环。
