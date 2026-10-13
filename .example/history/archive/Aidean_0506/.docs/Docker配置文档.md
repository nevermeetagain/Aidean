# Aidean Docker 配置文档（3核心产品）

> 项目名：Aidean（曾用名：AigcLadderDiagram）
> 版本：v2.0 | 更新日期：2026-05-06
> **重要**：所有Docker镜像必须使用国内源，国外环境访问不通
> **3产品**：Aidean（天梯图）/ AideanSpace（工具管理）/ Sphere（知识库+数字分身）

---

## 一、Docker 镜像配置（国内源）

### 1.1 核心服务镜像

| 服务 | 官方镜像 | 国内镜像（阿里云示例） | 说明 |
|---|---|---|---|
| **PostgreSQL** | postgres:15 | registry.cn-hangzhou.aliyuncs.com/library/postgres:15 | 主数据库，7个命名空间52张表 |
| **Redis** | redis:7 | registry.cn-hangzhou.aliyuncs.com/library/redis:7 | 页面ISR缓存 + API响应缓存 |
| **Node.js** | node:20-alpine | registry.cn-hangzhou.aliyuncs.com/library/node:20-alpine | Next.js 14 应用运行时 |
| **Nginx** | nginx:alpine | registry.cn-hangzhou.aliyuncs.com/library/nginx:alpine | 反向代理 + SSL终止 |
| **RAGFlow** | ragflow:latest | registry.cn-hangzhou.aliyuncs.com/infiniflow/ragflow:latest | 知识库系统（Sphere产品） |

### 1.2 镜像源配置原则

> **铁律**：国外环境访问不通，所有`docker-compose.yml`必须配置`image:`使用国内镜像源。

**配置方法**：
1. 在`docker-compose.yml`中，每个服务指定`image:`为国内镜像
2. 不要依赖Docker daemon的镜像加速器（可能无效）
3. 在`.env`文件中不要配置镜像地址（镜像地址写在compose文件中）

**示例**：
```yaml
services:
  postgres:
    image: registry.cn-hangzhou.aliyuncs.com/library/postgres:15
    # 不要写 image: postgres:15
```

---

## 二、Docker Compose 配置（3产品共享）

### 2.1 完整 docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: registry.cn-hangzhou.aliyuncs.com/library/postgres:15
    container_name: aidean-postgres
    environment:
      POSTGRES_USER: root
      POSTGRES_PASSWORD: NewPassword123!
      POSTGRES_DB: aidean
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/postgres:/etc/postgres
    ports:
      - "5432:5432"
    networks:
      - aidean-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U root"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: registry.cn-hangzhou.aliyuncs.com/library/redis:7
    container_name: aidean-redis
    command: redis-server /etc/redis/redis.conf
    volumes:
      - redis_data:/data
      - ./docker/redis:/etc/redis
    ports:
      - "6379:6379"
    networks:
      - aidean-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  nginx:
    image: registry.cn-hangzhou.aliyuncs.com/library/nginx:alpine
    container_name: aidean-nginx
    volumes:
      - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./docker/nginx/proxy.conf:/etc/nginx/proxy.conf
      - ./docker/nginx/ssl:/etc/nginx/ssl
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - aidean
      - space
      - sphere
    networks:
      - aidean-network

  aidean:
    image: registry.cn-hangzhou.aliyuncs.com/library/node:20-alpine
    container_name: aidean-app
    build:
      context: .
      dockerfile: ./docker/app/Dockerfile
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://root:NewPassword123!@postgres:5432/aidean
      - REDIS_URL=redis://redis:6379
      - PORT=3000
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - aidean-network
    restart: unless-stopped

  space:
    image: registry.cn-hangzhou.aliyuncs.com/library/node:20-alpine
    container_name: aidean-space
    build:
      context: .
      dockerfile: ./docker/app/Dockerfile
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://root:NewPassword123!@postgres:5432/aidean
      - REDIS_URL=redis://redis:6379
      - PORT=3001
    ports:
      - "3001:3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - aidean-network
    restart: unless-stopped

  sphere:
    image: registry.cn-hangzhou.aliyuncs.com/library/node:20-alpine
    container_name: aidean-sphere
    build:
      context: .
      dockerfile: ./docker/app/Dockerfile
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://root:NewPassword123!@postgres:5432/aidean
      - REDIS_URL=redis://redis:6379
      - PORT=3002
    ports:
      - "3002:3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - aidean-network
    restart: unless-stopped

networks:
  aidean-network:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
