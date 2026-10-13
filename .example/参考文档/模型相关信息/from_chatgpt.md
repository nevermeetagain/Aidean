可以，而且这个需求非常适合做成 **Ubuntu 上每天跑一次的“AI 情报采集器”**。但你最好不要把所有信息都塞进一个来源里，因为：

**“新模型出现”**和**“新提供商/中转站出现”**是两种完全不同的数据问题。

我建议明确拆成下面两个采集池。

---

# 1. 采集模型

你的目标应该定义成：

> 每天发现“昨天不存在、今天新出现/新上线”的模型，并记录模型名称、厂商、模型 ID、发布时间、能力、上下文、价格、API 可用情况、托管渠道。

这里最重要的是：**“发现时间”和“官方发布/创建时间”必须分开保存。**

例如 OpenRouter 当前 `/api/v1/models` 会返回 `created` Unix 时间戳、模型 ID、描述、上下文长度、模态、价格、能力参数等；当前数据里已经能看到 2026-09-28 新进入目录的 Claude Sonnet 5.5 等模型。

## A. OpenRouter —— 我最推荐作为“每日新模型总入口”

**用途：★★★★★**

官方接口：

```text
GET https://openrouter.ai/api/v1/models
```

它的优势非常适合你的需求：

| 能力                    | 情况       |
| --------------------- | -------- |
| 模型发现                  | ✅        |
| `created` 时间          | ✅        |
| 模型 ID                 | ✅        |
| 厂商                    | ✅        |
| 输入/输出价格               | ✅        |
| Cache 价格              | ✅        |
| 上下文长度                 | ✅        |
| 输入/输出模态               | ✅        |
| reasoning / tools 等能力 | ✅        |
| API Provider          | ✅        |
| Ubuntu curl           | ✅        |
| 每日 diff               | **非常适合** |

官方文档明确提供 `/api/v1/models`；模型数据包含 `created`、`pricing`、`architecture`、`supported_parameters` 等字段。([OpenRouter][1])

而且 OpenRouter 还有：

```text
GET /api/v1/models/{author}/{slug}/endpoints
```

可以进一步查看**某个模型到底被哪些 provider 提供，以及各 provider 的 endpoint 信息**。([OpenRouter][2])

### 对你最有价值的地方

你每天做：

```text
昨天模型快照
        ↓
今天 OpenRouter /models
        ↓
按 model id 做 diff
        ↓
新增模型
        ↓
进一步查询 endpoints
        ↓
得到 provider + 价格
```

这样一天只需要采集一次。

---

# B. Hugging Face —— “开源新模型”核心入口

**用途：★★★★★**

这是你必须长期采集的第二个源。

Hugging Face 官方 Hub API/CLI 可以按照：

```text
created_at
last_modified
downloads
likes
trending_score
```

排序。

当前 `hf models list` CLI 甚至直接支持：

```bash
hf models ls --sort created_at --limit 100
```

并可以拿到：

```text
createdAt
lastModified
author
downloads
likes
tags
pipeline_tag
inferenceProviderMapping
```

等数据。([Hugging Face][3])

这意味着 Ubuntu 上可以直接：

```bash
hf models ls --sort created_at --limit 200
```

或者使用 Python：

```python
from huggingface_hub import HfApi

api = HfApi()

models = api.list_models(
    sort="created_at",
    direction=-1,
    limit=200
)

for m in models:
    print(m.id, m.created_at)
```

### 它和 OpenRouter 的区别

OpenRouter：

> **模型已经被 API 市场/路由平台收录**

Hugging Face：

> **模型仓库刚刚出现**

因此可能出现：

```text
Hugging Face
    ↓
今天有人发布模型
    ↓
OpenRouter
    ↓
明天/后天才上线
```

所以两者做 diff 非常有价值。

---

# C. Replicate —— 图片 / 视频 / 音频模型尤其重要

**用途：★★★★★**

如果你不仅关注 LLM，而是你之前一直关注的：

