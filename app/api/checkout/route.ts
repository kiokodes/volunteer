/**
 * POST /api/checkout
 *
 * Convenience endpoint that's exactly the same as /api/checkin with
 * type='out'. Provided for clarity when reading the codebase - the
 * distinction matters conceptually (check-in is simple, check-out
 * triggers hours calculation).
 */

import { NextRequest, NextResponse } from 'next/server';
import { recordCheckIn } from '@/lib/hours-calculator';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { volunteer_id, orphanage_id } = body ?? {};

    if (!volunteer_id || !orphanage_id) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields.' },
        { status: 400 }
      );
    }

    const result = await recordCheckIn(volunteer_id, orphanage_id, 'out');
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, message: e?.message ?? 'Server error' },
      { status: 500 }
    );
  }
}
