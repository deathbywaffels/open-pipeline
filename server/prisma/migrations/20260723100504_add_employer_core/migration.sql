-- CreateEnum
CREATE TYPE "CandidateLeadStage" AS ENUM ('SOURCED', 'CONTACTED', 'PHONE_SCREEN', 'TECHNICAL_INTERVIEW', 'INTERVIEW', 'OFFER', 'REJECTED');

-- CreateTable
CREATE TABLE "Organization" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobPosting" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "locationText" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobPosting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobPostingRequiredSkill" (
    "id" SERIAL NOT NULL,
    "jobPostingId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "JobPostingRequiredSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateLead" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "jobPostingId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "stage" "CandidateLeadStage" NOT NULL DEFAULT 'SOURCED',
    "lastStageChangeAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateLeadStageEvent" (
    "id" SERIAL NOT NULL,
    "candidateLeadId" INTEGER NOT NULL,
    "fromStage" "CandidateLeadStage",
    "toStage" "CandidateLeadStage" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateLeadStageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_userId_key" ON "Organization"("userId");

-- CreateIndex
CREATE INDEX "JobPosting_organizationId_idx" ON "JobPosting"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "JobPostingRequiredSkill_jobPostingId_name_key" ON "JobPostingRequiredSkill"("jobPostingId", "name");

-- CreateIndex
CREATE INDEX "CandidateLead_organizationId_stage_idx" ON "CandidateLead"("organizationId", "stage");

-- CreateIndex
CREATE INDEX "CandidateLeadStageEvent_candidateLeadId_occurredAt_idx" ON "CandidateLeadStageEvent"("candidateLeadId", "occurredAt");

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPosting" ADD CONSTRAINT "JobPosting_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPostingRequiredSkill" ADD CONSTRAINT "JobPostingRequiredSkill_jobPostingId_fkey" FOREIGN KEY ("jobPostingId") REFERENCES "JobPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateLead" ADD CONSTRAINT "CandidateLead_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateLead" ADD CONSTRAINT "CandidateLead_jobPostingId_fkey" FOREIGN KEY ("jobPostingId") REFERENCES "JobPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateLeadStageEvent" ADD CONSTRAINT "CandidateLeadStageEvent_candidateLeadId_fkey" FOREIGN KEY ("candidateLeadId") REFERENCES "CandidateLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
