/**
 * lib/certificate.ts
 *
 * Generates a PDF volunteer certificate using jsPDF.
 * This runs in the browser (client-side only).
 *
 * Called when a volunteer reaches 100 hours.
 * The PDF is returned as a Blob so it can be downloaded or emailed.
 */

// We import jsPDF dynamically to avoid SSR issues (jsPDF needs the browser DOM)
export async function generateCertificate(params: {
  volunteerName: string;
  totalHours: number;
  issuedAt: string; // ISO date string
}): Promise<Blob> {
  // Dynamic import keeps jsPDF out of the server bundle
  const { jsPDF } = await import("jspdf");

  const { volunteerName, totalHours, issuedAt } = params;
  const formattedDate = new Date(issuedAt).toLocaleDateString("en-NG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Create an A4 landscape document for a proper certificate look
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = 297; // A4 landscape width (mm)
  const H = 210; // A4 landscape height (mm)

  // ── Background ──────────────────────────────────────────────────────────────
  doc.setFillColor(248, 250, 252); // surface-subtle
  doc.rect(0, 0, W, H, "F");

  // ── Border ───────────────────────────────────────────────────────────────────
  doc.setDrawColor(37, 99, 235); // brand-600
  doc.setLineWidth(3);
  doc.rect(10, 10, W - 20, H - 20, "S");

  doc.setLineWidth(0.5);
  doc.rect(13, 13, W - 26, H - 26, "S");

  // ── Header: Organisation name ────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(37, 99, 235); // brand-600
  doc.text("NEXTGEM FOUNDATION", W / 2, 30, { align: "center" });

  // ── Title ────────────────────────────────────────────────────────────────────
  doc.setFontSize(32);
  doc.setTextColor(15, 23, 42); // ink
  doc.text("Certificate of Volunteering", W / 2, 60, { align: "center" });

  // ── Subtitle ─────────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor(71, 85, 105); // ink-muted
  doc.text("This is to certify that", W / 2, 82, { align: "center" });

  // ── Volunteer Name ───────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(15, 23, 42);
  doc.text(volunteerName, W / 2, 105, { align: "center" });

  // Underline the name
  const nameWidth = doc.getTextWidth(volunteerName);
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.8);
  doc.line(W / 2 - nameWidth / 2, 108, W / 2 + nameWidth / 2, 108);

  // ── Body Text ────────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `has successfully completed ${totalHours} hours of volunteering`,
    W / 2, 125, { align: "center" }
  );
  doc.text(
    "with NextGem Foundation, contributing to the care and wellbeing of children across Nigeria.",
    W / 2, 135, { align: "center" }
  );

  // ── Badge label ──────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(37, 99, 235);
  doc.text("🏅 Dedicated Volunteer Badge Awarded", W / 2, 152, { align: "center" });

  // ── Date & Signature line ────────────────────────────────────────────────────
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105);

  // Left: date
  doc.text(`Date: ${formattedDate}`, 40, 180);

  // Right: signature placeholder
  doc.setDrawColor(148, 163, 184); // ink-faint
  doc.setLineWidth(0.5);
  doc.line(W - 90, 178, W - 25, 178);
  doc.text("Authorised Signature", W - 57, 184, { align: "center" });

  // ── Footer ───────────────────────────────────────────────────────────────────
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text("nextgemfoundation.com  •  volunteer.nextgemfoundation.com", W / 2, 195, {
    align: "center",
  });

  // Return as Blob so the caller can download it or attach it to an email
  return doc.output("blob");
}

/**
 * downloadCertificate
 * Convenience function: generate and immediately trigger a browser download.
 */
export async function downloadCertificate(params: {
  volunteerName: string;
  totalHours: number;
  issuedAt: string;
}): Promise<void> {
  const blob = await generateCertificate(params);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `nextgem-certificate-${params.volunteerName.replace(/\s+/g, "-").toLowerCase()}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
