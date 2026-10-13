--
-- PostgreSQL database dump
--

\restrict USyD9TZ2TPQOhXTxgCZaiTykdZn4LjjZUkUiFFvgcVrpKFFFaTr8h9deVfuP4U3

-- Dumped from database version 16.15
-- Dumped by pg_dump version 16.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ai_call_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_call_logs (
    id uuid NOT NULL,
    thesis_id uuid,
    task_type character varying(30) NOT NULL,
    status character varying(20) NOT NULL,
    result text,
    error text,
    tokens_used integer NOT NULL,
    celery_task_id character varying(200),
    requested_by uuid,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: aidean_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.aidean_accounts (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    sub character varying(128) NOT NULL,
    email character varying(255) NOT NULL,
    nickname character varying(100),
    access_token_encrypted character varying(1024),
    refresh_token_encrypted character varying(1024),
    access_expires_at timestamp with time zone,
    token_version integer,
    last_refreshed_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid NOT NULL,
    actor_id uuid,
    action character varying(30) NOT NULL,
    resource_type character varying(50) NOT NULL,
    resource_id uuid,
    detail text NOT NULL,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp with time zone NOT NULL
);


--
-- Name: check_artifacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.check_artifacts (
    id uuid NOT NULL,
    check_id uuid NOT NULL,
    artifact_type character varying(30) NOT NULL,
    relative_path character varying(500) NOT NULL,
    size_bytes integer NOT NULL,
    sha256 character varying(64),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    CONSTRAINT ck_check_artifacts_type CHECK (((artifact_type)::text = ANY ((ARRAY['report_json'::character varying, 'report_pdf'::character varying, 'thesis_snapshot'::character varying, 'parse_ast'::character varying, 'imported_source'::character varying])::text[])))
);


--
-- Name: citations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.citations (
    id uuid NOT NULL,
    thesis_id uuid NOT NULL,
    reference_id uuid NOT NULL,
    context text,
    created_at timestamp with time zone NOT NULL
);


--
-- Name: findings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.findings (
    id uuid NOT NULL,
    check_id uuid NOT NULL,
    finding_type character varying(80) NOT NULL,
    severity character varying(10) NOT NULL,
    rule_ref character varying(120) NOT NULL,
    message text NOT NULL,
    anchor jsonb NOT NULL,
    suggestion text,
    evidence jsonb NOT NULL,
    status character varying(10) NOT NULL,
    source character varying(20) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    CONSTRAINT ck_findings_severity CHECK (((severity)::text = ANY ((ARRAY['error'::character varying, 'warning'::character varying, 'info'::character varying])::text[]))),
    CONSTRAINT ck_findings_status CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'ignored'::character varying])::text[])))
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid NOT NULL,
    recipient_id uuid NOT NULL,
    notification_type character varying(30) NOT NULL,
    title character varying(200) NOT NULL,
    content text NOT NULL,
    status character varying(20) NOT NULL,
    read_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizations (
    id uuid NOT NULL,
    name character varying(200) NOT NULL,
    parent_id uuid,
    org_type character varying(20) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: references; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."references" (
    id uuid NOT NULL,
    title text NOT NULL,
    authors character varying[] NOT NULL,
    year integer,
    reference_type character varying(20) NOT NULL,
    source character varying(300),
    doi character varying(200),
    url text,
    abstract text,
    keywords character varying[] NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: review_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.review_comments (
    id uuid NOT NULL,
    review_id uuid NOT NULL,
    section character varying(100) NOT NULL,
    content text NOT NULL,
    severity character varying(20) NOT NULL,
    resolved boolean,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id uuid NOT NULL,
    thesis_id uuid NOT NULL,
    reviewer_id uuid NOT NULL,
    status character varying(20) NOT NULL,
    score numeric(3,1),
    summary text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: rule_packs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rule_packs (
    id uuid NOT NULL,
    name character varying(100) NOT NULL,
    kind character varying(20) NOT NULL,
    version integer NOT NULL,
    rules jsonb NOT NULL,
    status character varying(20) NOT NULL,
    description text,
    created_by uuid,
    published_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    CONSTRAINT ck_rule_packs_kind CHECK (((kind)::text = ANY ((ARRAY['format'::character varying, 'similarity'::character varying])::text[]))),
    CONSTRAINT ck_rule_packs_status CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'published'::character varying, 'archived'::character varying])::text[]))),
    CONSTRAINT ck_rule_packs_version_positive CHECK ((version >= 1))
);


