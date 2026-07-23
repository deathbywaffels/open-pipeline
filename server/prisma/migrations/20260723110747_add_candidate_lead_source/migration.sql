-- AlterTable
ALTER TABLE "CandidateLead" ADD COLUMN     "candidateUserId" INTEGER;

-- AddForeignKey
ALTER TABLE "CandidateLead" ADD CONSTRAINT "CandidateLead_candidateUserId_fkey" FOREIGN KEY ("candidateUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
