# ROAM — Automatic Klook Affiliate Links

The existing app, Google Places, Supabase accounts, AI itineraries, AdSense and design are retained.

## How it works
When a saved trip is opened, the browser requests `/api/affiliate/klook?city=Bangkok` (or the selected trip city). The Express backend uses the configured Klook destination URL pattern and calls Travelpayouts Partner Links API. Successful links are cached for six hours in memory. The browser never sees the API token.

## Required setup
1. Confirm Klook is an active/eligible program in your Travelpayouts account.
2. Obtain the Travelpayouts Partner Links API token and confirm the current endpoint, payload, response and authentication format against the official API documentation. The implementation uses `POST https://api.travelpayouts.com/links/v1/create` with `X-Access-Token` and `result.links[0].partner_url`; adjust if your account/docs differ.
3. Configure the four server-only environment variables in `.env.example` in your local `.env` and Vercel environment: `TRAVELPAYOUTS_API_TOKEN`, `TRAVELPAYOUTS_TRS`, `TRAVELPAYOUTS_MARKER`, `KLOOK_DESTINATION_URL_TEMPLATE`.
4. The URL template must be an approved, working Klook destination/search page with `{destination}` placeholder. **Travelpayouts converts URLs; it does not discover destination pages.** Klook may require city-specific IDs/slugs, in which case use a supported destination lookup API instead of this template. Do not assume every city can be resolved by name.
5. Restart/deploy, open a saved trip, and test the activities button and attribution in Travelpayouts.

The activity card reports a configuration or provider error until configured; it does **not** fabricate affiliate links. Hotels and flights continue to use optional approved partner URLs from the previous version. No live affiliate conversion has been verified.

## Local development
`npm install && npm run dev`

## Production
`npm run build`, then deploy to Vercel. Add server-only secrets to Vercel project environment variables; do not commit `.env`.
