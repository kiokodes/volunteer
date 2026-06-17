'use client';

/**
 * QR Scan page (the main volunteer action).
 *
 * Volunteers use this page to check in and out at orphanages. The QR code
 * they scan must be the CURRENT non-expired QR for that orphanage -
 * old/expired QRs are rejected (anti-fraud).
 *
 * The QR string is parsed and sent to the API to record a check-in/out.
 *
 * Auth note: only signed-in volunteers can reach this page. We use the
 * volunteer platform's auth (NextGem code + password).
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { QRScanner } from '@/components/QRScanner';
import { getSupabaseClient } from '@/lib/supabase';
import { recordCheckIn } from '@/lib/hours-calculator';
import { LogIn, LogOut, Camera, ArrowLeft, KeyRound } from 'lucide-react';

type Step = 'scan' | 'choose' | 'confirm' | 'done';

export default function ScanPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('scan');
  const [orphanage, setOrphanage] = useState<any | null>(null);
  const [action, setAction] = useState<'in' | 'out'>('in');
  const [loading, setLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [resultIsError, setResultIsError] = useState(false);
  const [volunteerId, setVolunteerId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Auth check - redirect to login if not signed in.
  useEffect(() => {
    const check = async () => {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login?redirect=/scan');
        return;
      }
      // Get the volunteer row.
      const { data: vol } = await supabase
        .from('volunteers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!vol) {
        router.push('/login');
        return;
      }
      setVolunteerId(vol.id);
      setAuthChecked(true);
    };
    check();
  }, [router]);

  const handleScan = async (rawText: string) => {
    const token = rawText.trim();
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('orphanages')
      .select('*')
      .eq('current_qr_code', token)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) {
      setResultMessage(
        `Invalid or expired QR: ${token}. Make sure you're scanning the current NextGem QR code.`
      );
      setResultIsError(true);
      setStep('done');
      return;
    }

    // Check expiry client-side too (so we can show a friendly message).
    if (data.qr_expires_at && new Date(data.qr_expires_at) < new Date()) {
      setResultMessage(
        'This QR code has expired. Ask the matron for the new one.'
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
    if (!volunteerId) {
      setResultMessage('Not signed in. Please sign in again.');
      setResultIsError(true);
      setTimeout(() => router.push('/login'), 1500);
      return;
    }
    if (!orphanage) return;

    setLoading(true);
    try {
      const result = await recordCheckIn(
        volunteerId,
        orphanage.id,
        orphanage.current_qr_code,
        action
      );
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

  // Show a loading state until auth has been verified.
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <header className="max-w-md mx-auto flex items-center justify-between mb-4">
        <Link href="/volunteer" className="flex items-center gap-1 text-sm text-gray-600">
          <ArrowLeft size={14} />
          Dashboard
        </Link>
        <span className="text-xs text-gray-500 flex items-center gap-1">
          <KeyRound size={12} />
          Signed in
        </span>
      </header>

      <div className="max-w-md mx-auto">
        {step === 'scan' && (
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h1 className="text-xl font-bold text-gray-900 text-center">Scan QR Code</h1>
            <QRScanner onScan={handleScan} />
            <p className="text-sm text-gray-600 text-center">
              Position the camera over the QR code at the orphanage entrance.
            </p>
          </div>
        )}

        {step === 'choose' && orphanage && (
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">You're at</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{orphanage.name}</p>
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

            <button onClick={reset} className="w-full text-sm text-gray-600 underline">
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
                className="flex-1 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:opacity-50 font-semibold"
              >
                {loading ? 'Saving…' : 'Confirm'}
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
    </div>
  );
}
