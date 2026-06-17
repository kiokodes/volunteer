/**
 * POST /api/admin/rotate-qr
 *
 * Rotates the QR code for an orphanage.
 *
 * Auth: only NextGem staff (role='admin') can call this. The platform
 *       has no public signup; this endpoint is also protected by
 *       checking the caller's role.
 *
 * Body: { orphanage_id, expires_in_days?, reason? }
 *   - expires_in_days: how many days until the new QR expires (default 30)
 *   - reason: optional human note (e.g. "compromised")
 *
 * Response: { new_qr_code, expires_at }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, getSupabaseAdmin } from '@/lib/supabase';
import { rotateOrphanageQR } from '@/lib/qr-utils';

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseClient();

    // 1. Auth check.
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ success: false, message: 'Not signed in' }, { status: 401 });
    }

    // 2. Role check: must be admin.
    const { data: vol } = await supabase
      .from('volunteers').select('role').eq('user_id', user.id).maybeSingle();
    if (!vol || vol.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Only NextGem admins can rotate QR codes' },
        { status: 403 }
      );
    }

    // 3. Parse body.
    const body = await req.json();
    const { orphanage_id, expires_in_days, reason } = body ?? {};

    if (!orphanage_id) {
      return NextResponse.json(
        { success: false, message: 'orphanage_id is required' },
        { status: 400 }
      );
    }

    // 4. Perform the rotation using the admin client.
    const admin = getSupabaseAdmin();
    const result = await rotateOrphanageQR(
      orphanage_id,
      user.id,
      expires_in_days ?? 30,
      reason ?? 'Admin-triggered rotation'
    );

    return NextResponse.json({
      success: true,
      new_qr_code: result.new_qr_code,
      expires_at: result.expires_at,
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, message: e?.message ?? 'Server error' },
      { status: 500 }
    );
  }
}
