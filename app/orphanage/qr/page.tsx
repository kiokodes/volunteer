'use client';

/**
 * Matron QR code page.
 *
 * Shows ONLY the current, valid QR code for the matron's assigned
 * orphanage. Once the QR expires (typically monthly), a banner appears
 * saying they need to contact NextGem staff for a new one.
 *
 * Access control:
 *   - Only users with role='matron' or role='admin' can reach this page.
 *   - Matrons are tied to ONE orphanage (assigned_orphanage_id). They
 *     only see THEIR orphanage's QR - not any other.
 *   - Admins see the QR for any orphanage (covered in admin pages).
 *
 * No QR is ever "permanent" - they rotate, typically monthly. This
 * prevents anyone from hoarding a single QR for a year of points.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { QRGenerator } from '@/components/QRGenerator';
import { getSupabaseClient } from '@/lib/supabase';
import { QrCode, LogOut, AlertTriangle, RefreshCw, Calendar, Building2, Phone, Mail } from 'lucide-react';

export default function OrphanageQRPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [orphanage, setOrphanage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = getSupabaseClient();

      // 1. Auth check.
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push('/login?redirect=/orphanage/qr');
        return;
      }

      // 2. Find the volunteer record.
      const { data: volunteer, error: volErr } = await supabase
        .from('volunteers')
        .select('*')
        .eq('user_id', authUser.id)
        .maybeSingle();
      if (volErr || !volunteer) {
        setError('Volunteer profile not found. Contact NextGem staff.');
        setLoading(false);
        return;
      }

      // 3. Permission check: must be matron or admin.
      if (volunteer.role !== 'matron' && volunteer.role !== 'admin') {
        setError(
          'Only matrons and NextGem staff can access QR codes. ' +
          'If you should have access, ask NextGem to update your role.'
        );
        setLoading(false);
        return;
      }

      setUser(volunteer);

      // 4. Load the orphanage.
      // Matrons can only see their assigned orphanage. Admins can see any
      // (we default to the first one or any passed via ?id=).
      const orphanageId = volunteer.assigned_orphanage_id;
      if (!orphanageId) {
        setError('No orphanage assigned to your account. Contact NextGem.');
        setLoading(false);
        return;
      }

      const { data: orph } = await supabase
        .from('orphanages').select('*').eq('id', orphanageId).maybeSingle();
      if (!orph) {
        setError('Your assigned orphanage was not found.');
        setLoading(false);
        return;
      }

      setOrphanage(orph);
      setLoading(false);
    };
    load();
  }, [router]);

  const handleLogout = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-lg shadow p-6 max-w-md text-center">
          <AlertTriangle className="mx-auto text-red-500" size={40} />
          <p className="mt-3 text-gray-900 font-semibold">Access denied</p>
          <p className="text-sm text-gray-600 mt-2">{error}</p>
          <Link href="/" className="inline-block mt-4 text-brand-600 hover:underline text-sm">
            Go to homepage
          </Link>
        </div>
      </div>
    );
  }

  if (!orphanage) return null;

  // Check if QR is expired.
  const isExpired = orphanage.qr_expires_at && new Date(orphanage.qr_expires_at) < new Date();
  const hasQR = !!orphanage.current_qr_code;
  const expiryDate = orphanage.qr_expires_at ? new Date(orphanage.qr_expires_at) : null;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <header className="max-w-2xl mx-auto flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Building2 className="text-brand-600" size={20} />
          <span className="font-semibold text-gray-900">{orphanage.name}</span>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-600 hover:text-red-600 flex items-center gap-1"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </header>

      <div className="max-w-2xl mx-auto space-y-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-bold text-gray-900">QR Code</h1>
            <p className="text-sm text-gray-600 mt-1">
              Print and display this at your orphanage entrance. Volunteers scan it to check in.
            </p>
          </div>

          {/* Expiry status banner. */}
          {isExpired && (
            <div className="bg-red-50 border border-red-200 rounded p-3 mb-4 flex items-start gap-2">
              <AlertTriangle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-800">
                <p className="font-semibold">This QR has expired.</p>
                <p>
                  Contact NextGem staff to get a new QR code. Old scans will be rejected.
                </p>
              </div>
            </div>
          )}

          {!hasQR && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4 flex items-start gap-2">
              <AlertTriangle size={16} className="text-yellow-700 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-yellow-800">
                No QR code has been generated yet. Contact NextGem staff.
              </p>
            </div>
          )}

          {/* The QR itself. Render with reduced opacity if expired so
              matrons see clearly that it's no longer valid. */}
          {hasQR && (
            <div className={`bg-white border-2 border-dashed border-gray-300 rounded-lg p-6 flex justify-center ${isExpired ? 'opacity-30 grayscale' : ''}`}>
              <QRGenerator
                qrCode={orphanage.current_qr_code}
                orphanageName={orphanage.name}
                size={300}
              />
            </div>
          )}

          {/* Expiry + rotation info. */}
          {hasQR && (
            <div className="mt-4 text-sm text-gray-700 space-y-1">
              <p className="flex items-center gap-2">
                <Calendar size={14} className="text-gray-400" />
                {expiryDate ? (
                  <>
                    Valid until:{' '}
                    <strong>{expiryDate.toLocaleDateString('en-US', { dateStyle: 'long' })}</strong>
                    {' '}
                    <span className="text-gray-500">
                      ({Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days left)
                    </span>
                  </>
                ) : (
                  <span className="text-gray-500">(no expiry set)</span>
                )}
              </p>
              <p className="flex items-center gap-2 text-xs text-gray-500">
                <RefreshCw size={12} />
                {orphanage.qr_rotated_at
                  ? `Last rotated: ${new Date(orphanage.qr_rotated_at).toLocaleDateString()}`
                  : 'Never rotated'}
              </p>
            </div>
          )}
        </div>

        {/* Print tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
          <p className="font-semibold mb-1">Print tips:</p>
          <ul className="text-xs space-y-1 text-blue-800">
            <li>• Print at 300 DPI minimum so it scans cleanly from 1+ meters away.</li>
            <li>• Laminate to protect from weather if displayed outdoors.</li>
            <li>• Mount at chest-to-eye height near the entrance.</li>
            <li>• Do NOT share the QR on social media - it can be misused.</li>
          </ul>
        </div>

        {/* Contacts */}
        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Your contact info</h3>
          {orphanage.matron_name && (
            <p className="text-sm">
              <span className="font-medium">{orphanage.matron_name}</span>
              <span className="text-xs text-gray-500 ml-2">Matron</span>
            </p>
          )}
          {orphanage.matron_phone && (
            <p className="text-xs flex items-center gap-1 mt-1 text-gray-600">
              <Phone size={12} />{orphanage.matron_phone}
            </p>
          )}
          {orphanage.matron_email && (
            <p className="text-xs flex items-center gap-1 mt-1 text-gray-600">
              <Mail size={12} />{orphanage.matron_email}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
