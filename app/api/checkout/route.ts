/**
 * POST /api/checkout
 *
 * Convenience endpoint that's exactly the same as /api/checkin with
 * type='out'. Provided for clarity when reading the codebase.
 *
 * Body: { volunteer_id, orphanage_id, qr_code }
 */

import { NextRequest, NextResponse } from 'next/server';
import { recordCheckIn } from '@/lib/hours-calculator';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { volunteer_id, orphanage_id, qr_code } = body ?? {};

    if (!volunteer_id || !orphanage_id || !qr_code) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields.' },
        { status: 400 }
      );
    }

    const result = await recordCheckIn(volunteer_id, orphanage_id, qr_code, 'out');
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, message: e?.message ?? 'Server error' },
      { status: 500 }
    );
  }
}
