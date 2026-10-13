// 帮助文档内容契约（docs.articles 配置键）：/docs 文档中心文章列表。
// - 铁律「可见即可改」：帮助文档正文后台可编辑（JSON 数组），缺行/非法/DB 不可用回退 DEFAULT；
// - 单一真源：DOCS_ARTICLES_JSON 为唯一手写真源，DEFAULT 由其解析而得，registry.defaultValue 与
//   prisma seed 均引用同一字符串（admin-config-seed-parity 守卫逐字符校验）；
// - 兜底文案与重构前 (site)/docs/page.tsx 硬编码 ARTICLES 逐字一致（保留原文为默认）。
import { z } from "zod";

export const DocsSectionSchema = z.object({
  title: z.string().trim().min(1, "小节标题不能为空").max(80, "小节标题 ≤80 字"),
  text: z.string().trim().min(1, "小节正文不能为空").max(1000, "小节正文 ≤1000 字"),
}).strict();
export const DocsArticleSchema = z.object({
  id: z.string().trim().min(1, "文章标识不能为空").max(40, "文章标识 ≤40 字"),
  group: z.string().trim().min(1, "分组不能为空").max(40, "分组 ≤40 字"),
  title: z.string().trim().min(1, "标题不能为空").max(80, "标题 ≤80 字"),
  summary: z.string().trim().max(200, "摘要 ≤200 字"),
  sections: z.array(DocsSectionSchema).min(1, "至少一个小节").max(12, "小节最多 12 个"),
  link: z.string().trim().min(1, "底部链接不能为空").max(200, "底部链接 ≤200 字"),
  linkLabel: z.string().trim().min(1, "链接文案不能为空").max(40, "链接文案 ≤40 字"),
}).strict();
export const DocsArticlesSchema = z.array(DocsArticleSchema).min(1, "至少一篇文章").max(24, "文章最多 24 篇");
export type DocsArticle = z.infer<typeof DocsArticleSchema>;

