好的，我先分别搜索这两部分的最新信息。好，信息已足够完整。下面分两部分详细回答：

---

# 第一部分：采集模型（哪些新模型上线了）

## 1. 🏆 LLM Gateway Timeline（最推荐）

**接口页面**：`https://llmgateway.io/timeline`

这是一个持续更新的大语言模型发布时间线，记录每个模型从原始提供商发布的时间，以及进入 LLM Gateway 的时间。目前追踪了来自 54 家提供商、33 个模型系列的 414 个模型，包括 OpenAI、Anthropic、Google、Meta、Mistral 和 DeepSeek，全列表持续更新。新旗舰模型通常在提供商发布后 48 小时内出现。

**采集方式**：该页面为 HTML，可用 `curl` + `BeautifulSoup` 抓取，或直接通过 LLM Gateway 的 API 接口（`/api/v1/models`，兼容 OpenAI 格式）拉取模型列表，与前一天对比找出新增条目。

---

## 2. 🥈 LLM Stats（实时，每小时更新）

**网站**：`https://llm-stats.com/llm-updates` 和 `https://llm-stats.com/ai-news`

LLM Stats 实时追踪所有主要语言模型的版本发布，涵盖 OpenAI（GPT 系列、o 系列）、Anthropic（Claude）、Google（Gemini）、Meta（Llama）、Mistral、DeepSeek 等提供商。时间线展示发布日期、新能力、benchmark 提升及功能新增。新闻 feed 每小时更新，包含最新 AI 模型发布、benchmark 结果和大语言模型新闻。目前追踪了 399+ 个模型发布记录。

**采集方式**：HTML 抓取，或订阅其 RSS feed。

---

## 3. 🥉 OpenRouter Models API（免费、无需认证）

**接口**：`GET https://openrouter.ai/api/v1/models`

该 Models API 将所有 LLM 的关键信息在确认后第一时间免费公开，返回标准化 JSON 格式，为每个可用模型提供完整的元数据，已做边缘缓存，适合生产级集成。列表接口支持可选的 `offset` 和 `limit` 分页参数；不传参数时直接返回完整列表。

```bash
# 每天保存一份快照，对比新增
curl https://openrouter.ai/api/v1/models > models_$(date +%F).json
# 用 jq 提取模型 id 列表
jq '[.data[].id]' models_$(date +%F).json
```

---

## 4. Hugging Face Open LLM Leaderboard（开源模型专项）

**接口**：Hugging Face Datasets API

专注开源/开放权重模型，适合追踪 Llama、Qwen、Mistral 等开源系列的新版本动态。

```bash
# 拉取 leaderboard 数据集
curl "https://huggingface.co/api/datasets/open-llm-leaderboard/results" \
  -H "Authorization: Bearer YOUR_HF_TOKEN"
```

---

## 第一部分：定时检测新模型的脚本示意

```python
#!/usr/bin/env python3
# detect_new_models.py
import httpx, json
from pathlib import Path
from datetime import date, timedelta

TODAY = date.today().isoformat()
YESTERDAY = (date.today() - timedelta(days=1)).isoformat()

def fetch_models():
    r = httpx.get("https://openrouter.ai/api/v1/models", timeout=30)
    return {m["id"]: m for m in r.json()["data"]}

def save_snapshot(models: dict):
    Path(f"snapshot_{TODAY}.json").write_text(json.dumps(models, indent=2))

def diff_with_yesterday(today_models: dict):
    yesterday_file = Path(f"snapshot_{YESTERDAY}.json")
    if not yesterday_file.exists():
        print("无昨日快照，跳过 diff")
        return
    yesterday_models = json.loads(yesterday_file.read_text())
    new_ids = set(today_models) - set(yesterday_models)
    print(f"今日新增模型 {len(new_ids)} 个:")
    for mid in new_ids:
        m = today_models[mid]
        print(f"  + {m['name']}  id={mid}  上下文={m.get('context_length')}tokens")

if __name__ == "__main__":
    models = fetch_models()
    save_snapshot(models)
    diff_with_yesterday(models)
```

