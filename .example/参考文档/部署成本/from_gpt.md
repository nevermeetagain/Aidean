我想建站，缺少服务器、域名、监控等等，访问free-for.dev ，帮我总结有哪些免费服务，可能相关的都以表格列出来。
产品涉及了：
1. 设计论文界面，论文查重。 
2. aidean_huaweiyun 采集模型相关信源(核心)。 
3. aideanbot采集微信公众号信源(核心)。 
4. 部署测试。 
5. 融合

————————

> **论文设计/论文查重 + aidean_huaweiyun 模型信源采集 + aideanbot 微信公众号信源采集 + 部署测试 + 最终融合**

我建议不要理解成“找一个免费服务器就完事”，而应该把它拆成：

**计算资源 → 域名/DNS/CDN → Web → API/数据库 → 文件存储 → 信源采集 → 定时任务 → 搜索 → 监控/日志 → 测试/CI → 鉴权 → 邮件告警**

下面把 free-for.dev 中与你最相关的都整理出来。

---

# 一、先给你结论：真正值得关注的是这些

| 层              | 推荐关注                           | 适合你的用途                                 | 免费情况                                                                                         |
| -------------- | ------------------------------ | -------------------------------------- | -------------------------------------------------------------------------------------------- |
| **服务器**        | **Oracle Cloud Always Free**   | 跑 aidean_huaweiyun、aideanbot、融合后端、定时采集 | 🟢 长期 Always Free；A1 合计 2 OCPU / 12GB RAM，另有 200GB Block Volume；但存在闲置实例回收机制。([Oracle 文档][1]) |
| **边缘/CDN/DNS** | **Cloudflare**                 | 域名 DNS、CDN、SSL、DDoS、WAF、Workers        | 🟢 免费层；Workers 10 万请求/天，R2 10GB、D1 免费额度等。([Cloudflare开发者文档][2])                              |
| **前端部署**       | **Cloudflare Pages / Workers** | 论文网站、模型信息网站、统一门户                       | 🟢 非常合适；Pages/Workers 集成度高。([Cloudflare开发者文档][2])                                            |
| **前端备选**       | **Vercel**                     | Next.js/React 官网、论文界面                  | 🟢 Hobby 免费，有 HTTPS、CI/CD、Preview。([Vercel][3])                                              |
| **数据库**        | **Supabase**                   | 用户、论文、信源、模型、采集记录、任务状态                  | 🟢 500MB DB、1GB文件、5GB egress、50k MAU；但 Free 项目闲置一周会暂停。([Supabase][4])                        |
| **对象存储**       | **Cloudflare R2**              | PDF、论文附件、网页快照、图片、原始采集文件                | 🟢 10GB/月，100万 Class A、1000万 Class B，Internet egress 免费。([Cloudflare开发者文档][5])               |
| **搜索**         | **Algolia**                    | 模型库搜索、信源搜索、论文搜索                        | 🟢 100万 documents / 1万 searches/月。                                                           |
| **采集**         | **Firecrawl**                  | 模型官网、博客、文档、网页正文抽取                      | 🟢 1000 credits/月，约1000页面；当前无卡免费。([火爬虫][6])                                                  |
| **采集**         | **Apify**                      | 网站爬虫、复杂页面、Actor                        | 🟢 每月 $5 免费额度，不需要信用卡。([Apify][7])                                                            |
| **AI 搜索**      | **Tavily**                     | 搜模型新闻、模型发布、实时研究信息                      | 🟢 1000 API credits/月。([Tavily][8])                                                          |
| **Web 搜索**     | **Brave Search API**           | 模型新发布、新闻、网页发现                          | 🟡 每月 $5 免费额度，需要信用卡验证。([Brave][9])                                                           |
| **定时任务**       | **Cloudflare Cron**            | 每小时/每天触发采集任务                           | 🟢 Workers Cron；当前 Free 账户最多 5 个 Cron Trigger。([Cloudflare开发者文档][10])                        |
| **CI/CD**      | **GitHub Actions**             | 自动测试、构建、部署                             | 🟢 GitHub Free 私有仓库每月 2000 分钟；公共仓库标准 runner 免费。([GitHub Docs][11])                           |
| **网站监控**       | **UptimeRobot**                | 网站/API是否挂掉                             | 🟢 50 monitors / 5分钟检查。([UptimeRobot][12])                                                   |
| **综合监控**       | **Better Stack**               | Uptime + Heartbeat + Status + 日志/异常    | 🟢 10 monitors/heartbeats、1 status page；免费项目计划。([Better Stack][13])                          |
| **错误监控**       | **Bugsink / GlitchTip**        | 前后端异常、接口报错                             | 🟢 free-for.dev 有 5000 errors/月或自托管等方案。                                                      |
| **日志**         | **OpenObserve**                | 采集日志、任务日志、接口日志                         | 🟢 free-for.dev 当前列出 200GB ingestion/月、15天 retention。                                        |
| **邮件**         | **Resend**                     | 注册、采集异常、论文报告、管理员通知                     | 🟢 3000/月、100/天。([开发者免费资源][14])                                                              |
| **鉴权**         | **Supabase Auth**              | 用户注册/登录/权限                             | 🟢 直接包含在 Supabase；避免额外引入 Auth0/Clerk                                                         |
| **代码仓库**       | **GitHub**                     | 三个项目 + 融合项目 + Actions                  | 🟢 很合适；Actions 配额见上。                                                                         |

