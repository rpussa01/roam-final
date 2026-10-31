# ROAM — Dynamic Klook affiliate links

This is the complete ROAM React/Vite + Express project with a server-side Travelpayouts integration. The existing app, Supabase accounts, Google Places, AI itineraries, AdSense and UI are retained.

## Run locally

1. `cp .env.example .env` (or keep your existing `.env` when updating).
2. Fill in your Google Places, Supabase and OpenAI settings.
3. Set `TRAVELPAYOUTS_API_TOKEN`, `TRAVELPAYOUTS_TRS`, and `TRAVELPAYOUTS_MARKER` with values confirmed in your Travelpayouts account. **Never use `VITE_` for secrets.**
4. Set `KLOOK_DESTINATION_URLS` to JSON containing **real, verified Klook destination page URLs**, e.g. `KLOOK_DESTINATION_URLS={"Bangkok":"https://www.klook.com/REAL-VERIFIED-PATH"}`. Do not copy the example path literally. Add destinations as verified. Alternatively, set `KLOOK_DESTINATION_URL_TEMPLATE` only if Klook/Travelpayouts confirms a supported URL pattern with `{destination}`.
5. `npm install && npm run dev` and open the Vite URL.
6. Check `http://localhost:5173/api/affiliate/status` to see whether configuration is present (does not reveal the token).
7. Select a configured destination, create an itinerary, and open **Book experiences**. The backend generates a tracked link and caches it for six hours.

## Important limitation

Travelpayouts' link API **converts an existing supported Klook landing page URL** into a tracked link; it does not search Klook for city pages. This package **does not fabricate Klook city URLs**. A city without a verified landing page shows a clear unavailable message rather than an incorrect affiliate link. The code handles any of ROAM's cities once a valid Klook URL is supplied. A fully zero-maintenance worldwide resolver would require an approved Klook destination-discovery API or a documented Klook URL pattern.

## Production / Vercel

Set the same server environment variables in your Vercel project settings and redeploy. `api/index.js` exports the Express app for Vercel. Never commit `.env` or keys. Rotate any keys that were exposed in screenshots or commits. Test the API endpoint after deployment before claiming links earn commissions. The API response parsing must be verified against your actual Travelpayouts account; no live request was performed here.
