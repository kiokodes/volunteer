/**
 * POST /api/flag
 *
 * Called by the matron dashboard after a volunteer is flagged locally.
 * Attempts to forward the flag to the Internal Operations Platform.
 *
 * The local `flags` table is the source of truth - this endpoint just
 * tries to push the same data to the internal platform. If the internal
 * platform URL isn't configured, this is a no-op.
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncToInternalPlatform } from '@/lib/internal-sync';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { volunteer_id, orphanage_id, reason, severity } = body ?? {};

    if (!volunteer_id || !orphanage_id || !reason) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields.' },
        { status: 400 }
      );
    }

    const synced = await syncToInternalPlatform({
      type: 'flag',
      data: {
        volunteer_id,
        orphanage_id,
        reason,
        severity: severity ?? 'low',
        flagged_at: new Date().toISOString(),
      },
    });

    // Mark synced if successful.
    if (synced) {
      const admin = getSupabaseAdmin();
      await admin
        .from('flags')
        .update({ synced_to_internal: true })
        .eq('volunteer_id', volunteer_id)
        .eq('orphanage_id', orphanage_id)
        .eq('reason', reason);
    }

    return NextResponse.json({ success: true, synced });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, message: e?.message ?? 'Server error' },
      { status: 500 }
    );
  }
}
