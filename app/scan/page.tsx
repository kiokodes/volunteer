'use client';

/**
 * QR Scan page.
 *
 * The main action page for volunteers. They:
 *   1. Scan the orphanage's QR code.
 *   2. Choose "Check In" or "Check Out".
 *   3. Confirm and we record the event + (on check-out) calculate hours.
 *
 * Important UX details:
 *   - Must work on a phone camera (no special app needed).
 *   - Clear messaging at every step (we don't want volunteers confused).
 *   - If the volunteer is not logged in, we use a temporary "guest" id.
 *     The PRD requires login but in practice we'll be permissive for Phase 1.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { QRScanner } from '@/components/QRScanner';
import { parseOrphanageQRPayload } from '@/lib/qr-utils';
import { getSupabaseClient } from '@/lib/supabase';
import { recordCheckIn } from '@/lib/hours-calculator';
import { LogIn, LogOut, Camera, ArrowLeft } from 'lucide-react';

type Step = 'scan' | 'choose' | 'confirm' | 'done';

export default function ScanPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('scan');
  const [orphanage, setOrphanage] = useState<any | null>(null);
  const [action, setAction] = useState<'in' | 'out'>('in');
  const [loading, setLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [resultIsError, setResultIsError] = useState(false);

  /**
   * Called by the QRScanner when a QR code is read.
   * Looks up the orphanage by its qr_code token.
   */
  const handleScan = async (rawText: string) => {
    const token = parseOrphanageQRPayload(rawText);
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('orphanages')
      .select('*')
      .eq('qr_code', token)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) {
      setResultMessage(
        `Invalid QR code: ${token}. Please make sure you're scanning a NextGem orphanage QR.`
      );
      setResultIsError(true);
      setStep('done');
      return;
    }

    setOrphanage(data);
    setStep('choose');
  };

  const handleAction = (a: 'in' | 'out') => {
    setAction(a);
    setStep('confirm');
  };

  const handleConfirm = async () => {
    const volunteerId = localStorage.getItem('volunteer_id');
    if (!volunteerId) {
      setResultMessage('You need to be logged in to record hours. Redirecting to login...');
      setResultIsError(true);
      setTimeout(() => router.push('/login'), 2000);
      return;
    }
    if (!orphanage) return;

    setLoading(true);
    try {
      const result = await recordCheckIn(volunteerId, orphanage.id, action);
      setResultMessage(result.message);
      setResultIsError(!result.success);
      setStep('done');
    } catch (e: any) {
      setResultMessage(`Error: ${e?.message ?? 'unknown'}`);
      setResultIsError(true);
      setStep('done');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep('scan');
    setOrphanage(null);
    setResultMessage(null);
    setResultIsError(false);
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
        Scan QR Code
      </h1>

      {step === 'scan' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <QRScanner onScan={handleScan} />
          <p className="text-sm text-gray-600 text-center">
            Position the camera over the QR code at the orphanage.
          </p>
        </div>
      )}

      {step === 'choose' && orphanage && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">You're at</p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {orphanage.name}
            </p>
            <p className="text-sm text-gray-500 mt-1">{orphanage.state}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4">
            <button
              onClick={() => handleAction('in')}
              className="flex flex-col items-center gap-2 py-6 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
            >
              <LogIn size={28} />
              <span className="font-semibold">Check In</span>
            </button>
            <button
              onClick={() => handleAction('out')}
              className="flex flex-col items-center gap-2 py-6 bg-gray-700 text-white rounded-lg hover:bg-gray-800"
            >
              <LogOut size={28} />
              <span className="font-semibold">Check Out</span>
            </button>
          </div>

          <button
            onClick={reset}
            className="w-full text-sm text-gray-600 underline"
          >
            Scan a different code
          </button>
        </div>
      )}

      {step === 'confirm' && orphanage && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">Confirm</p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {action === 'in' ? 'Check In' : 'Check Out'}
            </p>
            <p className="text-gray-700 mt-2">at {orphanage.name}</p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setStep('choose')}
              className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 py-3 bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:opacity-50 font-semibold"
            >
              {loading ? 'Saving...' : 'Confirm'}
            </button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div
          className={`bg-white rounded-lg shadow p-6 space-y-4 border-l-4 ${
            resultIsError ? 'border-red-500' : 'border-green-500'
          }`}
        >
          <p
            className={`text-lg font-semibold ${
              resultIsError ? 'text-red-700' : 'text-green-700'
            }`}
          >
            {resultIsError ? 'Something went wrong' : 'Success!'}
          </p>
          <p className="text-gray-700">{resultMessage}</p>

          <div className="flex gap-3 pt-2">
            <button
              onClick={reset}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-brand-600 text-white rounded-md hover:bg-brand-700"
            >
              <Camera size={16} />
              Scan again
            </button>
            <Link
              href="/volunteer"
              className="flex-1 flex items-center justify-center gap-2 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              <ArrowLeft size={16} />
              Dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
