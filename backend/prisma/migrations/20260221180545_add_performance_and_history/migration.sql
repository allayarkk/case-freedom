-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "importSessionId" TEXT;

-- AlterTable
ALTER TABLE "TicketAnalysis" ADD COLUMN     "aiDuration" INTEGER DEFAULT 0,
ADD COLUMN     "geoDuration" INTEGER DEFAULT 0,
ADD COLUMN     "routingDuration" INTEGER DEFAULT 0,
ADD COLUMN     "totalDuration" INTEGER DEFAULT 0;

-- CreateTable
CREATE TABLE "ImportSession" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "totalTickets" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Ticket_importSessionId_idx" ON "Ticket"("importSessionId");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_importSessionId_fkey" FOREIGN KEY ("importSessionId") REFERENCES "ImportSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