* 图片
* 视频
* TTS
* ASR
* 音乐
* 多模态

那么 Replicate 非常重要。

官方 API：

```text
GET https://api.replicate.com/v1/models
```

而且它直接支持按：

```text
model_created_at
latest_version_created_at
```

排序。

也就是说可以直接：

> 找“最近创建的模型”。

官方还提供：

```text
GET /v1/models/{owner}/{name}
GET /v1/models/{owner}/{name}/versions
GET /v1/search
```

用于进一步获取模型和版本信息。([Replicate][4])

Replicate 当前 Explore 页面也明确把大量官方模型按“Latest / Official models”展示，并覆盖图片、视频、音频等类别。([Replicate][5])

### 特别适合发现

```text
新视频模型
新图片模型
新语音模型
新音乐模型
小众开源模型
```

这部分仅靠 OpenRouter/Hugging Face 会漏掉不少。

---

# D. ModelScope —— 国产/中文生态非常重要

**用途：★★★★☆**

如果你要监控中国开源模型，这个应该加入。

ModelScope 目前已经提供官方 Python SDK/CLI：

```bash
ms-hub
```

或者 Python：

```python
from modelscope_hub import HubApi

api = HubApi(...)
```

官方 SDK 当前已经采用 OpenAPI-first 的方式，并提供：

```text
list_repos()
```

用于分页查看：

```text
model
dataset
studio
skill
mcp
```

等资源；官方项目当前版本也明确支持 Ubuntu/CLI 自动化场景。([GitHub][6])

所以：

```text
Hugging Face
+
ModelScope
```

基本构成了你需要的：

> **全球开源模型 + 中国开源模型**

两套模型发现入口。

---

# E. Artificial Analysis —— “模型出现 + 价格 + 性能”的高级数据源

**用途：★★★★★**

如果只是“发现新模型”，它不是最廉价的方案；但如果你的最终目标是建立：

> **AI 模型数据库**

它非常有价值。

官方 Data API 提供：

* 模型身份
* creator
* 发布时间
* 模态
* context
* licensing
* Input price
* Output price
* cache price
* latency
* throughput
* benchmarks
* provider
* provider-level pricing
* provider performance
* 时间序列

而且 API 是结构化 JSON。([Artificial Analysis][7])

例如：

```bash
curl "https://artificialanalysis.ai/api/v2/language/models" \
  -H "x-api-key: YOUR_API_KEY"
```

官方目前 Free API 每 24 小时 100 次请求；Pro 500 次；Provider 级数据属于 Commercial。([Artificial Analysis][7])

### 它特别适合做

```text
OpenRouter发现模型
        ↓
Artificial Analysis补全
        ↓
价格
性能
Benchmark
Provider
上下文
```

所以它不是单纯的“发现源”，而是非常优秀的**模型数据标准化层**。

---

# F. Models.dev —— 免费的结构化模型/价格数据库

**用途：★★★★★**

这个我很建议你关注，因为它非常符合你的：

> Ubuntu + 自动化 + 数据库

路线。

Models.dev 是开源数据库，定位就是：

> AI model specifications + pricing + capabilities

并且官方提供：

```bash
curl https://models.dev/api.json
curl https://models.dev/models.json
```

同时也有 GitHub 数据仓库。([GitHub][8])

它的价值不是“新闻”，而是：

```text
模型
→ 标准化 Model ID
→ provider
→ pricing
→ capabilities
```

### 非常适合做你的标准化数据层

例如：

```text
OpenRouter
Hugging Face
ModelScope
Replicate
        ↓
    Normalizer
        ↓
     Models.dev
        ↓
   你的数据库
```

---

# G. LiteLLM Model Pricing Database

**用途：★★★★☆**

LiteLLM 仓库里维护：

```text
model_prices_and_context_window.json
```

包含大量模型的：

* provider
* model
* input cost
* output cost
* context window
* cache
* 特殊计费方式

当前仓库仍在更新。([GitHub][9])

它特别适合作为：

> **价格交叉验证源**

而不是“第一发现源”。

