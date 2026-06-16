/**
 * app/api/sync/route.ts
 *
 * Internal API route called by the scan page after a successful check-out.
 * Fetches the full check record from Supabase and posts it to the Internal Ops Platform.
 * Also marks the record as synced in Supabase.
 *
 * POST /api/sync
 * Body: { recordId: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncCheckRecord } from "@/lib/sync";

export async function POST(req: NextRequest) {
  const { recordId } = await req.json();

  if (!recordId) {
    return NextResponse.json({ error: "recordId is required" }, { status: 400 });
  }

  const supabase = createClient();

  // Fetch the full check record from Supabase
  const { data: record, error } = await supabase
    .from("check_records")
    .select("*")
    .eq("id", recordId)
    .single();

  if (error || !record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  // Attempt to sync to the Internal Ops Platform
  const synced = await syncCheckRecord(record);

  if (synced) {
    // Mark as synced in Supabase so we don't double-sync in future retries
    await supabase
      .from("check_records")
      .update({ synced_to_internal: true })
      .eq("id", recordId);
  }

  return NextResponse.json({ success: synced });
}
