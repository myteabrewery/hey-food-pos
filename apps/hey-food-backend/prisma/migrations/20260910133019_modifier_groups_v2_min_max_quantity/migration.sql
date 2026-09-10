/*
  Warnings:

  - You are about to drop the column `required` on the `product_modifier_groups` table. All the data in the column will be lost.
  - Added the required column `quantity` to the `order_item_modifiers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `min_selections` to the `product_modifier_groups` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quantity_enabled` to the `product_modifier_options` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "order_item_modifiers" ADD COLUMN     "quantity" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "product_modifier_groups" DROP COLUMN "required",
ADD COLUMN     "max_selections" INTEGER,
ADD COLUMN     "min_selections" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "product_modifier_options" ADD COLUMN     "quantity_enabled" BOOLEAN NOT NULL;
