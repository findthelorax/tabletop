-- AlterTable
ALTER TABLE "Table" ADD COLUMN     "areaId" TEXT;

-- CreateTable
CREATE TABLE "TableArea" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TableArea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TableArea_restaurantId_sortOrder_idx" ON "TableArea"("restaurantId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "TableArea_restaurantId_name_key" ON "TableArea"("restaurantId", "name");

-- CreateIndex
CREATE INDEX "Table_restaurantId_areaId_idx" ON "Table"("restaurantId", "areaId");

-- AddForeignKey
ALTER TABLE "TableArea" ADD CONSTRAINT "TableArea_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Table" ADD CONSTRAINT "Table_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "TableArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;
