-- CreateTable
CREATE TABLE "DashboardAction" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "floorplanId" TEXT,
    "kind" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "undoneAt" TIMESTAMP(3),

    CONSTRAINT "DashboardAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DashboardAction_restaurantId_floorplanId_createdAt_idx" ON "DashboardAction"("restaurantId", "floorplanId", "createdAt");

-- CreateIndex
CREATE INDEX "DashboardAction_restaurantId_floorplanId_undoneAt_createdAt_idx" ON "DashboardAction"("restaurantId", "floorplanId", "undoneAt", "createdAt");
