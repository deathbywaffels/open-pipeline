-- AlterTable
ALTER TABLE "User" ADD COLUMN     "commuteRadiusKm" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "needsSponsorship" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "DesiredLocation" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DesiredLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DesiredLocation_userId_label_key" ON "DesiredLocation"("userId", "label");

-- AddForeignKey
ALTER TABLE "DesiredLocation" ADD CONSTRAINT "DesiredLocation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
