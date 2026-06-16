/**
 * POST /api/orphanage-register
 *
 * Register a new orphanage in the volunteer platform.
 * In production, this should be restricted to admins and the Internal
 * Operations Platform will be the source of truth. For Phase 1, anyone
 * with the API key can register.
 *
 * Generates a unique QR token for the new orphanage.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { generateOrphanageQRToken } from '@/lib/qr-utils';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, state, city, address, matron_name, matron_phone, matron_email } =
      body ?? {};

    if (!name || !state) {
      return NextResponse.json(
        { success: false, message: 'name and state are required.' },
        { status: 400 }
      );
    }

    // Generate a unique QR token. Retry a few times in case of collision.
    let qrCode = generateOrphanageQRToken(state);
    const admin = getSupabaseAdmin();
    for (let i = 0; i < 5; i++) {
      const { data: existing } = await admin
        .from('orphanages')
        .select('id')
        .eq('qr_code', qrCode)
        .maybeSingle();
      if (!existing) break;
      qrCode = generateOrphanageQRToken(state);
    }

    const { data, error } = await admin
      .from('orphanages')
      .insert({
        name,
        state,
        city: city ?? null,
        address: address ?? null,
        matron_name: matron_name ?? null,
        matron_phone: matron_phone ?? null,
        matron_email: matron_email ?? null,
        qr_code: qrCode,
        is_active: true,
        verified: false, // requires admin verification before going live
      })
      .select()
      .single();

    if (error) throw error;

    await admin.from('audit_log').insert({
      actor_role: 'admin',
      action: 'orphanage_registered',
      entity_type: 'orphanage',
      entity_id: data.id,
      metadata: { name, state, qr_code: qrCode },
    });

    return NextResponse.json({ success: true, orphanage: data });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, message: e?.message ?? 'Server error' },
      { status: 500 }
    );
  }
}
