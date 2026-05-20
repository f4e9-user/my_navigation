# Cloudflare 系统入口导航站

一个 Next.js 全栈 MVP：后端从 Cloudflare 自动同步 DNS Records 与 Tunnel Public Hostnames，前端只展示管理员确认公开的系统入口。

## 安全边界

公开首页与 `/api/public/assets` 只返回：

- 系统名称
- 子域名
- 访问链接
- 分类 / 标签
- 简短说明
- icon

不会返回：

- Cloudflare Account ID
- API Token
- DNS 目标值
- Tunnel service
- 内部端口 / 内部服务地址
- 同步日志

新发现资产默认 `isVisible=false`，必须由管理员确认后才展示。

## 技术栈

- Next.js App Router
- Prisma + SQLite
- Tailwind CSS
- Cloudflare API

## 初始化

```bash
cp .env.example .env
# 编辑 .env，填入真实 Cloudflare 配置
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

## 环境变量

```bash
DATABASE_URL="file:./dev.db"
CLOUDFLARE_ACCOUNT_ID="xxx"
CLOUDFLARE_API_TOKEN="xxx"
ALLOWED_ROOT_DOMAINS="example.com,example.net"
SYNC_INTERVAL_MINUTES="60"
```

Cloudflare API Token 最小权限建议：

- Zone:Read
- DNS:Read
- Cloudflare Tunnel:Read
- Zero Trust:Read

`ALLOWED_ROOT_DOMAINS` 是安全边界：只同步明确允许的根域名。

## 页面

- `/`：公开系统入口导航页
- `/admin/assets`：管理页，查看同步资产与可见状态

## API

公开接口：

```http
GET /api/public/assets
```

只返回展示字段。

管理员接口：

```http
POST /api/admin/sync/cloudflare
GET /api/admin/assets
PATCH /api/admin/assets/:id/profile
```

`PATCH /api/admin/assets/:id/profile` body 示例：

```json
{
  "displayName": "管理后台",
  "description": "业务管理后台",
  "category": "生产系统",
  "icon": "⚙️",
  "sortOrder": 10,
  "isVisible": true
}
```

## 手动同步

```bash
npm run sync:cloudflare
```

同步逻辑：

1. 读取服务端环境变量。
2. 拉取 Cloudflare Zones，仅保留 `ALLOWED_ROOT_DOMAINS`。
3. 拉取每个 Zone 的 DNS records。
4. 拉取 Cloudflare Tunnels 与 configuration ingress。
5. 只保留等于 root domain 或以 `.root_domain` 结尾的 hostname。
6. 同 hostname 合并 DNS/Tunnel 来源。
7. 写入数据库：新资产创建 profile 且默认不可见；旧资产更新同步字段。
8. 本次未出现的资产标记 `removedAt`，不立即删除。

## 后续建议

生产使用前建议补充：

- Admin 鉴权，例如 Basic Auth、OIDC、Cloudflare Access 或 NextAuth。
- 定时任务，例如 cron 调 `npm run sync:cloudflare` 或部署平台 scheduled job。
- 同步日志表，但不要暴露到公开前端。
