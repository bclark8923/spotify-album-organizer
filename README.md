# Spotify Album Organizer

A web app to tag, rate, and organize your saved Spotify albums. Built with Next.js, Supabase, and the Spotify Web API.

## Features

- **Spotify Login** — OAuth login to access your saved albums
- **Custom Tags** — Tag albums with genres (Jazz, Electronic, Rock, etc.) or custom labels like "Vinyl owned"
- **Filter by Tags** — Filter your album grid by one or more tags
- **Listen Status** — Mark albums as "To Listen" or "Listened" (separate from tags)
- **Ratings** — Rate albums on a 0.0-10.0 scale in 0.25 increments
- **Playback** — Play albums directly from the app using Spotify Web Playback SDK
- **Device Casting** — Switch playback to any Spotify Connect device (phone, speaker, etc.)
- **Search & Sort** — Search by album/artist name, sort by name, artist, date, or rating

## Prerequisites

- Node.js 18+
- A [Spotify Developer](https://developer.spotify.com/dashboard) app
- A [Supabase](https://supabase.com) project

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd spotify-album-organizer
npm install
```

### 2. Spotify App Setup

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Add `http://localhost:3000/api/auth/callback/spotify` as a Redirect URI
4. Copy the Client ID and Client Secret

### 3. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to the SQL Editor and run the contents of `supabase/schema.sql`
3. Copy your project URL and service role key from Settings > API

### 4. Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

```
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=run_openssl_rand_base64_32
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Generate a NEXTAUTH_SECRET with:
```bash
openssl rand -base64 32
```

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

1. Push to GitHub
2. Import the repo at [vercel.com/new](https://vercel.com/new)
3. Add all environment variables from `.env.example`
4. Set `NEXTAUTH_URL` to your Vercel domain (e.g., `https://your-app.vercel.app`)
5. Add `https://your-app.vercel.app/api/auth/callback/spotify` as a Redirect URI in your Spotify app
6. Deploy

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS v4
- **Database:** Supabase (PostgreSQL)
- **Auth:** NextAuth.js with Spotify OAuth
- **Playback:** Spotify Web Playback SDK + Spotify Connect
- **Language:** TypeScript

## Notes

- Spotify Web Playback SDK requires a **Spotify Premium** account for in-app playback
- Non-Premium users will see a message and can open albums directly in Spotify
- The app only requests read access to your library -- it never modifies your Spotify data
