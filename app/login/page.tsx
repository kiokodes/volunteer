'use client';

/**
 * Volunteer login / registration page.
 *
 * Uses Supabase Auth (email + password) for simplicity.
 * After sign-in we either:
 *   - create a new volunteer row linked to the auth user (registration), or
 *   - look up the existing volunteer row (login).
 *
 * The volunteer_id is stored in localStorage so subsequent scans work
 * without re-login.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();

      if (mode === 'signup') {
        // 1. Create the auth user.
        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email,
          password,
        });
        if (authErr) throw authErr;
        if (!authData.user) throw new Error('Sign-up failed - no user returned');

        // 2. Create the volunteer row.
        const { data: vol, error: volErr } = await supabase
          .from('volunteers')
          .insert({
            user_id: authData.user.id,
            full_name: fullName,
            email,
            phone: phone || null,
          })
          .select()
          .single();
        if (volErr) throw volErr;

        // 3. Audit log.
        await supabase.from('audit_log').insert({
          actor_id: authData.user.id,
          actor_role: 'volunteer',
          action: 'volunteer_registered',
          entity_type: 'volunteer',
          entity_id: vol.id,
          metadata: { full_name: fullName, email },
        });

        localStorage.setItem('volunteer_id', vol.id);
        localStorage.setItem('volunteer_name', fullName);
        router.push('/volunteer');
      } else {
        // 1. Sign in.
        const { data: authData, error: authErr } =
          await supabase.auth.signInWithPassword({ email, password });
        if (authErr) throw authErr;
        if (!authData.user) throw new Error('Login failed');

        // 2. Look up the volunteer row.
        const { data: vol, error: volErr } = await supabase
          .from('volunteers')
          .select('*')
          .eq('user_id', authData.user.id)
          .single();
        if (volErr) throw volErr;

        localStorage.setItem('volunteer_id', vol.id);
        localStorage.setItem('volunteer_name', vol.full_name);
        router.push('/volunteer');
      }
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
        {mode === 'login' ? 'Volunteer Login' : 'Volunteer Sign Up'}
      </h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
        {mode === 'signup' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Phone (optional)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+234..."
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-brand-600 text-white rounded-md font-semibold hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? 'Please wait...' : mode === 'login' ? 'Log In' : 'Sign Up'}
        </button>

        <p className="text-center text-sm text-gray-600">
          {mode === 'login' ? (
            <>
              No account?{' '}
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="text-brand-600 font-semibold underline"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-brand-600 font-semibold underline"
              >
                Log in
              </button>
            </>
          )}
        </p>
      </form>
    </div>
  );
}
