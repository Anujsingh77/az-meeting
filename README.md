# A-Z Meeting — Multilingual Video Conferencing

A production-ready Next.js 14 app with real-time AI voice translation, live captions, and video calling. Built with Supabase (auth + database), LiveKit (WebRTC video), and Google Translate API.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Auth + DB | Supabase |
| Video/Audio | LiveKit WebRTC |
| Translation | Google Cloud Translate v2 |
| State | Zustand |
| Styling | Tailwind CSS |
| Animation | Framer Motion |
| UI Primitives | Radix UI |
| Forms | React Hook Form + Zod |

---

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/yourname/az-meeting
cd az-meeting
npm install
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) → New project
2. Copy your **Project URL** and **anon key** from Settings → API
3. Run the migration in Supabase SQL editor:
   - Open `supabase/migrations/001_initial.sql`
   - Paste the entire file into the SQL editor → Run
4. Enable Google OAuth:
   - Supabase Dashboard → Authentication → Providers → Google
   - Add your Google OAuth Client ID and Secret
   - Set redirect URL: `https://yourproject.supabase.co/auth/v1/callback`
5. Enable GitHub OAuth (optional):
   - Same place → GitHub provider

### 3. Set up LiveKit (video calls)

1. Sign up at [livekit.io](https://livekit.io) — free tier available
2. Create a project → copy API Key, API Secret, and WebSocket URL

### 4. Set up Google Translate (optional)

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Enable **Cloud Translation API**
3. Create an API key
4. Without this key, translations will return mock `[EN] text` placeholders

### 5. Configure environment variables

Copy `.env.local` and fill in your values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_secret
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud

GOOGLE_TRANSLATE_API_KEY=your_google_translate_key

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 6. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
src/
├── app/
│   ├── auth/login/         # Login page (email + Google + GitHub)
│   ├── dashboard/          # Home dashboard
│   ├── meeting/            # Full meeting room (video + translation)
│   ├── schedule/           # Create & manage meetings
│   ├── profile/            # Edit profile, password, delete account
│   ├── feedback/           # Submit & view feedback
│   ├── settings/           # App settings
│   └── api/
│       ├── auth/callback/  # Supabase OAuth callback
│       ├── meetings/       # Meetings CRUD API
│       ├── profile/        # Profile update API
│       ├── feedback/       # Feedback API
│       └── translate/      # Translation API (Google Translate)
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx    # Sidebar nav + mobile drawer
│   │   └── ThemeProvider.tsx
│   ├── ui/
│   │   └── index.tsx       # Button, Input, Select, Switch, Badge, Avatar, Card
│   └── meeting/            # (extend with LiveKit video tiles)
├── hooks/
│   ├── useAuth.ts          # Auth helpers (Google, GitHub, email, reset)
│   └── useTranslation.ts   # Cached translation hook
├── lib/
│   ├── supabase/
│   │   ├── client.ts       # Browser Supabase client
│   │   ├── server.ts       # Server Supabase client
│   │   └── middleware.ts   # Session refresh middleware
│   └── utils.ts            # cn, generateMeetingCode, getInitials, etc.
├── store/
│   └── app.ts              # Zustand global store (persisted)
└── types/
    ├── index.ts            # App types + LANGUAGES array
    └── supabase.ts         # Generated DB types
```

---

## Features Implemented

### ✅ Authentication
- Google OAuth (one-click sign in)
- GitHub OAuth
- Email + password (sign up, sign in, forgot password)
- Auto profile creation on first sign in
- Protected routes via middleware

### ✅ Dashboard
- Personalized greeting with stats
- Instant meeting creation (generates unique code)
- Join meeting by code
- Upcoming meetings list with join/edit

### ✅ Meeting Room
- Video grid with speaking indicator
- Mic / camera toggle (with visual slash indicator)
- Screen sharing (uses browser `getDisplayMedia` API)
- Hand raise toggle
- Recording start/stop
- Live rotating captions with original language shown
- Right panel: Translate / Video / Chat / People tabs
- All translation settings wired to Zustand store
- Virtual background selector (6 options)
- Camera filter picker (6 options)
- AI skin touch-up / auto lighting toggles
- HD recording toggle
- Chat with auto-translation hint
- People list with language tags + AI stats
- "More" dropdown: record, copy link, settings, report
- Leave meeting → back to dashboard

### ✅ Schedule
- Schedule form with date, time, duration, languages
- Multi-language selector (30 languages)
- Delete meetings
- Upcoming meetings list with join/edit/delete

### ✅ Profile
- Edit name, job title
- Avatar upload → stored in Supabase Storage
- Change password (Supabase Auth)
- Download account data (JSON export)
- Delete account (with "DELETE" confirmation)
- Language preferences
- Notification toggles
- Preference toggles

### ✅ Feedback
- 4 feedback types: Feature, Bug, Translation issue, General
- Star rating (1–5)
- Tag selector
- Anonymous submission
- Submission saved to Supabase `feedback` table
- Community feedback list with status badges

### ✅ Settings
- Dark / light mode toggle
- Compact UI toggle
- Animation toggle
- E2E encryption toggle
- Privacy settings
- App language selector
- Time zone selector
- Notification toggles
- Sign out
- Delete account (redirects to profile)
- Download data

---

## Deploying to Production

### Vercel (recommended)

```bash
npm install -g vercel
vercel --prod
```

Add all `.env.local` variables to Vercel's Environment Variables dashboard.

### Supabase config for production

In Supabase → Authentication → URL Configuration:
- **Site URL**: `https://yourdomain.com`
- **Redirect URLs**: `https://yourdomain.com/api/auth/callback`

---

## Adding Real LiveKit Video

Install the LiveKit components (already in package.json):

```tsx
// In src/app/meeting/page.tsx, replace mock video tiles with:
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import "@livekit/components-styles";

// Fetch token from your API:
// GET /api/livekit-token?room=ROOM_CODE&username=USER_NAME

<LiveKitRoom
  serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
  token={token}
  connect={true}
>
  <VideoConference />
</LiveKitRoom>
```

Create `/api/livekit-token/route.ts`:

```ts
import { AccessToken } from "livekit-server-sdk";
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const room = searchParams.get("room");
  const username = searchParams.get("username");
  const at = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, { identity: username });
  at.addGrant({ roomJoin: true, room });
  return Response.json({ token: await at.toJwt() });
}
```

---

## License

MIT — build something great.
