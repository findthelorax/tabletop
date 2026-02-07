-- CreateTable
CREATE TABLE "Server" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Server_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "FloorplanSection" ADD COLUMN     "serverId" TEXT;

-- AlterTable
ALTER TABLE "TableSeating" ADD COLUMN     "serverId" TEXT;

-- CreateIndex
CREATE INDEX "Server_restaurantId_name_idx" ON "Server"("restaurantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Server_restaurantId_name_key" ON "Server"("restaurantId", "name");

-- CreateIndex
CREATE INDEX "TableSeating_restaurantId_serverId_seatedAt_idx" ON "TableSeating"("restaurantId", "serverId", "seatedAt");

-- AddForeignKey
ALTER TABLE "Server" ADD CONSTRAINT "Server_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FloorplanSection" ADD CONSTRAINT "FloorplanSection_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableSeating" ADD CONSTRAINT "TableSeating_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE SET NULL ON UPDATE CASCADE;
