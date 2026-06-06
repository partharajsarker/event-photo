-- =============================================================================
-- Event Photography Platform - Complete Database Schema
-- Run this in Supabase SQL Editor if Prisma migrations fail
-- =============================================================================

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable: Event
CREATE TABLE IF NOT EXISTS "Event" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "qrCodeUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Photo
CREATE TABLE IF NOT EXISTS "Photo" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "thumbnail" TEXT,
    "originalUrl" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'processing',

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Download
CREATE TABLE IF NOT EXISTS "Download" (
    "id" TEXT NOT NULL,
    "photoId" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "downloadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Download_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Event
CREATE UNIQUE INDEX IF NOT EXISTS "Event_slug_key" ON "Event"("slug");
CREATE INDEX IF NOT EXISTS "Event_slug_idx" ON "Event"("slug");
CREATE INDEX IF NOT EXISTS "Event_createdAt_idx" ON "Event"("createdAt");

-- CreateIndex: Photo
CREATE INDEX IF NOT EXISTS "Photo_eventId_uploadedAt_idx" ON "Photo"("eventId", "uploadedAt" DESC);
CREATE INDEX IF NOT EXISTS "Photo_status_idx" ON "Photo"("status");

-- CreateIndex: Download
CREATE INDEX IF NOT EXISTS "Download_photoId_downloadedAt_idx" ON "Download"("photoId", "downloadedAt" DESC);

-- AddForeignKey: Photo -> Event
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'Photo_eventId_fkey'
    ) THEN
        ALTER TABLE "Photo" ADD CONSTRAINT "Photo_eventId_fkey" 
            FOREIGN KEY ("eventId") REFERENCES "Event"("id") 
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: Download -> Photo
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'Download_photoId_fkey'
    ) THEN
        ALTER TABLE "Download" ADD CONSTRAINT "Download_photoId_fkey" 
            FOREIGN KEY ("photoId") REFERENCES "Photo"("id") 
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Create Prisma migrations tracking table (if using Prisma)
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "finished_at" TIMESTAMP(3),
    "migration_name" TEXT NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
);

-- Mark migrations as applied (if running SQL directly)
INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "applied_steps_count")
VALUES 
    ('init', 'manual', NOW(), '20250604000000_init', 1),
    ('status', 'manual', NOW(), '20250605000000_add_photo_status', 1)
ON CONFLICT (id) DO NOTHING;

-- Verify tables created
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as columns
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name IN ('Event', 'Photo', 'Download')
ORDER BY table_name;
