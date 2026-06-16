'use client';

/**
 * Matron Dashboard.
 *
 * Matrons see:
 *   - Volunteers who checked in today at their orphanage.
 *   - Ability to flag a volunteer (with reason).
 *   - Total hours logged at the orphanage (this month and all-time).
 *
 * Phase 1: shows ALL orphanages' activity for testing. In production this
 * would be filtered to "their" orphanage based on matron auth.
 */

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { Flag, AlertTriangle } from 'lucide-react';

export default function MatronDashboard() {
  const [orphanages, setOrphanages] = useState<any[]>([]);
  const [selectedOrphanage, setSelectedOrphanage] = useState<string>('');
  const [todayCheckins, setTodayCheckins] = useState<any[]>([]);
  const [monthlyHours, setMonthlyHours] = useState<number>(0);
  const [allTimeHours, setAllTimeHours] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Flag dialog state.
  const [flaggingVolunteer, setFlaggingVolunteer] = useState<string | null>(null);
  const [flagReason, setFlagReason] = useState('');
  const [flagSeverity, setFlagSeverity] = useState<'low' | 'medium' | 'high'>('low');

  useEffect(() => {
    const load = async () => {
      const supabase = getSupabaseClient();
      const { data: orph } = await supabase
        .from('orphanages')
        .select('*')
        .eq('is_active', true)
        .order('name');
      setOrphanages(orph ?? []);
      if (orph && orph.length > 0) setSelectedOrphanage(orph[0].id);
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedOrphanage) return;
    const loadStats = async () => {
      const supabase = getSupabaseClient();

      // Today's check-ins at this orphanage.
      const today = new Date().toISOString().split('T')[0];
      const { data: checkins } = await supabase
        .from('check_ins')
        .select('*, volunteers(full_name, email)')
        .eq('orphanage_id', selectedOrphanage)
        .gte('scanned_at', `${today}T00:00:00`)
        .order('scanned_at', { ascending: false });
      setTodayCheckins(checkins ?? []);

      // Monthly hours.
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const { data: monthly } = await supabase
        .from('volunteer_hours')
        .select('hours')
        .eq('orphanage_id', selectedOrphanage)
        .gte('date', startOfMonth.toISOString().split('T')[0]);
      setMonthlyHours(
        (monthly ?? []).reduce((s, r) => s + Number(r.hours), 0)
      );

      // All-time hours.
      const { data: allTime } = await supabase
        .from('volunteer_hours')
        .select('hours')
        .eq('orphanage_id', selectedOrphanage);
      setAllTimeHours(
        (allTime ?? []).reduce((s, r) => s + Number(r.hours), 0)
      );
    };
    loadStats();
  }, [selectedOrphanage]);

  const submitFlag = async () => {
    if (!flaggingVolunteer || !flagReason || !selectedOrphanage) return;
    const supabase = getSupabaseClient();

    await supabase.from('flags').insert({
      volunteer_id: flaggingVolunteer,
      orphanage_id: selectedOrphanage,
      flagged_by: 'matron',
      reason: flagReason,
      severity: flagSeverity,
    });

    await supabase.from('audit_log').insert({
      actor_role: 'matron',
      action: 'flag_raised',
      entity_type: 'volunteer',
      entity_id: flaggingVolunteer,
      metadata: { reason: flagReason, severity: flagSeverity },
    });

    // Try to sync to internal platform (best-effort).
    try {
      await fetch('/api/flag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          volunteer_id: flaggingVolunteer,
          orphanage_id: selectedOrphanage,
          reason: flagReason,
          severity: flagSeverity,
        }),
      });
    } catch (e) {
      // Non-fatal - flag is saved locally.
    }

    setFlaggingVolunteer(null);
    setFlagReason('');
    setFlagSeverity('low');
    alert('Volunteer flagged. Admin will be notified.');
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Matron Dashboard</h1>
      <p className="text-gray-600 mb-6">
        View today's volunteers and flag any concerns.
      </p>

      {/* Orphanage selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Orphanage
        </label>
        <select
          value={selectedOrphanage}
          onChange={(e) => setSelectedOrphanage(e.target.value)}
          className="w-full md:w-96 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          {orphanages.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name} ({o.state})
            </option>
          ))}
        </select>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-sm text-gray-600 uppercase">This Month</p>
          <p className="text-3xl font-bold text-brand-700 mt-1">
            {monthlyHours.toFixed(1)}
          </p>
          <p className="text-xs text-gray-500">volunteer hours</p>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-sm text-gray-600 uppercase">All Time</p>
          <p className="text-3xl font-bold text-brand-700 mt-1">
            {allTimeHours.toFixed(1)}
          </p>
          <p className="text-xs text-gray-500">volunteer hours</p>
        </div>
      </div>

      {/* Today's check-ins */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Today's Activity
        </h2>
        {todayCheckins.length === 0 ? (
          <p className="text-sm text-gray-500">
            No volunteers have checked in today.
          </p>
        ) : (
          <div className="space-y-2">
            {todayCheckins.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {c.volunteers?.full_name ?? 'Unknown'}
                  </p>
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

      {/* Flag dialog */}
      {flaggingVolunteer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="text-red-600" size={24} />
              <h3 className="text-lg font-semibold text-gray-900">
                Flag Volunteer
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Reason
                </label>
                <textarea
                  rows={3}
                  value={flagReason}
                  onChange={(e) => setFlagReason(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g. Left early without finishing task..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Severity
                </label>
                <select
                  value={flagSeverity}
                  onChange={(e) =>
                    setFlagSeverity(e.target.value as 'low' | 'medium' | 'high')
                  }
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
