# NextGem Volunteer Check-In System

## Concept & Vision

A purposeful, mobile-first volunteer management system that transforms QR code scanning into meaningful service tracking. The experience should feel warm, encouraging, and connected to a greater mission — every tap of your name is an act of showing up for children who need it most. The interface prioritizes speed and simplicity for busy volunteers while giving administrators clear oversight.

## Design Language

### Aesthetic Direction
Warm professional with purposeful energy — not clinical or corporate, but not childish either. Think: a well-designed charity app that inspires action. Clean but human.

### Color Palette
- **Primary**: `#1d56e8` (the provided blue — trust, reliability, action)
- **Primary Dark**: `#0f3ab9` (hover states, emphasis)
- **Primary Light**: `#e8f0fe` (backgrounds, subtle highlights)
- **Success**: `#059669` (check-in confirmed, positive feedback)
- **Warning**: `#d97706` (flagged sessions, attention needed)
- **Danger**: `#dc2626` (errors, no check-out after 8hrs)
- **Background**: `#f8fafc` (main bg), `#ffffff` (cards)
- **Text Primary**: `#1e293b`
- **Text Secondary**: `#64748b`
- **Text Muted**: `#94a3b8`

### Typography
- **Headings**: `Nunito` (rounded, friendly, approachable) — weights 700, 800
- **Body**: `Inter` (clarity, readability on mobile) — weights 400, 500, 600
- **Monospace** (for codes/numbers): `JetBrains Mono`

### Spatial System
- Base unit: 4px
- Card padding: 20px (5 units)
- Section gaps: 32px (8 units)
- Mobile-first: max-width 480px for main content

### Motion Philosophy
- **Check-in/out action**: Satisfying pulse + color transition (400ms ease-out)
- **Page transitions**: Subtle fade (200ms)
- **Card interactions**: Scale on tap (0.98), lift shadow on hover
- **Loading states**: Gentle pulse animation
- **Success state**: Confetti-like celebration dots (subtle)

### Visual Assets
- **Icons**: Lucide React (consistent, friendly)
- **Illustrations**: Simple geometric shapes suggesting community/hands
- **QR visual**: Subtle pattern background behind QR preview

## Layout & Structure

### Volunteer Check-In Page (`/[token]`)
```
┌─────────────────────────────┐
│     NextGem Logo/Wordmark   │
│                             │
│   "Welcome to [Orphanage]"  │
│                             │
│   ┌─────────────────────┐   │
│   │   Select Your Name  │   │
│   │                     │   │
│   │   ○ Volunteer 1     │   │
│   │   ○ Volunteer 2     │   │
│   │   ○ Volunteer 3     │   │
│   │                     │   │
│   └─────────────────────┘   │
│                             │
│   [ Check In / Out Button ] │
│                             │
│   Status: "You checked in   │
│    at 9:00 AM"              │
└─────────────────────────────┘
```

### Confirmation Screen (Modal/Overlay)
```
┌─────────────────────────────┐
│                             │
│        ✓ Checked In!        │
│                             │
│   9:00 AM • June 16, 2026   │
│                             │
│   See you later, [Name]!    │
│   You're making a           │
│   difference today.         │
│                             │
│   [ Done ]                  │
└─────────────────────────────┘
```

### Dashboard (`/dashboard`)
```
┌─────────────────────────────┐
│   NextGem Admin      [Logout]│
├─────────────────────────────┤
│  Password: [________] [→]   │
├─────────────────────────────┤
│                             │
│  ┌─Orphanages──────────────┐│
│  │ Sunshine Home    12h    ││
│  │ Rainbow Village   8h    ││
│  └─────────────────────────┘│
│                             │
│  ┌─Volunteers──────────────┐│
│  │ Ahmad Bello    24h ⭐   ││
│  │ Fatima Yusuf   18h      ││
│  │ Chidi Okoro    18h      ││
│  └─────────────────────────┘│
│                             │
│  ┌─Flagged (no check-out)──┐│
│  │ ⚠ Ahmad Bello (8.5h)   ││
│  └─────────────────────────┘│
└─────────────────────────────┘
```

## Features & Interactions

### QR Code Flow (Volunteer)
1. **Scan**: Camera/QR reader opens link with `?token=XXX`
2. **Load**: Fetch orphanage by `qr_code_token`
   - Loading: Skeleton pulse on volunteer list
   - Not found: "This QR code isn't recognized" with support contact
   - Found: Show orphanage name + volunteer list
3. **Select**: Tap volunteer name → highlight selected (only one selectable)
4. **Action Button**: 
   - No session today → "Check In" (primary blue)
   - Open session → "Check Out" (green, shows check-in time)
5. **Confirm**: Tap button → API call → show confirmation modal
6. **Done**: Tap "Done" or wait 3s → return to selection state

