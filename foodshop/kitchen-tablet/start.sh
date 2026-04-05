#!/bin/bash

# 后厨平板操作界面 - 快速启动脚本

echo "========================================="
echo "   后厨平板操作界面 - Kitchen Tablet"
echo "========================================="
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未安装 Node.js"
    echo "请先安装 Node.js: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js 版本: $(node --version)"
echo "✅ npm 版本: $(npm --version)"
echo ""

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 依赖安装失败"
        exit 1
    fi
    echo "✅ 依赖安装成功"
    echo ""
fi

# 检查环境变量
if [ ! -f ".env" ]; then
    echo "⚠️  未找到 .env 文件"
    echo "📝 创建默认配置..."
    cat > .env << EOF
# API 基础URL (请修改为实际的边缘主控地址)
VITE_API_URL=http://localhost:8000

# WebSocket URL (请修改为实际的边缘主控地址)
VITE_WS_URL=ws://localhost:8000/ws/store/default

# 设备认证Token
VITE_DEVICE_TOKEN=kitchen-tablet-001
EOF
    echo "✅ 已创建 .env 文件"
    echo "⚠️  请编辑 .env 文件，配置正确的后端服务地址"
    echo ""
fi

# 显示配置
echo "📋 当前配置:"
if [ -f ".env" ]; then
    cat .env | grep -v "^#" | grep -v "^$"
fi
echo ""

# 询问运行模式
echo "请选择运行模式:"
echo "1) 开发模式 (热重载)"
echo "2) 生产构建"
echo "3) 预览生产版本"
read -p "请输入选项 [1-3]: " mode

case $mode in
    1)
        echo ""
        echo "🚀 启动开发服务器..."
        echo "访问地址: http://localhost:3000"
        echo ""
        npm run dev
        ;;
    2)
        echo ""
        echo "🔨 构建生产版本..."
        npm run build
        if [ $? -eq 0 ]; then
            echo ""
            echo "✅ 构建成功!"
            echo "📦 构建产物位于: dist/"
            echo ""
            echo "部署步骤:"
            echo "1. 将 dist/ 目录复制到 Web 服务器"
            echo "2. 配置 Nginx（参考 DEPLOYMENT.md）"
            echo "3. 访问部署的地址"
        else
            echo "❌ 构建失败"
            exit 1
        fi
        ;;
    3)
        echo ""
        echo "👀 预览生产版本..."
        
        # 先构建（如果还未构建）
        if [ ! -d "dist" ]; then
            echo "📦 先进行生产构建..."
            npm run build
        fi
        
        echo ""
        echo "🚀 启动预览服务器..."
        echo "访问地址: http://localhost:4173"
        echo ""
        npm run preview
        ;;
    *)
        echo "❌ 无效选项"
        exit 1
        ;;
esac
