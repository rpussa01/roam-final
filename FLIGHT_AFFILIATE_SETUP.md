# ROAM — itinerary-specific flight affiliate search

The **Get there** card collects an origin IATA code, departure date, optional return date and adult count. Destination airport is mapped server-side from the trip city. It requests `/api/affiliate/flights` and only opens a link when Travelpayouts returns a successful tracked URL. No untracked fallback is used.

## Required Vercel server environment variables

- `TRAVELPAYOUTS_API_TOKEN` (secret; server only)
- `TRAVELPAYOUTS_TRS=593702`
- `TRAVELPAYOUTS_MARKER=798359`

The Aviasales program must be active in your Travelpayouts account and must accept route search URLs. Deploy after adding variables.

## Limitations

Aviasales route paths such as `/search/PER1502CMB31031` do **not encode the year**. Users must verify the actual travel year and dates on the partner website. Confirm Aviasales still supports this route syntax and the Travelpayouts conversion API for your account before launch. City-to-airport mapping uses representative airports (e.g. Tokyo TYO, Bali DPS, Sri Lanka CMB), not automatic nearest-airport selection.

If conversion fails, the UI displays an error rather than falsely labeling a generic URL affiliate-tracked.
