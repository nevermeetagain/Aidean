-- 自定义渠道调度增强（控制台 MVP 丙）：
-- 纯增列、零回填、可回滚。适用模型白名单 / 优先级 / 分组标签 / 加权（并发分摊）。
-- String[] → TEXT[]（Prisma 6.x postgres provider 语义）；默认值保证旧行读取时行为不变。

-- AlterTable
ALTER TABLE "custom_channels" ADD COLUMN "models" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "custom_channels" ADD COLUMN "priority" INTEGER DEFAULT 100;
ALTER TABLE "custom_channels" ADD COLUMN "group_name" TEXT;
ALTER TABLE "custom_channels" ADD COLUMN "weight" INTEGER DEFAULT 1;