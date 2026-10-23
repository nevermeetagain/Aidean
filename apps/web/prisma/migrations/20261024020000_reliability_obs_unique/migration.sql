-- T120-13 · reliability_observations 幂等唯一键 (entity_type, entity_id, window_start)
-- 1) 去重：同键保留最新（created_at DESC, id DESC），其余删除。
--    熔断：待删重复行 > 1000 → 中止迁移（破坏性删除需先报用户，任务卡阻塞条件）。
-- 2) 建唯一索引（Prisma @@unique 同名）。

DO $$
DECLARE
  dup_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO dup_count FROM (
    SELECT "id", ROW_NUMBER() OVER (
      PARTITION BY "entity_type", "entity_id", "window_start"
      ORDER BY "created_at" DESC, "id" DESC
    ) AS rn
    FROM "reliability_observations"
  ) t WHERE t.rn > 1;

  IF dup_count > 1000 THEN
    RAISE EXCEPTION 'T120-13: reliability_observations 待删重复行 % > 1000，已中止（需用户裁决）', dup_count;
  END IF;

  DELETE FROM "reliability_observations" r
  USING (
    SELECT "id", ROW_NUMBER() OVER (
      PARTITION BY "entity_type", "entity_id", "window_start"
      ORDER BY "created_at" DESC, "id" DESC
    ) AS rn
    FROM "reliability_observations"
  ) d
  WHERE r."id" = d."id" AND d.rn > 1;
END $$;

-- CreateIndex
CREATE UNIQUE INDEX "reliability_observations_entity_type_entity_id_window_start_key"
  ON "reliability_observations"("entity_type", "entity_id", "window_start");
