-- AlterTable: Add status field to Photo
ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'processing';

-- Make thumbnail nullable
ALTER TABLE "Photo" ALTER COLUMN "thumbnail" DROP NOT NULL;

-- CreateIndex: Event createdAt
CREATE INDEX IF NOT EXISTS "Event_createdAt_idx" ON "Event"("createdAt");

-- CreateIndex: Photo status
CREATE INDEX IF NOT EXISTS "Photo_status_idx" ON "Photo"("status");