---

# 二、服务器、域名、DNS、CDN：你最先缺的基础设施

## 1. 免费服务器 / 计算资源

| 服务                           | 类型              | free-for.dev / 官方当前信息                                                    | 对你的用途                    |
| ---------------------------- | --------------- | ------------------------------------------------------------------------ | ------------------------ |
| **Oracle Cloud Always Free** | IaaS            | A1：2 OCPU + 12GB RAM；200GB Block Volume；20GB Object Storage；另有数据库、LB、监控等 | **★★★★★ 最值得研究**          |
| Google Cloud Compute Engine  | IaaS            | 1 个 e2-micro/月；30GB 标准持久盘；1GB 外网流量/月                                     | 小型 Web、备用节点              |
| Google Cloud Run             | Serverless      | 200万 requests/月                                                          | 轻量 API / Webhook / 小服务   |
| Cloudflare Workers           | Edge Serverless | 10万 requests/day，128MB，单次 CPU 10ms                                       | Webhook、轻量 API、Cron、边缘逻辑 |
| Koyeb                        | PaaS            | 官方当前 Free instance：512MB RAM、0.1 vCPU、2GB SSD；1个免费 PostgreSQL            | 小型服务/备用部署                |
| Deno Deploy                  | Edge PaaS       | free-for.dev 当前列 10万 requests/day、100GiB transfer/月                      | TypeScript 小 API         |
| Northflank                   | PaaS            | 2 services、2 cron jobs、1 DB                                              | 测试/微服务                   |
| SnapDeploy                   | PaaS            | 最多 4 containers、100 running hours/月、10 deploys/day                       | 部署测试                     |
| DigitalOcean App Platform    | Hosting         | free-for.dev 当前列 3 个静态站                                                  | 前端备用                     |
| Netlify                      | Static/PaaS     | 当前目录 300 credits/月，约 30GB bandwidth                                      | 静态前端                     |
| Vercel                       | Frontend/PaaS   | Hobby 免费，HTTPS、Preview、Functions 等                                       | **论文/模型门户前端**            |

Oracle 当前官方文档确认它的 Always Free 资源是账号生命周期内的免费资源，但有区域容量和闲置回收规则；A1 是合计 2 OCPU / 12GB RAM。([Oracle 文档][1])

Google Cloud 当前官方 Free Tier 则保留 1 个 e2-micro 和 Cloud Run 每月 200 万请求等免费额度。([Google Cloud][15])

### 对你而言，最重要的区别

**Oracle = 真正的“服务器”**

可以运行：

```text
Docker
├── Web Gateway
├── aidean_huaweiyun
├── aideanbot
├── Fusion API
├── Collector Scheduler
├── Redis / Queue
├── PostgreSQL（也可外置）
└── Monitoring Agent
```

而：

```text
Cloudflare Workers
Vercel
Netlify
Deno Deploy
```

更像是：

> **“部署代码的运行环境”**

不是传统意义上的一台 Linux VPS。

---

# 三、域名与 DNS

这是一个非常容易误解的地方。

### free-for.dev 里面真正列出的“Domain”主要是免费子域名

| 服务          | 免费内容                | 能否替代你的正式品牌域名 |
| ----------- | ------------------- | ------------ |
| DigitalPlat | 免费子域名               | ❌            |
| DNSHE       | 免费子域名、多后缀           | ❌            |
| isroot.in   | `xxx.isroot.in` 子域名 | ❌            |
| pp.ua       | `xxx.pp.ua` 子域名     | ❌            |

free-for.dev 当前 Domain 类别就列出这 4 个，全部属于免费 **subdomain**，不是让你永久拥有一个 `.com/.ai/.cn` 顶级域名。

所以你这个项目建议：

```text
正式域名：
yourdomain.com / yourdomain.ai / yourdomain.cn

                  ↓

              Cloudflare DNS
                  ↓
       ┌──────────┼───────────┐
       ↓          ↓           ↓
     Web         API        Collector
```

Cloudflare 免费层提供免费 DNS、SSL、CDN、DDoS 防护、部分 WAF/防护能力，而且支持免费域名邮箱转发等。

### DNS 免费服务

| 服务                     | 能做什么                  | 推荐度   |
| ---------------------- | --------------------- | ----- |
| **Cloudflare DNS**     | DNS + CDN + SSL + 防护  | ★★★★★ |
| deSEC                  | 免费 DNS + API + DNSSEC | ★★★★  |
| Hurricane Electric DNS | 免费 DNS                | ★★★   |
| DNSPod                 | 免费 DNS                | ★★★   |
| ClouDNS                | 1 domain / 50 records | ★★★   |
| DuckDNS                | DDNS                  | ★★    |
| Dynv6                  | DDNS/API              | ★★    |
| ZoneEdit               | DNS/DDNS              | ★★    |
| Zonomi                 | 1 DNS zone            | ★★    |

这些服务均来自 free-for.dev 当前 DNS 分类。

---

