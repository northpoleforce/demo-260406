# MQTT 结合无头渲染 (SSR) 屏幕同步工作流剖析

本独立文档专门记载“基于事件驱动的流式屏幕同步架构”的核心工作流。该方案旨在通过 MQTT 通信协议与服务端的无头浏览器配合，完美跨越复杂前端渲染与单片机硬件限制的鸿沟。

---

## 一、 系统全链路时序拓扑

下方拓扑图严密定义了从数据库变更到最终电子墨水屏像素发生物理偏转的全部数据流向：

```mermaid
sequenceDiagram
    autonumber
    participant DB as 业务源 (DB/Webhook)
    participant Web as Web 页面 (前端)
    participant Node as 无头渲染进程 (Puppeteer)
    participant Sharp as 图像降维中心 (Sharp)
    participant HTTP as 静态文件分发 (Nginx)
    participant MQTT as 消息调度经纪 (EMQX Broker)
    participant S3 as e1001 (ESP32-S3 终端)
    participant EPaper as UC8179 E-Paper 屏幕

    Note over S3, MQTT: 初始化阶段: ESP32-S3 连入，静默监听心跳
    S3->>MQTT: 固件订阅 Topic: `e1001/cmd/update`

    %% 阶段 1：捕获拦截层
    rect rgb(240, 248, 255)
        Note left of Node: 【捕获拦截层】
        DB->>Node: 数据更新触发
        activate Node
        Node->>Web: 虚拟访客接入独立面板网页
        Note right of Node: 前端容器硬锁定: 800x480 <br> Wait网络清空 (networkidle0)
        Web-->>Node: 回传页面的真彩 24-bit PNG 截图
    end
    
    %% 阶段 2：降维打击层
    rect rgb(255, 245, 238)
        Note left of Node: 【降维打击层】
        Node->>Sharp: 丢入 PNG 原图
        activate Sharp
        Note over Sharp: <算法侵入> <br>1. 灰度映射池化 <br>2. Floyd-Steinberg 深度抖动推演
        Sharp-->>Node: 输出包含错落墨点的 1-bit 黑白 .raw 流
        deactivate Sharp
        Node->>HTTP: 落盘存储为 `screen_latest.raw` 文件
        HTTP-->>Node: 确认落盘
    end

    %% 阶段 3：信令控制层
    rect rgb(240, 255, 240)
        Note left of Node: 【信令控制层】
        Node->>MQTT: Publish 更新信令
        Note over Node, MQTT: Payload报文体: <br> {"url": "http://x.x/latest.raw", "md5": "1A2B3C"}
        deactivate Node
        MQTT-->>S3: 利用 QoS=1 下推此更新报文至硬件
    end

    %% 阶段 4：边缘执行层
    rect rgb(255, 250, 250)
        Note right of S3: 【边缘执行层】
        activate S3
        S3->>S3: 解析 JSON，比对防抖校验码 (过滤重复刷)
        S3->>HTTP: 开辟 TCP 通道，发起 HTTP GET 请求
        HTTP-->>S3: 以 Chunked 模式下发文件流
        
        Note right of S3: 流式防溢出管道 (Stream-to-Screen)
        loop 直接注入寄存器
            S3->>EPaper: Bypass 内存，数据直推硬件 SPI 总线
        end
        
        S3->>EPaper: 下达终极指令: epaper.update() <br>引发物理涂层翻转
        deactivate S3
    end
```

---

## 二、 阶段拆解与“哲学理念”

整个工作流践行了**“控制面与数据面分离”、“重算力前置”**的架构美学。

### 阶段 1：触发与捕获 (Trigger & Capture)
*   **动作**：一旦检测到数据变化，驻守云端的 Puppeteer 无头浏览器便作为“哨兵”拉起该终端对应的 Web 面板。
*   **高明点**：设置了严格的视窗规格锁定（与 e1001 一比一对应），从而完全释放了网页前端人员的设计束缚。它负责将各种 DOM 树、WebGL 图表进行冷酷定格。

### 阶段 2：图像特化降维 (Image Dithering)
*   **动作**：这是对 E-Paper 物理特性的直接妥协与利用。将 24 位全彩色图片利用 `Sharp` 图像操作库丢掉色彩特征，应用 `Floyd-Steinberg` 误差扩散矩阵。
*   **高明点**：该操作人为地在生硬像素间植入斑驳密布的黑白点阵，在墨水屏不具备真彩域的情况下，“伪造”出了平滑细腻的灰度过渡层次感，这是终端微控制器靠自身算力极难实时推演出的视觉盛宴。

### 3. 信令与多路下发 (Signaling Control via MQTT)
*   **动作**：服务器不会通过臃肿的 HTTP 或者直接的 TCP Socket 去盲推 40KB+ 的文件，而是聪明地发送了一张极小的 JSON "传票"（包含大文件所在的 URL 与内容特征标识）。
*   **高明点**：依靠 MQTT QoS 服务来完成“传票”的必定送达与离线暂存。这一举彻底解耦了文件分发的风险，即便同时面临 10,000 台 e1001 设备，系统也绝不在信令下发阶段产生资源瓶颈阻塞。

### 4. 终端流式直推 (Stream-to-Hardware Execution)
*   **动作**：边缘端的 e1001（ESP32-S3） 只是一个被拨动了琴弦的木偶。它循着“传票”地址发起下载，由于完整图像帧极有可能突破其可怜的可用 RAM，它选择利用 HTTP Client 的 Stream 能力，收到一小块 buffer 就通过 SPI 直接塞入驱动 IC 的显存缓冲区内。
*   **高明点**：绕开了 MCU 内存被占崩的风险极限，并在最后一步精确执行 `epaper.update()`，让复杂的云技术魔法收束于沉浸低噪的物理硬件动作上。