### Session Logic
- **Check-in**: Create session with `check_in_time = now()`, `check_out_time = null`
- **Check-out**: Update session with `check_out_time = now()`, calculate `hours = (checkout - checkin)`
- **Same day only**: Check-in and check-out must be same calendar day
- **One open session per volunteer per orphanage**: Enforce at DB level

### Dashboard Flow (Admin)
1. **Login**: Simple password input (env var `DASHBOARD_PASSWORD`)
   - Correct: Show dashboard
   - Wrong: Shake animation + "Incorrect password"
2. **View Orphanages**: Cards with total volunteer hours
3. **View Volunteers**: Table with individual hours, sorted by total
4. **Flagged Sessions**: 
   - Query: sessions where `check_out_time IS NULL` AND `check_in_time < now() - 8 hours`
   - Show warning with volunteer name and duration
5. **Refresh**: Manual refresh button (data changes aren't frequent)

### Edge Cases
- **Double scan same day**: If open session exists, show "Check Out" button
- **Scanning after midnight**: Sessions are date-bound
- **Network failure**: Show retry option, don't create duplicate sessions on retry
- **Invalid token**: Friendly "QR not recognized" message

## Component Inventory

### `<VolunteerCard />`
- **Default**: White bg, subtle border, name + nysc_code
- **Selected**: Blue border, light blue bg tint, checkmark icon
- **Checked-in today**: Shows "Checked in at X:XX AM" badge

### `<ActionButton />`
- **Check In state**: Blue bg, white text, "Check In" + hand icon
- **Check Out state**: Green bg, white text, "Check Out" + clock icon
- **Loading**: Spinner replaces text
- **Disabled**: Gray bg when no volunteer selected

### `<ConfirmationModal />`
- **Check-in success**: Blue checkmark, "Checked In!", timestamp
- **Check-out success**: Green checkmark, "Checked Out!", hours worked
- **Closing**: Tap outside or "Done" button

### `<OrphanageCard />` (Dashboard)
- **Default**: White card, name, total hours, volunteer count
- **Highlighted**: Subtle glow if recently active

### `<VolunteerRow />` (Dashboard)
- **Default**: Name, hours, sessions count
- **Flagged**: Orange left border, warning icon

### `<StatCard />` (Dashboard)
- **Metric display**: Large number, label, optional trend indicator

### `<PasswordGate />`
- **Input**: Full-width password field
- **Error**: Red border + shake + message
- **Loading**: Button shows spinner

## Technical Approach

### Stack
- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Hosting**: Vercel
- **Styling**: CSS Modules + CSS Variables

### Project Structure
```
/
├── app/
│   ├── layout.tsx          # Root layout with fonts
│   ├── page.tsx            # Redirect or landing
│   ├── globals.css         # CSS variables, base styles
│   ├── [token]/
│   │   └── page.tsx        # Volunteer check-in page
│   └── dashboard/
│       ├── page.tsx        # Admin dashboard
│       └── layout.tsx      # Dashboard layout
├── components/
│   ├── VolunteerCard.tsx
│   ├── ActionButton.tsx
│   ├── ConfirmationModal.tsx
│   ├── OrphanageCard.tsx
│   ├── VolunteerRow.tsx
│   ├── StatCard.tsx
│   ├── PasswordGate.tsx
│   └── LoadingSkeleton.tsx
├── lib/
│   ├── supabase.ts         # Supabase client
│   ├── types.ts            # TypeScript interfaces
│   └── utils.ts            # Helper functions
├── scripts/
│   └── seed.ts             # Seed orphanages/volunteers
├── drizzle.config.ts       # Drizzle config (optional)
└── .env.local              # Environment variables
```

### Database Schema (Supabase)
```sql
-- Orphanages table
CREATE TABLE orphanages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  qr_code_token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Volunteers table
CREATE TABLE volunteers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  nysc_code TEXT NOT NULL,
  orphanage_id UUID REFERENCES orphanages(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id UUID REFERENCES volunteers(id) ON DELETE CASCADE,
  orphanage_id UUID REFERENCES orphanages(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  check_in_time TIMESTAMPTZ NOT NULL,
  check_out_time TIMESTAMPTZ,
  hours_worked NUMERIC(4,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(volunteer_id, orphanage_id, date)
);

-- Index for quick lookup
CREATE INDEX idx_sessions_active ON sessions(volunteer_id, orphanage_id) 
  WHERE check_out_time IS NULL;
CREATE INDEX idx_orphanages_token ON orphanages(qr_code_token);
```

### API Routes
- `GET /api/orphanage/[token]` — Fetch orphanage + volunteers
- `POST /api/session/check-in` — Create new session
- `POST /api/session/check-out` — Update session with checkout time
- `GET /api/dashboard/stats` — Aggregated stats for dashboard

### Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=xxx
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
DASHBOARD_PASSWORD=xxx
```

### Security
- Dashboard protected by password (simple but effective for internal tool)
- Supabase RLS policies for data isolation
- No sensitive data exposed in QR token lookup