也就是说：

```text
OpenRouter发现：
gpt-X

LiteLLM确认：
这个模型标准价格是多少
```

---

# H. 各大模型厂商官方发布页 —— 最终真实性验证

这一层非常重要。

因为：

> OpenRouter `created`
>
> ≠
>
> 官方首次发布日。

例如一个模型可能：

```text
9月20日官方发布
9月21日 Hugging Face 出现
9月22日 Replicate 上线
9月23日 OpenRouter 收录
```

如果你只记录 OpenRouter，就会把 9 月 23 日误认为发布时间。

因此最终应该有：

### OpenAI

官方模型 / Pricing 页面直接列最新模型与 API 价格。([OpenAI Developers][10])

### Google

Gemini Models 页面直接列：

* Stable
* Preview
* Deprecated
* Endpoint
* New

等状态。([Google AI][11])

### xAI

官方 News 页面会发布新模型及价格；例如 2026-09-21 的 Grok 4.7 页面同时说明了模型发布、API 可用性和价格。([SpaceXAI][12])

其余应该长期监控：

```text
Anthropic
DeepSeek
Qwen / Alibaba
Z.ai / 智谱
Moonshot / Kimi
MiniMax
ByteDance
Tencent
Baidu
Mistral
Meta
Cohere
NVIDIA
```

### 这一层不是用来“大量抓数据”

而是：

> **给“今天新增模型”做最终官方证据。**

---

# 1 部分：模型采集渠道汇总

| 渠道                      |     新模型发现 | 发布时间 |  价格 | Provider | 图片/视频/音频 | Ubuntu |    API/CLI |      推荐等级 |
| ----------------------- | --------: | ---: | --: | -------: | -------: | -----: | ---------: | --------: |
| **OpenRouter**          |       ✅✅✅ |    ✅ |   ✅ |       ✅✅ |       部分 |      ✅ |        API | **★★★★★** |
| **Hugging Face**        |       ✅✅✅ |    ✅ |  部分 |        ✅ |       ✅✅ |      ✅ |    API/CLI | **★★★★★** |
| **Replicate**           |       ✅✅✅ |    ✅ |  部分 |        ✅ |      ✅✅✅ |      ✅ |        API | **★★★★★** |
| **ModelScope**          |        ✅✅ | ✅/部分 |  部分 |       部分 |       ✅✅ |      ✅ |    API/CLI | **★★★★☆** |
| **Artificial Analysis** |        ✅✅ |    ✅ | ✅✅✅ |      ✅✅✅ |        ✅ |      ✅ |        API | **★★★★★** |
| **Models.dev**          | ✅/快照 diff |   部分 | ✅✅✅ |       ✅✅ |       部分 |      ✅ |   API/JSON | **★★★★★** |
| **LiteLLM**             |      diff |   部分 |  ✅✅ |       ✅✅ |       部分 |      ✅ |        Git | **★★★★☆** |
| **官方厂商发布页**             |       ✅✅✅ |  ✅✅✅ | ✅✅✅ |        ✅ |      视厂商 |      ✅ | Web/RSS/爬取 | **★★★★★** |

---

# 2. 采集提供商和中转站

这一部分与第一部分完全不同。

你真正想知道的其实是：

```text
谁在提供模型？
谁今天新增了？
谁开始提供某个新模型？
谁降价了？
谁涨价了？
谁是官方 Provider？
谁是推理托管商？
谁是 Gateway？
谁是中转站？
```

所以我建议拆成三层。

---

## A. OpenRouter —— Provider 发现的第一入口

**用途：★★★★★**

这个其实非常强。

官方：

```text
GET /api/v1/providers
```

会返回：

```text
name
slug
headquarters
privacy policy
terms
datacenters
status page
```

等 provider 信息。([OpenRouter][13])

目前 OpenRouter 的 Provider 页面已经能看到 **88 个 provider**，例如：

* OpenAI
* Tencent Cloud
* NovitaAI
* DeepInfra
* NVIDIA
* Xiaomi
* 等。([OpenRouter][14])

