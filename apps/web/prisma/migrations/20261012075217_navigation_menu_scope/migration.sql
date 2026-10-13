/*
  Warnings:

  - Made the column `priority` on table `custom_channels` required. This step will fail if there are existing NULL values in that column.
  - Made the column `weight` on table `custom_channels` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "NavScope" AS ENUM ('SITE', 'ADMIN');

-- AlterTable
ALTER TABLE "custom_channels" ALTER COLUMN "priority" SET NOT NULL,
ALTER COLUMN "weight" SET NOT NULL;

-- AlterTable
ALTER TABLE "navigation_menus" ADD COLUMN     "required_permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "scope" "NavScope" NOT NULL DEFAULT 'SITE';

-- CreateIndex
CREATE INDEX "navigation_menus_scope_idx" ON "navigation_menus"("scope");

-- AddForeignKey
ALTER TABLE "evidence_chains" ADD CONSTRAINT "evidence_chains_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "discovery_candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
