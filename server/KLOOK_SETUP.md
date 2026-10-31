# ROAM — dynamic Klook links

The Klook/Travelpayouts Drive script is installed in `index.html` using the exact snippet you supplied. This script can monetize eligible outgoing partner links according to the provider rules; it does **not** generate destination links on its own.

## Destination-aware booking cards

`BookingOptions` uses the selected trip city and itinerary stops. It substitutes tokens in `VITE_KLOOK_DEEPLINK_TEMPLATE`, e.g. `{destination}` (URL-encoded), without changing any other tracking parameters. The button remains disabled until a template is configured.

1. In Travelpayouts, open Klook → link tools and determine whether a **dynamic destination/search deep-link template** is supported. Ask support for the official format if necessary.
2. Paste the exact partner-approved HTTPS template in `.env` as `VITE_KLOOK_DEEPLINK_TEMPLATE=...`. Include `{destination}` where the provider explicitly supports a city name; or `{query}` for a search term.
3. If the provider only offers fixed short links, use `VITE_ACTIVITY_AFFILIATE_URL=<the exact generated link>` as a temporary fallback. It will work but will not automatically change destination. Do **not** append arbitrary query parameters to a `klook.tpx.lv` short link.
4. Restart `npm run dev` and test Bangkok and London links; verify they resolve to the correct destination and that clicks appear in Travelpayouts reports.
5. Repeat for hotel and flight providers with their own approved templates.

## Ads

`index.html` loads AdSense once when `VITE_ADSENSE_CLIENT` is configured. `public/ads.txt` is included for your supplied publisher ID. Actual ad serving requires AdSense approval and an ad unit slot for manual placements.

## Security

Keep OpenAI and Google Places secret keys on the server. Never commit `.env`. Rotate any API key previously exposed in screenshots.