因此你完全可以每天：

```text
provider_snapshot_2026-09-28.json
provider_snapshot_2026-09-29.json
                 ↓
                diff
                 ↓
      new_provider_today
```

这就能自动发现：

> **今天 OpenRouter 新增了哪些 Provider。**

---

# B. OpenRouter Endpoint —— 找“谁在卖这个模型”

这甚至比 `/providers` 更重要。

例如：

```text
OpenAI GPT-X
```

不能只记录：

```text
provider = OpenAI
```

因为实际上可能出现：

```text
OpenAI
Azure
AWS
Together
Fireworks
DeepInfra
Novita
NVIDIA
……
```

同一个模型可能由多个推理供应商提供。

OpenRouter 的 endpoint API 能获取：

```text
model
provider_name
pricing
context
performance
uptime
```

等信息。官方 endpoint 返回结构中就包含 `provider_name`、`pricing`、`throughput`、`latency`、`uptime` 等字段。([OpenRouter][15])

所以你可以形成：

```text
模型
 ↓
Provider矩阵
 ↓
每个Provider的价格
 ↓
性能
 ↓
可用性
```

这是做**服务商监控**非常好的数据。

---

# C. Artificial Analysis —— Provider 数据库

这个在供应商层面同样非常强。

它的商业 API 已经直接提供：

```text
GET /api/v2/language/providers
```

返回：

```text
provider
country
models
pricing
performance
```

官方文档给出的 provider 数据示例就是：

```text
Together.ai
DeepSeek V3
pricing
output speed
TTFT
context
```

而 Provider-level API 属于 Commercial tier。([Artificial Analysis][7])

因此：

```text
OpenRouter
+
Artificial Analysis
```

可以做很不错的 provider 双重交叉验证。

---

# D. Models.dev —— Provider / Model / Price 标准化

它最大的优点不是“新闻”，而是：

> **统一模型与供应商数据。**

如果你的数据库以后要支持：

```text
model
provider
gateway
price
context
capability
```

Models.dev 很适合充当一个外部参考库。([GitHub][8])

---

# E. 各家官方 Provider 价格页

这是价格采集必须增加的一层。

因为：

> 聚合平台价格 ≠ 官方价格。

例如当前：

### OpenAI

官方 Pricing 页面提供按 1M tokens 的输入、输出、缓存价格。([OpenAI Developers][10])

### Groq

官方 Models 页面直接同时列：

```text
model
speed
price
rate limits
context window
max completion
```

而且 API：

```text
GET https://api.groq.com/openai/v1/models
```

可以直接获取当前模型列表。([GroqCloud][16])

### Novita

官方价格页同时覆盖：

* LLM
* Image
* Video
* Audio
* GPU

并且公开具体模型价格。([Novita AI][17])

### SiliconFlow

官方价格中心已经是一个比较完整的：

```text
模型
+
厂商
+
输入价格
+
输出价格
+
缓存价格
+
模态
```

数据库式页面。([硅基流动 SiliconFlow][18])

---

# F. 中转站 / Gateway

这里需要单独说，因为：

> **“Provider”与“中转站”不是一回事。**

例如：

```text
OpenAI
Anthropic
DeepSeek
```

是模型厂商。

而：

```text
OpenRouter
302.AI
AnyRouter
AiHubMix
```

更接近：

> Gateway / Aggregator / API Relay / Multi-model Platform

---

## 1. OpenRouter

本身就是一个典型的模型路由/聚合层。

它可以同时发现：

```text
Model
Provider
Provider endpoint
Price
```

因此是你监控中转市场非常好的入口。

---

## 2. AnyRouter

这个很值得加入你的监控。

官方已经提供：

```text
GET /api/v1/models
```

直接返回：

* model id
* owner
* context
* price
* capabilities
* provider routing

并支持：

```text
?all=1
```

获取完整模型目录。([AnyRouter 文档][19])

而且 AnyRouter 自己就是 Gateway，它明确说明：

