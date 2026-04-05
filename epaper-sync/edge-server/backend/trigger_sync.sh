#!/bin/bash

# 简单的脚本用来远程或本地触发 SSR 渲染并同步到 e1001
SERVER_IP="127.0.0.1"
SERVER_PORT=3000

echo "========================================="
echo "  📣 远程图像更新触发器"
echo "========================================="

echo "正在向服务器发送渲染指令 => http://${SERVER_IP}:${SERVER_PORT}/trigger"

# 使用 curl 发送一个简单的 GET 请求。
# -s 则静默输出
# -o /dev/null 不保存输出

curl -s -o /dev/null "http://${SERVER_IP}:${SERVER_PORT}/trigger"

if [ $? -eq 0 ]; then
    echo "✅ 渲染指令已发出!服务器正在执行 Puppeteer 网页捕捉并投递 MQTT 消息..."
    echo "💡 请观察 e1001 的屏幕状态变化。"
else
    echo "❌ 触发失败!请检查服务器是否已在端口 ${SERVER_PORT} 启动。"
fi
echo "========================================="
