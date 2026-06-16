'use client';

/**
 * QR Code Generator component.
 *
 * Used by matrons to view and print the QR code for their orphanage.
 * Volunteers scan these codes to check in/out.
 *
 * The QR contains just the orphanage's `qr_code` token (a short string),
 * so it works with any standard phone camera - no special app required.
 */

import { useEffect, useState } from 'react';
import { generateQRDataURL } from '@/lib/qr-utils';

interface QRGeneratorProps {
  qrCode: string;
  orphanageName: string;
  size?: number;
}

export function QRGenerator({ qrCode, orphanageName, size = 256 }: QRGeneratorProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    generateQRDataURL(qrCode)
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? 'Failed to generate QR');
      });
    return () => {
      cancelled = true;
    };
  }, [qrCode]);

  if (error) {
    return (
      <div className="text-red-600 text-sm">Could not generate QR: {error}</div>
    );
  }

  if (!dataUrl) {
    return (
      <div className="animate-pulse bg-gray-200" style={{ width: size, height: size }} />
    );
  }

  return (
    <div className="inline-flex flex-col items-center gap-2">
      {/* The QR image. Print-friendly: white background, high contrast. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={dataUrl}
        alt={`QR code for ${orphanageName}`}
        width={size}
        height={size}
        className="bg-white p-2 rounded shadow"
      />
      {/* The token, shown below the QR so matrons can verify it's correct. */}
      <code className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
        {qrCode}
      </code>
    </div>
  );
}
