# ROAM 2.0 — Swipe. Discover. Save. Plan.

A mobile-first React travel discovery app using real Google Places results. Swipe right to save, organise saved places, and generate simple day-by-day itineraries.

## Local setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and set `GOOGLE_PLACES_API_KEY`.
3. `npm run dev`
4. Open http://localhost:5173
5. Test http://localhost:5173/api/health — `configured` must be `true`.

The Vite frontend proxies `/api` to the Express server at port 3001. The API key stays server-side.

## Deploy to Vercel

1. Push the project to GitHub.
2. Import the repository in Vercel. Framework: **Vite**; build: `npm run build`; output: `dist`.
3. In Vercel → Project Settings → Environment Variables, set `GOOGLE_PLACES_API_KEY` for Production and Preview.
4. Redeploy. Test `/api/health` and `/api/places?city=Bangkok&category=All` on the deployed URL.
5. If you previously exposed your key in screenshots or commits, rotate it and replace it in both environments.

`api/index.js` exports the Express app as a Vercel serverless function; `server/index.js` starts the local server. Never import `server/index.js` from the Vercel function, because it calls `listen()`.

## Product workflow

**Discover** → select city and category → swipe right to save or left to skip. **Saved** → filter and manage favourite places. **My Trip** → choose destination and days → build an itinerary from saved places.

Saved places and trips are currently stored in the browser's localStorage, not synced between devices. The itinerary is a simple round-robin grouping, **not AI optimised** and does not account for opening hours, route distances or live availability. Google Places API billing and quotas apply; set budget alerts. Place photos are proxied through the server. Respect Google Maps Platform attribution, content caching/storage and display policies before commercial launch.

## Production checklist

- [ ] `/api/health` returns JSON with `configured: true`
- [ ] `/api/places` returns real places
- [ ] Photos load
- [ ] Saved places persist after refresh
- [ ] Itineraries persist after refresh
- [ ] Test on mobile
- [ ] Restrict the API key appropriately and monitor API costs
- [ ] Add authentication and a compliant backend data model before multi-device sync

## Accounts, preferences and cloud database

1. Create a Supabase project. In **SQL Editor**, run `supabase/schema.sql`.
2. In **Project Settings → API**, copy the Project URL and **publishable / anon** key (NOT the service role key).
3. Create `.env.local` using `.env.example` and fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Under Supabase **Authentication → URL Configuration**, set your Vercel production site URL and add localhost + preview redirect URLs as needed. Under **Authentication → Providers**, enable Email.
5. In Vercel **Settings → Environment Variables**, add both `VITE_` values for Production and Preview, along with `GOOGLE_PLACES_API_KEY`. Redeploy after changing variables.
6. Run `npm install` and `npm run dev`. Click the user icon to register/sign in and edit travel preferences.

Signed-in users store saved places, trips and preferences in Supabase with per-user row-level security. Guest data stays in browser localStorage. Guest data is **not automatically imported** on sign-in; sign-in starts a separate cloud collection. User preferences are saved but do not yet alter Google Places search ranking or itinerary logic.

Never put the Google Places secret or Supabase service-role key in `VITE_` environment variables.
