/*
  Warnings:

  - You are about to drop the column `api_key` on the `custom_channels` table. All the data in the column will be lost.
  - Made the column `key_cipher` on table `custom_channels` required. This step will fail if there are existing NULL values in that column.
  - Made the column `key_masked` on table `custom_channels` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "custom_channels" DROP COLUMN "api_key",
ALTER COLUMN "key_cipher" SET NOT NULL,
ALTER COLUMN "key_masked" SET NOT NULL;
