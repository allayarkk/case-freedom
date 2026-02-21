-- CreateEnum
CREATE TYPE "TicketType" AS ENUM ('COMPLAINT', 'DATA_CHANGE', 'CONSULTATION', 'CLAIM', 'APP_MALFUNCTION', 'FRAUD', 'SPAM');

-- CreateEnum
CREATE TYPE "Sentiment" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE');

-- CreateEnum
CREATE TYPE "Segment" AS ENUM ('VIP', 'MASS', 'PRIORITY');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('KZ', 'ENG', 'RU');

-- CreateEnum
CREATE TYPE "ManagerPosition" AS ENUM ('SPECIALIST', 'SENIOR_SPECIALIST', 'LEAD_SPECIALIST');

-- CreateEnum
CREATE TYPE "ManagerSkill" AS ENUM ('VIP', 'ENG', 'KZ');

-- CreateTable
CREATE TABLE "Office" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Office_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Manager" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "position" "ManagerPosition" NOT NULL,
    "officeId" TEXT NOT NULL,
    "skills" "ManagerSkill"[],
    "activeTicketCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Manager_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "clientGuid" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "attachments" TEXT,
    "segment" "Segment" NOT NULL,
    "country" TEXT NOT NULL,
    "oblast" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "houseNumber" TEXT NOT NULL,
    "managerId" TEXT,
    "officeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketAnalysis" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "type" "TicketType" NOT NULL,
    "sentiment" "Sentiment" NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "language" "Language" NOT NULL DEFAULT 'RU',
    "summary" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentLog" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "fromManagerId" TEXT,
    "toManagerId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssignmentLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Ticket_segment_idx" ON "Ticket"("segment");

-- CreateIndex
CREATE INDEX "Ticket_managerId_idx" ON "Ticket"("managerId");

-- CreateIndex
CREATE INDEX "Ticket_officeId_idx" ON "Ticket"("officeId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketAnalysis_ticketId_key" ON "TicketAnalysis"("ticketId");

-- AddForeignKey
ALTER TABLE "Manager" ADD CONSTRAINT "Manager_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Manager"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketAnalysis" ADD CONSTRAINT "TicketAnalysis_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentLog" ADD CONSTRAINT "AssignmentLog_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentLog" ADD CONSTRAINT "AssignmentLog_fromManagerId_fkey" FOREIGN KEY ("fromManagerId") REFERENCES "Manager"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentLog" ADD CONSTRAINT "AssignmentLog_toManagerId_fkey" FOREIGN KEY ("toManagerId") REFERENCES "Manager"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentLog" ADD CONSTRAINT "AssignmentLog_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "Manager"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
