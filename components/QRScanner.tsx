'use client';

/**
 * QR Scanner component.
 *
 * Uses the `html5-qrcode` library which:
 *   - Works with any standard phone camera.
 *   - Handles both QR codes and other barcode formats.
 *   - Falls back gracefully on devices without a camera.
 *
 * Usage:
 *   <QRScanner onScan={(text) => handleScan(text)} />
 *
 * Critical notes:
 *   - Must be rendered client-side (uses the camera).
 *   - Must be in a secure context (HTTPS in production). Vercel provides this by default.
 */

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
  onScan: (text: string) => void;
  onError?: (error: string) => void;
}

export function QRScanner({ onScan, onError }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerId = 'qr-scanner-container';

  // Start the camera + scanner when the component mounts.
  useEffect(() => {
    // Don't initialize on the server (SSR) - Html5Qrcode needs `window`.
    if (typeof window === 'undefined') return;

    const scanner = new Html5Qrcode(containerId);
    scannerRef.current = scanner;

    const start = async () => {
      try {
        await scanner.start(
          // Use the rear camera on mobile, fall back to any available camera.
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            // Success - we got a QR code!
            onScan(decodedText);
            // Stop scanning after a successful scan to avoid duplicates.
            scanner.stop().catch(() => {});
            setIsScanning(false);
          },
          (_err) => {
            // Per-frame errors are normal (no QR in view); don't surface them.
          }
        );
        setIsScanning(true);
        setError(null);
      } catch (e: any) {
        const msg = e?.message ?? 'Could not start camera';
        setError(msg);
        onError?.(msg);
        setIsScanning(false);
      }
    };

    start();

    // Cleanup on unmount.
    return () => {
      scanner.stop().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restart the scanner if the user clicks "Scan again".
  const restart = async () => {
    if (!scannerRef.current) return;
    try {
      await scannerRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (text) => {
          onScan(text);
          scannerRef.current?.stop().catch(() => {});
          setIsScanning(false);
        },
        () => {}
      );
      setIsScanning(true);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? 'Could not restart camera');
    }
  };

  return (
    <div className="w-full">
      {/* The scanner renders a video stream into this div. */}
      <div
        id={containerId}
        className="w-full max-w-md mx-auto rounded-lg overflow-hidden bg-black aspect-square"
        style={{ minHeight: 280 }}
      />

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-md">
          <p className="font-semibold">Camera error</p>
          <p className="text-sm mt-1">{error}</p>
          <p className="text-xs mt-2 text-red-600">
            Make sure you've allowed camera access and that you're using HTTPS
            (or localhost).
          </p>
        </div>
      )}

      {isScanning && (
        <p className="mt-3 text-sm text-center text-gray-600">
          Point your camera at the QR code.
        </p>
      )}

      {!isScanning && !error && (
        <div className="mt-4 text-center">
          <button
            onClick={restart}
            className="px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700"
          >
            Scan again
          </button>
        </div>
      )}
    </div>
  );
}
