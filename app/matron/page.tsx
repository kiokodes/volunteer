'use client';

/**
 * Matron dashboard.
 *
 * Shows:
 *   - Today's volunteers who checked in
 *   - Ability to flag a volunteer (with reason)
 *   - Total volunteer hours at their orphanage (this month + all-time)
 *
 * Matron is tied to ONE orphanage (their assigned_orphanage_id).
 * They cannot see other orphanages' data.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase';
import { Flag, AlertTriangle, QrCode, Clock, Users, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';

export default function MatronDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [orphanage, setOrphanage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [todayCheckins, setTodayCheckins] = useState<any[]>([]);
  const [monthlyHours, setMonthlyHours] = useState<number>(0);
  const [allTimeHours, setAllTimeHours] = useState<number>(0);

  const [flaggingVolunteer, setFlaggingVolunteer] = useState<string | null>(null);
  const [flagReason, setFlagReason] = useState('');
  const [flagSeverity, setFlagSeverity] = useState<'low' | 'medium' | 'high'>('low');

  useEffect(() => {
    const load = async () => {
      const supabase = getSupabaseClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push('/login?redirect=/matron');
        return;
      }

      const { data: vol } = await supabase
        .from('volunteers').select('*').eq('user_id', authUser.id).maybeSingle();
      if (!vol || (vol.role !== 'matron' && vol.role !== 'admin')) {
        router.push('/');
        return;
      }
      setUser(vol);

      if (!vol.assigned_orphanage_id) {
        setLoading(false);
        return;
      }

      // Load orphanage + check QR status.
      const { data: orph } = await supabase
        .from('orphanages').select('*').eq('id', vol.assigned_orphanage_id).maybeSingle();
      setOrphanage(orph);

      if (orph) {
        const today = new Date().toISOString().split('T')[0];
        const { data: checkins } = await supabase
          .from('check_ins')
          .select('*, volunteers(full_name, auth_email)')
          .eq('orphanage_id', orph.id)
          .gte('scanned_at', `${today}T00:00:00`)
          .order('scanned_at', { ascending: false });
        setTodayCheckins(checkins ?? []);

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        const { data: monthly } = await supabase
          .from('volunteer_hours')
          .select('hours')
          .eq('orphanage_id', orph.id)
          .gte('date', startOfMonth.toISOString().split('T')[0]);
        setMonthlyHours((monthly ?? []).reduce((s, r) => s + Number(r.hours), 0));

        const { data: allTime } = await supabase
          .from('volunteer_hours').select('hours').eq('orphanage_id', orph.id);
        setAllTimeHours((allTime ?? []).reduce((s, r) => s + Number(r.hours), 0));
      }

      setLoading(false);
    };
    load();
  }, [router]);

  const submitFlag = async () => {
    if (!flaggingVolunteer || !flagReason || !orphanage) return;
    const supabase = getSupabaseClient();
    await supabase.from('flags').insert({
      volunteer_id: flaggingVolunteer,
      orphanage_id: orphanage.id,
      flagged_by: user.full_name,
      reason: flagReason,
      severity: flagSeverity,
    });
    await supabase.from('audit_log').insert({
      actor_id: user.id,
      actor_role: 'matron',
      action: 'flag_raised',
      entity_type: 'volunteer',
      entity_id: flaggingVolunteer,
      metadata: { reason: flagReason, severity: flagSeverity },
    });

    // Try to push to internal platform.
    try {
      await fetch('/api/flag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          volunteer_id: flaggingVolunteer,
          orphanage_id: orphanage.id,
          reason: flagReason,
          severity: flagSeverity,
        }),
      });
    } catch (e) {}

    setFlaggingVolunteer(null);
    setFlagReason('');
    setFlagSeverity('low');
    alert('Volunteer flagged. Admin will be notified.');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-gray-500">Loading…</p></div>;
  }

  if (!orphanage) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6 text-center">
          <AlertTriangle className="mx-auto text-yellow-500" size={40} />
          <p className="mt-3 text-gray-900 font-semibold">No orphanage assigned</p>
          <p className="text-sm text-gray-600 mt-2">
            Your account isn't tied to an orphanage yet. Contact NextGem staff.
          </p>
        </div>
      </div>
    );
  }

  const isExpired = orphanage.qr_expires_at && new Date(orphanage.qr_expires_at) < new Date();
  const hasQR = !!orphanage.current_qr_code;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <header className="max-w-3xl mx-auto flex items-center justify-between mb-4">
        <Link href="/orphanage/qr" className="text-sm text-gray-600 hover:text-brand-600 flex items-center gap-1">
          <ArrowLeft size={14} />
          Back
        </Link>
        <span className="text-sm text-gray-700">{user.full_name}</span>
      </header>

      <div className="max-w-3xl mx-auto space-y-4">
        <div className="bg-white rounded-lg shadow p-5">
          <h1 className="text-xl font-bold text-gray-900">{orphanage.name}</h1>
          <p className="text-sm text-gray-600 mt-1">{orphanage.city ? `${orphanage.city}, ` : ''}{orphanage.state}</p>
        </div>

        {/* QR Status warning. */}
        {(isExpired || !hasQR) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-900">
              <p className="font-semibold mb-1">Your QR code needs renewal</p>
              <p>
                {!hasQR
                  ? 'No QR code has been generated yet.'
                  : 'Your current QR has expired.'}{' '}
                Contact NextGem staff to receive a new one.
              </p>
              <Link
                href="/orphanage/qr"
                className="inline-flex items-center gap-1 mt-2 text-brand-700 font-medium hover:underline"
              >
                <QrCode size={14} />
                View QR code page
              </Link>
            </div>
          </div>
        )}

        {/* Stats cards. */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-600 uppercase">This Month</p>
            <p className="text-3xl font-bold text-brand-700 mt-1">{monthlyHours.toFixed(1)}</p>
            <p className="text-xs text-gray-500">volunteer hours</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-600 uppercase">All Time</p>
            <p className="text-3xl font-bold text-brand-700 mt-1">{allTimeHours.toFixed(1)}</p>
            <p className="text-xs text-gray-500">volunteer hours</p>
          </div>
        </div>

        {/* Today's activity. */}
        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Today's Activity</h2>
          {todayCheckins.length === 0 ? (
            <p className="text-sm text-gray-500">No volunteers have checked in today.</p>
          ) : (
            <div className="space-y-2">
              {todayCheckins.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <p className="font-medium text-sm">{(c as any).volunteers?.full_name ?? 'Unknown'}</p>
                    <p className="text-xs text-gray-500">
                      {c.type === 'in' ? '⬇ Checked in' : '⬆ Checked out'} at{' '}
                      {new Date(c.scanned_at).toLocaleTimeString()}
                    </p>
                  </div>
                  {c.type === 'in' && (
                    <button
                      onClick={() => setFlaggingVolunteer(c.volunteer_id)}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-red-50 text-red-700 rounded hover:bg-red-100"
                    >
                      <Flag size={14} />
                      Flag
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick link to QR. */}
        <Link
          href="/orphanage/qr"
          className="block bg-white rounded-lg shadow p-5 text-center hover:shadow-lg transition-shadow"
        >
          <QrCode className="mx-auto text-brand-600" size={32} />
          <p className="mt-2 font-semibold text-gray-900">View / Print QR Code</p>
          <p className="text-xs text-gray-500 mt-1">For this month's use</p>
        </Link>
      </div>

      {/* Flag dialog. */}
      {flaggingVolunteer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="text-red-600" size={24} />
              <h3 className="text-lg font-semibold text-gray-900">Flag Volunteer</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Reason</label>
                <textarea
                  rows={3}
                  value={flagReason}
                  onChange={(e) => setFlagReason(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g. Left early without finishing task…"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Severity</label>
                <select
                  value={flagSeverity}
                  onChange={(e) => setFlagSeverity(e.target.value as any)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="low">Low - minor concern</option>
                  <option value="medium">Medium - needs review</option>
                  <option value="high">High - urgent</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setFlaggingVolunteer(null)}
                className="flex-1 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitFlag}
                disabled={!flagReason}
                className="flex-1 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                Submit Flag
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
