/**
 * app/api/sync-flag/route.ts
 *
 * Syncs a matron-submitted volunteer flag to the Internal Operations Platform.
 *
 * POST /api/sync-flag
 * Body: { volunteer_id, orphanage_id, reason }
 */

import { NextRequest, NextResponse } from "next/server";
import { syncFlag } from "@/lib/sync";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { volunteer_id, orphanage_id, reason } = body;

  if (!volunteer_id || !orphanage_id || !reason) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Get the current user (matron) ID from the session
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const synced = await syncFlag({
    volunteer_id,
    orphanage_id,
    matron_id: user.id,
    reason,
  });

  return NextResponse.json({ success: synced });
}