--
-- Name: similarity_checks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.similarity_checks (
    id uuid NOT NULL,
    thesis_id uuid NOT NULL,
    requested_by uuid NOT NULL,
    provider character varying(50) NOT NULL,
    provider_task_id character varying(255),
    status character varying(20) NOT NULL,
    progress integer NOT NULL,
    similarity_score numeric(5,2),
    report jsonb,
    error text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: theses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.theses (
    id uuid NOT NULL,
    title text NOT NULL,
    author_id uuid NOT NULL,
    advisor_id uuid,
    status character varying(20) NOT NULL,
    thesis_type character varying(20) NOT NULL,
    abstract text,
    keywords character varying[] NOT NULL,
    version integer NOT NULL,
    file_path text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: thesis_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.thesis_versions (
    id uuid NOT NULL,
    thesis_id uuid NOT NULL,
    version_number integer NOT NULL,
    file_path character varying(500) NOT NULL,
    change_summary text,
    created_by uuid,
    created_at timestamp with time zone NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    email character varying(255) NOT NULL,
    name character varying(100) NOT NULL,
    password_hash character varying(255),
    role character varying(20) NOT NULL,
    status character varying(20) NOT NULL,
    organization_id uuid,
    mfa_enabled boolean,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    tier character varying(10) DEFAULT 'free'::character varying NOT NULL,
    CONSTRAINT ck_users_tier CHECK (((tier)::text = ANY ((ARRAY['free'::character varying, 'pro'::character varying, 'max'::character varying])::text[])))
);


--
-- Data for Name: ai_call_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ai_call_logs (id, thesis_id, task_type, status, result, error, tokens_used, celery_task_id, requested_by, created_at, updated_at) FROM stdin;
332999a0-5b72-4357-a7b2-c91c1a5a2ebc	2e433d63-fdac-4d43-9273-0ed455b8fab0	abstract_generate	completed	**摘要**\n\n随着科学文献数量的爆发式增长，高效、客观的学术论文质量自动评估技术已成为学术出版与研究管理领域的关键需求。现有方法多依赖于简单的文本统计指标或单一维度的语义分析，难以全面捕捉论文在宏观结构组织与微观语义内涵上的复杂特征。针对这一挑战，本文提出了一种融合文本结构特征与深层语义表示的学术论文质量自动评估新框架。该方法首先构建了多维度的特征提取管线，系统地量化了章节组织结构、图表信息密度以及参考文献引用分布等关键结构特征，从而刻画论文的规范性与信息承载能力；同时，利用先进的预训练语言模型生成句级细粒度语义表示，以精准捕捉文本的逻辑连贯性与学术表达深度。通过多模态特征融合策略，模型能够有效整合结构先验与语义知识，显著提升对论文质量的判别能力。我们在多个公开学术数据集上进行了广泛的实验验证。结果表明，所提方法在评估准确率上显著优于现有的基线模型，同时保持了较高的计算效率，满足了大规模自动化处理的需求。进一步的消融实验结果证实，语义特征的引入对整体性能提升具有显著贡献，验证了结构特征与语义特征互补协同的有效性。本研究不仅为学术论文质量评估提供了新的技术视角，也为基于多特征融合的文本分析任务奠定了理论基础，具有重要的学术价值与应用前景。\n\n**关键词**：学术论文质量评估；特征融合；结构特征；语义表示；自动评估	\N	465	\N	c27cc2d8-1d62-4056-a596-6abbb1d2430a	2026-09-28 03:55:09.755283+00	2026-09-28 03:55:09.762986+00
571f5051-4455-4d75-a862-0114e9b327aa	2e433d63-fdac-4d43-9273-0ed455b8fab0	review_assist	completed	这份摘要/引言内容简明扼要，清晰地阐述了研究问题、方法、实验设置和主要结论，符合一般学术论文摘要的结构要求。但在学术质量上，特别是在严谨性、具体性和逻辑连贯性方面，仍有提升空间。以下是基于一般学术质量标准的反馈：\n\n### 优点\n\n1.  **结构清晰**：遵循了“背景/问题 -> 方法 -> 实验 -> 结果/结论”的标准逻辑流。\n2.  **核心要素完整**：明确提到了方法的核心（融合结构与语义）、特征维度（章节、图表、引用、句级语义）、评估指标（准确率、效率）和验证手段（消融实验）。\n3.  **语言简洁**：用词专业，如“预训练模型”、“消融实验”、“基线方法”，符合学术规范。\n\n### 改进建议与批评\n\n#### 1. 缺乏具体性（Specificity）\n*   **“多个公开数据集”**：这是最大的弱点。在摘要或引言中，最好明确提及是哪些数据集（例如：ACL Anthology, arXiv CS, 或具体的论文质量标注数据集如 LLM-as-a-Judge 相关的基准）。如果数据集是核心贡献之一，务必点名。如果未点名，读者无法判断方法的适用领域和基准线是否公平。\n*   **“优于基线方法”**：哪些基线？是纯结构特征模型？纯语义模型（如BERT/LLM直接判断）？还是传统统计特征？明确对比对象能增强说服力。\n*   **“准确率”指标**：在自动评估中，通常使用 Spearman/Pearson 相关系数、Kendall Tau、或者与人类评分的一致性（如 Cohen's Kappa）来衡量“质量评估”的性能，而不是简单的分类“准确率”。除非你的任务被定义为二分类（高质量/低质量），否则“准确率”可能不是最合适的指标术语。建议根据实际任务调整指标名称（如“与人类评估的相关性”或“预测一致性”）。\n\n#### 2. 方法描述过于笼统\n*   **“融合”**：如何融合？是线性加权、拼接（concatenation）、注意力机制、还是双塔结构？“融合”一词过于宽泛，未能体现方法的技术深度。建议简要说明融合策略。\n*   **“多维度特征提取管线”**：可以稍微具体化。例如，“我们构建了一个两级特征提取管线，首先从章节层级提取结构特征，其次在句子层级利用 [具体模型名，如 RoBERTa] 提取语义表示，并通过 [具体机制] 进行对齐与融合。”\n*   **“基于预训练模型”**：指出是哪个模型（BERT, RoBERTa, PLM, LLM?），或至少说明是领域特定的还是通用的。\n\n#### 3. 逻辑与因果链条的严谨性\n*   **“实验...结果表明所提方法在准确率与效率上均优于基线方法”**：这里将“准确率”（性能）和“效率”（速度/资源消耗）并列作为优势。如果效率提升是因为使用了轻量级模型或特征筛选，这很合理；但如果效率提升伴随了计算复杂度的增加，需谨慎表述。更重要的是，需要确认“效率”是否是本文的主要卖点。如果本文侧重方法创新，效率可能是次要结果；如果侧重部署，则应强调。\n*   **“消融实验验证了语义特征的显著贡献”**：这暗示结构特征也有贡献，但表述略单。建议改为“消融实验进一步证实了结构特征与语义特征的互补性，其中语义特征对最终性能提升贡献显著。” 这样更全面。\n\n#### 4. 语言润色\n*   原文：“本文提出一种...方法，构建了...管线...” 句子较长，可适当断句，增强可读性。\n*   “章节组织、图表密度与引用分布等结构特征”：这部分很好，具体且可衡量。\n*   “句级语义表示”：可以考虑是否也包含文档级语义？如果只到句级，需注意与“章节组织”这种块级特征的尺度匹配问题。\n\n### 修改建议示例（更严谨的版本）\n\n> 本文提出一种融合多层级结构特征与句级语义表示的学术论文质量自动评估方法。具体而言，我们构建了双通道特征提取管线：一通道提取包括章节组织规范、图表密度分布及引用网络局部密度在内的结构特征；另一通道基于 [具体模型，如 RoBERTa] 提取句级语义嵌入。随后，通过 [具体融合机制，如 注意力加权融合] 将二者整合，输入预测模型以评估论文整体质量。\n>\n> 在 [数据集名称，如 ACL 2010-2020 子集 / 自建标注数据集] 上的实验表明，与纯结构基线及纯语义基线（[如 BERTScore / LLM-as-Judge]）相比，所提方法在质量预测相关性（Spearman ρ）上提升 [X]%，同时推理效率提高 [Y]%。消融实验进一步验证了结构特征与语义特征的互补性，其中语义表示对捕捉隐含逻辑缺陷具有显著贡献。\n\n### 总结\n\n当前版本作为一个**高度浓缩的摘要**是可接受的，但若作为**引言的结尾或摘要**，显得信息密度不足且关键细节缺失。学术审稿人通常会质疑“多个数据集”、“准确率”和“融合”这些模糊表述。建议根据上述意见增加具体细节，以提升可信度和技术深度。	\N	1327	\N	c27cc2d8-1d62-4056-a596-6abbb1d2430a	2026-09-28 03:56:32.770006+00	2026-09-28 03:56:32.771432+00
\.


--
-- Data for Name: aidean_accounts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.aidean_accounts (id, user_id, sub, email, nickname, access_token_encrypted, refresh_token_encrypted, access_expires_at, token_version, last_refreshed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.alembic_version (version_num) FROM stdin;
0006
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_logs (id, actor_id, action, resource_type, resource_id, detail, ip_address, user_agent, created_at) FROM stdin;
65f8b2c3-c32a-4895-a0b3-8a65bc8796a0	\N	create	auth	\N	POST /api/v1/auth/login → 200	127.0.0.1	Mozilla/5.0 (Windows NT; Windows NT 10.0; zh-CN) WindowsPowerShell/5.1.26100.2161	2026-09-28 03:33:33.590826+00
bd80efd4-5593-45d7-aafa-be727d328edb	\N	create	auth	\N	POST /api/v1/auth/refresh → 401	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/144.0.0.0 Safari/537.36	2026-09-28 03:35:05.278487+00
6bb30859-0b35-4b71-96f9-c52777b59077	\N	create	auth	\N	POST /api/v1/auth/login → 200	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/144.0.0.0 Safari/537.36	2026-09-28 03:38:47.261238+00
acc926e1-a1f6-4c35-a5cc-dc82d65149bb	c27cc2d8-1d62-4056-a596-6abbb1d2430a	create	thesis	\N	POST /api/v1/theses/2e433d63-fdac-4d43-9273-0ed455b8fab0/upload → 200	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/144.0.0.0 Safari/537.36	2026-09-28 03:41:41.790764+00
8dce988e-aa7d-4c08-bcca-8ff5d3776169	c27cc2d8-1d62-4056-a596-6abbb1d2430a	create	check	\N	POST /api/v1/checks/thesis/2e433d63-fdac-4d43-9273-0ed455b8fab0 → 201	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/144.0.0.0 Safari/537.36	2026-09-28 03:42:27.82269+00
00b9902c-d9f1-4bc3-b785-186de39b0083	\N	create	auth	\N	POST /api/v1/auth/login → 200	127.0.0.1	Mozilla/5.0 (Windows NT; Windows NT 10.0; zh-CN) WindowsPowerShell/5.1.26100.2161	2026-09-28 03:45:32.067318+00
8337fcaf-e5ec-4417-ad04-5636c2fde2ec	\N	create	auth	\N	POST /api/v1/auth/login → 200	127.0.0.1	Python-urllib/3.13	2026-09-28 03:46:32.424558+00
1b01b49f-b81d-477b-bf91-559024485793	\N	create	auth	\N	POST /api/v1/auth/refresh → 200	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/144.0.0.0 Safari/537.36	2026-09-28 03:54:45.316776+00
01d7e8ab-2e5c-4e3c-854f-364c63fd8ead	c27cc2d8-1d62-4056-a596-6abbb1d2430a	create	ai	\N	POST /api/v1/ai/generate-abstract → 200	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/144.0.0.0 Safari/537.36	2026-09-28 03:55:09.770361+00
b332b35c-ce7d-4583-861d-bc8548d99821	c27cc2d8-1d62-4056-a596-6abbb1d2430a	create	ai	\N	POST /api/v1/ai/review-assist → 200	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/144.0.0.0 Safari/537.36	2026-09-28 03:56:32.773369+00
f415369d-b2b7-42fc-916c-b8d1f6bbabb7	c27cc2d8-1d62-4056-a596-6abbb1d2430a	create	thesis	\N	POST /api/v1/theses/2e433d63-fdac-4d43-9273-0ed455b8fab0/submit → 200	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/144.0.0.0 Safari/537.36	2026-09-28 03:58:55.611013+00
0e16b4b4-751e-4b3a-8d60-1791a74e25d7	c27cc2d8-1d62-4056-a596-6abbb1d2430a	create	auth	\N	POST /api/v1/auth/logout → 200	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/144.0.0.0 Safari/537.36	2026-09-28 03:59:48.77757+00
338a24f1-4248-4d07-b77b-6bc7aed932d0	\N	create	auth	\N	POST /api/v1/auth/login → 200	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/144.0.0.0 Safari/537.36	2026-09-28 03:59:56.140062+00
7f3a7b2e-505d-4fb8-b018-7e12f9876f47	88154fc6-8509-42b7-af53-f5aa16d94599	create	review	\N	POST /api/v1/reviews → 201	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/144.0.0.0 Safari/537.36	2026-09-28 04:02:44.428261+00
f23849a1-9a10-443d-86f4-871b7d9ef188	88154fc6-8509-42b7-af53-f5aa16d94599	create	review	\N	POST /api/v1/reviews/67180a82-a332-4b14-85d6-04bbcfeb3d42/comments → 201	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/144.0.0.0 Safari/537.36	2026-09-28 04:04:55.172424+00
443c3665-96a0-46e2-af79-b38ba6d210a4	88154fc6-8509-42b7-af53-f5aa16d94599	update	review	\N	PATCH /api/v1/reviews/67180a82-a332-4b14-85d6-04bbcfeb3d42/complete → 200	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/144.0.0.0 Safari/537.36	2026-09-28 04:08:27.268522+00
5e7f505f-1bf4-4cac-97d2-8405f179d646	\N	create	auth	\N	POST /api/v1/auth/login → 200	127.0.0.1	Python-urllib/3.13	2026-09-28 04:09:20.873995+00
a4da90d6-edff-4905-b0da-7dbec01e67b6	\N	create	auth	\N	POST /api/v1/auth/login → 200	127.0.0.1	Python-urllib/3.13	2026-09-28 04:10:05.05935+00
3dd19ef0-9080-4cac-b93a-e756e732fbdd	\N	create	auth	\N	POST /api/v1/auth/login → 200	127.0.0.1	Python-urllib/3.13	2026-09-28 04:10:54.481831+00
e0b9b634-4001-4d7b-bced-e90726674c3b	88154fc6-8509-42b7-af53-f5aa16d94599	create	auth	\N	POST /api/v1/auth/logout → 200	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/144.0.0.0 Safari/537.36	2026-09-28 04:11:39.500053+00
927ad332-e1ce-4f30-891f-7d53fb32093b	\N	create	auth	\N	POST /api/v1/auth/login → 200	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/144.0.0.0 Safari/537.36	2026-09-28 04:11:45.765224+00
d2e93c0e-a5f7-477e-bdef-7d8765b7f002	\N	create	auth	\N	POST /api/v1/auth/refresh → 200	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/144.0.0.0 Safari/537.36	2026-09-28 04:26:56.561614+00
1b835427-e65f-426a-96df-8a2e4f8ed34b	\N	create	auth	\N	POST /api/v1/auth/login → 200	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	2026-09-28 04:37:18.09343+00
40e20346-6616-48ec-995e-05d6691ae798	\N	create	auth	\N	POST /api/v1/auth/login → 200	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/144.0.0.0 Safari/537.36	2026-09-28 04:38:48.015299+00
e533dbe2-0ca5-4af5-938c-b82c68e06506	\N	create	auth	\N	POST /api/v1/auth/refresh → 200	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/144.0.0.0 Safari/537.36	2026-09-28 04:53:49.032245+00
e4cf571e-6402-4f09-afed-0d904429a522	\N	create	auth	\N	POST /api/v1/auth/refresh → 200	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/144.0.0.0 Safari/537.36	2026-09-28 05:08:51.821068+00
0f43d8cb-48e7-48ca-8e23-303f524ebf98	\N	create	auth	\N	POST /api/v1/auth/login → 200	127.0.0.1	Python-urllib/3.13	2026-09-28 06:07:02.054997+00
6ee46dc9-2fcb-4dfc-8c44-de1263dc358a	\N	create	auth	\N	POST /api/v1/auth/refresh → 401	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	2026-10-08 12:38:59.204473+00
\.


--
-- Data for Name: check_artifacts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.check_artifacts (id, check_id, artifact_type, relative_path, size_bytes, sha256, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: citations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.citations (id, thesis_id, reference_id, context, created_at) FROM stdin;
\.


--
-- Data for Name: findings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.findings (id, check_id, finding_type, severity, rule_ref, message, anchor, suggestion, evidence, status, source, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, recipient_id, notification_type, title, content, status, read_at, created_at, updated_at) FROM stdin;
ec4aac89-7e53-4cce-8fbd-46fb2b6f40fe	c27cc2d8-1d62-4056-a596-6abbb1d2430a	check_completed	查重完成	您的论文查重已完成，全文相似率 18%，请查看详细报告。	unread	\N	2026-09-28 03:42:43.383937+00	2026-09-28 03:42:43.383949+00
012de678-6a81-43fe-952a-3a2e00ac5257	c27cc2d8-1d62-4056-a596-6abbb1d2430a	thesis_submitted	论文已提交	您的论文「基于深度学习的学术论文质量评估方法研究」已成功提交。	unread	\N	2026-09-28 03:58:55.603345+00	2026-09-28 03:58:55.603359+00
a860f091-25ab-4612-a6ad-aafda44bd6cc	c27cc2d8-1d62-4056-a596-6abbb1d2430a	review_requested	论文进入评审	您的论文「基于深度学习的学术论文质量评估方法研究」已进入评审阶段，评审专家已开始审阅。	unread	\N	2026-09-28 04:02:44.420056+00	2026-09-28 04:02:44.4201+00
87a5b542-f595-4f06-88f8-477b51c1688b	c27cc2d8-1d62-4056-a596-6abbb1d2430a	review_completed	评审已完成	您的论文「基于深度学习的学术论文质量评估方法研究」已完成评审，评分：80分，请查看评审意见并等待最终决定。	unread	\N	2026-09-28 04:08:27.2617+00	2026-09-28 04:08:27.26171+00
\.


--
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.organizations (id, name, parent_id, org_type, created_at, updated_at) FROM stdin;
3fa4d570-71bc-4909-baf8-676c0446aa8a	计算机科学与技术学院	\N	department	2026-09-28 03:32:53.693802+00	2026-09-28 03:32:53.693802+00
\.


--
-- Data for Name: references; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."references" (id, title, authors, year, reference_type, source, doi, url, abstract, keywords, created_at, updated_at) FROM stdin;
56e54e30-bb4a-4f22-ba6d-f8b474e4debf	Attention Is All You Need	{"Ashish Vaswani","Noam Shazeer","Niki Parmar"}	2017	journal	NeurIPS 2017	10.48550/arXiv.1706.03762	https://arxiv.org/abs/1706.03762	The dominant sequence transduction models are based on complex recurrent or convolutional neural networks. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms.	{transformer,attention,"neural networks"}	2026-09-28 03:32:54.240845+00	2026-09-28 03:32:54.243165+00
\.


--
-- Data for Name: review_comments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.review_comments (id, review_id, section, content, severity, resolved, created_at, updated_at) FROM stdin;
c5f799e8-ab18-43d0-8699-4e0bfd0daa49	67180a82-a332-4b14-85d6-04bbcfeb3d42	摘要	摘要中\\ 多个公开数据集\\表述过于模糊，建议明确列出数据集名称与规模；\\准确率\\建议改为与人工评分的一致性指标（如 Spearman 相关性）。	info	f	2026-09-28 04:04:55.165941+00	2026-09-28 04:04:55.165951+00
\.


--
-- Data for Name: reviews; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reviews (id, thesis_id, reviewer_id, status, score, summary, created_at, updated_at) FROM stdin;
67180a82-a332-4b14-85d6-04bbcfeb3d42	2e433d63-fdac-4d43-9273-0ed455b8fab0	88154fc6-8509-42b7-af53-f5aa16d94599	completed	80.0	论文选题有价值，方法框架完整，实验验证较为系统。摘要表述需更具体，建议补充数据集与指标细节后通过。综合评分80分，修改后通过。	2026-09-28 04:02:44.394318+00	2026-09-28 04:08:27.257795+00
\.


--
-- Data for Name: rule_packs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.rule_packs (id, name, kind, version, rules, status, description, created_by, published_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: similarity_checks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.similarity_checks (id, thesis_id, requested_by, provider, provider_task_id, status, progress, similarity_score, report, error, created_at, updated_at) FROM stdin;
6ff6540e-d022-4b8b-84db-441ee82943ca	2e433d63-fdac-4d43-9273-0ed455b8fab0	c27cc2d8-1d62-4056-a596-6abbb1d2430a	paperfree	pf-1790566947802-7dcedd3a3b4e-f191b869	completed	100	18.00	{"provider": "PaperFree (LLM 模拟)", "simulated": true, "conclusion": "全文相似率为 18.0%，处于较低水平，通过检测。", "quote_rate": 3.0, "total_words": 537, "report_title": "基于深度学习的学术论文质量评估方法研究", "similar_words": 96, "reference_rate": 5.0, "similarity_score": 18.0, "matched_fragments": [{"text": "第一章 绪论。学术论文质量评估是科研管理工作的核心环节，传统依赖专家人工评审的方式不仅成本高昂，而且容易出现评分不一致的现象，因此亟需一种客观、可复现的自动化评估手段。", "source_db": "Global Academic Lite", "similarity": 62.0, "source_url": null, "source_title": "Automated Evaluation Frameworks for Research Integrity in Hi"}, {"text": "第二章 相关工作。近年来，深度学习技术在自然语言处理领域取得了显著进展，预训练语言模型的出现使得文本语义表示能力大幅提升，为学术文本的细粒度质量分析提供了全新的技术基础。", "source_db": "Natural Language Pro", "similarity": 58.0, "source_url": null, "source_title": "The Impact of Pre-trained Models on Fine-grained Text Analys"}, {"text": "第四章 实验与分析。实验结果表明，所提出的方法在准确率与稳定性两个维度上均优于现有基线方法，消融实验进一步验证了语义特征对整体评估性能的贡献最为显著。", "source_db": "Data Science & Engin", "similarity": 45.0, "source_url": null, "source_title": "Benchmarking Neural Network Approaches for Document Quality "}]}	\N	2026-09-28 03:42:27.812629+00	2026-09-28 03:42:43.379116+00
\.


--
-- Data for Name: theses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.theses (id, title, author_id, advisor_id, status, thesis_type, abstract, keywords, version, file_path, created_at, updated_at) FROM stdin;
85bcdd74-85fd-4903-b230-5a892734c028	面向科研协作的知识图谱构建与应用	c27cc2d8-1d62-4056-a596-6abbb1d2430a	88154fc6-8509-42b7-af53-f5aa16d94599	submitted	master	本文研究面向科研协作场景的知识图谱构建方法，提出了基于本体工程的领域知识建模框架。	{知识图谱,科研协作,本体工程}	1	\N	2026-09-28 03:32:54.239215+00	2026-09-28 03:32:54.239998+00
2e433d63-fdac-4d43-9273-0ed455b8fab0	基于深度学习的学术论文质量评估方法研究	c27cc2d8-1d62-4056-a596-6abbb1d2430a	88154fc6-8509-42b7-af53-f5aa16d94599	in_review	master	本文提出了一种基于深度学习的学术论文质量评估方法，通过多维特征提取和神经网络模型实现自动化评估。	{深度学习,论文评估,自然语言处理}	1	c27cc2d8-1d62-4056-a596-6abbb1d2430a\\2e433d63-fdac-4d43-9273-0ed455b8fab0\\thesis-v1.txt	2026-09-28 03:32:54.218381+00	2026-09-28 04:02:44.416875+00
\.


--
-- Data for Name: thesis_versions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.thesis_versions (id, thesis_id, version_number, file_path, change_summary, created_by, created_at) FROM stdin;
3cef9004-a7cf-4666-b07f-7dfefc39eee7	2e433d63-fdac-4d43-9273-0ed455b8fab0	1	c27cc2d8-1d62-4056-a596-6abbb1d2430a\\2e433d63-fdac-4d43-9273-0ed455b8fab0\\thesis-v1.txt	\N	c27cc2d8-1d62-4056-a596-6abbb1d2430a	2026-09-28 03:41:41.763126+00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, name, password_hash, role, status, organization_id, mfa_enabled, created_at, updated_at, tier) FROM stdin;
bc435256-05ee-47b3-b45f-c468d02e2bf8	admin@aidanthesis.dev	System Admin	$2b$12$H.X3.afpdO04Z2TdjzPqNeB9G2QCCcH6sFX2lz2suVE60LiIEWmwS	super_admin	active	3fa4d570-71bc-4909-baf8-676c0446aa8a	f	2026-09-28 03:32:53.864793+00	2026-09-28 03:32:53.869387+00	free
88154fc6-8509-42b7-af53-f5aa16d94599	advisor@aidanthesis.dev	张导师	$2b$12$bnKWoQcpLzJdDhrJYSjvhuMzC3lP4uITik14ep6lquQeJCsSS.2R.	advisor	active	3fa4d570-71bc-4909-baf8-676c0446aa8a	f	2026-09-28 03:32:54.042397+00	2026-09-28 03:32:54.043583+00	free
c27cc2d8-1d62-4056-a596-6abbb1d2430a	student@aidanthesis.dev	李同学	$2b$12$SWhN0W1FrlbbMS/OewHCj.Ty1a96L2SgVJWH6pm/6W0v4cnTZCsKy	student	active	3fa4d570-71bc-4909-baf8-676c0446aa8a	f	2026-09-28 03:32:54.213806+00	2026-09-28 03:32:54.216131+00	free
\.


--
-- Name: ai_call_logs ai_call_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_call_logs
    ADD CONSTRAINT ai_call_logs_pkey PRIMARY KEY (id);


--
-- Name: aidean_accounts aidean_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aidean_accounts
    ADD CONSTRAINT aidean_accounts_pkey PRIMARY KEY (id);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: check_artifacts check_artifacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.check_artifacts
    ADD CONSTRAINT check_artifacts_pkey PRIMARY KEY (id);


--
-- Name: citations citations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.citations
    ADD CONSTRAINT citations_pkey PRIMARY KEY (id);


--
-- Name: findings findings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.findings
    ADD CONSTRAINT findings_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: references references_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."references"
    ADD CONSTRAINT references_pkey PRIMARY KEY (id);


--
-- Name: review_comments review_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_comments
    ADD CONSTRAINT review_comments_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: rule_packs rule_packs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rule_packs
    ADD CONSTRAINT rule_packs_pkey PRIMARY KEY (id);


--
-- Name: similarity_checks similarity_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.similarity_checks
    ADD CONSTRAINT similarity_checks_pkey PRIMARY KEY (id);


--
-- Name: theses theses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.theses
    ADD CONSTRAINT theses_pkey PRIMARY KEY (id);


--
-- Name: thesis_versions thesis_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thesis_versions
    ADD CONSTRAINT thesis_versions_pkey PRIMARY KEY (id);


--
-- Name: check_artifacts uq_check_artifacts_path; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.check_artifacts
    ADD CONSTRAINT uq_check_artifacts_path UNIQUE (check_id, artifact_type, relative_path);


--
-- Name: rule_packs uq_rule_packs_name_version; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rule_packs
    ADD CONSTRAINT uq_rule_packs_name_version UNIQUE (name, version);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: ix_ai_call_logs_celery_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ai_call_logs_celery_task_id ON public.ai_call_logs USING btree (celery_task_id);


--
-- Name: ix_ai_call_logs_requested_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ai_call_logs_requested_by ON public.ai_call_logs USING btree (requested_by);


--
-- Name: ix_ai_call_logs_task_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ai_call_logs_task_type ON public.ai_call_logs USING btree (task_type);


--
-- Name: ix_ai_call_logs_thesis_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ai_call_logs_thesis_id ON public.ai_call_logs USING btree (thesis_id);


--
-- Name: ix_aidean_accounts_sub; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_aidean_accounts_sub ON public.aidean_accounts USING btree (sub);


--
-- Name: ix_aidean_accounts_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_aidean_accounts_user_id ON public.aidean_accounts USING btree (user_id);


--
-- Name: ix_audit_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_audit_logs_action ON public.audit_logs USING btree (action);


--
-- Name: ix_audit_logs_actor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_audit_logs_actor_id ON public.audit_logs USING btree (actor_id);


--
-- Name: ix_audit_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_audit_logs_created_at ON public.audit_logs USING btree (created_at);


--
-- Name: ix_audit_logs_resource_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_audit_logs_resource_type ON public.audit_logs USING btree (resource_type);


--
-- Name: ix_check_artifacts_check_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_check_artifacts_check_id ON public.check_artifacts USING btree (check_id);


--
-- Name: ix_citations_reference_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_citations_reference_id ON public.citations USING btree (reference_id);


--
-- Name: ix_citations_thesis_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_citations_thesis_id ON public.citations USING btree (thesis_id);


--
-- Name: ix_findings_check_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_findings_check_id ON public.findings USING btree (check_id);


--
-- Name: ix_findings_finding_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_findings_finding_type ON public.findings USING btree (finding_type);


--
-- Name: ix_findings_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_findings_status ON public.findings USING btree (status);


--
-- Name: ix_notifications_recipient_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_notifications_recipient_id ON public.notifications USING btree (recipient_id);


--
-- Name: ix_references_doi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_references_doi ON public."references" USING btree (doi);


--
-- Name: ix_review_comments_review_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_review_comments_review_id ON public.review_comments USING btree (review_id);


--
-- Name: ix_reviews_reviewer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_reviews_reviewer_id ON public.reviews USING btree (reviewer_id);


--
-- Name: ix_reviews_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_reviews_status ON public.reviews USING btree (status);


--
-- Name: ix_reviews_thesis_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_reviews_thesis_id ON public.reviews USING btree (thesis_id);


--
-- Name: ix_rule_packs_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_rule_packs_name ON public.rule_packs USING btree (name);


--
-- Name: ix_rule_packs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_rule_packs_status ON public.rule_packs USING btree (status);


--
-- Name: ix_similarity_checks_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_similarity_checks_status ON public.similarity_checks USING btree (status);


--
-- Name: ix_similarity_checks_thesis_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_similarity_checks_thesis_id ON public.similarity_checks USING btree (thesis_id);


--
-- Name: ix_theses_author_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_theses_author_id ON public.theses USING btree (author_id);


--
-- Name: ix_theses_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_theses_status ON public.theses USING btree (status);


--
-- Name: ix_thesis_versions_thesis_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_thesis_versions_thesis_id ON public.thesis_versions USING btree (thesis_id);


--
-- Name: ix_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_users_email ON public.users USING btree (email);


--
-- Name: aidean_accounts aidean_accounts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aidean_accounts
    ADD CONSTRAINT aidean_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: check_artifacts check_artifacts_check_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.check_artifacts
    ADD CONSTRAINT check_artifacts_check_id_fkey FOREIGN KEY (check_id) REFERENCES public.similarity_checks(id) ON DELETE CASCADE;


--
-- Name: citations citations_reference_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.citations
    ADD CONSTRAINT citations_reference_id_fkey FOREIGN KEY (reference_id) REFERENCES public."references"(id) ON DELETE CASCADE;


--
-- Name: citations citations_thesis_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.citations
    ADD CONSTRAINT citations_thesis_id_fkey FOREIGN KEY (thesis_id) REFERENCES public.theses(id) ON DELETE CASCADE;


--
-- Name: findings findings_check_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.findings
    ADD CONSTRAINT findings_check_id_fkey FOREIGN KEY (check_id) REFERENCES public.similarity_checks(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.users(id);


--
-- Name: organizations organizations_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.organizations(id);


--
-- Name: review_comments review_comments_review_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_comments
    ADD CONSTRAINT review_comments_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.reviews(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.users(id);


--
-- Name: reviews reviews_thesis_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_thesis_id_fkey FOREIGN KEY (thesis_id) REFERENCES public.theses(id) ON DELETE CASCADE;


--
-- Name: rule_packs rule_packs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rule_packs
    ADD CONSTRAINT rule_packs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: similarity_checks similarity_checks_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.similarity_checks
    ADD CONSTRAINT similarity_checks_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(id);


--
-- Name: similarity_checks similarity_checks_thesis_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.similarity_checks
    ADD CONSTRAINT similarity_checks_thesis_id_fkey FOREIGN KEY (thesis_id) REFERENCES public.theses(id) ON DELETE CASCADE;


--
-- Name: theses theses_advisor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.theses
    ADD CONSTRAINT theses_advisor_id_fkey FOREIGN KEY (advisor_id) REFERENCES public.users(id);


--
-- Name: theses theses_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.theses
    ADD CONSTRAINT theses_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- Name: thesis_versions thesis_versions_thesis_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thesis_versions
    ADD CONSTRAINT thesis_versions_thesis_id_fkey FOREIGN KEY (thesis_id) REFERENCES public.theses(id) ON DELETE CASCADE;


--
-- Name: users users_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- PostgreSQL database dump complete
--

\unrestrict USyD9TZ2TPQOhXTxgCZaiTykdZn4LjjZUkUiFFvgcVrpKFFFaTr8h9deVfuP4U3

