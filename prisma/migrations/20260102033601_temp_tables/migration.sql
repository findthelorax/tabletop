-- CreateTable
CREATE TABLE "TempTableAssignment" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "floorplanId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "fromSectionId" TEXT NOT NULL,
    "toSectionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "TempTableAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TempTableAssignment_restaurantId_floorplanId_endedAt_idx" ON "TempTableAssignment"("restaurantId", "floorplanId", "endedAt");

-- CreateIndex
CREATE INDEX "TempTableAssignment_restaurantId_floorplanId_toSectionId_en_idx" ON "TempTableAssignment"("restaurantId", "floorplanId", "toSectionId", "endedAt");

-- CreateIndex
CREATE INDEX "TempTableAssignment_restaurantId_floorplanId_tableId_endedA_idx" ON "TempTableAssignment"("restaurantId", "floorplanId", "tableId", "endedAt");

-- AddForeignKey
ALTER TABLE "TempTableAssignment" ADD CONSTRAINT "TempTableAssignment_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TempTableAssignment" ADD CONSTRAINT "TempTableAssignment_floorplanId_fkey" FOREIGN KEY ("floorplanId") REFERENCES "Floorplan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TempTableAssignment" ADD CONSTRAINT "TempTableAssignment_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TempTableAssignment" ADD CONSTRAINT "TempTableAssignment_fromSectionId_fkey" FOREIGN KEY ("fromSectionId") REFERENCES "FloorplanSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TempTableAssignment" ADD CONSTRAINT "TempTableAssignment_toSectionId_fkey" FOREIGN KEY ("toSectionId") REFERENCES "FloorplanSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