---
---

# 第二部分：采集提供商和中转站（含价格）

## 数据源分级

### 🟢 一级数据源：各官方定价页（最准确）

直接爬取或 API 拉取各一方提供商官方定价页面，是价格最权威的来源：

| 提供商 | 官方定价页 |
|--------|-----------|
| OpenAI | `https://openai.com/api/pricing` |
| Anthropic | `https://www.anthropic.com/pricing` |
| Google | `https://ai.google.dev/pricing` |
| DeepSeek | `https://platform.deepseek.com/api-docs/pricing` |
| Mistral | `https://mistral.ai/technology/api-pricing/` |
| xAI | `https://x.ai/api` |
| Moonshot | `https://platform.moonshot.cn/docs/pricing` |

这些均有官方文档：Anthropic pricing docs、OpenAI pricing docs、Google Gemini API pricing、DeepSeek pricing docs、xAI model docs、Mistral API pricing。

> ⚠️ 注意：LLM API 定价看似简单，实则复杂——2026 年上半年价格已变动两次，每家提供商对输入/输出 token 的定价方式各异，"标题价格"往往与实际账单不符。

---

### 🟡 二级数据源：聚合比较平台（结构化、跨平台）

这些平台已帮你聚合了多家价格，可直接爬取或调用其 API/数据：

#### ① BenchLM.ai（推荐，更新最及时）

**地址**：`https://benchlm.ai/llm-pricing`

截至 2026 年 9 月 27 日，该平台追踪 29 家提供商、164 个付费模型的定价。最便宜的模型是 Qwen3.7 Flash（$0.03/$0.13 per million tokens 输入/输出），最便宜的生产级模型（评分 70+）是 Gemini 3.8 Flash（$0.75/$3.75）。

#### ② CostGoat.com（提供商数量最多）

**地址**：`https://costgoat.com/compare/llm-api`

该平台聚合了通过 HTTP 请求访问大语言模型的 LLM API，覆盖每家主要 AI 提供商（OpenAI、Anthropic、Google、DeepSeek、Mistral、xAI），按每百万 token 的输入/输出分别定价。

#### ③ MorphLLM.com（验证时间最新）

**地址**：`https://www.morphllm.com/llm-api`

该页面包含 2026 年 9 月 22 日验证的 12 家提供商定价，包括 GPT-6 Astra（$10/$50）、GPT-6 Sol（$2/$10）、Claude Fable 5.1（$10/$50）、Gemini 3.8 Flash（$0.75/$3.75）、DeepSeek V4.1 Flash（$0.30/$1.20）等。

#### ④ CloudZero.com（含价格历史分析）

**地址**：`https://www.cloudzero.com/blog/llm-api-pricing-comparison/`

截至 2026 年 8 月 20 日，主流 LLM API 输入价格下限已降至约 $0.20/百万 tokens（GPT-5.6 Luna 经 7 月 30 日降价后）；开放权重和离岸提供商输出价更低；旗舰模型输入价约在 $5–$10 之间，如 GPT-5.6 Sol（$5/$30）、Claude Opus 5（$5/$25）、Claude Fable 5（$10/$50）。

---

### 🔵 三级数据源：中转站/聚合网关（追踪第三方转发定价）

中转站（如国内各类 API 中转）通常不公开标准 API，但以下平台可作为参考：

#### OpenRouter（最大中转聚合网关）

OpenRouter 将众多提供商的模型聚合在一个 API Key 后，适合评估和故障转移。Claude 系列也通过 Amazon Bedrock、Google Cloud 转售（通过云提供商计费，区域端点有约 10% 溢价），以及 Claude in Microsoft Foundry（通过云市场按 Anthropic 标准费率计费）。

```bash
# 获取 OpenRouter 上每个模型每个子提供商的价格
curl https://openrouter.ai/api/v1/models \
  | jq '.data[] | {id: .id, name: .name, providers: .per_provider_limits}'
```

#### Artificial Analysis API（含推理速度+价格）

