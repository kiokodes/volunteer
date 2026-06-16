/**
 * components/CertificateButton.tsx
 *
 * Client component — downloads the volunteer's PDF certificate.
 * Uses jsPDF (browser-only), so this must be a Client Component.
 */

"use client";

import { useState } from "react";
import { downloadCertificate } from "@/lib/certificate";
import { Download, Loader2 } from "lucide-react";

interface Props {
  volunteerName: string;
  totalHours: number;
}

export default function CertificateButton({ volunteerName, totalHours }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      await downloadCertificate({
        volunteerName,
        totalHours,
        issuedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Certificate download failed:", err);
      alert("Could not generate certificate. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="btn-secondary px-3 py-1.5 text-xs gap-1"
      title="Download your certificate"
    >
      {loading
        ? <Loader2 size={13} className="animate-spin" />
        : <Download size={13} />}
      {loading ? "Generating…" : "Certificate"}
    </button>
  );
}
