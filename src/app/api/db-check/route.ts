import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const results: Record<string, { exists: boolean; error?: string }> = {};

  // Check Event table
  try {
    await prisma.event.count();
    results.Event = { exists: true };
  } catch (error) {
    results.Event = {
      exists: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }

  // Check Photo table
  try {
    await prisma.photo.count();
    results.Photo = { exists: true };
  } catch (error) {
    results.Photo = {
      exists: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }

  // Check Download table
  try {
    await prisma.download.count();
    results.Download = { exists: true };
  } catch (error) {
    results.Download = {
      exists: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }

  const allExist = Object.values(results).every((r) => r.exists);

  if (!allExist) {
    console.error("Database schema check failed:", results);
  }

  return NextResponse.json({
    status: allExist ? "ok" : "error",
    tables: results,
    message: allExist
      ? "All tables exist"
      : "Some tables are missing. Run: npx prisma migrate deploy",
  });
}
