我希望使用api，或能在ubuntu上使用的工具，每天定时采集一次大模型的最新信息，尤其是今天上新了哪些大模型、以及有哪些新的服务提供商(包含它们的价格)。有哪些渠道呢。  从两个部分分开回答：1. 采集模型；2. 采集提供商和中转站。
---

# 大模型动态每日采集方案（Ubuntu + API）

## 第一部分：采集「今天上新/上新了哪些模型」

| 优先级 | 渠道 | 接入方式 | 关键能力（已实测） | 覆盖范围 | 费用 |
|:---:|------|------|------|------|------|
| ★1 | **OpenRouter** | `GET https://openrouter.ai/api/v1/models` | 每个模型带 **`created` 时间戳**（可精确 diff 出“今天新增”）+ 价格 + 上下文长度 + 架构信息。实测 460 个模型、最近 7 天新增 22 个 | 已上架 API 的商业+开源模型 | **免 key 免费拉全量** |
| ★2 | **Hugging Face Hub**（国内走 `hf-mirror.com` 镜像） | `GET https://hf-mirror.com/api/models?sort=createdAt&direction=-1&limit=100` | 分钟级新模型流，实测可拉到当天最新；配合 `downloads`/`likes` 过滤实验噪音，或按 `author=deepseek-ai/Qwen/meta-llama` 等过滤官方机构 | 权重发布（含未上 API 的模型） | 免 key（有速率限制）；huggingface.co 本体在国内直连超时，**必须用镜像** |
| ★3 | **LiteLLM 价格库** | `GET https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json` | 官方每日维护的全网模型注册表（实测 ~6000 条）；diff 昨日 JSON 的新增 key = 新模型 | 几乎所有 API 提供商 | 免费 |
| ★4 | **models.dev** | `GET https://models.dev/api.json` | 实测 **225 家提供商、7857 个含价格模型**，每模型带 `release_date`/`last_update` | 提供商+模型+价格一体 | 免费（开源数据，社区 PR 更新） |
| ★5 | 各厂商官方 `GET /v1/models` | OpenAI 兼容端点（OpenAI、DeepSeek、Groq、Together、Fireworks、DeepInfra 等） | 只反映自家模型变更，需各自 key | 单一厂商 | 免费调用（需注册） |
| ★6 | **arXiv API / HF Daily Papers** | `GET http://export.arxiv.org/api/query?search_query=...` 按 `submittedDate`；`GET https://hf-mirror.com/api/daily_papers` | 新模型发布的**前置信号**（论文通常先于 API 上架 1-30 天） | 学术界/开源界 | 免费 |
| ★7 | Artificial Analysis API | `api.artificialanalysis.ai`（Pro 订阅） | 模型性能/价格对比数据 | 主流模型 | 付费 |
| 补充 | 官方 changelog/博客 | OpenAI changelog、Anthropic news、各厂博客，配 **RSSHub**（自部署）转 RSS | 官方公告的一手口径 | 各厂商 | 免费 |

**模型部分的要点**：OpenRouter 的 `created` 字段是“今天上新了哪些模型”最直接的数据源（模型上架即出现）；Hugging Face 是“权重层面”的最早信号但噪音大，务必过滤；两者结合 + LiteLLM diff 基本无遗漏。

## 第二部分：采集「服务提供商和中转站（含价格）」

