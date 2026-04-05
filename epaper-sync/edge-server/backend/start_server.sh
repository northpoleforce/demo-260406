#!/bin/bash

# 确保脚本在当前目录运行
cd "$(dirname "$0")"

echo "========================================="
echo "  🚀 E1001 SSR Server 启动向导"
echo "========================================="

# 1. 检查环境变量 (Node.js)
if ! command -v node &> /dev/null
then
    echo "❌ 错误: 未检测到 Node.js 环境，请先安装 Node.js。"
    exit 1
fi

# 2. 检查依赖是否已安装
if [ ! -d "node_modules" ]; then
    echo "📦 正在安装必要的依赖包 (puppeteer, sharp, mqtt, express)..."
    npm install
fi

# 3. 启动服务端脚本
echo "✨ 正在启动无头浏览器渲染中心..."
echo "🔗 访问 http://localhost:3000/trigger 以手动同步"
echo "-----------------------------------------"

npm start