# 四、你两个“核心采集系统”最值得关注的服务

这个部分对你反而比免费服务器更重要。

你的：

```text
aidean_huaweiyun  ← 模型/AI信源
aideanbot         ← 微信公众号信源
```

都属于 **Data Acquisition Pipeline**。

我建议把采集链设计成：

```text
┌──────────────────────────────────────────┐
│             Source Discovery             │
│ Brave / Tavily / News API / RSS          │
└─────────────────┬────────────────────────┘
                  ↓
┌──────────────────────────────────────────┐
│             Fetch / Crawl                │
│ Firecrawl / Apify / 自建 HTTP crawler    │
└─────────────────┬────────────────────────┘
                  ↓
┌──────────────────────────────────────────┐
│             Parse / Normalize            │
│ HTML → Markdown → Metadata → Content     │
└─────────────────┬────────────────────────┘
                  ↓
┌──────────────────────────────────────────┐
│                Storage                   │
│ PostgreSQL + R2                          │
└─────────────────┬────────────────────────┘
                  ↓
┌──────────────────────────────────────────┐
│             Dedup / Version              │
│ URL / Hash / SimHash / Content hash      │
└─────────────────┬────────────────────────┘
                  ↓
┌──────────────────────────────────────────┐
│                Search                    │
│ PostgreSQL FTS / Algolia                 │
└──────────────────────────────────────────┘
```

---

## 1. 模型信源采集：free-for.dev 里非常有价值的一组

| 服务                   | 类型                            |                     免费额度 | 对 `aidean_huaweiyun` 的作用 |
| -------------------- | ----------------------------- | -----------------------: | ------------------------ |
| **Firecrawl**        | Crawl/Scrape/Search           |           1000 credits/月 | ★★★★★                    |
| **Apify**            | Web Scraping/Automation       |                     $5/月 | ★★★★★                    |
| **Tavily**           | AI Web Search                 |           1000 credits/月 | ★★★★★                    |
| **Brave Search API** | Web/News Search               |                     $5/月 | ★★★★★                    |
| News API             | News API                      |  100 queries/day，但文章存在延迟 | ★★★                      |
| Browse AI            | Web extraction/monitoring     |           1000 credits/月 | ★★★★                     |
| WebScraping.AI       | Scraping                      |         2000 API calls/月 | ★★★★                     |
| Simplescraper        | Scraping                      | 100 cloud scrape credits | ★★                       |
| Geekflare API        | Scrape + Screenshot + DNS/TLS |            500 credits/月 | ★★★                      |
| WrapAPI              | 网站转 API                       |              30k calls/月 | ★★★                      |
| OCR.Space            | OCR                           |        25,000 requests/月 | ★★★                      |
| Reducto              | PDF/文档解析                      |              15k credits | ★★★★                     |

free-for.dev 当前 APIs/Data/ML 分类已经包含了 Apify、Brave、Browse AI、News API、Firecrawl、OCR.Space、Reducto 等。

其中 Firecrawl 官方当前已经明确：

> 每月 1000 credits
> Scrape/Crawl/Map/Monitor 基本上每页 1 credit

也就是说 **1000 credits ≈ 1000 页基础抓取**。([火爬虫][6])

Apify 当前 Free 也是每月 $5，且无需信用卡。([Apify][7])

Tavily 当前 Free 是 1000 API credits/月，不要求信用卡。([Tavily][8])

Brave Search API 当前并不是“真正独立 Free Plan”，而是每月赠送 $5 credits；需要信用卡验证，所以我会把它归入 **有免费额度但有附加条件**。([Brave][9])

---

# 五、微信公众号采集：free-for.dev 能帮什么？

这里需要特别注意：

**free-for.dev 并没有给你提供一个“指定微信公众号名称 → 自动获得其全部历史文章/API列表”的现成解决方案。**

所以 `aideanbot` 的核心仍然是你自己的微信信源获取能力。

free-for.dev 能提供的是外围能力：

| 能力      | 服务                       | 用途                |
| ------- | ------------------------ | ----------------- |
| 定时触发    | Cloudflare Cron          | 每日/每小时执行          |
| 网页抓取    | Firecrawl                | 普通网页正文提取          |
| 复杂网页抓取  | Apify                    | 浏览器/动态网页          |
| 搜索      | Brave / Tavily           | 发现新文章             |
| HTML→文本 | Firecrawl                | 标准化               |
| OCR     | OCR.Space                | 图片型文章/扫描内容        |
| 文件解析    | Reducto                  | PDF/附件            |
| 存储      | R2                       | 原始 HTML/PDF/图片    |
| 结构化数据库  | Supabase                 | 公众号、文章、作者、发布时间、版本 |
| 搜索      | Algolia                  | 用户侧全文搜索           |
| 定时任务监控  | Better Stack/UptimeRobot | 判断采集是否失效          |

所以：

> **free-for.dev 可以把“公众号采集基础设施”几乎全部补齐，但不能替代微信特定的数据获取入口。**

这一点与你目前 `aideanbot` 遇到的问题高度相关。

---

# 六、论文设计界面

你这个部分其实很好搭。

