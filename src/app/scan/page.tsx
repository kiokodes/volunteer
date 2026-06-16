/**
 * app/scan/page.tsx
 *
 * QR Scan page — the most important page for volunteers in the field.
 *
 * Flow:
 *  1. Volunteer opens this page on their phone.
 *  2. Camera activates and scans the QR code at the orphanage.
 *  3. The QR code URL contains a unique orphanage token.
 *  4. We look up the orphanage from that token.
 *  5. Volunteer taps "Check In" or "Check Out".
 *  6. Record is saved to Supabase and synced to the Internal Ops Platform.
 *
 * The QR code URL format is:
 *   https://volunteer.nextgemfoundation.com/scan?token=<orphanage_qr_code_token>
 *
 * This page handles both the scanning UI and the check-in/out confirmation.
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Orphanage, CheckRecord } from "@/types";
import { calculatePoints, getBadgeTier } from "@/lib/gamification";
import { QrCode, CheckCircle, LogOut, Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

type ScanState =
  | "scanning"        // Camera is active, waiting for a QR code
  | "confirming"      // QR scanned, showing orphanage + action choice
  | "processing"      // Saving the check-in/out record
  | "success"         // Record saved successfully
  | "error";          // Something went wrong

export default function ScanPage() {
  const supabase       = createClient();
  const router         = useRouter();
  const searchParams   = useSearchParams();
  const scannerRef     = useRef<HTMLDivElement>(null);
  const html5QrRef     = useRef<unknown>(null); // holds the Html5QrcodeScanner instance

  // The token comes from the QR code URL, or from a direct link
  const tokenFromUrl = searchParams.get("token");

  const [scanState, setScanState]       = useState<ScanState>(
    tokenFromUrl ? "confirming" : "scanning"
  );
  const [orphanage, setOrphanage]       = useState<Orphanage | null>(null);
  const [activeRecord, setActiveRecord] = useState<CheckRecord | null>(null); // existing open check-in
  const [userId, setUserId]             = useState<string | null>(null);
  const [error, setError]               = useState<string | null>(null);
  const [hoursWorked, setHoursWorked]   = useState<number | null>(null);

  // ── Load current user on mount ───────────────────────────────────────────────
  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }
      setUserId(user.id);
    }
    loadUser();
  }, []);

  // ── If token is already in URL, look up the orphanage immediately ────────────
  useEffect(() => {
    if (tokenFromUrl && userId) {
      lookupOrphanage(tokenFromUrl);
    }
  }, [tokenFromUrl, userId]);

  // ── Start the QR scanner camera once we are in "scanning" state ─────────────
  useEffect(() => {
    if (scanState !== "scanning" || !scannerRef.current) return;

    let scanner: unknown;

    // Dynamically import html5-qrcode to avoid SSR issues (it uses browser APIs)
    import("html5-qrcode").then(({ Html5QrcodeScanner }) => {
      scanner = new Html5QrcodeScanner(
        "qr-reader", // ID of the div where the camera renders
        {
          fps: 10,             // Frames per second for QR detection
          qrbox: { width: 250, height: 250 }, // Size of the scanning box
          rememberLastUsedCamera: true,
        },
        false // verbose = false (no console spam)
      );

      // @ts-ignore
      scanner.render(
        // Success callback: QR code detected
        (decodedText: string) => {
          // @ts-ignore
          scanner.clear(); // Stop the camera

          // Extract the token from the decoded URL
          // Expected format: https://...nextgemfoundation.com/scan?token=<token>
          try {
            const url   = new URL(decodedText);
            const token = url.searchParams.get("token");
            if (token) {
              lookupOrphanage(token);
            } else {
              // QR code doesn't have our expected format
              setError("This QR code doesn't look like a NextGem orphanage code. Please try again.");
              setScanState("error");
            }
          } catch {
            // decodedText is not a URL — treat it as a raw token
            lookupOrphanage(decodedText);
          }
        },
        // Error callback: just ignore scan errors (they fire constantly while scanning)
        () => {}
      );

      // @ts-ignore
      html5QrRef.current = scanner;
    });

    // Cleanup: stop the camera when the component unmounts or state changes
    return () => {
      // @ts-ignore
      if (html5QrRef.current?.clear) html5QrRef.current.clear().catch(() => {});
    };
  }, [scanState]);

  /**
   * lookupOrphanage
   * Given an orphanage QR token, fetch the orphanage from Supabase
   * and check if the volunteer is already checked in there.
   */
  async function lookupOrphanage(token: string) {
    setScanState("processing");
    setError(null);

    // Find the orphanage with this token
    const { data: org, error: orgError } = await supabase
      .from("orphanages")
      .select("*")
      .eq("qr_code_token", token)
      .eq("is_active", true)
      .single();

    if (orgError || !org) {
      setError("Orphanage not found or QR code is no longer active.");
      setScanState("error");
      return;
    }

    setOrphanage(org);

    // Check if the volunteer already has an open (not yet checked out) record here
    const { data: openRecord } = await supabase
      .from("check_records")
      .select("*")
      .eq("volunteer_id", userId!)
      .eq("orphanage_id", org.id)
      .is("check_out_time", null)  // null check_out_time = still checked in
      .order("check_in_time", { ascending: false })
      .limit(1)
      .single();

    setActiveRecord(openRecord ?? null);
    setScanState("confirming");
  }

  /**
   * handleCheckIn
   * Creates a new check-in record in Supabase.
   */
  async function handleCheckIn() {
    if (!userId || !orphanage) return;
    setScanState("processing");

    const { error: insertError } = await supabase.from("check_records").insert({
      volunteer_id:        userId,
      orphanage_id:        orphanage.id,
      check_in_time:       new Date().toISOString(),
      check_out_time:      null,
      hours_worked:        null,
      synced_to_internal:  false, // Will be synced after check-out when hours are known
    });

    if (insertError) {
      setError("Failed to check in. Please try again.");
      setScanState("error");
      return;
    }

    setScanState("success");
  }

  /**
   * handleCheckOut
   * Closes the open check-in record, calculates hours, and syncs to the Internal Platform.
   */
  async function handleCheckOut() {
    if (!userId || !orphanage || !activeRecord) return;
    setScanState("processing");

    const checkOutTime = new Date();
    const checkInTime  = new Date(activeRecord.check_in_time);

    // Calculate hours worked (rounded to 2 decimal places)
    const msWorked    = checkOutTime.getTime() - checkInTime.getTime();
    const hours       = Math.round((msWorked / (1000 * 60 * 60)) * 100) / 100;
    const points      = Math.floor(hours * 10); // 10 points per hour

    setHoursWorked(hours);

    // Step 1: Update the check-in record with check-out time and hours
    const { error: updateError } = await supabase
      .from("check_records")
      .update({
        check_out_time:     checkOutTime.toISOString(),
        hours_worked:       hours,
        synced_to_internal: false, // Will be updated after successful sync
      })
      .eq("id", activeRecord.id);

    if (updateError) {
      setError("Failed to check out. Please try again.");
      setScanState("error");
      return;
    }

    // Step 2: Update the volunteer's cumulative stats
    // We use an upsert — if the stats row doesn't exist yet, create it
    const { data: currentStats } = await supabase
      .from("volunteer_stats")
      .select("total_hours, total_points, certificate_issued")
      .eq("volunteer_id", userId)
      .single();

    const newTotalHours  = (currentStats?.total_hours  ?? 0) + hours;
    const newTotalPoints = (currentStats?.total_points ?? 0) + points;
    const newBadgeTier   = getBadgeTier(newTotalHours);
    const certEarned     = newTotalHours >= 100;
    const certAlready    = currentStats?.certificate_issued ?? false;

    await supabase.from("volunteer_stats").upsert({
      volunteer_id:        userId,
      total_hours:         newTotalHours,
      total_points:        newTotalPoints,
      badge_tier:          newBadgeTier,
      certificate_issued:  certEarned || certAlready,
      certificate_issued_at: certEarned && !certAlready ? new Date().toISOString() : null,
    });

    // Step 3: Try to sync to the Internal Operations Platform
    // This is done via our own API route (server-side) to keep the secret secure
    try {
      await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordId: activeRecord.id }),
      });
    } catch {
      // Sync failure is non-blocking — the record is saved locally and will retry
      console.warn("[scan] Sync to internal platform failed — will retry later.");
    }

    setScanState("success");
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-surface-subtle flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/volunteer" className="text-ink-muted hover:text-ink">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="font-semibold text-ink">Scan QR Code</h1>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6">

        {/* ── SCANNING: Camera view ── */}
        {scanState === "scanning" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink-muted text-center">
              Point your camera at the QR code at the orphanage entrance.
            </p>
            {/* The html5-qrcode library renders the camera feed into this div */}
            <div
              id="qr-reader"
              ref={scannerRef}
              className="rounded-lg overflow-hidden border border-slate-200"
            />
            <p className="text-xs text-ink-faint text-center">
              Allow camera access if prompted by your browser.
            </p>
          </div>
        )}

        {/* ── PROCESSING: Loading spinner ── */}
        {scanState === "processing" && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 size={40} className="animate-spin text-brand-500" />
            <p className="text-ink-muted text-sm">Processing…</p>
          </div>
        )}

        {/* ── CONFIRMING: Show orphanage + action buttons ── */}
        {scanState === "confirming" && orphanage && (
          <div className="flex flex-col gap-4">
            {/* Orphanage info card */}
            <div className="card">
              <p className="text-xs text-ink-muted font-medium uppercase tracking-wide mb-1">
                Orphanage
              </p>
              <h2 className="text-lg font-bold text-ink">{orphanage.name}</h2>
              <p className="text-sm text-ink-muted">{orphanage.state}</p>
            </div>

            {/* Status indicator */}
            <div className={`rounded-lg px-4 py-3 text-sm font-medium flex items-center gap-2
              ${activeRecord
                ? "bg-green-50 border border-green-200 text-green-800"
                : "bg-slate-50 border border-slate-200 text-ink-muted"}`}>
              <div className={`w-2 h-2 rounded-full ${activeRecord ? "bg-green-500" : "bg-slate-300"}`} />
              {activeRecord
                ? `Checked in at ${new Date(activeRecord.check_in_time).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}`
                : "Not checked in"}
            </div>

            {/* Action buttons */}
            {!activeRecord ? (
              <button onClick={handleCheckIn} className="btn-primary w-full justify-center py-4 text-base gap-2">
                <CheckCircle size={20} />
                Check In
              </button>
            ) : (
              <button onClick={handleCheckOut} className="btn-danger w-full justify-center py-4 text-base gap-2">
                <LogOut size={20} />
                Check Out
              </button>
            )}

            <button
              onClick={() => setScanState("scanning")}
              className="btn-secondary w-full justify-center"
            >
              Scan a different QR code
            </button>
          </div>
        )}

        {/* ── SUCCESS ── */}
        {scanState === "success" && (
          <div className="flex flex-col items-center gap-5 py-10">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle size={36} className="text-success" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-ink">
                {hoursWorked != null ? "Checked out!" : "Checked in!"}
              </h2>
              {hoursWorked != null && (
                <p className="text-ink-muted mt-1">
                  You logged <strong>{hoursWorked.toFixed(2)} hours</strong> today.
                  +{Math.floor(hoursWorked * 10)} points earned!
                </p>
              )}
              {hoursWorked == null && (
                <p className="text-ink-muted mt-1">
                  Your check-in has been recorded. Scan again when you leave to log your hours.
                </p>
              )}
            </div>
            <Link href="/volunteer" className="btn-primary px-8">
              Back to dashboard
            </Link>
          </div>
        )}

        {/* ── ERROR ── */}
        {scanState === "error" && (
          <div className="flex flex-col items-center gap-5 py-10">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle size={36} className="text-danger" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-ink">Something went wrong</h2>
              <p className="text-ink-muted mt-1 text-sm">{error}</p>
            </div>
            <button onClick={() => { setError(null); setScanState("scanning"); }} className="btn-primary px-8">
              Try again
            </button>
          </div>
        )}

      </main>
    </div>
  );
}
