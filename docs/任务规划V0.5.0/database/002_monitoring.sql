-- > 版本: v0.4 | 更新: 2026-10-14 | 变更: V0.4.0 新增——M-002 模型源监控数据模型基线（仅 CREATE，不改既有表；落地任务 TASK-058，必须排在 M-001/TASK-011 之后）
-- 目标迁移名：apps/web/prisma/migrations/20261015000000_model_source_monitoring/migration.sql
-- 口径：PG16；主键 uuid（应用侧 uuid v7，与 schema.prisma @default(uuid(7)) 一致）；时间 timestamp(3)；价格 decimal(19,6) 原币
-- 软删除：monitoring_sources 用 deleted_at；快照/观测/事件为追加型事实表，不软删，按保留期清理（DESIGN-004 §6：快照 180 天、事件 365 天）

CREATE TABLE monitoring_sources (
  id                  uuid PRIMARY KEY,
  key                 varchar(40)  NOT NULL,
  label               varchar(80)  NOT NULL,
  tier                varchar(2)   NOT NULL CHECK (tier IN ('S1','S2','A','B','C')),
  kind                varchar(16)  NOT NULL CHECK (kind IN ('official','cloud','hosted','aggregator','relay','benchmark','community')),
  endpoint            text         NOT NULL,
  docs_url            text,
  auth_required       boolean      NOT NULL DEFAULT false,
  cadence_cron        varchar(64)  NOT NULL DEFAULT '15 2 * * *',
  tos_status          varchar(24)  NOT NULL DEFAULT 'pending' CHECK (tos_status IN ('allowed','attribution_required','pending','forbidden')),
  enabled             boolean      NOT NULL DEFAULT true,
  mapped_entity_type  varchar(16)  CHECK (mapped_entity_type IN ('ModelProvider','APIStation')),
  mapped_entity_id    uuid,
  last_run_at         timestamp(3),
  last_status         varchar(24)  NOT NULL DEFAULT 'never' CHECK (last_status IN ('never','ok','partial','failed','credential_missing','disabled')),
  last_count          integer,
  last_error          varchar(2000),
  created_at          timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at          timestamp(3)
);
CREATE UNIQUE INDEX monitoring_sources_key_key ON monitoring_sources (key);
CREATE INDEX monitoring_sources_enabled_idx ON monitoring_sources (enabled) WHERE deleted_at IS NULL;

CREATE TABLE catalog_snapshots (
  id           uuid PRIMARY KEY,
  source_id    uuid         NOT NULL REFERENCES monitoring_sources(id) ON DELETE CASCADE,
  fetched_at   timestamp(3) NOT NULL,
  item_count   integer      NOT NULL CHECK (item_count >= 0),
  raw_sha256   char(64)     NOT NULL,
  raw_bytes    integer      NOT NULL CHECK (raw_bytes >= 0),
  raw_sample   varchar(2048) NOT NULL DEFAULT '',
  source_url   text         NOT NULL,
  created_at   timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- 同源同哈希不重复入库（REQ-M-003 / 幂等键 sourceKey+rawSha256）
CREATE UNIQUE INDEX catalog_snapshots_source_sha_key ON catalog_snapshots (source_id, raw_sha256);
CREATE INDEX catalog_snapshots_source_fetched_idx ON catalog_snapshots (source_id, fetched_at DESC);

CREATE TABLE provider_model_observations (
  id                   uuid PRIMARY KEY,
  source_id            uuid         NOT NULL REFERENCES monitoring_sources(id) ON DELETE CASCADE,
  external_model_id    varchar(200) NOT NULL,
  normalized_model_id  varchar(200) NOT NULL,
  display_name         varchar(200),
  vendor_hint          varchar(80),
  is_listed            boolean      NOT NULL DEFAULT true,
  price_unit           varchar(24)  CHECK (price_unit IN ('usd_per_1m_tokens','cny_per_1m_tokens','usd_per_request','ratio')),
  price_input          decimal(19,6),
  price_output         decimal(19,6),
  price_cache_read     decimal(19,6),
  context_length       integer,
  first_seen_at        timestamp(3) NOT NULL,
  last_seen_at         timestamp(3) NOT NULL,
  delisted_at          timestamp(3),
  last_snapshot_id     uuid REFERENCES catalog_snapshots(id) ON DELETE SET NULL,
  created_at           timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- 一个源内一个外部模型 ID 只有一行当前观测（upsert 键）
CREATE UNIQUE INDEX pmo_source_external_key ON provider_model_observations (source_id, external_model_id);
-- 查询路径：「某模型在哪些源可调用」（TASK-066）
CREATE INDEX pmo_normalized_listed_idx ON provider_model_observations (normalized_model_id) WHERE is_listed;

CREATE TABLE catalog_change_events (
  id                   uuid PRIMARY KEY,
  source_id            uuid         NOT NULL REFERENCES monitoring_sources(id) ON DELETE CASCADE,
  snapshot_id          uuid         NOT NULL REFERENCES catalog_snapshots(id) ON DELETE CASCADE,
  kind                 varchar(24)  NOT NULL CHECK (kind IN ('listed','delisted','model_first_seen','price_changed')),
  external_model_id    varchar(200) NOT NULL,
  normalized_model_id  varchar(200) NOT NULL,
  price_unit           varchar(24),
  before_input         decimal(19,6),
  before_output        decimal(19,6),
  after_input          decimal(19,6),
  after_output         decimal(19,6),
  delta_pct            double precision,
  source_url           text         NOT NULL,
  detected_at          timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- 幂等键 snapshotId + normalizedModelId + kind（⑤ Events）
CREATE UNIQUE INDEX cce_snapshot_model_kind_key ON catalog_change_events (snapshot_id, normalized_model_id, kind);
-- 后台变更流分页（TASK-063：按 detected_at desc，可按源/类型过滤）
CREATE INDEX cce_detected_idx ON catalog_change_events (detected_at DESC);
CREATE INDEX cce_source_kind_detected_idx ON catalog_change_events (source_id, kind, detected_at DESC);
