-- T120-12 · monitor_run_requests：后台「立即运行」意图表（05_数据模型基线 §2.1）
CREATE TABLE "monitor_run_requests" (
    "id" UUID NOT NULL,
    "source_key" VARCHAR(40) NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'pending',
    "requested_by" UUID NOT NULL,
    "result_count" INTEGER,
    "error" VARCHAR(2000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "monitor_run_requests_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "monitor_run_requests_status_check" CHECK ("status" IN ('pending', 'running', 'done', 'failed')),
    CONSTRAINT "monitor_run_requests_result_count_check" CHECK ("result_count" IS NULL OR "result_count" >= 0)
);

-- 运行历史分页
CREATE INDEX "monitor_run_requests_source_created_idx" ON "monitor_run_requests"("source_key", "created_at" DESC);

-- 幂等键：同源至多一条活动请求（pending/running）；并发重复插入撞 23505 → 10006
CREATE UNIQUE INDEX "monitor_run_requests_active_key" ON "monitor_run_requests"("source_key") WHERE "status" IN ('pending', 'running');

ALTER TABLE "monitor_run_requests"
    ADD CONSTRAINT "monitor_run_requests_source_key_fkey" FOREIGN KEY ("source_key") REFERENCES "monitoring_sources"("key") ON DELETE CASCADE ON UPDATE CASCADE;
