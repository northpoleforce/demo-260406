#!/bin/bash

# ========================================================
# 🚀 深圳 Hackathon 2026 - 全链路一键启动脚本 (Robust Version)
# ========================================================

set -eo pipefail

# ── 颜色 & 工具函数 ──────────────────────────────────────
export LANG=en_US.UTF-8
export TERM=xterm-256color
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()    { echo -e "${BLUE}ℹ️  $*${NC}"; }
success() { echo -e "${GREEN}✅ $*${NC}"; }
warn()    { echo -e "${YELLOW}⚠️  $*${NC}"; }
error()   { echo -e "${RED}❌ $*${NC}"; }
step()    { echo -e "\n${CYAN}${BOLD}▶ $*${NC}"; }
divider() { echo -e "${BLUE}────────────────────────────────────────────────────${NC}"; }

# 脚本工作目录锁定到项目根
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
cd "$SCRIPT_DIR"

divider
echo -e "${GREEN}${BOLD}  🌟 边缘 AI 智能餐饮系统 × 电子纸同步方案${NC}"
echo -e "${BLUE}  Hackathon 2026 深圳 · All-in-One 启动脚本${NC}"
divider

# ── STEP 1: 检查必要的运行时环境 ────────────────────────
step "环境预检"

# 1.1 Node.js
if ! command -v node &>/dev/null; then
    error "未检测到 Node.js。请先安装: https://nodejs.org/"
    exit 1
fi
NODE_VER=$(node -v)
success "Node.js $NODE_VER"

# 1.2 npm
if ! command -v npm &>/dev/null; then
    error "未检测到 npm，请重新安装 Node.js。"
    exit 1
fi

# 1.3 Python 3 (FastAPI 后端必须)
PYTHON_CMD=""
if command -v python3 &>/dev/null; then
    PYTHON_CMD="python3"
    PY_VER=$(python3 --version)
    success "$PY_VER"
elif command -v python &>/dev/null && python --version 2>&1 | grep -q "Python 3"; then
    PYTHON_CMD="python"
    PY_VER=$(python --version)
    success "$PY_VER"
else
    warn "未检测到 Python 3，餐饮后端 (FastAPI) 将被跳过。"
fi

# 1.4 uvicorn (仅当 Python 存在时检查)
UVICORN_OK=false
if [ -n "$PYTHON_CMD" ]; then
    if $PYTHON_CMD -m uvicorn --version &>/dev/null 2>&1; then
        UVICORN_OK=true
        success "uvicorn 已就绪"
    else
        warn "未安装 uvicorn，正在自动安装 Python 依赖..."
        PIP_CMD="pip3"
        command -v pip3 &>/dev/null || PIP_CMD="pip"
        $PIP_CMD install fastapi uvicorn pydantic httpx --quiet \
            && UVICORN_OK=true \
            && success "Python 依赖安装完成" \
            || warn "Python 依赖安装失败，餐饮后端 (FastAPI) 将被跳过。"
    fi
fi

# ── STEP 2: 自动安装 Node 依赖 ──────────────────────────
step "Node.js 依赖检查"

# 2.1 根目录（安装 concurrently）
if [ ! -f "node_modules/.bin/concurrently" ]; then
    info "根目录缺少依赖，正在安装..."
    npm install --silent
    success "根目录依赖安装完成"
else
    success "根目录依赖已就绪"
fi

# 2.2 各子项目
check_and_install() {
    local dir="$1"
    local name="$2"
    if [ -d "$dir" ] && [ ! -d "$dir/node_modules" ]; then
        info "$name 缺少 node_modules，正在安装..."
        (cd "$dir" && npm install --silent)
        success "$name 依赖安装完成"
    fi
}

check_and_install "epaper-sync/edge-server/backend"  "电子纸渲染后端"
check_and_install "epaper-sync/edge-server/frontend" "电子纸前端 UI"
check_and_install "foodshop/kitchen-tablet"          "后厨平板前端"

