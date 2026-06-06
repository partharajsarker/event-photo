import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const results: Record<
    string,
    { exists: boolean; count?: number; error?: string }
  > = {};

  // Check Event table
  try {
    const count = await prisma.event.count();
    results.Event = { exists: true, count };
  } catch (error) {
    results.Event = {
      exists: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }

  // Check Photo table
  try {
    const count = await prisma.photo.count();
    results.Photo = { exists: true, count };
  } catch (error) {
    results.Photo = {
      exists: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }

  // Check Download table
  try {
    const count = await prisma.download.count();
    results.Download = { exists: true, count };
  } catch (error) {
    results.Download = {
      exists: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }

  // Verify Photo schema has required columns
  try {
    // Try to query with all expected columns
    await prisma.photo.findFirst({
      select: {
        id: true,
        eventId: true,
        filename: true,
        thumbnail: true,
        originalUrl: true,
        uploadedAt: true,
        downloadCount: true,
        status: true,
      },
    });
    results.PhotoSchema = { exists: true };
  } catch (error) {
    results.PhotoSchema = {
      exists: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }

  const allExist =
    results.Event?.exists &&
    results.Photo?.exists &&
    results.Download?.exists &&
    results.PhotoSchema?.exists;

  if (!allExist) {
    console.error("[DB Check] Schema verification failed:", results);
  } else {
    console.log("[DB Check] All tables verified:", results);
  }

  return NextResponse.json({
    status: allExist ? "ok" : "error",
    tables: results,
    message: allExist
      ? "All tables exist and are accessible"
      : "Some tables are missing or have issues. Run: npx prisma migrate deploy",
    hint: !allExist
      ? "Go to Supabase SQL Editor and run: prisma/deploy-schema.sql"
      : undefined,
  });
}
