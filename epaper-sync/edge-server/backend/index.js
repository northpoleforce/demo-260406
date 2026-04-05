require('dotenv').config();
const express = require('express');
const puppeteer = require('puppeteer');
const sharp = require('sharp');
const mqtt = require('mqtt');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = 3000;
const publicDir = path.join(__dirname, 'public');

// 初始化 Supabase 客户端
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
    console.warn("⚠️  警告: 缺少 SUPABASE_URL 或 SUPABASE_ANON_KEY 环境变量，实时监听将无法启动");
}
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// 强烈建议将这两个值改成您 e1001 的确切分辨率
const SCREEN_WIDTH = 800;  
const SCREEN_HEIGHT = 480;

if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
}

// 提供静态文件访问支持
app.use(express.static(publicDir));

// 1. 挂载到免费的测试 MQTT 代理
const client = mqtt.connect('mqtt://broker.emqx.io');

client.on('connect', () => {
    console.log('[MQTT] 成功挂载至公共 Broker (broker.emqx.io)');
});

// 全局渲染锁闭状态（防并发内存溢出）
let isRendering = false;
let pendingRender = false;

// 2. 核心渲染推送流水线（已解耦为独立异步函数）
async function renderAndPush() {
    if (isRendering) {
        console.log("[系统缓冲] 当前渲染管线已有任务在执行，将此更新压入等待队列...");
        pendingRender = true;
        return { success: false, msg: "已加入队列等待执行..." };
    }

    isRendering = true;
    console.log("[渲染引擎] 捕获到目标渲染动作，开始召唤 Puppeteer...");
    
    try {
        const launchOptions = { 
            headless: "new",
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
            ]
        };

        if (os.platform() === 'darwin') {
            const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
            if (fs.existsSync(chromePath)) {
                console.log("[系统分析] 检测到 macOS 平台，将切换至宿主 Google Chrome 以规避系统库兼容性报错。");
                launchOptions.executablePath = chromePath;
            }
        }

        const browser = await puppeteer.launch(launchOptions);
        const page = await browser.newPage();
        
        await page.setViewport({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT });
        
        const targetUrl = `http://localhost:3001`;
        console.log(`[渲染引擎] 正在访问并渲染目标网页 => ${targetUrl}`);
        
        // 步骤1：等待网络空闲
        await page.goto(targetUrl, { waitUntil: 'networkidle0' });
        
        // 步骤2：高可靠性增强 - 等待前端明确发出 “我已排队并挂载 DOM 渲染成功” 的握手信号
        console.log("[系统缓冲] 正在等待前端传递 __RENDER_READY__ 确切信号...");
        await page.waitForFunction('window.__RENDER_READY__ === true', { timeout: 10000 }).catch(() => {
            console.log("⚠️ 前端未返回 Ready 信号超时，将尝试直接强行截图...");
        });
        
        const screenshotBuffer = await page.screenshot();
        await browser.close();
        console.log("[渲染引擎] 真彩 PNG 快照截取成功!");

        // 3. 图像降维打击与抖动注入
        // 取消原有的暴力 threshold() 截断，改用 Floyd-Steinberg 误差扩散算法保留极高质量的明暗灰阶细节
        const image = sharp(screenshotBuffer);
        const { data: rawData, info } = await image
            .resize(SCREEN_WIDTH, SCREEN_HEIGHT)
            .normalize() // 局部自适应拉伸照片对比度，使菜品更鲜明
            .gamma(1.1)  // 补偿电子纸偏灰的硬件视觉缺陷
            .grayscale()
            .raw() 
            .toBuffer({ resolveWithObject: true });

        const channels = info.channels || 1;
        const width = SCREEN_WIDTH;
        const height = SCREEN_HEIGHT;
        
        // 浮点数组用于承受误差溢出计算
        const pixels = new Float32Array(width * height);
        for (let i = 0; i < width * height; i++) {
            pixels[i] = rawData[i * channels]; // 收束所有彩色至单通道明亮度
        }

        // 核心算法：Floyd-Steinberg Dithering
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = y * width + x;
                const oldPixel = pixels[i];
                // 128 为中位阈值判定，生成 0 或 255 的极值
                const newPixel = oldPixel < 130 ? 0 : 255; 
                pixels[i] = newPixel;
                
                const quantError = oldPixel - newPixel;
                
                // 将截断的细节残余误差（量子误差）如同水墨般推演晕染到周围还没处理的像素上
                if (x + 1 < width) pixels[i + 1] += quantError * 7 / 16;
                if (x - 1 >= 0 && y + 1 < height) pixels[i - 1 + width] += quantError * 3 / 16;
                if (y + 1 < height) pixels[i + width] += quantError * 5 / 16;
                if (x + 1 < width && y + 1 < height) pixels[i + 1 + width] += quantError * 1 / 16;
            }
        }

        const packedBuffer = Buffer.alloc((width * height) / 8);
        for (let i = 0; i < pixels.length; i++) {
            // 利用已计算出的伪灰阶，转换为 1-bit 高密度缓存打包
            if (pixels[i] > 128) {
                const byteIndex = Math.floor(i / 8);
                const bitIndex = 7 - (i % 8);
                packedBuffer[byteIndex] |= (1 << bitIndex);
            }
        }

        const pngFilePath = path.join(publicDir, 'latest.png');
        fs.writeFileSync(pngFilePath, screenshotBuffer);
        const rawFilePath = path.join(publicDir, 'latest.raw');
        fs.writeFileSync(rawFilePath, packedBuffer);
        console.log(`[图像中心] RAW 数据已落盘 (${packedBuffer.length} Bytes). PNG 对应已保存.`);
        
        const nifs = os.networkInterfaces();
        let localIp = '127.0.0.1';
        for (const name of Object.keys(nifs)) {
            for (const net of nifs[name]) {
                if (net.family === 'IPv4' && !net.internal) {
                    localIp = net.address;
                    break;
                }
            }
            if (localIp !== '127.0.0.1') break;
        }

        const url = `http://${localIp}:${port}/latest.raw`;
        console.log(`[信令中心] 生成目标下载地址: ${url}`);
        
        // 4. MQTT 跨端信令下推
        client.publish('e1001/cmd/update', url);
        console.log("[信令中心] >>> 最终更新信令已通过 MQTT 发出！");

        return { success: true, url, rawFilePath };
    } catch(err) {
        console.error("[引擎报错] 渲染截屏过程发生异常: ", err);
        return { success: false, msg: err.message };
    } finally {
        isRendering = false;
        // 如果有积压的更新请求，开启下一次渲染
        if (pendingRender) {
            console.log("[流水线] 发现积压的高并发更新任务，即将处理新一轮快照...");
            pendingRender = false;
            // 延时一段缓冲再跑下一轮
            setTimeout(() => {
                renderAndPush().catch(e => console.error(e));
            }, 1000);
        }
    }
}

