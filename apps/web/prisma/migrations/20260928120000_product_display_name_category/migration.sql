-- #71 产品中文命名与二级分类：products 增 display_name/category + enum ProductCategory（真源 schema 生成，diff 与手裁一致）

-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('1', '2', '3');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "category" "ProductCategory",
ADD COLUMN     "display_name" TEXT;
