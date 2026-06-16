/**
 * POST /api/certificate
 *
 * Generates a certificate PDF for a volunteer.
 * Normally called automatically when the volunteer reaches 100 hours,
 * but this endpoint allows manual regeneration (e.g. if the original was lost).
 *
 * GET /api/certificate?volunteer_id=...
 *   Returns the latest certificate URL for the volunteer.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateCertificatePDF } from '@/lib/certificate-generator';
import { getSupabaseClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { volunteer_id } = await req.json();
    if (!volunteer_id) {
      return NextResponse.json(
        { success: false, message: 'volunteer_id required' },
        { status: 400 }
      );
    }

    const pdfUrl = await generateCertificatePDF(volunteer_id);
    if (!pdfUrl) {
      return NextResponse.json(
        { success: false, message: 'Failed to generate certificate' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, pdf_url: pdfUrl });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, message: e?.message ?? 'Server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const volunteerId = url.searchParams.get('volunteer_id');
    if (!volunteerId) {
      return NextResponse.json(
        { success: false, message: 'volunteer_id query param required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('certificates')
      .select('*')
      .eq('volunteer_id', volunteerId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ success: true, certificate: data });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, message: e?.message ?? 'Server error' },
      { status: 500 }
    );
  }
}
