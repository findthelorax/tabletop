/*
  Warnings:

  - A unique constraint covering the columns `[storeNumber]` on the table `Restaurant` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[loginUsername]` on the table `Restaurant` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Restaurant_name_key";

-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "loginUsername" TEXT NOT NULL DEFAULT 'admin',
ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "passwordSalt" TEXT,
ADD COLUMN     "storeNumber" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE UNIQUE INDEX "Restaurant_storeNumber_key" ON "Restaurant"("storeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Restaurant_loginUsername_key" ON "Restaurant"("loginUsername");
