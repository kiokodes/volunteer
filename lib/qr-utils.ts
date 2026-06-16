/**
 * QR code utilities.
 *
 * Two main uses:
 *   1. GENERATE QR codes for orphanages (matron prints these and sticks them
 *      at the orphanage entrance).
 *   2. PARSE QR codes that volunteers scan (extract the orphanage qr_code string).
 *
 * The QR payload is just the orphanage's `qr_code` string (a short unique
 * token). We don't encode full URLs - keeping it short means the QR is
 * scannable from any standard phone camera.
 */

import QRCode from 'qrcode';

/**
 * Generate a QR code as a Data URL (PNG) for the given payload.
 * The Data URL can be used directly in an <img> tag or saved to a file.
 *
 * @param payload - the string to encode (orphanage's qr_code)
 * @returns a Promise resolving to a base64 Data URL
 */
export async function generateQRDataURL(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'H', // high - survives wear and tear
    margin: 2,
    width: 512, // high resolution for printing
    color: {
      dark: '#14532d', // brand-900 - dark green for high contrast
      light: '#FFFFFF',
    },
  });
}

/**
 * Generate a short, URL-safe unique token for an orphanage's qr_code field.
 * Used when registering a new orphanage.
 *
 * Format: NG-<state-prefix>-<random>
 * Example: NG-LAG-9F3K2X
 */
export function generateOrphanageQRToken(state: string): string {
  const statePrefix = state.substring(0, 3).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `NG-${statePrefix}-${random}`;
}

/**
 * Extract the orphanage qr_code from a scanned QR payload.
 * If the payload is a URL like https://...?qr=NG-LAG-9F3K2X, we extract the token.
 * Otherwise we return the payload as-is.
 */
export function parseOrphanageQRPayload(payload: string): string {
  const trimmed = payload.trim();
  // If it's a URL with a query parameter, extract the qr param.
  if (trimmed.includes('?qr=')) {
    const parts = trimmed.split('?qr=');
    return parts[1] ?? trimmed;
  }
  return trimmed;
}