> routes requests to upstream model providers

即：

```text
AnyRouter
   ↓
上游 Provider
   ↓
模型
```

([AnyRouter][20])

这就完全符合你要监控的“中转站”。

---

## 3. 302.AI

也非常适合作为监控对象。

官方 API：

```text
GET /v1/models
```

可以：

> 列出当前可用模型，并提供每个模型价格。

([302文档][21])

另外还有：

```text
GET /dashboard/prices
```

直接读取 API 的价格数据。([302文档][22])

它自己也明确采用：

> Pay-as-you-go

并按 Token 或调用次数计费。([302.AI 帮助中心][23])

所以它实际上很适合做：

> **“中转站价格监控器”**

---

# G. GitHub —— 监控新的中转站/网关项目

这一层特别重要。

因为大量新出现的：

```text
OpenAI Compatible Gateway
API Relay
One API
New API
AI Gateway
Model Router
```

首先不是出现在 OpenRouter，而是：

> **GitHub 新仓库 / Release。**

GitHub 官方 REST API 可以直接：

```text
搜索仓库
搜索代码
读取 Releases
```

并且 Release API 可以列出：

```text
created_at
published_at
tag_name
release notes
```

等字段。([GitHub Docs][24])

因此你完全可以每天搜索：

```text
"OpenAI compatible gateway"
"AI gateway"
"LLM gateway"
"API relay"
"API proxy"
"model router"
"new-api"
"one-api"
```

然后：

```text
昨天结果
    ↓
今天 GitHub Search
    ↓
新增项目
    ↓
读取 README
    ↓
提取：
Provider
Models
Pricing
API
OpenAI Compatible
```

这对于发现**新中转站软件、新平台、新服务商**非常有价值。

---

# 2 部分：提供商 / 中转站采集渠道汇总

| 渠道                                          | Provider | 中转站 |  模型 |  价格 | API | Ubuntu | 新增 diff |        推荐 |
| ------------------------------------------- | -------: | --: | --: | --: | --: | -----: | ------: | --------: |
| **OpenRouter Providers**                    |      ✅✅✅ |   ✅ |   ✅ |   ✅ |   ✅ |      ✅ |     ✅✅✅ | **★★★★★** |
| **OpenRouter Endpoints**                    |      ✅✅✅ |   ✅ |   ✅ | ✅✅✅ |   ✅ |      ✅ |       ✅ | **★★★★★** |
| **Artificial Analysis**                     |      ✅✅✅ |  部分 |   ✅ | ✅✅✅ |   ✅ |      ✅ |       ✅ | **★★★★★** |
| **Models.dev**                              |       ✅✅ |  部分 | ✅✅✅ | ✅✅✅ |   ✅ |      ✅ |       ✅ | **★★★★★** |
| **官方 Provider API/价格页**                     |      ✅✅✅ |   ❌ |   ✅ | ✅✅✅ |  部分 |      ✅ |       ✅ | **★★★★★** |
| **AnyRouter**                               |       部分 | ✅✅✅ | ✅✅✅ | ✅✅✅ |   ✅ |      ✅ |       ✅ | **★★★★☆** |
| **302.AI**                                  |       部分 | ✅✅✅ | ✅✅✅ | ✅✅✅ |   ✅ |      ✅ |       ✅ | **★★★★☆** |
| **GitHub Search/Release API**               |        ✅ | ✅✅✅ |   ✅ |  部分 |   ✅ |      ✅ |     ✅✅✅ | **★★★★★** |
| **Hugging Face inference-provider mapping** |       ✅✅ |   ❌ | ✅✅✅ |  部分 |   ✅ |      ✅ |       ✅ | **★★★★☆** |

---

# 三、你真正应该建立的“双采集系统”

根据你这个需求，我反而不建议：

```text
每天爬 50 个网站
```

这样维护成本太高。

应该做：

