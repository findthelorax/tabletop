-- CreateEnum
CREATE TYPE "TableStatus" AS ENUM ('AVAILABLE', 'SEATED', 'DIRTY', 'ON_HOLD', 'DISABLED');

-- CreateEnum
CREATE TYPE "TableKind" AS ENUM ('BAR', 'HIGHTOP', 'BOOTH', 'TABLE_AND_CHAIRS', 'MIXED');

-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM ('CALL_AHEAD', 'WAITING', 'ARRIVED', 'SEATED', 'CANCELLED', 'NO_SHOW');

-- CreateTable
CREATE TABLE "Restaurant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Restaurant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Table" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "tableNumber" INTEGER NOT NULL,
    "label" TEXT,
    "capacity" INTEGER NOT NULL,
    "kind" "TableKind" NOT NULL,
    "hasBooth" BOOLEAN NOT NULL DEFAULT false,
    "isStepUp" BOOLEAN NOT NULL DEFAULT false,
    "allowsHighChair" BOOLEAN NOT NULL DEFAULT true,
    "status" "TableStatus" NOT NULL DEFAULT 'AVAILABLE',
    "seatedAt" TIMESTAMP(3),
    "seatedPartySize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Table_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TableSeating" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "partySize" INTEGER NOT NULL,
    "seatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TableSeating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TableStatusEvent" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "fromStatus" "TableStatus",
    "toStatus" "TableStatus" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "partySize" INTEGER,
    "notes" TEXT,
    "seatingId" TEXT,

    CONSTRAINT "TableStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Floorplan" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Floorplan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FloorplanSection" (
    "id" TEXT NOT NULL,
    "floorplanId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "serverName" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FloorplanSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FloorplanSectionTable" (
    "floorplanSectionId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FloorplanSectionTable_pkey" PRIMARY KEY ("floorplanSectionId","tableId")
);

-- CreateTable
CREATE TABLE "WaitlistEntry" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "serviceDay" TEXT NOT NULL,
    "partyName" TEXT NOT NULL,
    "partySize" INTEGER NOT NULL,
    "phoneNumber" TEXT,
    "isCallAhead" BOOLEAN NOT NULL DEFAULT false,
    "quotedWaitMinutes" INTEGER,
    "notes" TEXT,
    "status" "WaitlistStatus" NOT NULL,
    "arrivedAt" TIMESTAMP(3),
    "waitingStartedAt" TIMESTAMP(3),
    "seatedAt" TIMESTAMP(3),
    "seatingId" TEXT,
    "removedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Restaurant_name_key" ON "Restaurant"("name");

-- CreateIndex
CREATE INDEX "Table_restaurantId_status_idx" ON "Table"("restaurantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Table_restaurantId_tableNumber_key" ON "Table"("restaurantId", "tableNumber");

-- CreateIndex
CREATE INDEX "TableSeating_restaurantId_tableId_seatedAt_idx" ON "TableSeating"("restaurantId", "tableId", "seatedAt");

-- CreateIndex
CREATE INDEX "TableSeating_restaurantId_endedAt_idx" ON "TableSeating"("restaurantId", "endedAt");

-- CreateIndex
CREATE INDEX "TableStatusEvent_restaurantId_tableId_occurredAt_idx" ON "TableStatusEvent"("restaurantId", "tableId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "Floorplan_restaurantId_name_key" ON "Floorplan"("restaurantId", "name");

-- CreateIndex
CREATE INDEX "FloorplanSection_floorplanId_sortOrder_idx" ON "FloorplanSection"("floorplanId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "FloorplanSection_floorplanId_name_key" ON "FloorplanSection"("floorplanId", "name");

-- CreateIndex
CREATE INDEX "FloorplanSectionTable_tableId_idx" ON "FloorplanSectionTable"("tableId");

-- CreateIndex
CREATE UNIQUE INDEX "WaitlistEntry_seatingId_key" ON "WaitlistEntry"("seatingId");

-- CreateIndex
CREATE INDEX "WaitlistEntry_restaurantId_status_idx" ON "WaitlistEntry"("restaurantId", "status");

-- CreateIndex
CREATE INDEX "WaitlistEntry_restaurantId_waitingStartedAt_idx" ON "WaitlistEntry"("restaurantId", "waitingStartedAt");

-- CreateIndex
CREATE INDEX "WaitlistEntry_restaurantId_serviceDay_status_idx" ON "WaitlistEntry"("restaurantId", "serviceDay", "status");

-- AddForeignKey
ALTER TABLE "Table" ADD CONSTRAINT "Table_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableSeating" ADD CONSTRAINT "TableSeating_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableSeating" ADD CONSTRAINT "TableSeating_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableStatusEvent" ADD CONSTRAINT "TableStatusEvent_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableStatusEvent" ADD CONSTRAINT "TableStatusEvent_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableStatusEvent" ADD CONSTRAINT "TableStatusEvent_seatingId_fkey" FOREIGN KEY ("seatingId") REFERENCES "TableSeating"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Floorplan" ADD CONSTRAINT "Floorplan_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FloorplanSection" ADD CONSTRAINT "FloorplanSection_floorplanId_fkey" FOREIGN KEY ("floorplanId") REFERENCES "Floorplan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FloorplanSectionTable" ADD CONSTRAINT "FloorplanSectionTable_floorplanSectionId_fkey" FOREIGN KEY ("floorplanSectionId") REFERENCES "FloorplanSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FloorplanSectionTable" ADD CONSTRAINT "FloorplanSectionTable_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_seatingId_fkey" FOREIGN KEY ("seatingId") REFERENCES "TableSeating"("id") ON DELETE SET NULL ON UPDATE CASCADE;
