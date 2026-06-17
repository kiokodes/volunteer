'use client';

/**
 * Admin QR Management (NextGem staff only).
 *
 * Allows NextGem admins to:
 *   - View all orphanages and their current QR codes + expiry dates
 *   - Rotate a QR code (generates a new token, expires old one)
 *   - See the rotation history for each orphanage
 *
 * Only accessible by users with role='admin'. Matrons can NOT reach
 * this page (they manage their own QR via /orphanage/qr).
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase';
import { QrCode, RefreshCw, Calendar, AlertCircle, Shield, ArrowLeft, History } from 'lucide-react';

export default function AdminQRPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [orphanages, setOrphanages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rotating, setRotating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [historyFor, setHistoryFor] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const supabase = getSupabaseClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push('/login?redirect=/admin/qr');
        return;
      }

      const { data: vol } = await supabase
        .from('volunteers').select('*').eq('user_id', authUser.id).maybeSingle();
      if (!vol || vol.role !== 'admin') {
        setError('Only NextGem admins can access this page.');
        setLoading(false);
        return;
      }
      setUser(vol);

      const { data: orphs } = await supabase
        .from('orphanages').select('*').order('name');
      setOrphanages(orphs ?? []);
      setLoading(false);
    };
    load();
  }, [router]);

  const rotateQR = async (orphanageId: string) => {
    if (!confirm('Rotate this QR code? The old QR will stop working immediately.')) return;
    setRotating(orphanageId);
    try {
      const res = await fetch('/api/admin/rotate-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orphanage_id: orphanageId,
          expires_in_days: 30,
          reason: 'Admin-triggered rotation from admin/qr page',
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? 'Rotation failed');

      // Refresh.
      const supabase = getSupabaseClient();
      const { data: orphs } = await supabase.from('orphanages').select('*').order('name');
      setOrphanages(orphs ?? []);
      alert(`New QR: ${json.new_qr_code}\nExpires: ${new Date(json.expires_at).toLocaleDateString()}`);
    } catch (e: any) {
      alert(`Error: ${e?.message ?? 'unknown'}`);
    } finally {
      setRotating(null);
    }
  };

  const showHistory = async (orphanageId: string) => {
    setHistoryFor(orphanageId);
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from('qr_rotation_history')
      .select('*')
      .eq('orphanage_id', orphanageId)
      .order('effective_from', { ascending: false })
      .limit(10);
    setHistory(data ?? []);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-gray-500">Loading…</p></div>;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6 text-center">
          <Shield className="mx-auto text-red-500" size={40} />
          <p className="mt-3 text-gray-900 font-semibold">Admin only</p>
          <p className="text-sm text-gray-600 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <header className="max-w-5xl mx-auto flex items-center justify-between mb-4">
        <Link href="/" className="text-sm text-gray-600 hover:text-brand-600 flex items-center gap-1">
          <ArrowLeft size={14} />
          Home
        </Link>
        <span className="text-sm text-gray-700 flex items-center gap-1">
          <Shield size={14} className="text-brand-600" />
          {user?.full_name} (Admin)
        </span>
      </header>

      <div className="max-w-5xl mx-auto space-y-4">
        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex items-center gap-2 mb-2">
            <QrCode className="text-brand-600" size={24} />
            <h1 className="text-2xl font-bold text-gray-900">QR Code Management</h1>
          </div>
          <p className="text-sm text-gray-600">
            Rotate QR codes to invalidate old scans. Each rotation gives the orphanage
            a new QR token that expires after 30 days by default.
          </p>
        </div>

        {orphanages.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
            No orphanages registered yet.
          </div>
        ) : (
          <div className="space-y-3">
            {orphanages.map((o) => {
              const isExpired = o.qr_expires_at && new Date(o.qr_expires_at) < new Date();
              const hasNoQR = !o.current_qr_code;
              const daysLeft = o.qr_expires_at
                ? Math.ceil((new Date(o.qr_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : null;

              return (
                <div key={o.id} className="bg-white rounded-lg shadow p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900">{o.name}</h3>
                      <p className="text-xs text-gray-500">{o.state}</p>

                      {hasNoQR ? (
                        <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
                          <AlertCircle size={14} /> No QR generated yet
                        </p>
                      ) : (
                        <div className="mt-2 text-sm">
                          <p className="text-gray-700">
                            <code className="bg-gray-100 px-1 rounded">{o.current_qr_code}</code>
                          </p>
                          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <Calendar size={12} />
                            {isExpired ? (
                              <span className="text-red-600 font-medium">Expired</span>
                            ) : daysLeft !== null ? (
                              <span>
                                Expires {new Date(o.qr_expires_at).toLocaleDateString()}
                                {daysLeft <= 7 && (
                                  <span className="text-orange-600 ml-1">({daysLeft} days left)</span>
                                )}
                              </span>
                            ) : (
                              <span className="text-gray-500">No expiry set</span>
                            )}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => showHistory(o.id)}
                        className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 flex items-center gap-1"
                      >
                        <History size={14} />
                        History
                      </button>
                      <button
                        onClick={() => rotateQR(o.id)}
                        disabled={rotating === o.id}
                        className="px-3 py-1 text-sm bg-brand-600 text-white rounded hover:bg-brand-700 disabled:opacity-50 flex items-center gap-1"
                      >
                        <RefreshCw size={14} className={rotating === o.id ? 'animate-spin' : ''} />
                        {rotating === o.id ? 'Rotating…' : 'Rotate QR'}
                      </button>
                    </div>
                  </div>

                  {/* History panel. */}
                  {historyFor === o.id && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs uppercase font-semibold text-gray-500 mb-2">Rotation history</p>
                      {history.length === 0 ? (
                        <p className="text-sm text-gray-500">No rotations yet.</p>
                      ) : (
                        <div className="space-y-1 text-xs">
                          {history.map((h) => (
                            <div key={h.id} className="flex justify-between text-gray-700">
                              <code className="bg-gray-100 px-1 rounded">{h.qr_code}</code>
                              <span className="text-gray-500">
                                {new Date(h.effective_from).toLocaleDateString()}
                                {h.effective_to && ` → ${new Date(h.effective_to).toLocaleDateString()}`}
                                {!h.effective_to && <span className="text-green-600 ml-1">(current)</span>}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
