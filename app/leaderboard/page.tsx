'use client';

/**
 * Leaderboard page.
 *
 * Shows:
 *   - Top volunteers this month (by hours).
 *   - Top volunteers all-time (by hours).
 *
 * Uses the denormalized totals on the volunteers table for speed.
 * Toggling between "This Month" and "All Time" queries the volunteer_hours
 * table and aggregates on the client.
 */

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { Trophy, Crown, Medal } from 'lucide-react';

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
        // All-time - use the denormalized totals directly (fast).
        const { data } = await supabase
          .from('volunteers')
          .select('id, full_name, total_hours, total_points')
          .order('total_hours', { ascending: false })
          .limit(50);
        setEntries(
          (data ?? []).map((v, i) => ({
            rank: i + 1,
            name: v.full_name,
            hours: Number(v.total_hours),
            points: v.total_points,
          }))
        );
      } else {
        // This month - aggregate from volunteer_hours.
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const startStr = startOfMonth.toISOString().split('T')[0];

        const { data: hours } = await supabase
          .from('volunteer_hours')
          .select('hours, points_earned, volunteer_id, volunteers(full_name)')
          .gte('date', startStr);

        // Aggregate per volunteer.
        const map = new Map<
          string,
          { name: string; hours: number; points: number }
        >();
        for (const row of hours ?? []) {
          const id = row.volunteer_id;
          const name =
            (row.volunteers as any)?.full_name ?? 'Unknown';
          const existing = map.get(id);
          if (existing) {
            existing.hours += Number(row.hours);
            existing.points += Number(row.points_earned);
          } else {
            map.set(id, {
              name,
              hours: Number(row.hours),
              points: Number(row.points_earned),
            });
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
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="text-yellow-500" size={32} />
        <h1 className="text-2xl font-bold text-gray-900">Leaderboard</h1>
      </div>

      {/* Period toggle */}
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
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-600">
            No volunteers yet. Be the first to log hours!
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Rank
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Volunteer
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                  Hours
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                  Points
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr
                  key={e.rank}
                  className={`border-t ${
                    e.rank <= 3 ? 'bg-yellow-50' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {e.rank === 1 && <Crown className="text-yellow-500" size={18} />}
                      {e.rank === 2 && <Medal className="text-gray-400" size={18} />}
                      {e.rank === 3 && <Medal className="text-orange-600" size={18} />}
                      <span className="font-semibold">#{e.rank}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {e.name}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {e.hours.toFixed(1)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {e.points.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
