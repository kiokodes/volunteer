/**
 * POST /api/sync-hours
 *
 * Manually trigger a sync of unsynced hours to the Internal Operations Platform.
 * Useful for retries and admin overrides. Normally syncing happens automatically
 * after each check-out (see lib/hours-calculator.ts).
 *
 * The Internal Platform URL must be set in env for this to actually do anything.
 */

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { syncToInternalPlatform } from '@/lib/internal-sync';

export async function POST() {
  try {
    const admin = getSupabaseAdmin();

    // Find all unsynced hours rows.
    const { data: unsynced, error } = await admin
      .from('volunteer_hours')
      .select('*, volunteers(full_name, email), orphanages(name, qr_code)')
      .eq('synced_to_internal', false)
      .limit(100);

    if (error) throw error;

    let successCount = 0;
    let failCount = 0;

    for (const row of unsynced ?? []) {
      const ok = await syncToInternalPlatform({
        type: 'volunteer_hours',
        data: row,
      });
      if (ok) {
        await admin
          .from('volunteer_hours')
          .update({ synced_to_internal: true })
          .eq('id', row.id);
        successCount++;
      } else {
        failCount++;
      }
    }

    return NextResponse.json({
      success: true,
      attempted: unsynced?.length ?? 0,
      synced: successCount,
      failed: failCount,
      message:
        failCount > 0
          ? `${failCount} rows failed - check INTERNAL_PLATFORM_API_URL env var.`
          : 'All rows synced.',
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, message: e?.message ?? 'Server error' },
      { status: 500 }
    );
  }
}
