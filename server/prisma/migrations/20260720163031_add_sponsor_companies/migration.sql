-- CreateEnum
CREATE TYPE "SponsorOutreachStatus" AS ENUM ('NOT_STARTED', 'RESEARCHING', 'APPLIED', 'REJECTED');

-- CreateTable
CREATE TABLE "SponsorCompany" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'NL',
    "outreachStatus" "SponsorOutreachStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "hiresItWorkers" BOOLEAN,
    "notes" TEXT,
    "careersUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SponsorCompany_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SponsorCompany_userId_country_idx" ON "SponsorCompany"("userId", "country");

-- CreateIndex
CREATE UNIQUE INDEX "SponsorCompany_userId_normalizedName_country_key" ON "SponsorCompany"("userId", "normalizedName", "country");

-- AddForeignKey
ALTER TABLE "SponsorCompany" ADD CONSTRAINT "SponsorCompany_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
