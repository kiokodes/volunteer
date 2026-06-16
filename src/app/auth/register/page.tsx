/**
 * app/auth/register/page.tsx
 *
 * Volunteer self-registration page.
 * Creates a Supabase auth user AND a corresponding profile row.
 *
 * New users are always created with role = "volunteer".
 * Matron accounts must be created by an admin via the Internal Operations Platform.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail]       = useState("");
  const [phone, setPhone]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Step 1: Create Supabase auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError || !authData.user) {
      setError(authError?.message ?? "Registration failed. Please try again.");
      setLoading(false);
      return;
    }

    // Step 2: Create profile row linked to the new auth user
    // Role defaults to "volunteer" — cannot be changed by the user themselves
    const { error: profileError } = await supabase.from("profiles").insert({
      id:        authData.user.id,
      full_name: fullName.trim(),
      email:     email.trim().toLowerCase(),
      phone:     phone.trim() || null,
      role:      "volunteer",
    });

    if (profileError) {
      setError("Account created but profile setup failed. Please contact support.");
      setLoading(false);
      return;
    }

    // All good — redirect to dashboard
    router.push("/volunteer");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8 bg-surface-subtle">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-brand-600 rounded-xl mb-3">
            <span className="text-white text-xl font-bold">N</span>
          </div>
          <h1 className="text-xl font-bold text-ink">Join NextGem</h1>
          <p className="text-sm text-ink-muted mt-1">Create your volunteer account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleRegister} className="card flex flex-col gap-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="fullName" className="label">Full name</label>
            <input
              id="fullName"
              type="text"
              className="input"
              placeholder="Ada Okafor"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="label">Email</label>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="phone" className="label">
              Phone number <span className="text-ink-faint font-normal">(optional)</span>
            </label>
            <input
              id="phone"
              type="tel"
              className="input"
              placeholder="+234 800 000 0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="password" className="label">Password</label>
            <input
              id="password"
              type="password"
              className="input"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          <button
            type="submit"
            className="btn-primary w-full justify-center py-3"
            disabled={loading}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="text-center text-sm text-ink-muted mt-4">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-brand-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
