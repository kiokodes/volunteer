'use client';

/**
 * Top navigation bar.
 *
 * Shown on every page. Contains links to:
 *   - Volunteer dashboard
 *   - QR scan page
 *   - Matron view (orphanage QR)
 *   - Leaderboard
 *
 * Designed to be mobile-friendly - links wrap nicely on small screens.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ScanLine, Home, QrCode, Trophy, UserCog } from 'lucide-react';

const links = [
  { href: '/volunteer', label: 'Dashboard', icon: Home },
  { href: '/scan', label: 'Scan', icon: ScanLine },
  { href: '/orphanage/qr', label: 'Orphanage QR', icon: QrCode },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { href: '/matron', label: 'Matron', icon: UserCog },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="bg-brand-700 text-white shadow-md sticky top-0 z-50">
      <div className="container-page flex flex-wrap items-center justify-between gap-3 py-3">
        {/* Logo / brand */}
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="text-2xl">💎</span>
          <span className="hidden sm:inline">NextGem Volunteers</span>
        </Link>

        {/* Nav links - wrap on mobile, inline on larger screens */}
        <div className="flex flex-wrap gap-1">
          {links.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href || pathname?.startsWith(link.href + '/');
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm transition-colors ${
                  active
                    ? 'bg-brand-900 text-white'
                    : 'text-brand-100 hover:bg-brand-600'
                }`}
              >
                <Icon size={16} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