| 服务          | 用途        | 免费情况               | 适合度   |
| ----------- | --------- | ------------------ | ----- |
| **TinyMCE** | 富文本/论文编辑器 | Core 免费、无限使用       | ★★★★★ |
| **Figma**   | UI 原型设计   | 免费层                | ★★★★★ |
| Excalidraw  | 论文流程图/架构图 | 免费                 | ★★★★  |
| Whimsical   | 流程图/线框    | 4 free boards      | ★★★   |
| Canva       | 视觉设计      | 免费层                | ★★★   |
| Zeplin      | UI交付      | 1 project          | ★★    |
| DB Designer | 数据库设计     | 2 models/10 tables | ★★★   |
| ReadTheDocs | 文档/PDF    | 免费                 | ★★★   |

TinyMCE 的核心编辑器是 free-for.dev 当前 API/Data 分类中明确列出的免费工具；Figma、Excalidraw、Whimsical 等在 Design/UI 分类。

你的论文编辑器可以设计成：

```text
┌─────────────────────────────────────┐
│ 论文标题                    保存状态 │
├──────────┬──────────────────────────┤
│ 目录     │                          │
│          │      Rich Text Editor     │
│ 摘要     │      TinyMCE              │
│ 第一章   │                          │
│ 第二章   │                          │
│ ...      │                          │
├──────────┴──────────────────────────┤
│ 字数 | 引用 | 相似度 | AI检测 | PDF   │
└─────────────────────────────────────┘
```

---

# 七、论文查重：这里是整个方案中的“短板”

这个问题需要单独说。

**free-for.dev 当前目录并没有给你一个可以直接拿来做“学术论文查重”的成熟免费核心服务。**

它能提供：

```text
PDF解析
OCR
文本处理
搜索
数据库
全文搜索
网页采集
```

但是：

```text
“论文 → 学术数据库 → 文献比对 → 相似度”
```

本身并没有一个明显可以直接替代知网/维普/Turnitin 这类学术查重数据库的免费服务。

所以你的“论文查重”最好拆成：

| 层          | 实现                         |
| ---------- | -------------------------- |
| 文本提取       | OCR.Space / Reducto / 自己解析 |
| 文本清洗       | 自己实现                       |
| 本地数据库查重    | PostgreSQL                 |
| 文本重复       | Hash / SimHash / MinHash   |
| 段落相似       | TF-IDF / BM25 / Embedding  |
| 自己的论文库     | R2 + PostgreSQL            |
| 互联网相似内容发现  | Brave / Tavily / Firecrawl |
| 学术数据库      | **另行解决**                   |
| 正式“权威查重报告” | **另行解决**                   |

这意味着：

> **论文编辑器可以很大程度免费搭出来；“真正有含金量的论文查重数据库”不是单纯靠免费基础设施解决的。**

这是你整个项目里最值得单独立项的一块。

---

# 八、PDF / 文档处理

这个对论文系统很重要。

| 服务                  |                   免费额度 | 适用                       |
| ------------------- | ---------------------: | ------------------------ |
| **OCR.Space**       |         25k requests/月 | PDF/图片 OCR               |
| **Reducto**         |            15k credits | PDF/XLSX/JPG/PPTX → JSON |
| **CustomJS**        |            600 calls/月 | PDF → Text / PNG / 合并    |
| **APITemplate**     |            50 images/月 | 图片/PDF生成                 |
| **PDFBolt**         |  500 PDF conversions/月 | PDF生成                    |
| **Ironfang Render** |          250 renders/月 | PDF/截图/图片                |
| Doppio              | 400 PDFs/screenshots/月 | PDF + Screenshot         |
| PDFMonkey           |             300 docs/月 | 模板生成 PDF                 |
| CraftMyPDF          |             100 PDFs/月 | 模板 PDF                   |

这些都来自 free-for.dev 当前 APIs/Data、Screenshot/API 等分类。([开发者免费资源][14])

---

# 九、数据库 / 数据存储

你的项目实际上至少需要：

```text
User
Paper
PaperVersion
PaperCheck
Source
Article
Model
ModelVersion
ModelProvider
CollectionTask
CollectionRun
RawDocument
DocumentVersion
SystemLog
```

所以数据库不能只按“网站用户”考虑。

| 服务                       | 免费能力                                | 用途           |
| ------------------------ | ----------------------------------- | ------------ |
| **Supabase**             | 500MB DB / 1GB storage / 50k MAU    | **最容易开发**    |
| **Cloudflare D1**        | 5m rows read/day、100k write/day、5GB | Edge 数据      |
| **Oracle Autonomous DB** | 2 个 Always Free DB；每个 20GB          | 数据量较大的免费方案   |
| CockroachDB              | 10GiB + 50m RUs/月                   | PostgreSQL 类 |
| MongoDB Atlas            | 512MB                               | MongoDB      |
| Couchbase Capella        | 8GB                                 | NoSQL        |
| Aiven                    | 1GB Postgres/MySQL/Valkey           | 小型数据库        |
| CrateDB                  | 8GB                                 | 分析型数据        |
| InfluxDB                 | 时序数据免费层                             | 监控指标         |
| MemCachier               | 25MB Memcache                       | Cache        |

free-for.dev 当前 Managed Data/IaaS 部分包含这些数据库选项。

