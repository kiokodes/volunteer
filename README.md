# NextGem Volunteer Platform

A mobile-first web app for NextGem Foundation volunteers to check in/out at orphanages using QR codes, track hours, and earn gamification rewards.

---

## Quick Start (Deploy to Vercel)

### 1. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and open your project (or create a new one)
2. Navigate to **SQL Editor**
3. Open `supabase-schema.sql` from this project and paste the entire contents
4. Click **Run** — all tables and security policies will be created

### 2. Get your environment variables

From your Supabase project:
- Go to **Settings → API**
- Copy your **Project URL** and **anon public** key

### 3. Deploy to Vercel

1. Push this project to a GitHub repository
2. Go to [vercel.com](https://vercel.com) → **New Project** → import your repo
3. Add these environment variables in Vercel's project settings:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `INTERNAL_PLATFORM_API_URL` | URL of the Internal Ops Platform API (set this later) |
| `INTERNAL_PLATFORM_API_SECRET` | A shared secret string you choose |
| `NEXT_PUBLIC_APP_URL` | `https://volunteer.nextgemfoundation.com` |

4. Click **Deploy**

---

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Copy env file and fill in your values
cp .env.local.example .env.local

# 3. Start the dev server
npm run dev

# 4. Open http://localhost:3000
```

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Home / landing (redirects based on role)
│   ├── layout.tsx            # Root layout (fonts, metadata)
│   ├── globals.css           # Tailwind + global styles
│   ├── auth/
│   │   ├── login/page.tsx    # Sign in
│   │   └── register/page.tsx # Volunteer registration
│   ├── volunteer/
│   │   └── page.tsx          # Volunteer dashboard (hours, badges, progress)
│   ├── scan/
│   │   └── page.tsx          # QR scan + check-in/out flow
│   ├── leaderboard/
│   │   └── page.tsx          # Public leaderboard
│   ├── orphanage/
│   │   └── qr/page.tsx       # Matron: print QR + view today's volunteers
│   └── api/
│       ├── sync/route.ts     # Sync check records to Internal Platform
│       └── sync-flag/route.ts # Sync flags to Internal Platform
├── components/
│   └── CertificateButton.tsx # Download PDF certificate
├── lib/
│   ├── supabase/
│   │   ├── client.ts         # Browser Supabase client
│   │   └── server.ts         # Server Supabase client
│   ├── gamification.ts       # Badge/points/milestone logic
│   ├── sync.ts               # POST data to Internal Platform
│   └── certificate.ts        # PDF certificate generator (jsPDF)
├── types/
│   └── index.ts              # All TypeScript types + constants
└── middleware.ts             # Auth guard for protected routes
```

---

## User Roles

| Role | How to create | Access |
|------|--------------|--------|
| **Volunteer** | Self-register at `/auth/register` | Dashboard, scan, leaderboard |
| **Matron** | Admin creates via Supabase dashboard | QR code page, flag volunteers |
| **Admin** | Set manually in Supabase `profiles` table | Full access |

To create a Matron account manually:
1. Have them register as a volunteer at `/auth/register`
2. In Supabase → Table Editor → `profiles`, find their row
3. Change `role` from `volunteer` to `matron`
4. In the `orphanages` table, set `matron_id` to their user ID

---

## Gamification System

| Milestone | Hours | Badge | Points | Certificate? |
|-----------|-------|-------|--------|-------------|
| First Steps | 10 hrs | 🟢 Basic | 100 pts | No |
| Dedicated | 100 hrs | 🔵 Intermediate | 1,000 pts | **Yes** |
| Champion | 1,000 hrs | 🟡 Advanced | 10,000 pts | No |

Points are earned at **10 points per hour** on top of milestone bonuses.

---

## QR Code Flow

1. Admin creates an orphanage record in Supabase → a unique `qr_code_token` is auto-generated
2. The matron opens `/orphanage/qr` and prints the QR code
3. The QR code contains the URL: `https://volunteer.nextgemfoundation.com/scan?token=<token>`
4. Volunteer scans with their phone camera → check-in/out page opens
5. Hours are calculated on checkout and synced to the Internal Platform

---

## Syncing to the Internal Operations Platform

When a volunteer checks out, the platform:
1. Saves the record locally in Supabase (`synced_to_internal = false`)
2. Calls `POST /api/sync` which posts the record to the Internal Platform
3. Marks `synced_to_internal = true` on success

If the sync fails (network issue), the record stays in Supabase and can be retried. The volunteer's hours are always saved — sync failure never causes data loss.

The Internal Platform must expose:
- `POST /api/volunteer-hours` — accepts a `CheckRecord` JSON body
- `POST /api/volunteer-flags` — accepts a flag JSON body
- `POST /api/volunteer-certificates` — accepts `{ volunteer_id, issued_at }`

All requests include the header: `x-api-secret: <INTERNAL_PLATFORM_API_SECRET>`

---

## Offline Support

The platform stores check-in/out records in Supabase immediately. If a volunteer has poor connectivity:
- Check-in is saved locally as soon as they tap the button
- Sync to the Internal Platform retries on the next action
- `synced_to_internal = false` flags all unsynced records for future retry

A background retry job can be added later using Supabase Edge Functions or a cron job that queries unsynced records.
