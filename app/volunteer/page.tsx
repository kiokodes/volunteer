'use client';

/**
 * Volunteer dashboard.
 *
 * Shows the signed-in volunteer's stats and next actions.
 * Different content shown based on role:
 *   - volunteer: hours, points, badges, progress to next milestone
 *   - matron:    link to manage their orphanage's QR
 *   - admin:     link to admin tools (QR rotation, etc)
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase';
import { HoursCard } from '@/components/HoursCard';
import { ScanLine, Award, Shield, QrCode } from 'lucide-react';
import type { Volunteer } from '@/lib/types';

export default function VolunteerDashboard() {
  const router = useRouter();
  const [volunteer, setVolunteer] = useState<Volunteer | null>(null);
  const [badges, setBadges] = useState<any[]>([]);
  const [hours, setHours] = useState<any[]>([]);
  const [certificateUrl, setCertificateUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login?redirect=/volunteer');
        return;
      }

      const { data: vol } = await supabase
        .from('volunteers').select('*').eq('user_id', user.id).maybeSingle();
      if (!vol) {
        router.push('/login');
        return;
      }
      setVolunteer(vol);

      const { data: b } = await supabase
        .from('badges').select('*').eq('volunteer_id', vol.id);
      setBadges(b ?? []);

      const { data: h } = await supabase
        .from('volunteer_hours')
        .select('*')
        .eq('volunteer_id', vol.id)
        .order('date', { ascending: false })
        .limit(30);
      setHours(h ?? []);

      const { data: cert } = await supabase
        .from('certificates').select('*').eq('volunteer_id', vol.id)
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (cert) setCertificateUrl(cert.pdf_url);

      setLoading(false);
    };
    load();
  }, [router]);

  if (loading || !volunteer) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-gray-500">Loading…</p></div>;
  }

  const isMatron = volunteer.role === 'matron';
  const isAdmin = volunteer.role === 'admin';

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome, {volunteer.full_name}!</h1>
          <p className="text-gray-600 mt-1">
            {isAdmin ? 'NextGem admin' : isMatron ? 'Orphanage matron' : 'Volunteer'}
          </p>
          {volunteer.nextgem_code && (
            <p className="mt-2 inline-block bg-brand-50 text-brand-800 px-3 py-1 rounded font-mono font-bold tracking-wide">
              {volunteer.nextgem_code}
            </p>
          )}
        </div>

        {/* Admin / matron specific actions. */}
        {(isMatron || isAdmin) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href="/orphanage/qr"
              className="bg-white rounded-lg shadow p-4 hover:shadow-lg flex items-center gap-3"
            >
              <QrCode className="text-brand-600" size={24} />
              <div>
                <p className="font-semibold text-gray-900">My Orphanage QR</p>
                <p className="text-xs text-gray-500">View / print current QR</p>
              </div>
            </Link>
            {isAdmin && (
              <Link
                href="/admin/qr"
                className="bg-white rounded-lg shadow p-4 hover:shadow-lg flex items-center gap-3"
              >
                <Shield className="text-brand-600" size={24} />
                <div>
                  <p className="font-semibold text-gray-900">Admin Tools</p>
                  <p className="text-xs text-gray-500">Rotate QR codes</p>
                </div>
              </Link>
            )}
          </div>
        )}

        {/* Volunteer primary action: scan. */}
        {!isMatron && !isAdmin && (
          <Link
            href="/scan"
            className="block bg-brand-600 text-white rounded-lg shadow p-4 hover:bg-brand-700"
          >
            <div className="flex items-center gap-3">
              <ScanLine size={28} />
              <div>
                <p className="font-semibold">Scan QR Code</p>
                <p className="text-sm text-brand-100">Check in or out at an orphanage</p>
              </div>
            </div>
          </Link>
        )}

        {/* Certificate banner. */}
        {certificateUrl && (
          <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-yellow-900">🏆 Your 100-hour certificate is ready!</p>
              <p className="text-sm text-yellow-800 mt-1">Download and share your achievement.</p>
            </div>
            <a
              href={certificateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
            >
              Download
            </a>
          </div>
        )}

        <HoursCard
          totalHours={volunteer.total_hours}
          totalPoints={volunteer.total_points}
          badges={badges.map((b) => ({ milestone: b.milestone, badge_name: b.badge_name }))}
        />

        {hours.length > 0 && (
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Recent Activity</h2>
            <div className="space-y-1 text-sm">
              {hours.slice(0, 5).map((h) => (
                <div key={h.id} className="flex justify-between border-b last:border-0 py-1">
                  <span className="text-gray-700">{h.date}</span>
                  <span className="font-medium">{Number(h.hours).toFixed(2)}h</span>
                  <span className="text-brand-700">+{h.points_earned}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