### Supabase 当前特别值得注意

目前官方 Free：

* PostgreSQL 500MB/project
* Storage 1GB
* 50,000 MAU
* 5GB egress
* 500,000 Edge Function invocations
* 200万 Realtime messages

但 **Free 项目闲置一周会暂停**，同时只有 2 个 active Free projects。([Supabase][4])

所以它非常适合：

> 用户 + 论文 + 信源元数据 + 模型数据库

但不要把它当作：

> 海量 PDF / HTML / 图片原文件仓库。

原始文件放 **R2** 更合理。

---

# 十、对象存储 / 文件备份

| 服务                    |                     免费额度 | 适合你的内容           |
| --------------------- | -----------------------: | ---------------- |
| **Cloudflare R2**     |                10GB/月免费层 | PDF、HTML、图片、网页快照 |
| **Backblaze B2**      |                     10GB | 备份               |
| Filebase              |                      5GB | 对象存储             |
| Oracle Object Storage |         20GB Always Free | 原始资料/备份          |
| 4EVERLAND             | 6GB IPFS + 300MB Arweave | 非核心分布式存储         |
| BorgBase              |                     10GB | Borg Backup      |

Cloudflare R2 当前官方免费层是 10GB-month、100万 Class A、1000万 Class B，而且互联网出口不收费。([Cloudflare开发者文档][5])

Oracle 当前 Always Free 则有 20GB Object Storage；免费账号在试用结束后仍然保留这一 Always Free 容量。([Oracle 文档][1])

---

# 十一、融合层：API、Webhook、消息、队列

你最终的“融合”应该不是把三个项目代码硬合并，而是：

```text
                   ┌──────────────┐
                   │  Unified Web │
                   └──────┬───────┘
                          ↓
                  ┌───────────────┐
                  │   Fusion API  │
                  └──────┬────────┘
                         ↓
        ┌────────────────┼────────────────┐
        ↓                ↓                ↓
   Paper Service    Model Source      WeChat Source
        ↓                ↓                ↓
     Database        Collector         Collector
```

可以考虑这些免费能力：

| 服务                | 用途                  | 免费情况                             |
| ----------------- | ------------------- | -------------------------------- |
| **Svix**          | Webhook             | 50k messages/月                   |
| AnyHook           | Webhook relay/retry | 3000 events/月                    |
| Webhooker         | Webhook gateway     | 10k events/月                     |
| Cloudflare Queues | 消息队列                | 100万 operations/月                |
| NATS.io / Synadia | 消息总线                | 5GB data/月                       |
| CloudAMQP         | RabbitMQ            | 100万 messages/月                  |
| Trigger.dev       | 后台任务                | $5 compute credits/月 + schedules |
| Activepieces      | 自动化                 | 5000 tasks/月                     |
| Pipedream         | Workflow            | 免费工作流                            |
| Zapier            | 自动化                 | 100 tasks/月左右的免费层                |

free-for.dev 当前 PaaS/BaaS/Messaging/API 分类中都有这些组件。

对于你的系统，我反而建议：

> **先不要引入 RabbitMQ + Kafka 这一套。**

MVP 用：

```text
PostgreSQL
+
数据库任务表
+
Worker
+
Cron
```

就可以。

真正出现高并发采集之后，再换 Queue。

---

# 十二、部署与测试

## CI/CD

| 服务                 |                        免费额度/能力 | 推荐用途      |
| ------------------ | -----------------------------: | --------- |
| **GitHub Actions** |           Free 私有仓库 2000 min/月 | ★★★★★     |
| **CircleCI**       |   当前 free-for.dev 列 6000 min/月 | ★★★★      |
| Buildkite          |             5000 job minutes/月 | ★★★       |
| buddy              |  5 projects / 120 executions/月 | ★★★       |
| Codemagic          |                500 build min/月 | 移动端       |
| Bytebase           |     20 users / 10 DB instances | 数据库 CI/CD |
| Nx Cloud           | 30 contributors / 150k credits | Monorepo  |
| Trigger.dev        |                           后台任务 | ★★★★      |

GitHub 官方当前 GitHub Free 是 **2000 Actions minutes/月 + 500MB artifact storage**；公共仓库标准 GitHub-hosted runner 免费。([GitHub Docs][16])

而且 GitHub Actions 原生支持 schedule，最短调度间隔可到 5 分钟。([GitHub Docs][17])

---

## 测试

| 服务           | 用途                    |
| ------------ | --------------------- |
| Cypress      | E2E / UI              |
| Checkly      | API + E2E + Synthetic |
| Argos        | UI 截图回归               |
| Bencher      | 性能回归                  |
| BugBug       | 浏览器自动化                |
| kogiQA       | Web 自动化               |
| webhook.site | Webhook 调试            |
| Beeceptor    | Mock API              |
| flaky        | 模拟 API 异常             |

这些均出现在 free-for.dev 当前 Testing 分类。

你的项目尤其建议：

```text
Unit Test
↓
API Test
↓
Collector Test
↓
E2E
↓
Visual Regression
↓
Deploy
↓
Smoke Test
```

而不是只测试前端页面。

---

# 十三、监控：至少要监控这 5 种东西

你这个项目因为有两个“核心自动采集系统”，普通的网站 uptime 已经不够。