```text
                  每日 1 次
                     │
          ┌──────────┴──────────┐
          │                     │
     ① 模型发现              ② Provider发现
          │                     │
   OpenRouter API          OpenRouter Providers
   Hugging Face            OpenRouter Endpoints
   Replicate               Artificial Analysis
   ModelScope              Models.dev
          │                 Official pricing
          │                 GitHub
          └──────────┬──────────┘
                     ▼
              Normalizer
                     │
                     ▼
                PostgreSQL
                     │
          ┌──────────┼──────────┐
          ▼          ▼          ▼
       新模型      新Provider   价格变化
          │          │          │
          └──────────┼──────────┘
                     ▼
                 LLM分析
                     │
                     ▼
              每日 AI 情报
```

---

# 四、数据库最好从一开始就把这几个概念拆开

例如不要简单设计：

```text
model_name
provider
price
```

应该至少：

```text
models
├── model_id
├── canonical_name
├── creator
├── release_date
├── discovered_at
├── modalities
├── context_window
├── open_source
└── official_url

providers
├── provider_id
├── name
├── type
├── country
├── website
├── api_base
├── discovered_at
└── official_url

model_provider
├── model_id
├── provider_id
├── provider_model_id
├── input_price
├── output_price
├── cache_price
├── context_window
├── availability
└── observed_at

gateways
├── gateway_id
├── name
├── website
├── api_base
├── compatibility
├── discovered_at
└── source

price_history
├── model_id
├── provider_id
├── price_type
├── old_price
├── new_price
├── effective_at
└── source
```

这样你以后才能回答：

> **“今天有哪些新模型？”**

以及：

> **“今天有哪些新 API 提供商？”**

以及：

> **“今天哪些模型降价了？”**

以及：

> **“GPT-X 现在有哪些官方 Provider、中转 Provider，各多少钱？”**

这四个问题其实是完全不同的查询。

---

# 五、对于你当前需求，我会把渠道分成三个级别

### 第一层：每天必须采集

```text
OpenRouter Models
OpenRouter Providers
OpenRouter Endpoints
Hugging Face
Replicate
ModelScope
```

这是你的**机器发现层**。

### 第二层：每日/每周补充

```text
Artificial Analysis
Models.dev
LiteLLM
```

这是你的**标准化、价格、性能交叉验证层**。

### 第三层：作为最终证据

```text
OpenAI
Anthropic
Google
xAI
DeepSeek
Qwen
Z.ai
Moonshot
MiniMax
ByteDance
Tencent
Baidu
Mistral
Meta
Cohere
NVIDIA
……
```

这是你的**官方真实性验证层**。

---

# 六、还有一个非常关键的结论

对于你的系统，我建议将“新模型”定义成 **3 个事件**，而不是一个事件：

```text
MODEL_RELEASED
    官方宣布新模型

MODEL_PUBLISHED
    Hugging Face / ModelScope / Replicate
    出现新模型

MODEL_API_AVAILABLE
    OpenRouter / Provider / Gateway
    开始可以调用
```

例如：

```text
9月28日
Anthropic 官方发布
        ↓
MODEL_RELEASED

9月28日
Hugging Face 出现
        ↓
MODEL_PUBLISHED

9月29日
OpenRouter 收录
        ↓
MODEL_API_AVAILABLE
```

这会比单纯记录一个：

```text
created_at
```

专业很多。

因为你真正要的不是“今天网站上多了一条记录”，而是：

> **今天 AI 市场到底发生了什么。**

而且你之前提到希望最终是**服务器每日自动更新并入库**，这个场景特别适合采用“**API 拉取 + 每日快照 + diff + 官方源验证**”的模式，而不是依赖网页爬虫。

### 我给你的最终推荐组合

如果考虑**成本、稳定性、Ubuntu 无人值守、覆盖面**四个因素，我会先做：

```text
模型：
OpenRouter
+ Hugging Face
+ Replicate
+ ModelScope

供应商/中转：
OpenRouter Providers
+ OpenRouter Endpoints
+ Artificial Analysis
+ 302.AI
+ AnyRouter
+ GitHub Search

价格校验：
官方 Pricing
+ Models.dev
+ LiteLLM
```