/** docs.articles 规范 JSON 真源（compact，无空格；与重构前硬编码 ARTICLES 逐字一致） */
export const DOCS_ARTICLES_JSON = `[{"id":"start","group":"开始使用","title":"快速开始","summary":"从了解模型到完成配置，让第一次使用更简单。","sections":[{"title":"01 · 找到适合的模型","text":"从产品中的模型天梯图开始。对照任务类型、性能和价格筛选候选模型，再打开模型详情查看参数。单一排名不是全部：写作、推理和代码任务可能需要不同模型。"},{"title":"02 · 打开个人控制台","text":"登录后进入控制台。顶部展示余额、账号等级与今日用量；下方通过标签切换模型配置、免费额度、平台密钥、自有密钥和调用测试台，不必反复向下翻页。"},{"title":"03 · 完成一次小规模验证","text":"先配置模型，再在调用测试台发起简短请求。核对返回内容、错误提示和用量，确认满足需要后再接入自己的应用。不要在提示词中填写密码或真实密钥。"}],"link":"/user/console","linkLabel":"进入控制台"},{"id":"account","group":"开始使用","title":"账号与等级","summary":"了解账号状态和可用额度，不把等级当作模型性能。","sections":[{"title":"在哪里查看账号信息","text":"登录后的控制台概览展示当前等级及余额。免费模型的剩余额度和刷新周期在「免费额度」板块查看，以当前页面显示为准。"},{"title":"通用版与专业版","text":"通用版按档位绑定模型，适合快速配置；专业版按具体模型维护优先级，适合需要精细控制的用户。两种形式在「模型配置」标题右侧切换。"},{"title":"使用前确认","text":"实际可用能力受模型配置、余额及额度共同影响。遇到限制时先查看具体提示，避免连续重复提交相同请求。"}],"link":"/user/console?tab=quotas","linkLabel":"查看免费额度"},{"id":"keys","group":"开发者接入","title":"密钥管理","summary":"区分平台密钥与自有密钥，避免把凭证放错位置。","sections":[{"title":"平台密钥","text":"平台密钥用于你的应用调用本站网关。在控制台「平台密钥」中管理。创建后按照页面提示安全保存；不要将密钥写进公开仓库、前端代码、截图或分享链接。"},{"title":"自有密钥","text":"自有密钥用于配置你持有的上游服务凭证，与本站平台密钥用途不同。在「自有密钥」板块操作，并核对服务渠道和地址。"},{"title":"怀疑泄露怎么办","text":"立即在对应管理界面停用或撤销受影响密钥，更换应用中的凭证，并检查近期调用记录。不要将泄露的密钥发送给客服。"}],"link":"/user/console?tab=platformKeys","linkLabel":"管理平台密钥"},{"id":"gateway","group":"开发者接入","title":"网关接入","summary":"先在站内验证，再将配置带入自己的应用。","sections":[{"title":"接入前的三个检查","text":"确认平台密钥有效、目标模型已经配置、余额或免费额度满足调用要求。先使用控制台调用测试台验证，避免同时排查应用代码和账号配置。"},{"title":"在应用中安全配置","text":"从本站当前接入说明或测试台核对服务地址和模型标识，将凭证保存在服务端环境变量或密钥管理系统中。不要把管理后台地址作为模型服务地址，也不要直接将密钥交给浏览器。"},{"title":"失败时如何定位","text":"记录错误码、请求时间和请求标识，检查模型、额度和密钥状态。排障时只提供脱敏信息；不要反复重试权限或参数错误。生产接入前应单独验证超时和限流处理。"}],"link":"/user/console?tab=playground","linkLabel":"打开调用测试台"},{"id":"billing","group":"使用与支持","title":"计费与用量","summary":"先了解展示口径，再根据实际使用选择模型。","sections":[{"title":"查看价格","text":"价格页和模型详情提供可见价格信息。不同模型的输入和输出价格可能不同；调用前核对当前展示的币种和单位，不要把单次请求数等同于 Token 用量。"},{"title":"查看余额和消耗","text":"控制台概览提供余额及今日用量，余额入口可查看相关信息。测试先从短输入开始，根据实际输出长度和使用频率评估预算。"},{"title":"免费额度与自有渠道","text":"免费额度按界面展示的周期刷新，不能视作无限使用。自有渠道还受上游账户规则约束，使用前同时检查上游余额和权限。"}],"link":"/pricing","linkLabel":"查看当前价格"},{"id":"faq","group":"使用与支持","title":"常见问题","summary":"遇到问题时，先从这里找答案。","sections":[{"title":"为什么控制台没有显示全部功能？","text":"控制台采用标签式工作区，一次展示一个功能板块。点击「免费额度」「平台密钥」「自有密钥」或「调用测试台」切换；窄屏可横向滚动标签栏。"},{"title":"为什么排名与实际体验不同？","text":"评测反映特定任务和测试条件，不能替代你的业务验证。建议用相同输入对比候选模型，综合考虑质量、响应时间及价格。"},{"title":"如何联系支持？","text":"请发送问题描述、发生时间、相关页面及脱敏错误提示至 591547726@qq.com。不要附带密码、密钥、支付凭证完整信息或私人业务数据。"}],"link":"/about#contact","linkLabel":"联系与反馈"}]`;
export const DOCS_ARTICLES_DEFAULT: DocsArticle[] = DocsArticlesSchema.parse(JSON.parse(DOCS_ARTICLES_JSON));

/** 前台读取兜底：合法 JSON → 校验后的文章数组；任何异常 → 回默认（深拷贝防篡改常量） */
export function parseDocsArticles(value: string | undefined): DocsArticle[] {
  try {
    return DocsArticlesSchema.parse(JSON.parse(value ?? ""));
  } catch {
    return DOCS_ARTICLES_DEFAULT.map((a) => ({ ...a, sections: a.sections.map((s) => ({ ...s })) }));
  }
}

/** 文档分组顺序（左侧目录按此顺序归组；不在列表内的分组按首次出现顺序追加） */
export function docsGroupsOf(articles: DocsArticle[]): string[] {
  const seen: string[] = [];
  for (const a of articles) if (!seen.includes(a.group)) seen.push(a.group);
  return seen;
}
