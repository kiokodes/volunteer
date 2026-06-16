'use client';

/**
 * Volunteer Dashboard.
 *
 * Shows the logged-in volunteer:
 *   - Total hours and points
 *   - Progress to next milestone (with progress bar)
 *   - All badges earned
 *   - Recent hours history
 *
 * Reads the volunteer_id from localStorage (set during login).
 * If not logged in, redirects to /login.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase';
import { HoursCard } from '@/components/HoursCard';
import type { Volunteer, VolunteerHour, Badge } from '@/lib/types';
import { ScanLine, FileDown } from 'lucide-react';

export default function VolunteerDashboard() {
  const router = useRouter();
  const [volunteer, setVolunteer] = useState<Volunteer | null>(null);
  const [hours, setHours] = useState<VolunteerHour[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [certificateUrl, setCertificateUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const volunteerId = localStorage.getItem('volunteer_id');
    if (!volunteerId) {
      router.push('/login');
      return;
    }

    const loadData = async () => {
      const supabase = getSupabaseClient();

      // Volunteer profile.
      const { data: v } = await supabase
        .from('volunteers')
        .select('*')
        .eq('id', volunteerId)
        .single();
      setVolunteer(v);

      // Recent hours (last 30).
      const { data: h } = await supabase
        .from('volunteer_hours')
        .select('*')
        .eq('volunteer_id', volunteerId)
        .order('date', { ascending: false })
        .limit(30);
      setHours(h ?? []);

      // Badges.
      const { data: b } = await supabase
        .from('badges')
        .select('*')
        .eq('volunteer_id', volunteerId);
      setBadges(b ?? []);

      // Certificate (if any).
      const { data: cert } = await supabase
        .from('certificates')
        .select('*')
        .eq('volunteer_id', volunteerId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cert) setCertificateUrl(cert.pdf_url);

      setLoading(false);
    };

    loadData();
  }, [router]);

  if (loading) {
    return (
      <div className="text-center py-12 text-gray-500">Loading...</div>
    );
  }

  if (!volunteer) {
    return (
      <div className="text-center py-12">
        <p>Could not load your profile.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {volunteer.full_name}!
        </h1>
        <p className="text-gray-600 mt-1">
          Here's your volunteer journey so far.
        </p>
      </div>

      {/* Quick action: Scan */}
      <Link
        href="/scan"
        className="block bg-brand-600 text-white rounded-lg shadow p-4 hover:bg-brand-700 transition-colors"
      >
        <div className="flex items-center gap-3">
          <ScanLine size={28} />
          <div>
            <p className="font-semibold">Scan QR Code</p>
            <p className="text-sm text-brand-100">Check in or out at an orphanage</p>
          </div>
        </div>
      </Link>

      {/* Certificate banner (if exists) */}
      {certificateUrl && (
        <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-yellow-900">
              🏆 Your 100-hour certificate is ready!
            </p>
            <p className="text-sm text-yellow-800 mt-1">
              Download and share your achievement.
            </p>
          </div>
          <a
            href={certificateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
          >
            <FileDown size={16} />
            Download
          </a>
        </div>
      )}

      {/* Hours, points, badges card */}
      <HoursCard
        totalHours={volunteer.total_hours}
        totalPoints={volunteer.total_points}
        badges={badges.map((b) => ({
          milestone: b.milestone,
          badge_name: b.badge_name,
        }))}
      />

      {/* Hours history */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Activity
        </h2>
        {hours.length === 0 ? (
          <p className="text-sm text-gray-500">
            No hours logged yet. Scan a QR code at a partner orphanage to get started!
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-600 border-b">
                <tr>
                  <th className="py-2">Date</th>
                  <th className="py-2">Hours</th>
                  <th className="py-2">Points</th>
                  <th className="py-2">Synced</th>
                </tr>
              </thead>
              <tbody>
                {hours.map((h) => (
                  <tr key={h.id} className="border-b last:border-0">
                    <td className="py-2">{h.date}</td>
                    <td className="py-2">{h.hours.toFixed(2)}</td>
                    <td className="py-2">+{h.points_earned}</td>
                    <td className="py-2">
                      {h.synced_to_internal ? (
                        <span className="text-green-600">✓</span>
                      ) : (
                        <span className="text-gray-400">pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