# 2.3 修复可能损坏的 .bin symlink（常见于 node 版本切换后）
repair_bin_symlink() {
    local bin_path="$1"    # e.g. foodshop/kitchen-tablet/node_modules/.bin/vite
    local target="$2"      # e.g. ../vite/bin/vite.js
    local display="$3"
    if [ -f "$bin_path" ] && [ ! -L "$bin_path" ]; then
        warn "检测到 $display 可执行文件损坏（非 symlink），正在自动修复..."
        rm -f "$bin_path"
        ln -s "$target" "$bin_path"
        chmod +x "$bin_path"
        success "$display symlink 修复完成"
    fi
}

repair_bin_symlink \
    "foodshop/kitchen-tablet/node_modules/.bin/vite" \
    "../vite/bin/vite.js" \
    "Vite"
repair_bin_symlink \
    "epaper-sync/edge-server/frontend/node_modules/.bin/next" \
    "../next/dist/bin/next" \
    "Next.js"

# ── STEP 3: 检查 .env 配置文件 ──────────────────────────
step "环境变量配置检查"

ENV_WARN=false

# 3.1 电子纸前端 (.env.local)
EPAPER_FRONTEND_ENV="epaper-sync/edge-server/frontend/.env.local"
if [ ! -f "$EPAPER_FRONTEND_ENV" ]; then
    warn "缺少 $EPAPER_FRONTEND_ENV，已为你创建模版，请填入真实值！"
    cat > "$EPAPER_FRONTEND_ENV" << 'EOF'
# 电子纸前端 - Supabase 配置（请替换为真实值）
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SUPABASE_TABLE_NAME=menu_items
EOF
    ENV_WARN=true
else
    # 检查占位符是否未替换
    if grep -q "your-project\|your-anon-key" "$EPAPER_FRONTEND_ENV" 2>/dev/null; then
        warn "$EPAPER_FRONTEND_ENV 中的 Supabase 配置尚未填写！"
        ENV_WARN=true
    else
        success "电子纸前端 .env.local 已配置"
    fi
fi

# 3.2 电子纸渲染后端 (.env)
EPAPER_BACKEND_ENV="epaper-sync/edge-server/backend/.env"
if [ ! -f "$EPAPER_BACKEND_ENV" ]; then
    warn "缺少 $EPAPER_BACKEND_ENV，已为你创建模版，请填入真实值！"
    cat > "$EPAPER_BACKEND_ENV" << 'EOF'
# 电子纸渲染后端 - Supabase & MQTT 配置（请替换为真实值）
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
# MQTT_HOST=your-mqtt-broker
# MQTT_PORT=1883
EOF
    ENV_WARN=true
else
    if grep -q "your-project\|your-anon-key" "$EPAPER_BACKEND_ENV" 2>/dev/null; then
        warn "$EPAPER_BACKEND_ENV 中的 Supabase 配置尚未填写！"
        ENV_WARN=true
    else
        success "电子纸渲染后端 .env 已配置"
    fi
fi

# 3.3 后厨平板前端 (.env)
TABLET_ENV="foodshop/kitchen-tablet/.env"
if [ ! -f "$TABLET_ENV" ]; then
    warn "缺少 $TABLET_ENV，已为你从 .env.example 复制模版！"
    if [ -f "foodshop/kitchen-tablet/.env.example" ]; then
        cp "foodshop/kitchen-tablet/.env.example" "$TABLET_ENV"
    else
        cat > "$TABLET_ENV" << 'EOF'
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws/store/default
VITE_DEVICE_TOKEN=kitchen-tablet-001
VITE_USE_MOCK=true
EOF
    fi
    ENV_WARN=true
else
    success "后厨平板前端 .env 已配置"
fi

if $ENV_WARN; then
    warn "部分 .env 配置需要填写，服务可能以降级模式运行。"
fi

# ── STEP 4: 智能清理冲突端口 ────────────────────────────
step "端口清理与准备"

# 根据端口号获取服务名称
port_to_service() {
    case "$1" in
        8000) echo "餐饮后端 (FastAPI)" ;;
        3000) echo "电子纸渲染 (Node)" ;;
        3001) echo "电子纸前端 (Next.js)" ;;
        5173) echo "后厨平板 (Vite)" ;;
        *)    echo "未知服务" ;;
    esac
}

