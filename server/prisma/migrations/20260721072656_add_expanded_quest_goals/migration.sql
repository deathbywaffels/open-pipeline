-- AlterTable
ALTER TABLE "SponsorCompany" ADD COLUMN     "lastOutreachAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dailyPasteTarget" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "dailyReachOutTarget" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "lastActiveAt" TIMESTAMP(3);
