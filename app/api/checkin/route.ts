/**
 * POST /api/checkin
 *
 * Server-side endpoint for recording a check-in or check-out.
 * Validates input and delegates to the shared hours calculator.
 *
 * Why server-side? Because we want a stable, validated entry point that
 * could later be called by other clients (e.g. a dedicated mobile app).
 * Right now the /scan page calls it via the client-side lib, but exposing
 * it as an API also makes testing easier.
 */

import { NextRequest, NextResponse } from 'next/server';
import { recordCheckIn } from '@/lib/hours-calculator';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { volunteer_id, orphanage_id, type } = body ?? {};

    // Validate input - this is a critical action.
    if (!volunteer_id || !orphanage_id || !type) {
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

    const result = await recordCheckIn(volunteer_id, orphanage_id, type);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, message: e?.message ?? 'Server error' },
      { status: 500 }
    );
  }
}
