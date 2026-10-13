--
-- PostgreSQL database dump
--

\restrict 6xdvRI31v8PgPZj2aJFW3kITJ2NiTqdqc0rinCm5ywDGMxBtNotklJdoeJRtbb0

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
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


--
-- Name: article_manifests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.article_manifests (
    id character varying(36) NOT NULL,
    source_id character varying(36) NOT NULL,
    external_id character varying(128) NOT NULL,
    url character varying(512) NOT NULL,
    title character varying(512) NOT NULL,
    publish_time timestamp with time zone,
    content_hash character varying(64) NOT NULL,
    status character varying(16) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: bot_bindings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bot_bindings (
    id character varying(36) NOT NULL,
    user_id character varying(36) NOT NULL,
    channel character varying(32) NOT NULL,
    external_user_id character varying(128) NOT NULL,
    enabled boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: bot_channels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bot_channels (
    id character varying(36) NOT NULL,
    name character varying(128) NOT NULL,
    channel_type character varying(32) NOT NULL,
    webhook_url character varying(512) DEFAULT ''::character varying NOT NULL,
    secret_enc text DEFAULT ''::text NOT NULL,
    extra_config text DEFAULT '{}'::text NOT NULL,
    status character varying(16) DEFAULT 'active'::character varying NOT NULL,
    user_id character varying(36),
    total_push_count integer DEFAULT 0 NOT NULL,
    success_push_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: content_assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.content_assets (
    id character varying(36) NOT NULL,
    source_id character varying(36) NOT NULL,
    external_id character varying(128) NOT NULL,
    url character varying(512) NOT NULL,
    title character varying(512) NOT NULL,
    author character varying(128) NOT NULL,
    published_at timestamp with time zone,
    content_type character varying(16) NOT NULL,
    content_hash character varying(64) NOT NULL,
    raw_uri character varying(512) NOT NULL,
    content_markdown text NOT NULL,
    version integer NOT NULL,
    quality_score double precision NOT NULL,
    status character varying(16) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    hit_count integer DEFAULT 0 NOT NULL,
    category character varying(32) DEFAULT ''::character varying NOT NULL
);


--
-- Name: daily_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_reports (
    id character varying(36) NOT NULL,
    report_date character varying(10) NOT NULL,
    title character varying(256) DEFAULT ''::character varying NOT NULL,
    content_markdown text DEFAULT ''::text NOT NULL,
    topic_count integer DEFAULT 0 NOT NULL,
    status character varying(16) DEFAULT 'draft'::character varying NOT NULL,
    generated_by character varying(16) DEFAULT 'auto'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: engine_key_registrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.engine_key_registrations (
    engine character varying(32) NOT NULL,
    secret_ref text NOT NULL,
    key_id character varying(32) NOT NULL,
    registered_by character varying(36) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: feed_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feed_items (
    id character varying(36) NOT NULL,
    item_type character varying(16) DEFAULT 'article'::character varying NOT NULL,
    ref_id character varying(36) DEFAULT ''::character varying NOT NULL,
    title character varying(512) DEFAULT ''::character varying NOT NULL,
    summary text DEFAULT ''::text NOT NULL,
    source_name character varying(128) DEFAULT ''::character varying NOT NULL,
    score double precision DEFAULT '0'::double precision NOT NULL,
    category character varying(32) DEFAULT ''::character varying NOT NULL,
    url character varying(512) DEFAULT ''::character varying NOT NULL,
    is_pinned boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: hot_topic_articles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hot_topic_articles (
    id character varying(36) NOT NULL,
    hot_topic_id character varying(36) NOT NULL,
    asset_id character varying(36) NOT NULL,
    relevance_score double precision DEFAULT '0'::double precision NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: hot_topics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hot_topics (
    id character varying(36) NOT NULL,
    title character varying(512) NOT NULL,
    summary text DEFAULT ''::text NOT NULL,
    center_asset_id character varying(36),
    hot_score double precision DEFAULT '0'::double precision NOT NULL,
    source_count integer DEFAULT 1 NOT NULL,
    article_count integer DEFAULT 1 NOT NULL,
    status character varying(16) DEFAULT 'rising'::character varying NOT NULL,
    topic_date character varying(10) NOT NULL,
    category character varying(32) DEFAULT ''::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: job_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_items (
    id character varying(36) NOT NULL,
    job_id character varying(36) NOT NULL,
    external_id character varying(128) NOT NULL,
    url character varying(512) NOT NULL,
    status character varying(16) NOT NULL,
    error text NOT NULL,
    retry_count integer NOT NULL,
    completed boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jobs (
    id character varying(36) NOT NULL,
    type character varying(32) NOT NULL,
    user_id character varying(36) NOT NULL,
    payload text NOT NULL,
    status character varying(16) NOT NULL,
    progress integer NOT NULL,
    error text NOT NULL,
    result text NOT NULL,
    idempotency_key character varying(128) NOT NULL,
    worker_heartbeat_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: knowledge_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.knowledge_documents (
    id character varying(36) NOT NULL,
    asset_id character varying(36) NOT NULL,
    space_id character varying(36) NOT NULL,
    langbot_file_id character varying(512) NOT NULL,
    status character varying(16) NOT NULL,
    last_error text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    source character varying(16) DEFAULT 'copy'::character varying NOT NULL,
    content_hash character varying(64) NOT NULL
);


--
-- Name: knowledge_spaces; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.knowledge_spaces (
    id character varying(36) NOT NULL,
    user_id character varying(36) NOT NULL,
    name character varying(128) NOT NULL,
    langbot_kb_uuid character varying(64) NOT NULL,
    status character varying(16) NOT NULL,
    doc_count integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_public boolean DEFAULT false NOT NULL,
    owner_type character varying(16) DEFAULT 'user'::character varying NOT NULL,
    engine character varying(32) DEFAULT 'builtin'::character varying NOT NULL,
    engine_kb_id character varying(128) DEFAULT ''::character varying NOT NULL,
    description character varying(512)
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id character varying(36) NOT NULL,
    sub character varying(128) DEFAULT ''::character varying NOT NULL,
    is_broadcast boolean DEFAULT false NOT NULL,
    channel_type character varying(32) DEFAULT 'web'::character varying NOT NULL,
    title character varying(256) DEFAULT ''::character varying NOT NULL,
    message text DEFAULT ''::text NOT NULL,
    url character varying(512) DEFAULT ''::character varying NOT NULL,
    space_id character varying(64) DEFAULT ''::character varying NOT NULL,
    doc_id character varying(64) DEFAULT ''::character varying NOT NULL,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: process_heartbeats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.process_heartbeats (
    process_key character varying(32) NOT NULL,
    last_heartbeat_at timestamp with time zone DEFAULT now() NOT NULL,
    last_detail character varying(512) DEFAULT ''::character varying NOT NULL
);


--
-- Name: push_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_events (
    id character varying(36) NOT NULL,
    event_type character varying(32) NOT NULL,
    payload text DEFAULT ''::text NOT NULL,
    consumed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: push_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_logs (
    id character varying(36) NOT NULL,
    bot_channel_id character varying(36) NOT NULL,
    push_task_id character varying(36),
    status character varying(16) DEFAULT 'pending'::character varying NOT NULL,
    content_preview character varying(200) DEFAULT ''::character varying NOT NULL,
    error_message text DEFAULT ''::text NOT NULL,
    response_summary character varying(500) DEFAULT ''::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: push_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_tasks (
    id character varying(36) NOT NULL,
    name character varying(128) NOT NULL,
    bot_channel_id character varying(36) NOT NULL,
    trigger_type character varying(16) DEFAULT 'manual'::character varying NOT NULL,
    cron_expr character varying(128) DEFAULT ''::character varying NOT NULL,
    trigger_event character varying(32) DEFAULT ''::character varying NOT NULL,
    content_template text DEFAULT ''::text NOT NULL,
    space_id character varying(36),
    next_run_at timestamp with time zone,
    last_run_at timestamp with time zone,
    status character varying(16) DEFAULT 'active'::character varying NOT NULL,
    created_by character varying(36) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    retry_count integer DEFAULT 0 NOT NULL,
    next_retry_at timestamp with time zone
);


--
-- Name: short_link_maps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.short_link_maps (
    id character varying(36) NOT NULL,
    short_key character varying(128) NOT NULL,
    article_key character varying(128) NOT NULL,
    biz character varying(128) DEFAULT ''::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: source_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.source_subscriptions (
    id character varying(36) NOT NULL,
    user_id character varying(36) NOT NULL,
    source_id character varying(36) NOT NULL,
    space_id character varying(36) NOT NULL,
    sync_policy character varying(32) NOT NULL,
    sync_interval_minutes integer NOT NULL,
    next_run_at timestamp with time zone,
    last_success_at timestamp with time zone,
    consecutive_empty_syncs integer NOT NULL,
    status character varying(16) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    sync_anchor_hour integer
);


--
-- Name: sources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sources (
    id character varying(36) NOT NULL,
    type character varying(32) NOT NULL,
    external_id character varying(128) NOT NULL,
    name character varying(255) NOT NULL,
    url character varying(512) NOT NULL,
    status character varying(16) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id character varying(36) NOT NULL,
    sub character varying(64) NOT NULL,
    email character varying(255) NOT NULL,
    nickname character varying(128) NOT NULL,
    status character varying(16) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    role character varying(32) DEFAULT 'user'::character varying NOT NULL
);


--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.alembic_version (version_num) FROM stdin;
ab1005w5b
\.


--
-- Data for Name: article_manifests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.article_manifests (id, source_id, external_id, url, title, publish_time, content_hash, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: bot_bindings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bot_bindings (id, user_id, channel, external_user_id, enabled, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: bot_channels; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bot_channels (id, name, channel_type, webhook_url, secret_enc, extra_config, status, user_id, total_push_count, success_push_count, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: content_assets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.content_assets (id, source_id, external_id, url, title, author, published_at, content_type, content_hash, raw_uri, content_markdown, version, quality_score, status, created_at, updated_at, hit_count, category) FROM stdin;
\.


--
-- Data for Name: daily_reports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.daily_reports (id, report_date, title, content_markdown, topic_count, status, generated_by, created_at, updated_at) FROM stdin;
13a05016-8b5e-4016-b89e-50503d82f588	2026-10-07	BotHot 热点日报 · 2026-10-07	# BotHot 热点日报 · 2026-10-07\n\n今日暂无热点事件。	0	published	auto	2026-10-08 18:18:27.221846+08	2026-10-08 18:18:27.221846+08
7769732d-a0a6-4a69-bab2-0a224b61425e	2026-10-08	BotHot 热点日报 · 2026-10-08	# BotHot 热点日报 · 2026-10-08\n\n今日暂无热点事件。	0	published	auto	2026-10-09 06:30:03.302729+08	2026-10-09 06:30:03.302729+08
\.


--
-- Data for Name: engine_key_registrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.engine_key_registrations (engine, secret_ref, key_id, registered_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: feed_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.feed_items (id, item_type, ref_id, title, summary, source_name, score, category, url, is_pinned, created_at, updated_at) FROM stdin;
225a6392-35be-40d1-af34-0529750b5138	daily_report	13a05016-8b5e-4016-b89e-50503d82f588	BotHot 热点日报 · 2026-10-07			0			f	2026-10-08 18:18:27.221846+08	2026-10-08 18:18:27.221846+08
11afca60-82c8-45ff-8086-541a437ec943	daily_report	7769732d-a0a6-4a69-bab2-0a224b61425e	BotHot 热点日报 · 2026-10-08			0			f	2026-10-09 06:30:03.302729+08	2026-10-09 06:30:03.302729+08
35b9d3bd-b05c-49b0-adb5-d9b526860567	article	6809a5f4-4ec9-44ae-b618-36b612ddc435	清洗规则验证文章		麻籽研究所	34	其他	https://mp.weixin.qq.com/s/long-key-001?biz=MjM5MjgwNTQ1MQ==&hid=t27	f	2026-10-09 09:41:10.455517+08	2026-10-09 09:41:10.455517+08
8bcb80dd-d99d-4d10-8e8e-92bf627f92e5	article	cdb2f3ba-07ef-4876-8af7-f179c6404b11	清洗规则验证文章		麻籽研究所	34	其他	https://mp.weixin.qq.com/s/long-key-001?biz=MjM5MjgwNTQ1MQ==&hid=t27	f	2026-10-09 10:31:48.943323+08	2026-10-09 10:31:48.943323+08
63250d42-91e7-41d3-947e-3d3e53239ae6	article	0b1d1cc0-bbf3-4c18-88fc-5ac543a29d8c	清洗规则验证文章		麻籽研究所	34	其他	https://mp.weixin.qq.com/s/long-key-001?biz=MjM5MjgwNTQ1MQ==&hid=t27	f	2026-10-09 10:51:19.398496+08	2026-10-09 10:51:19.398496+08
\.


--
-- Data for Name: hot_topic_articles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.hot_topic_articles (id, hot_topic_id, asset_id, relevance_score, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: hot_topics; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.hot_topics (id, title, summary, center_asset_id, hot_score, source_count, article_count, status, topic_date, category, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: job_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.job_items (id, job_id, external_id, url, status, error, retry_count, completed, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: jobs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.jobs (id, type, user_id, payload, status, progress, error, result, idempotency_key, worker_heartbeat_at, created_at, updated_at) FROM stdin;
f25211a3-5f85-4191-946a-979479a3248e	hot_rescore	e25af14d-6053-47c9-97e1-4e9e90600287	{}	SUCCEEDED	1		{}	hot_rescore:2026100910	2026-10-09 10:00:05.965405+08	2026-10-09 10:00:00.984511+08	2026-10-09 10:00:05.974547+08
a8bff680-b39a-494f-bc2e-fc79f9e0a834	daily_report	e25af14d-6053-47c9-97e1-4e9e90600287	{"date": "2026-10-07"}	SUCCEEDED	1		{}	daily_report:2026-10-07	2026-10-08 18:18:27.215132+08	2026-10-08 18:18:22.265399+08	2026-10-08 18:18:27.235695+08
e3ebc7e9-872d-4c9f-830c-45a48cb17e73	hot_cluster	e25af14d-6053-47c9-97e1-4e9e90600287	{"date": "2026-10-08", "days": 1}	SUCCEEDED	1		{}	hot_cluster:2026-10-08:1	2026-10-08 18:18:27.240545+08	2026-10-08 18:18:22.274073+08	2026-10-08 18:18:27.359935+08
3f86e98a-5c57-4312-8289-72e7a050e937	hot_rescore	e25af14d-6053-47c9-97e1-4e9e90600287	{}	SUCCEEDED	1		{}	hot_rescore:2026100818	2026-10-08 18:18:27.366009+08	2026-10-08 18:18:22.279901+08	2026-10-08 18:18:27.370199+08
44179fb9-a1eb-47f8-96ae-1b427153e34a	hot_rescore	e25af14d-6053-47c9-97e1-4e9e90600287	{}	SUCCEEDED	1		{}	hot_rescore:2026100819	2026-10-08 19:00:11.331267+08	2026-10-08 19:00:06.326208+08	2026-10-08 19:00:11.337865+08
c1b22ba7-fe15-4dc4-9edb-5aade7c95378	hot_rescore	e25af14d-6053-47c9-97e1-4e9e90600287	{}	SUCCEEDED	1		{}	hot_rescore:2026100820	2026-10-08 20:00:06.86845+08	2026-10-08 20:00:01.854149+08	2026-10-08 20:00:06.87533+08
ef9a4c87-97fd-4509-a683-24122566d8bc	hot_rescore	e25af14d-6053-47c9-97e1-4e9e90600287	{}	SUCCEEDED	1		{}	hot_rescore:2026100821	2026-10-08 21:00:12.373025+08	2026-10-08 21:00:07.360674+08	2026-10-08 21:00:12.378562+08
411d28cb-01b6-439f-95ac-a748ed149adc	hot_rescore	e25af14d-6053-47c9-97e1-4e9e90600287	{}	SUCCEEDED	1		{}	hot_rescore:2026100822	2026-10-08 22:00:03.176221+08	2026-10-08 22:00:03.158355+08	2026-10-08 22:00:03.184236+08
8bcc0699-615d-4862-ac2d-d0c27610b112	hot_rescore	e25af14d-6053-47c9-97e1-4e9e90600287	{}	SUCCEEDED	1		{}	hot_rescore:2026100911	2026-10-09 11:00:07.042992+08	2026-10-09 11:00:06.778926+08	2026-10-09 11:00:07.059099+08
3443a9a4-cecc-49ce-bff2-a324aeb3d680	hot_rescore	e25af14d-6053-47c9-97e1-4e9e90600287	{}	SUCCEEDED	1		{}	hot_rescore:2026100823	2026-10-08 23:00:05.277864+08	2026-10-08 23:00:00.264775+08	2026-10-08 23:00:05.287811+08
c0654caa-9f6a-4d7d-8e5f-edba00b86918	hot_rescore	e25af14d-6053-47c9-97e1-4e9e90600287	{}	SUCCEEDED	1		{}	hot_rescore:2026100900	2026-10-09 00:00:06.000657+08	2026-10-09 00:00:05.993303+08	2026-10-09 00:00:06.006815+08
113e2df1-e650-4ceb-b947-75d41c5318cd	hot_rescore	e25af14d-6053-47c9-97e1-4e9e90600287	{}	SUCCEEDED	1		{}	hot_rescore:2026100901	2026-10-09 01:00:02.02762+08	2026-10-09 01:00:01.824814+08	2026-10-09 01:00:02.034712+08
5acb70e7-fa4b-4112-9484-657763c14485	hot_rescore	e25af14d-6053-47c9-97e1-4e9e90600287	{}	SUCCEEDED	1		{}	hot_rescore:2026100902	2026-10-09 02:00:07.477073+08	2026-10-09 02:00:07.308567+08	2026-10-09 02:00:07.484619+08
11126062-d956-4f23-bd1f-0f4d6022f9f7	hot_rescore	e25af14d-6053-47c9-97e1-4e9e90600287	{}	SUCCEEDED	1		{}	hot_rescore:2026100903	2026-10-09 03:00:03.271635+08	2026-10-09 03:00:02.988251+08	2026-10-09 03:00:03.277509+08
5a3b4566-bf69-43cd-b48f-1dfea4638fee	hot_rescore	e25af14d-6053-47c9-97e1-4e9e90600287	{}	SUCCEEDED	1		{}	hot_rescore:2026100904	2026-10-09 04:00:08.994994+08	2026-10-09 04:00:08.634856+08	2026-10-09 04:00:09.000593+08
36d05662-f9fa-4102-92b0-96303ae0b730	hot_rescore	e25af14d-6053-47c9-97e1-4e9e90600287	{}	SUCCEEDED	1		{}	hot_rescore:2026100905	2026-10-09 05:00:04.633195+08	2026-10-09 05:00:04.041355+08	2026-10-09 05:00:04.639882+08
8c206e22-cdd5-47bd-b2bc-8984d2394924	hot_rescore	e25af14d-6053-47c9-97e1-4e9e90600287	{}	SUCCEEDED	1		{}	hot_rescore:2026100906	2026-10-09 06:00:10.404937+08	2026-10-09 06:00:09.690183+08	2026-10-09 06:00:10.412174+08
8d69b227-0cf6-40a4-a5c2-50a1e51095db	daily_report	e25af14d-6053-47c9-97e1-4e9e90600287	{"date": "2026-10-08"}	SUCCEEDED	1		{}	daily_report:2026-10-08	2026-10-09 06:30:03.297523+08	2026-10-09 06:30:02.517498+08	2026-10-09 06:30:03.314523+08
072b107d-5656-44d8-b25f-f198a5c7618b	hot_cluster	e25af14d-6053-47c9-97e1-4e9e90600287	{"date": "2026-10-09", "days": 1}	SUCCEEDED	1		{}	hot_cluster:2026-10-09:1	2026-10-09 06:35:03.798134+08	2026-10-09 06:35:02.984013+08	2026-10-09 06:35:03.915996+08
022310ef-295e-49d2-b6c2-032b7f2fbae5	hot_rescore	e25af14d-6053-47c9-97e1-4e9e90600287	{}	SUCCEEDED	1		{}	hot_rescore:2026100907	2026-10-09 07:00:06.284716+08	2026-10-09 07:00:05.268831+08	2026-10-09 07:00:06.291565+08
a282f1f1-f491-484d-816e-8d40797592e1	hot_rescore	e25af14d-6053-47c9-97e1-4e9e90600287	{}	SUCCEEDED	1		{}	hot_rescore:2026100908	2026-10-09 08:00:02.125248+08	2026-10-09 08:00:00.885149+08	2026-10-09 08:00:02.130663+08
b446f56c-6031-437f-b307-414e09209ec7	hot_rescore	e25af14d-6053-47c9-97e1-4e9e90600287	{}	SUCCEEDED	1		{}	hot_rescore:2026100909	2026-10-09 09:00:07.816088+08	2026-10-09 09:00:06.457892+08	2026-10-09 09:00:07.821931+08
\.


--
-- Data for Name: knowledge_documents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.knowledge_documents (id, asset_id, space_id, langbot_file_id, status, last_error, created_at, updated_at, source, content_hash) FROM stdin;
\.


--
-- Data for Name: knowledge_spaces; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.knowledge_spaces (id, user_id, name, langbot_kb_uuid, status, doc_count, created_at, updated_at, is_public, owner_type, engine, engine_kb_id, description) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, sub, is_broadcast, channel_type, title, message, url, space_id, doc_id, read_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: process_heartbeats; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.process_heartbeats (process_key, last_heartbeat_at, last_detail) FROM stdin;
scheduler	2026-10-09 11:34:55.362583+08	
worker	2026-10-09 11:34:55.450006+08	
\.


--
-- Data for Name: push_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.push_events (id, event_type, payload, consumed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: push_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.push_logs (id, bot_channel_id, push_task_id, status, content_preview, error_message, response_summary, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: push_tasks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.push_tasks (id, name, bot_channel_id, trigger_type, cron_expr, trigger_event, content_template, space_id, next_run_at, last_run_at, status, created_by, created_at, updated_at, retry_count, next_retry_at) FROM stdin;
\.


--
-- Data for Name: short_link_maps; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.short_link_maps (id, short_key, article_key, biz, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: source_subscriptions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.source_subscriptions (id, user_id, source_id, space_id, sync_policy, sync_interval_minutes, next_run_at, last_success_at, consecutive_empty_syncs, status, created_at, updated_at, sync_anchor_hour) FROM stdin;
\.


--
-- Data for Name: sources; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sources (id, type, external_id, name, url, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, sub, email, nickname, status, created_at, updated_at, role) FROM stdin;
e25af14d-6053-47c9-97e1-4e9e90600287	qa-admin-001	qa-admin@bothot.local	QA管理员	ACTIVE	2026-10-08 18:18:12.353823+08	2026-10-08 18:18:12.353823+08	admin
7095644c-94ce-4aee-b61e-5c01d969fbeb	qa-operator-001	qa-operator@bothot.local	QA运营	ACTIVE	2026-10-08 18:18:12.366827+08	2026-10-08 18:18:12.366827+08	operator
ffdce332-7576-4f61-bfe6-52af6a0813d4	qa-user-001	qa-user@bothot.local	QA普通用户	ACTIVE	2026-10-08 18:18:12.372361+08	2026-10-08 18:18:12.372361+08	user
6d5a6f70-8ba9-43aa-ab19-da9c6a7d7390	01a0eb19-3a5f-78c3-899b-ed09106e76ef	test@aidean.com	测试用户	ACTIVE	2026-10-09 10:38:23.713964+08	2026-10-09 10:38:23.713964+08	user
\.


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: article_manifests article_manifests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_manifests
    ADD CONSTRAINT article_manifests_pkey PRIMARY KEY (id);


--
-- Name: bot_bindings bot_bindings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_bindings
    ADD CONSTRAINT bot_bindings_pkey PRIMARY KEY (id);


--
-- Name: bot_channels bot_channels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_channels
    ADD CONSTRAINT bot_channels_pkey PRIMARY KEY (id);


--
-- Name: content_assets content_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_assets
    ADD CONSTRAINT content_assets_pkey PRIMARY KEY (id);


--
-- Name: daily_reports daily_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_reports
    ADD CONSTRAINT daily_reports_pkey PRIMARY KEY (id);


--
-- Name: engine_key_registrations engine_key_registrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.engine_key_registrations
    ADD CONSTRAINT engine_key_registrations_pkey PRIMARY KEY (engine);


--
-- Name: feed_items feed_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feed_items
    ADD CONSTRAINT feed_items_pkey PRIMARY KEY (id);


--
-- Name: hot_topic_articles hot_topic_articles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hot_topic_articles
    ADD CONSTRAINT hot_topic_articles_pkey PRIMARY KEY (id);


--
-- Name: hot_topics hot_topics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hot_topics
    ADD CONSTRAINT hot_topics_pkey PRIMARY KEY (id);


--
-- Name: job_items job_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_items
    ADD CONSTRAINT job_items_pkey PRIMARY KEY (id);


--
-- Name: jobs jobs_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: knowledge_documents knowledge_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_documents
    ADD CONSTRAINT knowledge_documents_pkey PRIMARY KEY (id);


--
-- Name: knowledge_spaces knowledge_spaces_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_spaces
    ADD CONSTRAINT knowledge_spaces_pkey PRIMARY KEY (id);


--
-- Name: notifications pk_notifications; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT pk_notifications PRIMARY KEY (id);


--
-- Name: process_heartbeats process_heartbeats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.process_heartbeats
    ADD CONSTRAINT process_heartbeats_pkey PRIMARY KEY (process_key);


--
-- Name: push_events push_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_events
    ADD CONSTRAINT push_events_pkey PRIMARY KEY (id);


--
-- Name: push_logs push_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_logs
    ADD CONSTRAINT push_logs_pkey PRIMARY KEY (id);


--
-- Name: push_tasks push_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_tasks
    ADD CONSTRAINT push_tasks_pkey PRIMARY KEY (id);


--
-- Name: short_link_maps short_link_maps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.short_link_maps
    ADD CONSTRAINT short_link_maps_pkey PRIMARY KEY (id);


--
-- Name: source_subscriptions source_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.source_subscriptions
    ADD CONSTRAINT source_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: sources sources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sources
    ADD CONSTRAINT sources_pkey PRIMARY KEY (id);


--
-- Name: content_assets uq_asset_source_external; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_assets
    ADD CONSTRAINT uq_asset_source_external UNIQUE (source_id, external_id);


--
-- Name: bot_bindings uq_binding_channel_external; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_bindings
    ADD CONSTRAINT uq_binding_channel_external UNIQUE (channel, external_user_id);


--
-- Name: bot_channels uq_bot_channel_name; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_channels
    ADD CONSTRAINT uq_bot_channel_name UNIQUE (name);


--
-- Name: daily_reports uq_daily_report_date; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_reports
    ADD CONSTRAINT uq_daily_report_date UNIQUE (report_date);


--
-- Name: knowledge_documents uq_doc_asset_space; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_documents
    ADD CONSTRAINT uq_doc_asset_space UNIQUE (asset_id, space_id);


--
-- Name: engine_key_registrations uq_engine_key_registration_key_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.engine_key_registrations
    ADD CONSTRAINT uq_engine_key_registration_key_id UNIQUE (key_id);


--
-- Name: feed_items uq_feed_item_type_ref; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feed_items
    ADD CONSTRAINT uq_feed_item_type_ref UNIQUE (item_type, ref_id);


--
-- Name: hot_topic_articles uq_hot_topic_asset; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hot_topic_articles
    ADD CONSTRAINT uq_hot_topic_asset UNIQUE (hot_topic_id, asset_id);


--
-- Name: article_manifests uq_manifest_source_external; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_manifests
    ADD CONSTRAINT uq_manifest_source_external UNIQUE (source_id, external_id);


--
-- Name: short_link_maps uq_shortlink_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.short_link_maps
    ADD CONSTRAINT uq_shortlink_key UNIQUE (short_key);


--
-- Name: sources uq_source_type_external; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sources
    ADD CONSTRAINT uq_source_type_external UNIQUE (type, external_id);


--
-- Name: knowledge_spaces uq_space_user_name; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_spaces
    ADD CONSTRAINT uq_space_user_name UNIQUE (user_id, name);


--
-- Name: source_subscriptions uq_sub_user_source_space; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.source_subscriptions
    ADD CONSTRAINT uq_sub_user_source_space UNIQUE (user_id, source_id, space_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: ix_article_manifests_source_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_article_manifests_source_id ON public.article_manifests USING btree (source_id);


--
-- Name: ix_bot_bindings_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_bot_bindings_user_id ON public.bot_bindings USING btree (user_id);


--
-- Name: ix_bot_channels_channel_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_bot_channels_channel_type ON public.bot_channels USING btree (channel_type);


--
-- Name: ix_bot_channels_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_bot_channels_status ON public.bot_channels USING btree (status);


--
-- Name: ix_bot_channels_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_bot_channels_user_id ON public.bot_channels USING btree (user_id);


--
-- Name: ix_content_assets_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_content_assets_category ON public.content_assets USING btree (category);


--
-- Name: ix_content_assets_source_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_content_assets_source_id ON public.content_assets USING btree (source_id);


--
-- Name: ix_daily_reports_report_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_daily_reports_report_date ON public.daily_reports USING btree (report_date);


--
-- Name: ix_daily_reports_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_daily_reports_status ON public.daily_reports USING btree (status);


--
-- Name: ix_feed_items_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_feed_items_category ON public.feed_items USING btree (category);


--
-- Name: ix_feed_items_item_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_feed_items_item_type ON public.feed_items USING btree (item_type);


--
-- Name: ix_feed_items_ref_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_feed_items_ref_id ON public.feed_items USING btree (ref_id);


--
-- Name: ix_feed_items_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_feed_items_score ON public.feed_items USING btree (score);


--
-- Name: ix_hot_topic_articles_asset_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_hot_topic_articles_asset_id ON public.hot_topic_articles USING btree (asset_id);


--
-- Name: ix_hot_topic_articles_hot_topic_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_hot_topic_articles_hot_topic_id ON public.hot_topic_articles USING btree (hot_topic_id);


--
-- Name: ix_hot_topics_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_hot_topics_category ON public.hot_topics USING btree (category);


--
-- Name: ix_hot_topics_center_asset_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_hot_topics_center_asset_id ON public.hot_topics USING btree (center_asset_id);


--
-- Name: ix_hot_topics_hot_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_hot_topics_hot_score ON public.hot_topics USING btree (hot_score);


--
-- Name: ix_hot_topics_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_hot_topics_status ON public.hot_topics USING btree (status);


--
-- Name: ix_hot_topics_topic_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_hot_topics_topic_date ON public.hot_topics USING btree (topic_date);


--
-- Name: ix_job_items_job_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_job_items_job_id ON public.job_items USING btree (job_id);


--
-- Name: ix_jobs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_jobs_status ON public.jobs USING btree (status);


--
-- Name: ix_jobs_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_jobs_type ON public.jobs USING btree (type);


--
-- Name: ix_jobs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_jobs_user_id ON public.jobs USING btree (user_id);


--
-- Name: ix_knowledge_documents_asset_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_knowledge_documents_asset_id ON public.knowledge_documents USING btree (asset_id);


--
-- Name: ix_knowledge_documents_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_knowledge_documents_space_id ON public.knowledge_documents USING btree (space_id);


--
-- Name: ix_knowledge_spaces_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_knowledge_spaces_user_id ON public.knowledge_spaces USING btree (user_id);


--
-- Name: ix_notifications_sub_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_notifications_sub_created ON public.notifications USING btree (sub, created_at);


--
-- Name: ix_push_events_consumed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_push_events_consumed_at ON public.push_events USING btree (consumed_at);


--
-- Name: ix_push_events_event_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_push_events_event_type ON public.push_events USING btree (event_type);


--
-- Name: ix_push_logs_bot_channel_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_push_logs_bot_channel_id ON public.push_logs USING btree (bot_channel_id);


--
-- Name: ix_push_logs_push_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_push_logs_push_task_id ON public.push_logs USING btree (push_task_id);


--
-- Name: ix_push_logs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_push_logs_status ON public.push_logs USING btree (status);


--
-- Name: ix_push_tasks_bot_channel_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_push_tasks_bot_channel_id ON public.push_tasks USING btree (bot_channel_id);


--
-- Name: ix_push_tasks_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_push_tasks_created_by ON public.push_tasks USING btree (created_by);


--
-- Name: ix_push_tasks_next_run_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_push_tasks_next_run_at ON public.push_tasks USING btree (next_run_at);


--
-- Name: ix_push_tasks_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_push_tasks_space_id ON public.push_tasks USING btree (space_id);


--
-- Name: ix_push_tasks_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_push_tasks_status ON public.push_tasks USING btree (status);


--
-- Name: ix_push_tasks_trigger_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_push_tasks_trigger_type ON public.push_tasks USING btree (trigger_type);


--
-- Name: ix_short_link_maps_short_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_short_link_maps_short_key ON public.short_link_maps USING btree (short_key);


--
-- Name: ix_source_subscriptions_source_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_source_subscriptions_source_id ON public.source_subscriptions USING btree (source_id);


--
-- Name: ix_source_subscriptions_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_source_subscriptions_space_id ON public.source_subscriptions USING btree (space_id);


--
-- Name: ix_source_subscriptions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_source_subscriptions_user_id ON public.source_subscriptions USING btree (user_id);


--
-- Name: ix_sources_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sources_type ON public.sources USING btree (type);


--
-- Name: ix_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_users_role ON public.users USING btree (role);


--
-- Name: ix_users_sub; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_users_sub ON public.users USING btree (sub);


--
-- Name: article_manifests article_manifests_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_manifests
    ADD CONSTRAINT article_manifests_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.sources(id) ON DELETE CASCADE;


--
-- Name: bot_bindings bot_bindings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_bindings
    ADD CONSTRAINT bot_bindings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: bot_channels bot_channels_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_channels
    ADD CONSTRAINT bot_channels_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: content_assets content_assets_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_assets
    ADD CONSTRAINT content_assets_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.sources(id) ON DELETE CASCADE;


--
-- Name: engine_key_registrations fk_engine_key_registrations_registered_by_users_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.engine_key_registrations
    ADD CONSTRAINT fk_engine_key_registrations_registered_by_users_id FOREIGN KEY (registered_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: hot_topic_articles hot_topic_articles_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hot_topic_articles
    ADD CONSTRAINT hot_topic_articles_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.content_assets(id) ON DELETE CASCADE;


--
-- Name: hot_topic_articles hot_topic_articles_hot_topic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hot_topic_articles
    ADD CONSTRAINT hot_topic_articles_hot_topic_id_fkey FOREIGN KEY (hot_topic_id) REFERENCES public.hot_topics(id) ON DELETE CASCADE;


--
-- Name: hot_topics hot_topics_center_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hot_topics
    ADD CONSTRAINT hot_topics_center_asset_id_fkey FOREIGN KEY (center_asset_id) REFERENCES public.content_assets(id) ON DELETE SET NULL;


--
-- Name: job_items job_items_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_items
    ADD CONSTRAINT job_items_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: jobs jobs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: knowledge_documents knowledge_documents_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_documents
    ADD CONSTRAINT knowledge_documents_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.content_assets(id) ON DELETE CASCADE;


--
-- Name: knowledge_documents knowledge_documents_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_documents
    ADD CONSTRAINT knowledge_documents_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.knowledge_spaces(id) ON DELETE CASCADE;


--
-- Name: knowledge_spaces knowledge_spaces_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_spaces
    ADD CONSTRAINT knowledge_spaces_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: push_logs push_logs_bot_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_logs
    ADD CONSTRAINT push_logs_bot_channel_id_fkey FOREIGN KEY (bot_channel_id) REFERENCES public.bot_channels(id) ON DELETE CASCADE;


--
-- Name: push_logs push_logs_push_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_logs
    ADD CONSTRAINT push_logs_push_task_id_fkey FOREIGN KEY (push_task_id) REFERENCES public.push_tasks(id) ON DELETE SET NULL;


--
-- Name: push_tasks push_tasks_bot_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_tasks
    ADD CONSTRAINT push_tasks_bot_channel_id_fkey FOREIGN KEY (bot_channel_id) REFERENCES public.bot_channels(id) ON DELETE CASCADE;


--
-- Name: push_tasks push_tasks_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_tasks
    ADD CONSTRAINT push_tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: push_tasks push_tasks_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_tasks
    ADD CONSTRAINT push_tasks_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.knowledge_spaces(id) ON DELETE SET NULL;


--
-- Name: source_subscriptions source_subscriptions_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.source_subscriptions
    ADD CONSTRAINT source_subscriptions_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.sources(id) ON DELETE CASCADE;


--
-- Name: source_subscriptions source_subscriptions_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.source_subscriptions
    ADD CONSTRAINT source_subscriptions_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.knowledge_spaces(id) ON DELETE CASCADE;


--
-- Name: source_subscriptions source_subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.source_subscriptions
    ADD CONSTRAINT source_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 6xdvRI31v8PgPZj2aJFW3kITJ2NiTqdqc0rinCm5ywDGMxBtNotklJdoeJRtbb0

