#!/bin/bash

# ========================================================
# 🚀 E1001 电子纸全自动同步脚本 (All-in-One)
# ========================================================

# 1. 自动定位目录
SCRIPTS_DIR=$(cd "$(dirname "$0")"; pwd)
PROJECT_ROOT=$(dirname "$SCRIPTS_DIR")
SERVER_DIR="$PROJECT_ROOT/rdk-edge/backend"
WEB_DIR="$PROJECT_ROOT/rdk-edge/frontend"

echo "--------------------------------------------------------"
echo "🌟 欢迎使用 E1001 电子纸同步助手"
echo "--------------------------------------------------------"

# 2. 检查 Next.js 是否已启动 (默认 3001)
if ! curl -s "http://localhost:3001" > /dev/null; then
    echo "⚠️  未检测到 Next.js 网页运行 (localhost:3001)"
    echo "📦 正在为您尝试在后台启动网页端..."
    cd "$WEB_DIR" || exit
    nohup npm run dev -- -p 3001 > /tmp/next_app.log 2>&1 &
    echo "⏳ 等待网页编译就绪 (约 10 秒)..."
    sleep 10
else
    echo "✅ Next.js 网页已在运行 (3001)"
fi

# 3. 检查中转服务器依赖并启动 (3000)
echo "📦 正在检查渲染服务器环境 (3000)..."
cd "$SERVER_DIR" || exit

# 自动修改中转服务器的目标 URL 指向当前网页
# 确保 Server/index.js 里的 targetUrl 正确
# 使用 sed 确保截图目标是 localhost:3001
if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/targetUrl = \`http.*\`/targetUrl = \`http:\/\/localhost:3001\`/g" index.js
else
    sed -i "s/targetUrl = \`http.*\`/targetUrl = \`http:\/\/localhost:3001\`/g" index.js
fi

if [ ! -d "node_modules" ]; then
    echo "📦 第一次运行，正在安装渲染依赖 (Puppeteer/Sharp)..."
    npm install
fi

# 检查 3000 端口是否被占用，如果占用了先清掉，保证干净启动
PIDS=$(lsof -t -i:3000)
if [ -n "$PIDS" ]; then
    echo "🧹 清理旧的中转服务器 (PIDs: $PIDS)..."
    # 使用 xargs 或是循环来确保 kill 命令能正确处理多个 PID
    echo "$PIDS" | xargs kill -9 > /dev/null 2>&1
fi

echo "✨ 启动渲染中转服务器 (后台跑)..."
nohup node index.js > /tmp/relay_server.log 2>&1 &
sleep 3

# 4. 触发首次同步
echo "--------------------------------------------------------"
echo "🔥 发送首帧同步信号火线驰援电子纸..."
curl -s "http://localhost:3000/trigger" > /dev/null

echo "✅ 完成！"
echo "--------------------------------------------------------"
echo "🌐 网页端: http://localhost:3001"
echo "📡 渲染端: http://localhost:3000"
echo "📸 触发渲染: http://localhost:3000/trigger"
echo "--------------------------------------------------------"
echo "💡 您现在可以修改网页代码，或访问 trigger 接口强制电子纸刷新。"
echo "--------------------------------------------------------"
