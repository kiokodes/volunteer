'use client';

/**
 * Volunteer login page.
 *
 * IMPORTANT: Sign-up is disabled. Volunteers are created by NextGem staff
 * via the Internal Platform and assigned a unique "NextGem code"
 * (e.g. BY/0129, LA/0042) - simple like NYSC state codes. They sign in
 * here with that code + password.
 *
 * The auth flow:
 *   1. User enters their NextGem code + password.
 *   2. We convert the code to a synthetic auth email:
 *      BY/0129  ->  by0129@nextgem.volunteers
 *   3. Supabase Auth signs them in using the synthetic email + password.
 */

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient, codeToEmail } from '@/lib/supabase';
import { KeyRound, AlertCircle, Info } from 'lucide-react';

export default function LoginPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500">Loading…</div>}>
      <LoginPage />
    </Suspense>
  );
}

function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams?.get('redirect') ?? '/volunteer';

  const [nextgemCode, setNextgemCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already signed in? Bounce to dashboard.
  useEffect(() => {
    const check = async () => {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) router.push(redirect);
    };
    check();
  }, [router, redirect]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseClient();

      // Validate the NextGem code format. ST/0129
      //   ST  = 2-letter Nigerian state code (NYSC convention)
      //   0129 = 4-digit serial
      //   e.g. BY/0129, LA/0042, FC/0001
      const code = nextgemCode.trim().toUpperCase();
      if (!/^[A-Z]{2}\/\d{4}$/.test(code)) {
        throw new Error(
          'Invalid NextGem code format. Codes look like "BY/0129" ' +
          '(2-letter state code + slash + 4-digit number). ' +
          'If you don\'t have one yet, ask NextGem staff to register you.'
        );
      }

      // Convert code to synthetic email and sign in via Supabase Auth.
      const authEmail = codeToEmail(code);
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password,
      });

      if (signInErr) {
        if (signInErr.message?.toLowerCase().includes('invalid login')) {
          throw new Error('Wrong NextGem code or password. Try again, or contact NextGem staff.');
        }
        throw signInErr;
      }

      router.push(redirect);
    } catch (e: any) {
      setError(e?.message ?? 'Sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <span className="text-5xl">💎</span>
          <h1 className="text-2xl font-bold text-gray-900 mt-3">NextGem Volunteers</h1>
          <p className="text-gray-600 mt-1 text-sm">Sign in with your NextGem code</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white rounded-lg shadow-lg p-6 space-y-4">
          {/* Info card explaining how access works. */}
          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-900 flex items-start gap-2">
            <Info size={16} className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold mb-1">How do I get a NextGem code?</p>
              <p className="text-blue-800 text-xs">
                NextGem codes are issued only by NextGem staff. If you haven't
                received one, ask the person who registered you. Codes look like
                <code className="bg-white px-1 ml-1">BY/0129</code>
                (2-letter state code + 4-digit number).
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="nextgem-code" className="block text-sm font-medium text-gray-700">
              NextGem Code
            </label>
            <input
              id="nextgem-code"
              name="nextgem_code"
              type="text"
              required
              autoComplete="username"
              placeholder="BY/0129"
              value={nextgemCode}
              onChange={(e) => setNextgemCode(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-brand-600 text-white rounded-md font-semibold hover:bg-brand-700 disabled:opacity-50"
          >
            <KeyRound size={16} />
            {loading ? 'Signing in…' : 'Sign In'}
          </button>

          <div className="border-t pt-3 text-center">
            <Link
              href="/leaderboard"
              className="text-sm text-brand-600 hover:underline"
            >
              View the public leaderboard (no sign-in required)
            </Link>
          </div>
        </form>

        <p className="text-center text-xs text-gray-500 mt-6">
          Volunteer platform for NextGem-partnered orphanages.
        </p>
      </div>
    </div>
  );
}