这样已经能够覆盖相当大一部分“**今天 AI 市场新增了什么**”。

下一步最值得做的是把这些渠道整理成一份**“每日 AI 模型/Provider 采集源清单”**，直接给出每个源的 `URL / API Endpoint / 是否需要 Key / 返回 JSON 字段 / Ubuntu curl 示例 / 建议采集频率 / 去重字段 / 新增判定规则`，这样基本就可以直接交给 AI CLI 在 Ubuntu 上实现。

[1]: https://openrouter.ai/models?order=newest&utm_source=chatgpt.com "Compare AI Models: Pricing, Context & Benchmarks | OpenRouter"
[2]: https://openrouter.ai/docs/api/api-reference/endpoints/list-endpoints?utm_source=chatgpt.com "List all endpoints for a model | OpenRouter | Documentation"
[3]: https://huggingface.co/docs/huggingface_hub/main/package_reference/cli?utm_source=chatgpt.com "hf · Hugging Face"
[4]: https://replicate.com/docs/reference/http?utm_source=chatgpt.com "HTTP API - Replicate"
[5]: https://replicate.com/explore/ "Explore – Replicate"
[6]: https://github.com/modelscope/modelscope_hub?utm_source=chatgpt.com "GitHub - modelscope/modelscope_hub: The official Python client to connect with ModelScope Hub. · GitHub"
[7]: https://artificialanalysis.ai/data-api/docs?utm_source=chatgpt.com "Data API docs | Artificial Analysis"
[8]: https://github.com/anomalyco/models.dev/blob/dev/README.md?utm_source=chatgpt.com "models.dev/README.md at dev · anomalyco/models.dev · GitHub"
[9]: https://github.com/BerriAI/litellm/blob/main/model_prices_and_context_window.json "litellm/model_prices_and_context_window.json at main · BerriAI/litellm · GitHub"
[10]: https://developers.openai.com/zh-Hans/api/docs/pricing?utm_source=chatgpt.com "定价 | OpenAI API"
[11]: https://ai.google.dev/gemini-api/docs/models?utm_source=chatgpt.com "Models  |  Gemini API  |  Google AI for Developers"
[12]: https://x.ai/news/grok-4-7?utm_source=chatgpt.com "Introducing Grok 4.7 | SpaceXAI"
[13]: https://openrouter.ai/docs/api/api-reference/providers/list-providers?utm_source=chatgpt.com "List all providers | OpenRouter | Documentation"
[14]: https://openrouter.ai/providers/?utm_source=chatgpt.com "Providers | OpenRouter"
[15]: https://openrouter.ai/docs/api/api-reference/endpoints/list-endpoints-zdr?utm_source=chatgpt.com "Preview the impact of ZDR on the available endpoints | OpenRouter | Documentation"
[16]: https://console.groq.com/docs/models?utm_source=chatgpt.com "Supported Models - GroqDocs"
[17]: https://novita.ai/pricing?utm_source=chatgpt.com "Pricing | Novita AI"
[18]: https://siliconflow.cn/pricing?utm_source=chatgpt.com "大模型 API 价格方案 - 硅基流动 SiliconFlow"
[19]: https://docs.anyrouter.dev/features/models-catalog?utm_source=chatgpt.com "AnyRouter Docs"
[20]: https://www.anyrouter.dev/terms?utm_source=chatgpt.com "Terms of Service · AnyRouter"
[21]: https://doc.302.ai/147522038e0?utm_source=chatgpt.com "Models（列出模型） - 302.AI API文档"
[22]: https://doc.302.ai/294868996e0?utm_source=chatgpt.com "Price（获取API的价格） - 302.AI API文档"
[23]: https://help.302.ai/en/docs/API-Pricing?utm_source=chatgpt.com "API Pricing-302.AI| Help Center"
[24]: https://docs.github.com/en/rest/releases/releases?utm_source=chatgpt.com "REST API endpoints for releases - GitHub Docs"
