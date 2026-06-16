/**
 * Landing page.
 *
 * Simple welcome screen with quick links to:
 *   - Volunteer login/register
 *   - Scan a QR code (no login required)
 *   - Matron view (print QR codes)
 *
 * Kept deliberately simple - the platform is mobile-first for volunteers
 * who often just want to scan and check in/out quickly.
 */

import Link from 'next/link';
import { ScanLine, UserPlus, QrCode, Trophy } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="max-w-2xl mx-auto text-center py-8">
      <div className="mb-8">
        <span className="text-6xl">💎</span>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mt-4">
          NextGem Volunteers
        </h1>
        <p className="text-gray-600 mt-3 text-lg">
          Scan in at partner orphanages. Track your hours. Earn badges and
          certificates.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
        {/* Volunteer sign-up / login */}
        <Link
          href="/login"
          className="block bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow border-l-4 border-brand-500"
        >
          <UserPlus className="mx-auto text-brand-600" size={32} />
          <h2 className="font-semibold mt-3 text-gray-900">
            Volunteer Sign Up
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Create an account to track your hours
          </p>
        </Link>

        {/* Quick scan (assumes logged in via localStorage) */}
        <Link
          href="/scan"
          className="block bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow border-l-4 border-blue-500"
        >
          <ScanLine className="mx-auto text-blue-600" size={32} />
          <h2 className="font-semibold mt-3 text-gray-900">Scan QR Code</h2>
          <p className="text-sm text-gray-600 mt-1">
            Check in or out at an orphanage
          </p>
        </Link>

        {/* Matron view */}
        <Link
          href="/orphanage/qr"
          className="block bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow border-l-4 border-purple-500"
        >
          <QrCode className="mx-auto text-purple-600" size={32} />
          <h2 className="font-semibold mt-3 text-gray-900">
            Orphanage QR Codes
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Matrons: view and print QR codes
          </p>
        </Link>

        {/* Leaderboard */}
        <Link
          href="/leaderboard"
          className="block bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow border-l-4 border-yellow-500"
        >
          <Trophy className="mx-auto text-yellow-600" size={32} />
          <h2 className="font-semibold mt-3 text-gray-900">Leaderboard</h2>
          <p className="text-sm text-gray-600 mt-1">
            See top volunteers this month
          </p>
        </Link>
      </div>

      <div className="mt-12 text-sm text-gray-500">
        <p>NextGem Foundation &copy; {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}