// 保留一个用于调试或者手动初始化的 RESTful 接口
app.get('/trigger', async (req, res) => {
    const result = await renderAndPush();
    if (result.success) {
        res.send(`
            <h1>渲染与信令下推全套工作流已闭环完成!</h1>
            <p>1. 数据地址: ${result.url}</p>
            <p>2. 已为您保存一份 PNG 预览图: <a href="/latest.png" target="_blank">点击此处预览截图效果</a></p>
            <br/>请查看 e1001 屏幕反应。
        `);
    } else {
        res.status(500).send("渲染排队或失败：" + result.msg);
    }
});

// 5. 挂载 Supabase 自动化实时监听通道
if (supabase) {
    supabase
        .channel('server_photo_text_sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'photo_text' }, payload => {
            console.log(`[Supabase 实时引擎] 捕捉到数据表变动事件: ${payload.eventType}`);
            console.log(`[自动联动] 立即预定网页截图重绘并同步...`);
            // 延迟一点以确保前端（也是 Realtime）以及 DOM Tree 加载跟进上新数据
            setTimeout(() => {
                renderAndPush();
            }, 1000);
        })
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('[Supabase 实时通道] =====>> 成功接入挂载，正在等待数据库变更 <<=====');
            }
        });
}

app.listen(port, () => {
    console.log(`=========================================`);
    console.log(` 跨端无头渲染引擎已启动在端口: ${port}`);
    console.log(` [目标页面] 放进 public/target.html 可以随意改写`);
    console.log(` [立刻触发渲染同步] 浏览器访问: http://localhost:${port}/trigger`);
    console.log(`=========================================`);
});
