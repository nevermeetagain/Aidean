# 生产部署 Runbook（#2 生产部署实弹）

> 版本: v1.0 | 更新: 2026-09-17 | 适用: Ubuntu 24.04 + Docker

## 前置条件

- [ ] Ubuntu 24.04 服务器（≥4C/8G/100G SSD）
- [ ] Docker 24+ / Docker Compose v2
- [ ] 域名 + SSL 证书（Let's Encrypt 或商业证书）
- [ ] 微信/支付宝商户凭据（见《支付渠道集成指南》）
- [ ] SMTP 邮件服务（用于管理员通知）

## 部署步骤

### 1. 克隆仓库

```bash
git clone https://github.com/CodingHeader/Aidean.git
cd Aidean
```

### 2. 配置环境变量

```bash
cp docker/.env.example docker/.env
# 编辑 docker/.env，填入以下必填项：
```

| 变量 | 说明 | 示例 |
|---|---|---|
| `POSTGRES_PASSWORD` | 数据库密码（强密码） | `<随机32字符>` |
| `REPLICATOR_PASSWORD` | 复制账号密码 | `<随机32字符>` |
| `JWT_SECRET` | JWT 签名密钥（≥32字符） | `<随机64字符>` |
| `NEXT_PUBLIC_SITE_URL` | 站点 URL | `https://aidean.com` |
| `REDIS_URL` | Redis 连接（容器内网） | `redis://redis:6379` |
| `DATABASE_URL` | 数据库连接（容器内网） | `postgresql://root:<pw>@postgres-primary:5432/aidean?schema=public` |
| `AIDEAN_ENABLE_MOCK_UPSTREAM` | **生产必须留空或删** | — |
| `WECHAT_APP_ID` / `WECHAT_MCH_ID` / `WECHAT_API_KEY` | 微信支付凭据（#5） | — |
| `ALIPAY_APP_ID` / `ALIPAY_PRIVATE_KEY` / `ALIPAY_PUBLIC_KEY` | 支付宝凭据（#6） | — |

### 3. 启动基础设施

```bash
cd docker
docker compose -f docker-compose.prod.yml up -d postgres-primary redis
# 等待 postgres 健康
docker compose -f docker-compose.prod.yml ps  # 确认 healthy
```

### 4. 数据库初始化

```bash
cd ../apps/web
npx prisma migrate deploy    # 应用全部迁移（0000-0003）
npx prisma db seed           # 灌入种子数据
npx prisma generate          # 生成 Client
```

### 5. 构建并部署 Web

```bash
# ⚠️ Node.js v24 上须 TURBOPACK=1（webpack 在 v24 挂起）
TURBOPACK=1 npx next build   # 生产构建 → .next/standalone/
# 复制 static/public 到 standalone
cp -r .next/static .next/standalone/apps/web/.next/static
cp -r public .next/standalone/apps/web/public
```

### 6. 启动 Web + Nginx

```bash
cd docker
docker compose -f docker-compose.prod.yml up -d web nginx
docker compose -f docker-compose.prod.yml ps  # 全部 healthy
```

### 7. 验证

```bash
# 基本冒烟
curl -s https://your-domain/api/v1/system/health | jq .code  # 应为 0
curl -s https://your-domain/ | head -5                       # 应返回 HTML

# 鉴权验证
curl -s -X POST https://your-domain/api/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"admin@aidean.com","password":"Admin123!@#"}' | jq .code  # 应为 0

# 网关验证（需 API Key）
curl -s https://your-domain/api/v1/gateway/chat \
  -H 'Authorization: Bearer aid_ak_fake' | jq .code  # 应为 10004（无效 Key）
```

## 备份策略（#3）

```bash
# 每日备份（crontab）
0 2 * * * cd /opt/Aidean && bash scripts/db/backup.sh aidean

# 恢复（紧急）
bash scripts/db/restore.sh docker/postgres/backups/aidean_20260917_020000.dump aidean
```

## 回滚

```bash
# 回滚到上一版本
git checkout <previous-commit>
TURBOPACK=1 npx next build
# 重启 web 容器
docker compose -f docker-compose.prod.yml restart web
```

## 监控

- `docker compose -f docker-compose.prod.yml logs -f web` — 应用日志
- `docker compose -f docker-compose.prod.yml logs -f postgres-primary` — 数据库日志
- `/api/v1/system/health` — 健康检查端点
- Redis: `redis-cli -h redis ping` — 缓存可用性

## 已知限制

1. **Node.js v24 + webpack 挂起**：必须 `TURBOPACK=1 next build`（dev 同理）
2. **`prisma generate` EPERM**：web 进程锁 query_engine dll → 停 web 后 generate
3. **支付渠道**：生产环境未接入真实支付（见《支付渠道集成指南》）
