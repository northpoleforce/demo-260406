# 后厨平板操作界面 - 部署文档

## 系统要求

### 硬件要求

- **平板设备**: 10-12英寸触控屏
- **分辨率**: 最低 1280x800
- **内存**: 最低 2GB RAM
- **存储**: 最低 500MB 可用空间

### 软件要求

- **操作系统**: 支持现代浏览器的任意操作系统
- **浏览器**: 
  - Chrome 90+
  - Safari 14+
  - Firefox 88+
  - Edge 90+

### 网络要求

- **局域网连接**: 与边缘主控设备在同一局域网
- **带宽**: 最低 1Mbps
- **延迟**: 建议 < 50ms

## 部署步骤

### 1. 构建应用

```bash
# 克隆代码（如果还未克隆）
cd /path/to/kitchen-tablet

# 安装依赖
npm install

# 构建生产版本
npm run build
```

构建产物将生成在 `dist/` 目录。

### 2. 配置环境变量

在部署前，需要配置后端服务地址：

**方式一：构建时配置**

创建 `.env.production` 文件：

```bash
VITE_API_URL=http://192.168.1.100:8000
VITE_WS_URL=ws://192.168.1.100:8000/ws/store/default
VITE_DEVICE_TOKEN=kitchen-tablet-001
```

然后重新构建：

```bash
npm run build
```

**方式二：运行时配置（推荐）**

使用 Nginx 反向代理，前端使用相对路径。

### 3. 部署到 Web 服务器

#### 使用 Nginx（推荐）

1. 将 `dist/` 目录内容复制到 Nginx 服务器：

```bash
sudo cp -r dist/* /var/www/kitchen-tablet/
```

2. 创建 Nginx 配置文件：

```bash
sudo nano /etc/nginx/sites-available/kitchen-tablet
```

3. 添加以下配置：

```nginx
server {
    listen 80;
    server_name kitchen-tablet.local;
    
    root /var/www/kitchen-tablet;
    index index.html;
    
    # 前端资源
    location / {
        try_files $uri $uri/ /index.html;
        
        # 缓存控制
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
        
        # HTML 不缓存
        location ~* \.html$ {
            expires -1;
            add_header Cache-Control "no-store, no-cache, must-revalidate";
        }
    }
    
    # API 代理
    location /api {
        proxy_pass http://192.168.1.100:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # WebSocket 代理
    location /ws {
        proxy_pass http://192.168.1.100:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        
        # WebSocket 超时设置（保持长连接）
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }
    
    # 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
```

4. 启用配置并重启 Nginx：

```bash
sudo ln -s /etc/nginx/sites-available/kitchen-tablet /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 使用边缘主控直接服务（简化部署）

如果边缘主控已运行 Nginx，可以直接部署到边缘主控：

```bash
# 复制到边缘主控
scp -r dist/* edge-server:/var/www/kitchen-tablet/

# 在边缘主控上配置 Nginx（参考上面的配置）
```

### 4. 配置平板设备

1. 在平板浏览器中访问：`http://kitchen-tablet.local`
2. 将网页添加到主屏幕：
   - **iPad**: Safari → 分享 → 添加到主屏幕
   - **Android**: Chrome → 菜单 → 添加到主屏幕
3. 禁用设备休眠（保持屏幕常亮）
4. 设置为全屏模式（隐藏地址栏）

### 5. 测试验证

部署完成后，进行以下测试：

- [ ] 访问页面是否正常加载
- [ ] 网络状态显示为"在线"
- [ ] 订单数据是否正确显示
- [ ] 点击订单卡片是否能打开详情
- [ ] 状态流转操作是否正常
- [ ] WebSocket 连接是否稳定
- [ ] 催单提醒是否工作（声音+视觉）
- [ ] 离线重连是否正常

## 性能优化

### 浏览器优化

在平板浏览器中进行以下设置：

1. **禁用浏览器缓存过期检查**（已通过 Nginx 配置）
2. **启用硬件加速**
3. **清除不必要的浏览历史和缓存**

### 网络优化

1. **使用有线网络**（如果可能）
2. **配置静态 IP**（避免 DHCP 延迟）
3. **使用 5GHz WiFi**（如果使用无线）
4. **设置 QoS 优先级**（优先平板设备流量）

### 系统优化

```nginx
# Nginx 工作进程数
worker_processes auto;

# 连接数
events {
    worker_connections 1024;
}

# 启用 TCP 优化
tcp_nopush on;
tcp_nodelay on;

# 减少 keepalive 超时
keepalive_timeout 65;
```

## 监控与维护

### 日志位置

- **Nginx 访问日志**: `/var/log/nginx/access.log`
- **Nginx 错误日志**: `/var/log/nginx/error.log`
- **浏览器控制台**: 按 F12 打开开发者工具

### 健康检查

定期检查以下项目：

1. 平板设备网络连接状态
2. 后端服务健康状态
3. WebSocket 连接是否稳定
4. 内存占用是否异常

### 重启步骤

如需重启服务：

```bash
# 重启 Nginx
sudo systemctl restart nginx

# 清除浏览器缓存
# 在平板浏览器中：设置 → 清除缓存和数据

# 重新加载页面
# 在平板上刷新页面（下拉或按 F5）
```

## 故障排除

### 无法访问页面

1. 检查 Nginx 是否运行：`sudo systemctl status nginx`
2. 检查防火墙设置：`sudo ufw status`
3. 检查网络连接：`ping kitchen-tablet.local`

### 显示离线状态

1. 检查后端服务是否运行
2. 检查 WebSocket 代理配置
3. 查看浏览器控制台错误信息

### 订单数据不更新

1. 检查 WebSocket 连接状态
2. 手动刷新页面
3. 检查后端 API 是否正常

### 性能问题

1. 清除浏览器缓存
2. 检查平板内存占用
3. 重启浏览器或平板设备
4. 检查网络延迟

## 更新部署

版本更新时：

```bash
# 1. 构建新版本
npm run build

# 2. 备份当前版本
sudo cp -r /var/www/kitchen-tablet /var/www/kitchen-tablet.backup

# 3. 部署新版本
sudo cp -r dist/* /var/www/kitchen-tablet/

# 4. 清除 Nginx 缓存（如有）
sudo rm -rf /var/cache/nginx/*

# 5. 在平板上强制刷新页面（Ctrl+Shift+R 或清除缓存）
```

## 安全建议

1. **仅在局域网内访问**（不要暴露到公网）
2. **定期更新依赖**（`npm audit fix`）
3. **使用 HTTPS**（如果处理敏感数据）
4. **限制访问 IP**（Nginx allow/deny 配置）
5. **定期备份配置文件**

## 联系支持

如遇到部署问题，请提供以下信息：

- 操作系统和版本
- Nginx 版本
- 浏览器类型和版本
- 错误日志内容
- 网络配置信息
