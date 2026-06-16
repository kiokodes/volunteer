/**
 * Certificate generator.
 *
 * When a volunteer reaches 100 hours, we automatically generate a PDF
 * certificate. We use `jspdf` because it runs in the browser/server without
 * needing a native dependency (so it deploys cleanly to Vercel).
 *
 * Flow:
 *   1. Generate a PDF with the volunteer's name and stats.
 *   2. Upload to Supabase Storage (bucket: 'certificates').
 *   3. Insert a row in the certificates table.
 *   4. Optionally email/WhatsApp the certificate to the volunteer.
 *
 * Why this design:
 *   - Runs server-side so we don't depend on the user's browser.
 *   - Stores the PDF in Supabase Storage so it's persistent and shareable.
 *   - The certificate PDF URL also gets synced to the Internal Operations
 *     Platform so admins can see who has been recognized.
 */

import { jsPDF } from 'jspdf';
import { getSupabaseAdmin, getSupabaseClient } from './supabase';
import type { Volunteer, VolunteerHour } from './types';

/**
 * Generate a PDF certificate for the given volunteer and store it in Supabase.
 * Called automatically when a volunteer reaches 100 hours.
 */
export async function generateCertificatePDF(
  volunteerId: string
): Promise<string | null> {
  try {
    const supabase = getSupabaseClient();

    // Fetch the volunteer + their hours for the certificate body.
    const { data: volunteer, error: vErr } = await supabase
      .from('volunteers')
      .select('*')
      .eq('id', volunteerId)
      .single();

    if (vErr || !volunteer) {
      console.error('Certificate: could not find volunteer', vErr);
      return null;
    }

    const { data: hours, error: hErr } = await supabase
      .from('volunteer_hours')
      .select('hours')
      .eq('volunteer_id', volunteerId);

    if (hErr) {
      console.error('Certificate: could not fetch hours', hErr);
      return null;
    }

    const totalHours = (hours ?? []).reduce((sum, h) => sum + Number(h.hours), 0);

    // Build the PDF.
    const pdfBlob = buildCertificatePDF(volunteer as Volunteer, totalHours);

    // Upload to Supabase Storage. We use the admin client because Storage
    // uploads via the anon key have stricter RLS rules.
    const admin = getSupabaseAdmin();
    const fileName = `certificates/${volunteerId}-${Date.now()}.pdf`;

    const { error: uploadErr } = await admin.storage
      .from('certificates')
      .upload(fileName, pdfBlob, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadErr) {
      console.error('Certificate: upload failed', uploadErr);
      return null;
    }

    // Get the public URL.
    const { data: urlData } = admin.storage
      .from('certificates')
      .getPublicUrl(fileName);

    const pdfUrl = urlData.publicUrl;

    // Save a row in the certificates table.
    await supabase.from('certificates').insert({
      volunteer_id: volunteerId,
      pdf_url: pdfUrl,
    });

    // Update the volunteer to mark certificate issued.
    await supabase
      .from('volunteers')
      .update({ certificate_issued_at: new Date().toISOString() })
      .eq('id', volunteerId);

    // Audit log.
    await supabase.from('audit_log').insert({
      actor_role: 'system',
      action: 'certificate_issued',
      entity_type: 'volunteer',
      entity_id: volunteerId,
      metadata: { pdf_url: pdfUrl, total_hours: totalHours },
    });

    // Fire-and-forget: send the certificate by email/WhatsApp if configured.
    sendCertificateDelivery(volunteer as Volunteer, pdfUrl).catch((err) => {
      console.error('Certificate delivery failed (non-fatal):', err);
    });

    return pdfUrl;
  } catch (err) {
    console.error('Certificate generation failed:', err);
    return null;
  }
}

/**
 * Build the PDF certificate using jsPDF.
 * Returns a Blob so we can upload it to Supabase Storage.
 */
function buildCertificatePDF(volunteer: Volunteer, totalHours: number): Blob {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // Background border - simple rectangle
  doc.setDrawColor(34, 197, 94); // brand-500 emerald
  doc.setLineWidth(3);
  doc.rect(10, 10, 277, 190);

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(36);
  doc.setTextColor(22, 101, 52); // brand-800
  doc.text('Certificate of Achievement', 148, 50, { align: 'center' });

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(16);
  doc.setTextColor(60, 60, 60);
  doc.text('This certificate is proudly presented to', 148, 70, {
    align: 'center',
  });

  // Volunteer name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(20, 20, 20);
  doc.text(volunteer.full_name, 148, 95, { align: 'center' });

  // Body
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.setTextColor(60, 60, 60);
  const body =
    `for completing 100+ hours of volunteer service with ` +
    `NextGem Foundation, demonstrating exceptional commitment ` +
    `to transforming lives across Nigeria.`;
  doc.text(doc.splitTextToSize(body, 220), 148, 115, { align: 'center' });

  // Stats
  doc.setFontSize(12);
  doc.text(
    `Total Hours: ${totalHours.toFixed(1)}  |  Points: ${volunteer.total_points}`,
    148,
    140,
    { align: 'center' }
  );

  // Footer
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text('NextGem Foundation', 30, 180);
  doc.text(new Date().toLocaleDateString(), 266, 180, { align: 'right' });

  return doc.output('blob');
}

/**
 * Send the certificate to the volunteer via email (Resend) and/or WhatsApp (Twilio).
 * Best-effort - failures don't block the certificate generation.
 */
async function sendCertificateDelivery(
  volunteer: Volunteer,
  pdfUrl: string
): Promise<void> {
  const supabase = getSupabaseClient();

  // Email via Resend (server-side).
  if (process.env.RESEND_API_KEY && volunteer.email) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: process.env.CERTIFICATE_FROM_EMAIL ?? 'certificates@nextgemfoundation.com',
          to: volunteer.email,
          subject: 'Your NextGem Certificate - 100 Hours Milestone!',
          html: `
            <p>Hi ${escapeHtml(volunteer.full_name)},</p>
            <p>Congratulations on reaching 100 volunteer hours!</p>
            <p>Your certificate is ready: <a href="${pdfUrl}">Download PDF</a></p>
            <p>Thank you for your incredible service.</p>
            <p>- NextGem Foundation</p>
          `,
        }),
      });
      if (res.ok) {
        await supabase
          .from('certificates')
          .update({ emailed_at: new Date().toISOString() })
          .eq('volunteer_id', volunteer.id);
      }
    } catch (err) {
      console.error('Resend email failed:', err);
    }
  }

  // WhatsApp via Twilio (server-side).
  if (
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    volunteer.phone
  ) {
    try {
      const sid = process.env.TWILIO_ACCOUNT_SID;
      const token = process.env.TWILIO_AUTH_TOKEN;
      const from = process.env.TWILIO_WHATSAPP_FROM ?? 'whatsapp:+14155238886';
      const to = volunteer.phone.startsWith('whatsapp:')
        ? volunteer.phone
        : `whatsapp:${volunteer.phone}`;

      const body = new URLSearchParams({
        From: from,
        To: to,
        Body: `Hi ${volunteer.full_name}, congratulations on 100 hours! Your certificate: ${pdfUrl}`,
      });

      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
          },
          body,
        }
      );
      if (res.ok) {
        await supabase
          .from('certificates')
          .update({ whatsapp_sent_at: new Date().toISOString() })
          .eq('volunteer_id', volunteer.id);
      }
    } catch (err) {
      console.error('Twilio WhatsApp failed:', err);
    }
  }
}

/**
 * Minimal HTML escape for email body.
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
