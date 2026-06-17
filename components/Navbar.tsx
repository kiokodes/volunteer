'use client';

/**
 * Top navigation bar.
 *
 * The navbar adapts based on the logged-in user's role:
 *   - Public visitors (no auth): just sign-in + leaderboard
 *   - Volunteers (role='volunteer'): scan + dashboard + leaderboard
 *   - Matrons (role='matron'): QR code (their orphanage only) + dashboard
 *   - Admins (role='admin'): everything + admin tools
 *
 * Important: matrons CANNOT see other orphanages' QR codes. The QR link
 * only ever shows THEIR assigned orphanage's QR.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ScanLine, Home, QrCode, Trophy, LogOut, Shield } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';

const links = [
  { href: '/', label: 'Home', icon: Home, show: 'all' },
  { href: '/scan', label: 'Scan', icon: ScanLine, show: 'volunteer' },
  { href: '/orphanage/qr', label: 'QR Code', icon: QrCode, show: 'matron' },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy, show: 'all' },
];

export function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) {
        setUser(null);
        return;
      }
      supabase
        .from('volunteers')
        .select('id, full_name, role')
        .eq('user_id', u.id)
        .maybeSingle()
        .then(({ data }) => setUser(data));
    });
  }, [pathname]);

  const visible = links.filter((l) => {
    if (!user) return l.show === 'all' || l.href === '/';
    if (l.show === 'all') return true;
    if (l.show === 'volunteer') return ['volunteer', 'matron', 'admin'].includes(user.role);
    if (l.show === 'matron') return ['matron', 'admin'].includes(user.role);
    return false;
  });

  const handleLogout = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <nav className="bg-brand-800 text-white shadow-md sticky top-0 z-50">
      <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="text-2xl">💎</span>
          <span className="hidden sm:inline">NextGem Volunteers</span>
        </Link>

        <div className="flex flex-wrap items-center gap-1">
          {visible.map((link) => {
            const Icon = link.icon;
            const active =
              pathname === link.href ||
              (link.href !== '/' && pathname?.startsWith(link.href + '/'));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1 px-3 py-2 rounded text-sm transition-colors ${
                  active ? 'bg-brand-600 text-white' : 'text-brand-100 hover:bg-brand-700'
                }`}
              >
                <Icon size={16} />
                <span>{link.label}</span>
              </Link>
            );
          })}

          {user && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 px-3 py-2 text-sm text-brand-100 hover:bg-brand-700 rounded"
            >
              <LogOut size={14} />
              Sign out
            </button>
          )}

          {!user && (
            <Link
              href="/login"
              className="flex items-center gap-1 px-3 py-2 text-sm bg-brand-600 text-white rounded hover:bg-brand-700"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
