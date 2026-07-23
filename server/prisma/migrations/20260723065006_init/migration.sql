-- CreateEnum
CREATE TYPE "AccountRole" AS ENUM ('CANDIDATE', 'EMPLOYER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "role" "AccountRole" NOT NULL DEFAULT 'CANDIDATE';
