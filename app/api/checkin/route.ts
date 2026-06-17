/**
 * POST /api/checkin
 *
 * Server-side endpoint for recording a check-in or check-out.
 * Validates input and delegates to the shared hours calculator.
 *
 * Body: { volunteer_id, orphanage_id, qr_code, type }
 *   - qr_code: the actual QR token scanned (used to verify it's current)
 */

import { NextRequest, NextResponse } from 'next/server';
import { recordCheckIn } from '@/lib/hours-calculator';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { volunteer_id, orphanage_id, qr_code, type } = body ?? {};

    if (!volunteer_id || !orphanage_id || !qr_code || !type) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields.' },
        { status: 400 }
      );
    }
    if (type !== 'in' && type !== 'out') {
      return NextResponse.json(
        { success: false, message: "type must be 'in' or 'out'." },
        { status: 400 }
      );
    }

    const result = await recordCheckIn(volunteer_id, orphanage_id, qr_code, type);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, message: e?.message ?? 'Server error' },
      { status: 500 }
    );
  }
}