需要：

```text
1. Website Uptime
2. API Health
3. Collector Heartbeat
4. Error / Exception
5. Logs
```

## 监控服务

| 服务               | 免费能力                                  | 用途          |
| ---------------- | ------------------------------------- | ----------- |
| **UptimeRobot**  | 50 monitors / 5 min                   | 网站/API      |
| **Better Stack** | 10 monitors + heartbeat + status page | 综合监控        |
| AlertKick        | 10 uptime/heartbeat                   | Server      |
| Checkly          | API + browser checks                  | API/E2E     |
| Bleemeo          | 3 servers + 5 uptime                  | Server      |
| CronAlive        | Cron heartbeat                        | 采集任务        |
| Watchgoose       | 10 checks                             | Cron/Backup |
| SweetUptime      | Server/Uptime/Domain                  | 综合          |
| Datadog          | 5 nodes                               | APM         |
| Servervana       | 10 HTTP + 1 DNS + status              | 网站/DNS      |

free-for.dev 当前 Monitoring 分类就是这些方向。

UptimeRobot 官方当前确认 Free 是：

> 50 monitors
> 5-minute interval
> HTTP / ping / port / keyword / API 等核心监控

并且可以商业使用，不要求信用卡。([UptimeRobot][12])

Better Stack 当前免费项目提供：

> 10 monitors / heartbeats
> 1 status page
> 100,000 exceptions/month
> 3GB logs / 3-day retention

([Better Stack][13])

### 对你的项目尤其重要的是 Heartbeat

例如：

```text
aidean_huaweiyun
        │
        ├── 每日 06:00 开始采集
        ├── 每个 source 完成
        └── POST /heartbeat
                    ↓
              Better Stack
                    ↓
          超过 24h 没 heartbeat
                    ↓
                报警
```

这样即使：

> 网站还能打开

你也能马上知道：

> **模型采集器已经死了两天。**

---

# 十四、日志

| 服务                  |                  免费能力 | 用途    |
| ------------------- | --------------------: | ----- |
| **OpenObserve**     | 200GB ingestion/月，15天 | ★★★★★ |
| Axiom               |           0.5TB + 30天 | ★★★★  |
| Logtail             |                 1GB/月 | ★★★   |
| Logflare            |         大量 entries，3天 | ★★★   |
| Bugfender           |        100k lines/day | ★★    |
| ManageEngine Log360 |            50GB / 15天 | ★★★   |

free-for.dev 当前 Log Management 列表中已经有 OpenObserve、Axiom、Logtail 等。

---

# 十五、异常 / Bug / Crash

| 服务            | 免费情况                   | 用途                |
| ------------- | ---------------------- | ----------------- |
| **Bugsink**   | 5000 errors/月；也可自托管    | 后端异常              |
| **GlitchTip** | 1000 events/月；可自托管     | Sentry-compatible |
| Bugsnag       | 2000 errors/月          | 异常                |
| Exceptionless | 3000 events/月          | 错误+事件             |
| Honeybadger   | 12k errors/月的小团队/OSS方案 | 异常+Cron           |
| Axiom         | 日志分析                   | 日志                |

来源：free-for.dev 当前 Crash and Exception Handling 分类。

---

# 十六、安全、SSL、密钥

| 服务             | 免费能力                               | 用途                |
| -------------- | ---------------------------------- | ----------------- |
| **Cloudflare** | DNS/CDN/SSL/WAF/DDoS               | 第一层安全             |
| Semgrep        | 10 contributors / 10 private repos | SAST/SCA          |
| Aikido         | 10 repos/2 containers/1 domain     | AppSec            |
| CertPost       | 3 certificates                     | SSL 到期监控          |
| CertKit        | 3 certificates                     | SSL 管理            |
| GitGuardian    | Secret scanning                    | API Key/Secret 泄漏 |
| SnapEnv        | 3 projects / 3 members / 3 env     | 密钥管理              |

free-for.dev 当前 Security/PKI 分类包含这些。

---

# 十七、登录/用户体系

你的统一平台最终很可能需要：

```text
用户
├── 免费用户
├── 普通用户
├── 管理员
├── 数据管理员
└── 系统管理员
```

可用：

| 服务                |                    免费额度 | 说明           |
| ----------------- | ----------------------: | ------------ |
| **Supabase Auth** |            包含在 Supabase | 最省事          |
| Auth0             |                 25k MAU | 成熟           |
| Clerk             |             50k MRU/app | UI 很方便       |
| Logto             |                  5k MAU | 开源           |
| Kinde             |                7500 MAU | 简洁           |
| Descope           | 7500 active users/month | 高级鉴权         |
| Asgardeo          |                1000 MAU | SSO/MFA      |
| Authgear          |                5000 MAU | Passwordless |

数据来自 free-for.dev 当前 Authentication 分类。

对你现在的项目：

> **直接用 Supabase Auth，不要一开始再增加 Auth0/Clerk。**

---

# 十八、搜索

最终统一平台一定会需要搜索：

```text
论文搜索
模型搜索
厂商搜索
公众号搜索
文章搜索
关键词搜索
标签搜索
```