```

### 2.2 3产品端口规划

| 产品 | 容器名 | 内部端口 | 外部映射 | 说明 |
|---|---|---|---|---|
| **Aidean** | aidean-app | 3000 | 3000 | 大模型天梯图 |
| **AideanSpace** | aidean-space | 3000 | 3001 | AI Skills/MCP工具管理 |
| **Sphere** | aidean-sphere | 3000 | 3002 | 知识库+数字分身 |
| **Nginx** | aidean-nginx | 80/443 | 80/443 | 反向代理 + SSL终止 |
| **PostgreSQL** | aidean-postgres | 5432 | 5432 | 主数据库 |
| **Redis** | aidean-redis | 6379 | 6379 | 缓存服务 |

---

## 三、Nginx 反向代理配置

### 3.1 主配置（nginx.conf）

```nginx
events {
    worker_connections 1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;
    
    # Gzip压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # 上游服务器
    upstream aidean_upstream {
        server aidean:3000;
    }
    
    upstream space_upstream {
        server space:3001;
    }
    
    upstream sphere_upstream {
        server sphere:3002;
    }
    
    # HTTP重定向到HTTPS
    server {
        listen 80;
        server_name aidean.com www.aidean.com space.aidean.com sphere.aidean.com;
        return 301 https://$host$request_uri;
    }
    
    # Aidean产品（天梯图）
    server {
        listen 443 ssl http2;
        server_name aidean.com www.aidean.com;
        
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        
        location / {
            proxy_pass http://aidean_upstream;
            include /etc/nginx/proxy.conf;
        }
    }
    
    # AideanSpace产品（工具管理）
    server {
        listen 443 ssl http2;
        server_name space.aidean.com;
        
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        
        location / {
            proxy_pass http://space_upstream;
            include /etc/nginx/proxy.conf;
        }
    }
    
    # Sphere产品（知识库+数字分身）
    server {
        listen 443 ssl http2;
        server_name sphere.aidean.com;
        
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        
        location / {
            proxy_pass http://sphere_upstream;
            include /etc/nginx/proxy.conf;
        }
    }
}
```

### 3.2 代理通用配置（proxy.conf）

```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;

proxy_connect_timeout 60s;
proxy_send_timeout 60s;
proxy_read_timeout 60s;

proxy_buffering off;
proxy_request_buffering off;
```

---

## 四、应用 Dockerfile

### 4.1 Next.js 多阶段构建（docker/app/Dockerfile）

```dockerfile
# Stage 1: 依赖安装
FROM registry.cn-hangzhou.aliyuncs.com/library/node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm config set registry https://registry.npmmirror.com
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Stage 2: 构建
FROM registry.cn-hangzhou.aliyuncs.com/library/node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm config set registry https://registry.npmmirror.com
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npm run build

# Stage 3: 生产运行
FROM registry.cn-hangzhou.aliyuncs.com/library/node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/.next/ ./.next/
COPY --from=builder /app/node_modules/ ./node_modules/
COPY --from=builder /app/package.json ./
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/public/ ./public/

EXPOSE 3000
CMD ["node", ".next/standalone/server.js"]
```

---

## 五、数据库初始化

### 5.1 PostgreSQL 配置（docker/postgres/）

**初始化脚本**（init.sql）：
```sql
-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- 模糊搜索

-- 设置默认权限
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO public;
```

**备份脚本**（backup.sh）：
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U root aidean > /backup/aidean_$DATE.sql
echo "Backup completed: aidean_$DATE.sql"
```

---

## 六、Redis 配置（docker/redis/）

**redis.conf**：
```conf
# 基本配置
bind 0.0.0.0
port 6379
requirepass NewPassword123!

# 内存管理
maxmemory 512mb
maxmemory-policy allkeys-lru

# 持久化
appendonly yes
appendfsync everysec

# 日志
loglevel notice
logfile /data/redis.log
```

---

## 七、环境变量配置（.env）

### 7.1 .env.example（提交到仓库）

```bash
# ===========================================
# Aidean 项目 — 环境变量配置示例
# 复制此文件为 .env.local 并填入实际值
# ===========================================

# ----- 应用配置 -----
NODE_ENV=production
PORT=3000
APP_URL=https://aidean.com
APP_NAME=Aidean

# ----- 数据库（PostgreSQL）-----
DATABASE_URL=postgresql://root:NewPassword123!@postgres:5432/aidean
# 格式：postgresql://[用户名]:[密码]@[主机]:[端口]/[数据库名]

# ----- Redis -----
REDIS_URL=redis://:NewPassword123!@redis:6379
REDIS_PASSWORD=NewPassword123!

# ----- JWT 认证 -----
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# ----- 微信公众号 -----
WECHAT_APP_ID=
WECHAT_APP_SECRET=
WECHAT_TOKEN=

# ----- 支付（v1.2 启用） -----
WECHAT_PAY_MCH_ID=
WECHAT_PAY_API_KEY=
ALIPAY_APP_ID=
ALIPAY_PRIVATE_KEY=

# ----- HuggingFace（国内镜像）-----
HF_ENDPOINT=https://hf-mirror.com
HF_HUB_ENABLE_HF_TRANSFER=1

# ----- RAGFlow（Sphere产品）-----
RAGFLOW_IMAGE=registry.cn-hangzhou.aliyuncs.com/infiniflow/ragflow:latest
```

---

## 八、健康检查与监控

### 8.1 健康检查端点

| 端点 | 说明 | 响应 |
|---|---|---|
| `/api/v1/system/health` | 系统健康检查 | `{"status": "ok", "db": true, "redis": true}` |
| `/api/v1/system/stats` | 系统统计信息 | `{"users": 1000, "models": 500, "skills": 200}` |

### 8.2 日志配置

| 服务 | 日志路径 | 说明 |
|---|---|---|
| **Next.js** | 标准输出（docker logs） | 应用日志 |
| **PostgreSQL** | /var/log/postgresql/ | 数据库日志 |
| **Redis** | /data/redis.log | Redis日志 |
| **Nginx** | /var/log/nginx/ | 访问日志 + 错误日志 |

---

**文档版本**：v2.0 | **生成日期**：2026-05-06 | **作者**：AI助手