**接口**：`GET https://artificialanalysis.ai/api/v2/data/llms/models`（需申请免费 API Key）

返回各模型在不同提供商上的推理速度（tokens/s）、首 token 延迟（TTFT）和价格，是比较"同一模型在不同中转站上哪家更快更便宜"的最佳来源。

---

## 第二部分：价格采集 + 变动告警脚本示意

```python
#!/usr/bin/env python3
# track_providers_pricing.py
import httpx, json, sqlite3
from datetime import date

TODAY = date.today().isoformat()

def fetch_openrouter_pricing():
    """从 OpenRouter 获取所有模型在各提供商的定价"""
    r = httpx.get("https://openrouter.ai/api/v1/models", timeout=30)
    data = r.json()["data"]
    rows = []
    for m in data:
        p = m.get("pricing", {})
        rows.append({
            "date":        TODAY,
            "model_id":    m["id"],
            "name":        m.get("name"),
            "provider":    m["id"].split("/")[0],   # openrouter id 格式: provider/model
            "input_usd_per_1m":  float(p.get("prompt", 0)) * 1_000_000,
            "output_usd_per_1m": float(p.get("completion", 0)) * 1_000_000,
            "context_length":    m.get("context_length"),
        })
    return rows

def save_to_db(rows, db="pricing.db"):
    con = sqlite3.connect(db)
    cur = con.cursor()
    cur.execute("""CREATE TABLE IF NOT EXISTS pricing (
        date TEXT, model_id TEXT, name TEXT, provider TEXT,
        input_usd_per_1m REAL, output_usd_per_1m REAL, context_length INTEGER
    )""")
    cur.executemany(
        "INSERT INTO pricing VALUES (:date,:model_id,:name,:provider,"
        ":input_usd_per_1m,:output_usd_per_1m,:context_length)", rows)
    con.commit(); con.close()

def detect_price_changes(db="pricing.db"):
    """对比昨天和今天，找出价格变化"""
    con = sqlite3.connect(db)
    cur = con.cursor()
    cur.execute("""
        SELECT t.model_id, t.name,
               y.input_usd_per_1m AS old_in,  t.input_usd_per_1m AS new_in,
               y.output_usd_per_1m AS old_out, t.output_usd_per_1m AS new_out
        FROM pricing t
        JOIN pricing y ON t.model_id = y.model_id
        WHERE t.date = date('now')
          AND y.date = date('now', '-1 day')
          AND (t.input_usd_per_1m  != y.input_usd_per_1m
            OR t.output_usd_per_1m != y.output_usd_per_1m)
    """)
    changes = cur.fetchall()
    con.close()
    print(f"\n📊 今日价格变动 {len(changes)} 条:")
    for c in changes:
        print(f"  {c[1]}: 输入 ${c[2]:.4f}→${c[3]:.4f} | 输出 ${c[4]:.4f}→${c[5]:.4f}")

if __name__ == "__main__":
    rows = fetch_openrouter_pricing()
    save_to_db(rows)
    detect_price_changes()
    print(f"\n✅ 今日共采集 {len(rows)} 条提供商定价记录")
```

---

## 总览对比表

| 维度 | 第一部分：模型 | 第二部分：提供商/中转定价 |
|------|--------------|------------------------|
| **最佳 API 数据源** | OpenRouter `/api/v1/models` | OpenRouter `/api/v1/models`（含 per-provider 价格） |
| **最佳时间线页面** | llmgateway.io/timeline | benchlm.ai/llm-pricing |
| **实时新闻 Feed** | llm-stats.com/llm-updates（每小时更新） | costgoat.com、morphllm.com |
| **性能+价格综合** | — | Artificial Analysis API |
| **开源模型专项** | Hugging Face Leaderboard API | inference.net、together.ai 官方文档 |
| **检测新增方式** | 对比 model_id 集合 diff | 对比 input/output 价格字段变化 |
| **定时调度** | `cron` 每天 8:00 | 同上，可分开两个任务 |
| **存储方案** | SQLite `snapshots` 表 | SQLite `pricing` 表 |