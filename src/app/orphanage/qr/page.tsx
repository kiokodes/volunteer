/**
 * app/orphanage/qr/page.tsx
 *
 * Matron view — allows a matron to:
 *  1. View and print their orphanage's QR code
 *  2. See which volunteers are checked in today
 *  3. Flag a volunteer (with reason)
 *
 * Access: Only users with role = "matron" or "admin" can see this page.
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Orphanage, Profile, CheckRecord } from "@/types";
import { Printer, Flag, Users, QrCode, Loader2, AlertCircle } from "lucide-react";
import QRCode from "qrcode";

// URL format embedded in the QR code — volunteers scan this
function buildQrUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://volunteer.nextgemfoundation.com";
  return `${base}/scan?token=${token}`;
}

export default function OrphanageQrPage() {
  const router  = useRouter();
  const supabase = createClient();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [orphanage, setOrphanage]       = useState<Orphanage | null>(null);
  const [checkedInToday, setCheckedIn]  = useState<Array<CheckRecord & { profiles: Profile }>>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);

  // Flag modal state
  const [flagTarget, setFlagTarget]     = useState<string | null>(null); // volunteer_id
  const [flagReason, setFlagReason]     = useState("");
  const [flagLoading, setFlagLoading]   = useState(false);
  const [flagSuccess, setFlagSuccess]   = useState(false);

  // ── Load data on mount ─────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      // Verify user is a matron or admin
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile || (profile.role !== "matron" && profile.role !== "admin")) {
        router.push("/volunteer");
        return;
      }

      // Fetch the orphanage this matron manages
      const { data: org } = await supabase
        .from("orphanages")
        .select("*")
        .eq("matron_id", user.id)
        .eq("is_active", true)
        .single();

      if (!org) {
        setError("No active orphanage found for your account. Contact an admin.");
        setLoading(false);
        return;
      }

      setOrphanage(org);

      // Generate the QR code image on the canvas
      if (canvasRef.current) {
        await QRCode.toCanvas(canvasRef.current, buildQrUrl(org.qr_code_token), {
          width: 250,
          margin: 2,
          color: { dark: "#0f172a", light: "#ffffff" },
        });
      }

      // Fetch today's check-ins for this orphanage
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: checks } = await supabase
        .from("check_records")
        .select("*, profiles(full_name, email, phone)")
        .eq("orphanage_id", org.id)
        .gte("check_in_time", todayStart.toISOString())
        .order("check_in_time", { ascending: false });

      setCheckedIn((checks as unknown as Array<CheckRecord & { profiles: Profile }>) ?? []);
      setLoading(false);
    }

    load();
  }, []);

  // Re-render QR code when orphanage loads (canvas ref may not be ready on first render)
  useEffect(() => {
    if (orphanage && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, buildQrUrl(orphanage.qr_code_token), {
        width: 250,
        margin: 2,
        color: { dark: "#0f172a", light: "#ffffff" },
      });
    }
  }, [orphanage]);

  /**
   * handlePrint
   * Opens the browser print dialog. The canvas QR code and orphanage name will print.
   */
  function handlePrint() {
    window.print();
  }

  /**
   * handleFlag
   * Saves a volunteer flag to Supabase and syncs it to the Internal Platform.
   */
  async function handleFlag() {
    if (!flagTarget || !orphanage || !flagReason.trim()) return;
    setFlagLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    // Save flag in Supabase
    const { error: flagError } = await supabase.from("volunteer_flags").insert({
      volunteer_id: flagTarget,
      orphanage_id: orphanage.id,
      matron_id:    user?.id,
      reason:       flagReason.trim(),
    });

    if (flagError) {
      alert("Failed to submit flag. Please try again.");
      setFlagLoading(false);
      return;
    }

    // Sync flag to Internal Platform (non-blocking)
    try {
      await fetch("/api/sync-flag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ volunteer_id: flagTarget, orphanage_id: orphanage.id, reason: flagReason }),
      });
    } catch {
      // Non-critical — flag is saved locally even if sync fails
    }

    setFlagSuccess(true);
    setFlagLoading(false);
    setFlagTarget(null);
    setFlagReason("");

    // Hide success message after 3 seconds
    setTimeout(() => setFlagSuccess(false), 3000);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-brand-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <AlertCircle size={40} className="text-danger" />
        <p className="text-ink-muted text-center text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-subtle">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 print:hidden">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-2">
          <QrCode size={18} className="text-brand-600" />
          <h1 className="font-semibold text-ink">QR Code Manager</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-5">

        {/* ── QR Code Card ── */}
        <div className="card flex flex-col items-center gap-4 print:shadow-none print:border-0">
          <div className="text-center">
            <h2 className="font-bold text-ink text-lg">{orphanage?.name}</h2>
            <p className="text-sm text-ink-muted">{orphanage?.state}</p>
          </div>

          {/* The QR code canvas — rendered by qrcode library */}
          <canvas ref={canvasRef} className="rounded-lg border border-slate-200" />

          <p className="text-xs text-ink-faint text-center max-w-xs">
            Print this QR code and place it at your orphanage entrance.
            Volunteers scan it to check in and out.
          </p>

          <button onClick={handlePrint} className="btn-secondary gap-2 print:hidden">
            <Printer size={16} />
            Print QR Code
          </button>
        </div>

        {/* ── Today's Check-ins ── */}
        <div className="card print:hidden">
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} className="text-ink-muted" />
            <h2 className="text-sm font-semibold text-ink">
              Today&apos;s volunteers ({checkedInToday.length})
            </h2>
          </div>

          {flagSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-800 rounded px-3 py-2 text-sm mb-3">
              ✓ Volunteer flagged successfully.
            </div>
          )}

          {checkedInToday.length === 0 ? (
            <p className="text-sm text-ink-faint text-center py-4">
              No volunteers checked in today yet.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-slate-100">
              {checkedInToday.map((record) => {
                const volunteer = record.profiles;
                const isStillIn = !record.check_out_time;

                return (
                  <div key={record.id} className="py-3 flex items-center gap-3">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-brand-700 text-sm font-bold">
                        {volunteer?.full_name?.charAt(0) ?? "?"}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink truncate">
                        {volunteer?.full_name ?? "Unknown"}
                      </p>
                      <p className="text-xs text-ink-muted">
                        {new Date(record.check_in_time).toLocaleTimeString("en-NG", {
                          hour: "2-digit", minute: "2-digit"
                        })}
                        {record.check_out_time
                          ? ` → ${new Date(record.check_out_time).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}`
                          : " (still here)"}
                      </p>
                    </div>

                    {/* Status + flag */}
                    <div className="flex items-center gap-2">
                      {isStillIn && (
                        <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5 font-medium">
                          Active
                        </span>
                      )}
                      {record.hours_worked != null && (
                        <span className="text-xs text-ink-muted">
                          {record.hours_worked.toFixed(1)}h
                        </span>
                      )}
                      <button
                        onClick={() => setFlagTarget(record.volunteer_id)}
                        className="text-ink-faint hover:text-danger transition-colors p-1"
                        title="Flag this volunteer"
                      >
                        <Flag size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Flag modal ── */}
        {flagTarget && (
          <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 px-4">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-sm p-5 flex flex-col gap-4">
              <h3 className="font-semibold text-ink flex items-center gap-2">
                <Flag size={16} className="text-danger" />
                Flag volunteer
              </h3>
              <p className="text-sm text-ink-muted">
                Describe the reason for this flag. This will be reviewed by the NextGem admin team.
              </p>
              <textarea
                className="input resize-none"
                rows={3}
                placeholder="e.g. Arrived late, was disrespectful to children…"
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => { setFlagTarget(null); setFlagReason(""); }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFlag}
                  disabled={!flagReason.trim() || flagLoading}
                  className="btn-danger flex-1"
                >
                  {flagLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                  Submit flag
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
