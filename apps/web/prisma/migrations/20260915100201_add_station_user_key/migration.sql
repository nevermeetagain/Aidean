-- CreateTable
CREATE TABLE "station_user_keys" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "station_id" TEXT NOT NULL,
    "name" TEXT,
    "key_cipher" TEXT NOT NULL,
    "key_masked" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "station_user_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "station_user_keys_user_id_idx" ON "station_user_keys"("user_id");

-- CreateIndex
CREATE INDEX "station_user_keys_station_id_idx" ON "station_user_keys"("station_id");

-- CreateIndex
CREATE UNIQUE INDEX "station_user_keys_user_id_station_id_key" ON "station_user_keys"("user_id", "station_id");

-- AddForeignKey
ALTER TABLE "station_user_keys" ADD CONSTRAINT "station_user_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "station_user_keys" ADD CONSTRAINT "station_user_keys_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "api_stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
