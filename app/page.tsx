'use client';

/**
 * Landing page (home).
 *
 * Public - no sign-in required.
 * Shows the brand, a quick link to sign in for volunteers, and a CTA
 * to view the public leaderboard.
 */

import Link from 'next/link';
import { ScanLine, Trophy, KeyRound, ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <span className="text-6xl">💎</span>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mt-4">
            NextGem Volunteers
          </h1>
          <p className="text-gray-600 mt-3 text-lg">
            Scan QR codes at partner orphanages. Track your hours. Earn badges.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Sign in card (for registered volunteers). */}
          <Link
            href="/login"
            className="block bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow border-l-4 border-brand-600"
          >
            <KeyRound className="mx-auto text-brand-600" size={32} />
            <h2 className="font-semibold mt-3 text-gray-900 text-center">Sign In</h2>
            <p className="text-sm text-gray-600 mt-1 text-center">
              For registered volunteers with a NextGem code
            </p>
          </Link>

          {/* Leaderboard card (public). */}
          <Link
            href="/leaderboard"
            className="block bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow border-l-4 border-yellow-500"
          >
            <Trophy className="mx-auto text-yellow-600" size={32} />
            <h2 className="font-semibold mt-3 text-gray-900 text-center">Leaderboard</h2>
            <p className="text-sm text-gray-600 mt-1 text-center">
              See top volunteers - no login needed
            </p>
          </Link>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            Not a registered volunteer? Reach out to NextGem to get involved.
          </p>
        </div>
      </div>
    </div>
  );
}
