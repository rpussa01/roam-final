# ROAM — Central Affiliate Booking Engine

The My Trip screen now makes **one request** to `GET /api/affiliate/booking?city=London&near=...` for hotels, flights and experiences. The server validates each approved provider URL, converts up to three URLs in one Travelpayouts Partner Links API request, caches successful results for six hours and activates buttons **only** after a successful tracked-link response.

## Setup

1. Activate Klook and your preferred hotel and flight partner programs in Travelpayouts. Not all programs permit API conversion.
2. Configure `TRAVELPAYOUTS_API_TOKEN`, `TRAVELPAYOUTS_TRS`, `TRAVELPAYOUTS_MARKER` on the backend only. Confirm the project ID and marker ID in Travelpayouts.
3. Configure **real provider destination/search URLs** using JSON in `.env` (or Vercel environment variables):

```env
KLOOK_DESTINATION_URLS={"London":"https://www.klook.com/destination/c106-london/"}
HOTEL_DESTINATION_URLS={"London":"PASTE_VERIFIED_SUPPORTED_HOTEL_LONDON_URL"}
FLIGHT_DESTINATION_URLS={"London":"PASTE_VERIFIED_SUPPORTED_FLIGHT_LONDON_URL"}
```

Replace placeholders with real URLs. **Do not deploy placeholders.** You can add more cities to the JSON maps without changing application code. A supported, documented destination template can also be configured via `HOTEL_DESTINATION_URL_TEMPLATE`, `FLIGHT_DESTINATION_URL_TEMPLATE`, or `KLOOK_DESTINATION_URL_TEMPLATE`. Tokens: `{city}`, `{destination}`, `{near}`, `{origin}`, `{checkin}`, `{checkout}`. A template is only safe when the provider documents its URL pattern.

4. Run `npm install && npm run dev`. Check `/api/affiliate/booking-status`, then `/api/affiliate/booking?city=London`.
5. For Vercel, add the same server-side environment variables and redeploy. Verify each button and the Travelpayouts click dashboard.

## Important limitations

- The API **converts** valid destination URLs; it does not discover Klook's numeric destination IDs or invent valid flight/hotel search routes.
- Only London has a known Klook destination page built in. Other cities require verified destination URLs or an approved provider lookup/feed.
- A successful API response means a tracked link was generated, **not** that a commission is guaranteed.
- No untracked links are presented as affiliate links. Missing or rejected programs show an informative unavailable state.
- The backend allowlists Klook for experiences; Booking.com, Agoda, Trip.com and Hotels.com for hotels; Aviasales and Trip.com for flights (Kiwi.com is listed for input validation but is excluded from the Travelpayouts Partner Links API according to its documentation).
- Keep `.env` out of Git and rotate any credentials previously shown in screenshots.

Reference: https://support.travelpayouts.com/hc/en-us/articles/25289759198226-API-for-Travelpayouts-partner-links