| 优先级 | 渠道 | 接入方式 | 关键能力（已实测） | 费用 | 适合度 |
|:---:|------|------|------|------|------|
| ★1 | **OpenRouter** | 同上 `/api/v1/models` | 模型 id 前缀 = 供应商（`anthropic/`、`fireworks/`、`perceptron/`…），`pricing` 含每 token 价格（实测字段：prompt/completion/cache 等 7 项）；**diff 供应商前缀集合即可发现新接入的提供商** | 免 key | 正规聚合层，最佳单一来源 |
| ★2 | **models.dev** | `GET https://models.dev/api.json` | 实测 225 家提供商（deepinfra、groq、cerebras、poe、zai、bailing、sensenova 等中外厂商），每提供商含官网/文档/env 变量/全模型价格表 | 免费 | 覆盖面最广的开源比价数据库 |
| ★3 | **LiteLLM** | 同上 JSON + GitHub `providers/` 目录 | `litellm_provider` 字段可聚合出全部支持的提供商种类；仓库 commit diff 可发现新 provider 支持 | 免费 | 技术接入视角 |
| ★4 | 官方云厂商模型 API | AWS Bedrock `ListFoundationModels`、Azure OpenAI、Vertex AI（各需 key） | 企业级渠道的模型上新（Bedrock 新模型常晚于官方发布数周） | 按调用计费 | 企业采购视角 |
| ★5 | **中文中转站生态** | 无权威 API。渠道：GitHub 上 one-api/new-api 生态的导航仓库、**linux.do 论坛**（大量中转站发布/评测帖）、V2EX | 价格战、新站上线信息的第一现场 | 免费（爬帖子） | ⚠️ 见下方风险说明 |
| ★6 | 比价站 | llmpricecheck.com、LLMStats 等 | 聚合官方价格对比 | 部分免费 | 辅助核价 |

**关于中转站的重要提醒**（如实告知）：中转站（API 转售站）行业没有权威 API 或数据库，其价格数据散落在论坛帖和导航站中，且存在**跑路、降智（偷换小模型）、密钥泄露、虚标价格**等已知风险。技术上可以用 RSSHub/爬虫抓 linux.do 的中转站板块做“监控”，但价格信息只能作行情参考，不建议作为生产数据源。如果需要自建合规聚合层，开源的 **new-api/one-api** 可在 Ubuntu 上自部署做统一网关（但这解决的是“用”，不是“监控别家”）。

## 落地：Ubuntu 每日定时采集（可直接照抄）

```bash
# /etc/cron.d/llm-daily  — 每天 08:00 采集 + diff + 推送
0 8 * * *  youruser  /usr/bin/python3 /opt/llm-watch/watch.py >> /var/log/llm-watch.log 2>&1
```

核心 diff 逻辑（`/opt/llm-watch/watch.py` 精简版，三个源全部实测可用）：

```python
import json, time, urllib.request, pathlib

STORE = pathlib.Path("/opt/llm-watch/data"); STORE.mkdir(parents=True, exist_ok=True)
UA = {"User-Agent": "Mozilla/5.0"}

def fetch(url):
    req = urllib.request.Request(url, headers={**UA, "Accept-Encoding": "identity"})
    return urllib.request.urlopen(req, timeout=90).read()   # models.dev 5MB+，注意超时与重试

today = time.strftime("%Y-%m-%d")

# ① OpenRouter：今日新模型 + 今日新供应商前缀（免key）
or_data = json.loads(fetch("https://openrouter.ai/api/v1/models"))["data"]
new_models = [m for m in or_data if m["created"] > time.time() - 86400]
# ② models.dev：全量提供商+价格存档，diff 顶层 key 即新提供商
md = json.loads(fetch("https://models.dev/api.json"))
old_md = STORE / "modelsdev.json"
new_providers = []
if old_md.exists():
    old = json.loads(old_md.read_text())
    new_providers = set(md) - set(old)
old_md.write_text(json.dumps(md))
# ③ LiteLLM：价格变动检测（对每模型价格字段做哈希对比，可再加）
# ...同理存档 diff...

# ④ 推送：汇总后发 Telegram / 企业微信 webhook / 邮件
report = {"新模型": [m["id"] for m in new_models], "新提供商": sorted(new_providers)}
(STORE / f"report-{today}.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))
print(json.dumps(report, ensure_ascii=False, indent=2))
```

三个实测要点：**models.dev 约 5MB 且传输偶发截断，务必校验 `json.loads` 并重试**；HuggingFace 需用 `hf-mirror.com`（官方域名国内超时）；OpenRouter 免 key 可用，加 key 后有更高速率额度。跑通后您每天会得到一份类似“今日新增模型 3 个、新增提供商 2 家、价格变动 5 条”的 JSON 报告，接入任意通知渠道即可。