kill_port() {
    local port="$1"
    local service
    service=$(port_to_service "$port")
    local pids
    pids=$(lsof -ti tcp:"$port" 2>/dev/null || true)
    if [ -n "$pids" ]; then
        local proc_names
        proc_names=$(echo "$pids" | xargs -I {} sh -c 'ps -p {} -o comm= 2>/dev/null || echo unknown' | sort -u | tr '\n' ',' | sed 's/,$//')
        warn "端口 $port ($service) 被占用 [进程: $proc_names]，正在自动清理..."
        echo "$pids" | xargs kill -TERM 2>/dev/null || true
        sleep 1
        local remaining
        remaining=$(lsof -ti tcp:"$port" 2>/dev/null || true)
        if [ -n "$remaining" ]; then
            echo "$remaining" | xargs kill -9 2>/dev/null || true
        fi
        success "端口 $port 已释放"
    else
        success "端口 $port 空闲"
    fi
}

for port in 8000 3000 3001 5173; do
    kill_port "$port"
done

# 清理 Next.js 的 Turbopack 缓存，防止 React Client Manifest 报错
NEXT_CACHE_DIR="epaper-sync/edge-server/frontend/.next"
if [ -d "$NEXT_CACHE_DIR" ]; then
    info "清理 Next.js 缓存 (.next)..."
    # 强制清理（防止文件被占用的情况，先等进程释放）
    sleep 1
    find "$NEXT_CACHE_DIR" -type f -delete 2>/dev/null || true
    find "$NEXT_CACHE_DIR" -type d -empty -delete 2>/dev/null || true
    rmdir "$NEXT_CACHE_DIR" 2>/dev/null || true
    success "Next.js 缓存已清理"
fi

# ── STEP 5: 构建并发启动命令 ────────────────────────────
step "启动所有服务"

divider
echo -e "  ${BOLD}服务地址一览${NC}"
if $UVICORN_OK && [ -n "$PYTHON_CMD" ]; then
    echo -e "  🍽  餐饮后端  (FastAPI)  → ${GREEN}http://localhost:8000${NC}"
fi
echo -e "  💻  后厨平板  (React)    → ${GREEN}http://localhost:5173${NC}"
echo -e "  📡  电子纸渲染 (Node)    → ${GREEN}http://localhost:3000${NC}"
echo -e "  🖼   电子纸 UI (Next.js)  → ${GREEN}http://localhost:3001${NC}"
divider
echo -e "  ${YELLOW}按 Ctrl+C 可一键停止所有服务${NC}"
divider

# 根据 Python 可用性动态组装并发命令
CONCURRENTLY_NAMES="TABLET,EPAPER-SVR,EPAPER-UI"
CONCURRENTLY_COLORS="green,magenta,cyan"
CONCURRENTLY_CMDS=(
    "npm run start:kitchen-tablet"
    "npm run start:epaper-backend"
    "npm run start:epaper-frontend"
)

if $UVICORN_OK && [ -n "$PYTHON_CMD" ]; then
    CONCURRENTLY_NAMES="BACKEND,$CONCURRENTLY_NAMES"
    CONCURRENTLY_COLORS="blue,$CONCURRENTLY_COLORS"
    CONCURRENTLY_CMDS=("cd foodshop/backend && PYTHONPATH=app $PYTHON_CMD -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload" "${CONCURRENTLY_CMDS[@]}")
else
    warn "餐饮后端 (FastAPI) 将被跳过（Python/uvicorn 不可用）"
fi

# 使用 npx 确保一定能找到 concurrently
CMD_ARGS=()
for cmd in "${CONCURRENTLY_CMDS[@]}"; do
    CMD_ARGS+=("\"$cmd\"")
done

eval npx concurrently \
    --names "\"$CONCURRENTLY_NAMES\"" \
    --prefix-colors "\"$CONCURRENTLY_COLORS\"" \
    "${CMD_ARGS[@]}"
