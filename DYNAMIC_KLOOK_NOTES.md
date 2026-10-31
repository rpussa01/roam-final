# ROAM Klook destination handling

The booking card is now clickable even when a verified destination page is missing. In that case it opens Klook’s homepage and explicitly says it is **not** an affiliate link; users must search their destination there. This is a usability fallback, not automated worldwide affiliate deep linking.

When `KLOOK_DESTINATION_URLS` maps a city to a verified Klook page, the backend attempts to generate a tracked link through Travelpayouts. Set `TRAVELPAYOUTS_API_TOKEN`, `TRAVELPAYOUTS_TRS`, and `TRAVELPAYOUTS_MARKER` in the server environment. Do not expose these to the browser.

Fully automatic worldwide destination-specific commission links still require an officially supported Klook destination resolver or link-generation API. Do not assume Klook URL slugs or tracking parameters can be constructed from city names.

Test: `npm install && npm run build && npm run dev`. Visit `/api/affiliate/klook?city=London` and verify the `tracked` flag.