| 服务          |                           免费能力 | 适合             |
| ----------- | -----------------------------: | -------------- |
| **Algolia** | 100万 documents / 1万 searches/月 | ★★★★★          |
| Bonsai      |       1GB memory + 1GB storage | Elasticsearch类 |
| Searchly    |               2 indices / 20MB | 小规模            |
| CommandBar  |                       1000 MAU | 产品内搜索/命令栏      |

free-for.dev 当前 Search 分类见此。

不过 MVP 阶段我建议：

> **PostgreSQL Full Text Search → Algolia**

而不是第一天就引入搜索服务。

---

# 十九、分析用户行为

这个不是你第一阶段的刚需，但建站后非常有用。

| 服务                    |                     免费能力 | 用途             |
| --------------------- | -----------------------: | -------------- |
| **PostHog**           |    100万 tracked events/月 | 产品分析           |
| **Microsoft Clarity** | 无流量限制的 Session Recording | 用户行为           |
| Mixpanel              |      10万 tracked users/月 | 行为分析           |
| FullStory             |          1000 sessions/月 | Session Replay |
| LogRocket             |          1000 sessions/月 | 前端问题定位         |

free-for.dev 当前 Analytics / Visitor Recording 分类包含这些。

---

# 二十、最终我会怎么给你这套系统配

按照你现在的五类业务，我会优先考虑下面这套：

| 层                    | 方案                              |
| -------------------- | ------------------------------- |
| **域名**               | 自己购买正式域名                        |
| **DNS**              | **Cloudflare DNS**              |
| **CDN / SSL / DDoS** | **Cloudflare**                  |
| **服务器**              | **Oracle Cloud Always Free A1** |
| **Web 前端**           | Cloudflare Pages / Vercel       |
| **核心后端**             | Oracle VM Docker                |
| **数据库**              | **Supabase PostgreSQL**         |
| **文件/原始资料**          | **Cloudflare R2**               |
| **模型信源发现**           | **Tavily + Brave**              |
| **模型网页采集**           | **Firecrawl + Apify**           |
| **公众号采集**            | `aideanbot` 自有采集链               |
| **定时调度**             | Oracle Cron / Cloudflare Cron   |
| **搜索**               | PostgreSQL FTS → Algolia        |
| **论文编辑器**            | **TinyMCE**                     |
| **PDF/OCR**          | OCR.Space + Reducto             |
| **查重核心**             | 自己做 Hash/SimHash/MinHash/向量相似度  |
| **CI/CD**            | **GitHub Actions**              |
| **网站监控**             | **UptimeRobot**                 |
| **Collector 监控**     | **Better Stack Heartbeat**      |
| **错误追踪**             | Bugsink / GlitchTip             |
| **日志**               | OpenObserve                     |
| **通知邮件**             | Resend                          |
| **用户登录**             | Supabase Auth                   |
| **安全扫描**             | Semgrep                         |
| **产品分析**             | PostHog                         |
| **源码**               | GitHub                          |

这套组合的核心优势是：

```text
                  Cloudflare
       DNS / CDN / SSL / WAF / Edge
                       │
                       ▼
            ┌────────────────────┐
            │     Web Frontend   │
            └─────────┬──────────┘
                      │
                      ▼
              ┌───────────────┐
              │   Fusion API  │
              └───────┬───────┘
                      │
        ┌─────────────┼──────────────┐
        ▼             ▼              ▼
   Paper Service   Model Service   WeChat Service
        │             │              │
        │             │              │
        └─────────────┼──────────────┘
                      ▼
             ┌────────────────┐
             │ Supabase PG    │
             │ R2 Object      │
             └────────────────┘
                      ▲
                      │
             ┌────────┴─────────┐
             │ Collection Layer │
             │ Firecrawl/Apify  │
             │ Brave/Tavily     │
             └──────────────────┘

Oracle VM
 ├── aidean_huaweiyun
 ├── aideanbot
 ├── Fusion Backend
 ├── Scheduler
 └── Docker

External
 ├── UptimeRobot
 ├── Better Stack
 ├── OpenObserve
 └── GitHub Actions
```

---

# 二十一、但有一个非常重要的架构判断

你现在不要为了“全部免费”而把所有东西塞进一个平台。

我反而建议采用：

### **Oracle = 算力**

### **Cloudflare = 网络**

### **Supabase = 业务数据库**

### **R2 = 文件仓库**

### **GitHub = 代码 + CI**

### **Firecrawl/Apify = 外部采集增强**

### **Better Stack/UptimeRobot = 监控**

也就是：

```text
                Internet
                   │
              Cloudflare
                   │
       ┌───────────┴───────────┐
       │                       │
      Web                     API
       │                       │
       └───────────┬───────────┘
                   │
              Oracle VM
                   │
       ┌───────────┼─────────────┐
       ↓           ↓             ↓
  aidean_hua   aideanbot      Fusion
       │           │             │
       └───────────┼─────────────┘
                   ↓
             Supabase
                   │
                   ├── Metadata
                   ├── Users
                   ├── Papers
                   ├── Models
                   ├── Articles
                   └── Tasks
                   
                   +
                  R2
                   │
             PDF / HTML / Images
```

这样以后任何一个免费服务取消免费层，都可以替换，不至于把整个项目锁死。

