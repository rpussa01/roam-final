# ROAM dynamic Klook affiliate integration

ROAM automatically requests a commission-tracked Klook link for the selected itinerary city through its server-side Travelpayouts API. The browser never receives the API token.

## Configuration

Add the following to your local `.env` and to Vercel Project Settings > Environment Variables:

```env
TRAVELPAYOUTS_API_TOKEN=YOUR_NEW_PRIVATE_TOKEN
TRAVELPAYOUTS_TRS=YOUR_VERIFIED_TRS
TRAVELPAYOUTS_MARKER=YOUR_VERIFIED_MARKER
KLOOK_DESTINATION_URLS={}
```

The built-in **London** Klook landing page (`https://www.klook.com/destination/c106-london/`) was verified from the page supplied in this conversation. Other cities require verified Klook destination URLs, since Klook's numeric city IDs cannot be inferred from names. For example, add verified URLs using `KLOOK_DESTINATION_URLS={"Bangkok":"https://www.klook.com/destination/VERIFIED-ID-AND-SLUG/"}` (placeholder only; never deploy this example).

The app selects the current trip city, resolves its verified Klook destination URL, calls the Travelpayouts partner links API, caches the resulting link for six hours, and enables the experiences card only after the API returns a valid affiliate link. If a city cannot be resolved, it explains the missing configuration rather than sending users to an unrelated homepage.

## Run and test

```sh
npm install
npm run dev
```

Check `/api/affiliate/status` for configuration (does not reveal secrets). Select London and open My Trip. The experiences button should become clickable **only after** a successful Travelpayouts API response. Verify the returned link lands on Klook's London page. Other cities need their Klook IDs verified through an approved destination lookup or curated URL mapping.

## Deployment and security

Deploy to Vercel after setting server-side environment variables, then redeploy. Do not prefix private tokens with `VITE_`. Rotate API tokens that appeared in earlier screenshots. A successful build does not confirm affiliate approval or attribution; test actual generated links with your Travelpayouts account.
