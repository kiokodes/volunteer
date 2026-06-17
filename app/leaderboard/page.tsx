'use client';

/**
 * Public leaderboard.
 *
 * No sign-in required. Anyone can view the top volunteers and their
 * stats. This is the "marketing" page that drives volunteer recruitment.
 *
 * We deliberately don't show personal info beyond:
 *   - First name only (privacy)
 *   - Total hours
 *   - Total points
 *   - Top orphanage (if any)
 *
 * No email, no phone, no address.
 */

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { Trophy, Crown, Medal, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type Period = 'month' | 'all';

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<Period>('month');
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const supabase = getSupabaseClient();

      if (period === 'all') {
        // All-time: use denormalized totals directly (fast).
        const { data } = await supabase
          .from('volunteers')
          .select('id, full_name, total_hours, total_points')
          .eq('is_active', true)
          .order('total_hours', { ascending: false })
          .limit(50);
        setEntries(
          (data ?? []).map((v, i) => ({
            rank: i + 1,
            name: v.full_name?.split(' ')[0] ?? 'Volunteer', // First name only
            hours: Number(v.total_hours),
            points: v.total_points,
          }))
        );
      } else {
        // This month: aggregate from volunteer_hours.
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        const startStr = startOfMonth.toISOString().split('T')[0];

        const { data: hours } = await supabase
          .from('volunteer_hours')
          .select('hours, points_earned, volunteer_id, volunteers!inner(full_name)')
          .gte('date', startStr);

        const map = new Map<string, { name: string; hours: number; points: number }>();
        for (const row of hours ?? []) {
          const id = row.volunteer_id;
          const name = (row.volunteers as any)?.full_name?.split(' ')[0] ?? 'Volunteer';
          const existing = map.get(id);
          if (existing) {
            existing.hours += Number(row.hours);
            existing.points += Number(row.points_earned);
          } else {
            map.set(id, { name, hours: Number(row.hours), points: Number(row.points_earned) });
          }
        }
        const sorted = Array.from(map.values())
          .sort((a, b) => b.hours - a.hours)
          .slice(0, 50)
          .map((e, i) => ({ rank: i + 1, ...e }));
        setEntries(sorted);
      }
      setLoading(false);
    };
    load();
  }, [period]);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="text-sm text-gray-600 hover:text-brand-600 flex items-center gap-1">
            <ArrowLeft size={14} />
            Back to home
          </Link>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <Trophy className="text-yellow-500" size={32} />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Leaderboard</h1>
            <p className="text-sm text-gray-600">Top volunteers at NextGem-partnered orphanages</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-2 rounded-md text-sm font-semibold ${
              period === 'month'
                ? 'bg-brand-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => setPeriod('all')}
            className={`px-4 py-2 rounded-md text-sm font-semibold ${
              period === 'all'
                ? 'bg-brand-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Time
          </button>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading…</p>
        ) : entries.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <Trophy className="mx-auto text-gray-300" size={48} />
            <p className="mt-3 text-gray-900 font-semibold">No volunteers yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Be the first to sign up and log volunteer hours!
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Rank</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Volunteer</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Hours</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Points</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.rank} className={`border-t ${e.rank <= 3 ? 'bg-yellow-50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {e.rank === 1 && <Crown className="text-yellow-500" size={18} />}
                        {e.rank === 2 && <Medal className="text-gray-400" size={18} />}
                        {e.rank === 3 && <Medal className="text-orange-600" size={18} />}
                        <span className="font-semibold">#{e.rank}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{e.name}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{e.hours.toFixed(1)}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{e.points.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
          <p className="font-semibold mb-1">Want to appear on the leaderboard?</p>
          <p className="text-blue-800 text-xs">
            Get a NextGem code from our staff, then sign in and scan QR codes at partner orphanages.
            The top volunteers get certificates at 100 hours and special recognition at 1000.
          </p>
        </div>
      </div>
    </div>
  );
}