---

# 二十二、特别值得你注意的三个坑

**第一，免费域名 ≠ 正式域名。**

free-for.dev 现在的 Domain 类别主要是免费子域名，不要把它当成正式品牌域名解决方案。

**第二，免费服务器 ≠ 免费数据采集。**

你的网站本身可能几乎零成本，但是：

```text
每日扫描几千网站
+
浏览器渲染
+
JS页面
+
代理
+
网页搜索
+
长期存储
```

才是真正可能产生费用的位置。

所以 `Firecrawl + Apify + Brave + Tavily` 应该做成**可替换的采集 Provider 层**，而不是写死。

**第三，论文查重才是整个系统最大的“非基础设施难点”。**

服务器、数据库、网页、PDF、OCR、监控，都已经可以通过免费层拼起来；真正的：

> **论文 → 学术知识库 → 高质量相似度 → 可解释查重报告**

不是 free-for.dev 能直接替你解决的。

---

## 最后给你一个优先级

按照你现在真正缺什么，我会这样排：

|         优先级 | 要解决的东西              | 首选                    |
| ----------: | ------------------- | --------------------- |
|          P0 | **服务器**             | Oracle Cloud          |
|          P0 | **正式域名**            | 自购域名                  |
|          P0 | **DNS / SSL / CDN** | Cloudflare            |
|          P0 | **两个采集系统部署**        | Oracle + Docker       |
|          P0 | **数据库**             | Supabase              |
|          P0 | **原始数据存储**          | R2                    |
|          P0 | **采集失败监控**          | Better Stack          |
|          P0 | **部署测试**            | GitHub Actions        |
|          P1 | 模型信源搜索              | Tavily + Brave        |
|          P1 | 模型网页采集              | Firecrawl + Apify     |
|          P1 | 论文编辑器               | TinyMCE               |
|          P1 | PDF/OCR             | OCR.Space + Reducto   |
|          P1 | 全文搜索                | PostgreSQL → Algolia  |
|          P1 | 登录                  | Supabase Auth         |
|          P1 | 错误监控                | Bugsink/GlitchTip     |
|          P2 | 产品分析                | PostHog + Clarity     |
| **P0/P1专项** | **论文查重数据库与算法**      | **单独设计，不要直接套免费 SaaS** |

**原始目录：** [free-for.dev 当前目录](https://free-for.dev/?utm_source=chatgpt.com)
free-for.dev 的完整源码目录也明确列出了 Cloud、BaaS、CI/CD、Monitoring、DNS、Domain、Search、Storage、Testing、Web Hosting 等类别。

如果把你的这几个项目真正落地，我会把下一步直接做成一张 **“0 元/低成本部署架构采购表”**：精确到「注册什么账号 → 哪个服务免费 → 哪个项目放哪里 → 域名怎么接 → 3 个现有项目怎么部署 → 数据库怎么分 → 监控怎么接 → 哪些地方以后最容易产生费用」，这样就可以直接照表搭。

[1]: https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm?trk=public_post_comment-text "Always Free Resources"
[2]: https://developers.cloudflare.com/workers/platform/pricing/?utm_source=chatgpt.com "Pricing · Cloudflare Workers docs"
[3]: https://vercel.com/docs/plans/hobby?utm_source=chatgpt.com "Vercel Hobby Plan"
[4]: https://supabase.com/docs/guides/platform/billing-on-supabase?utm_source=chatgpt.com "About billing on Supabase | Supabase Docs"
[5]: https://developers.cloudflare.com/r2/pricing/?utm_source=chatgpt.com "Pricing · Cloudflare R2 docs"
[6]: https://www.firecrawl.dev/pricing?dub_id=Ntqjr3kko37KTFVB&via=lokesh-kapoor&utm_source=chatgpt.com "Pricing | Firecrawl"
[7]: https://apify.com/pricing?utm_source=chatgpt.com "Apify pricing - flexible plan + pay as you go · Apify"
[8]: https://www.tavily.com/pricing?utm_source=chatgpt.com "Tavily"
[9]: https://brave.com/search/api/?utm_source=chatgpt.com "Brave Search API | Brave"
[10]: https://developers.cloudflare.com/workers/configuration/cron-triggers/?utm_source=chatgpt.com "Cron Triggers · Cloudflare Workers docs"
[11]: https://docs.github.com/en/billing/concepts/product-billing/github-actions?utm_source=chatgpt.com "GitHub Actions billing - GitHub Docs"
[12]: https://uptimerobot.com/pricing/?utm_source=chatgpt.com "Plans & Pricing | UptimeRobot"
[13]: https://betterstack.com/pricing?utm_source=chatgpt.com "Pricing | Better Stack"
[14]: https://free-for.dev/?utm_source=chatgpt.com "Free for Developers"
[15]: https://cloud.google.com/free?utm_source=chatgpt.com "Free Trial and Free Tier Services and Products | Google Cloud"
[16]: https://docs.github.com/en/billing/reference/product-usage-included?utm_source=chatgpt.com "Product usage included with each plan - GitHub Docs"
[17]: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax?utm_source=chatgpt.com "Workflow syntax for GitHub Actions - GitHub Docs"
