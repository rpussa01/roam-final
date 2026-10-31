# Flight affiliate update

Search flights builds an Aviasales route from the selected origin, destination,
departure, optional return and adults. The search URL includes your configured
marker, then the server converts it using the official Travelpayouts links API.
The browser opens only the returned validated affiliate URL. Conversion failures
show an error; they never fall back to an untracked search.

## Setup
Keep your existing .env.local. Ensure it contains:

```
TRAVELPAYOUTS_API_TOKEN=your_private_token
TRAVELPAYOUTS_TRS=593702
TRAVELPAYOUTS_MARKER=798359
```

Enable Aviasales for that project in Travelpayouts. Never use a VITE_ prefix for
the private token. Restart the server after changing configuration.

Run `npm install`, `npm run build`, then `npm start` (or `npm run dev`).
The public IDs above are prefilled in .env.example; no private token is bundled.

The fixed homepage shortlink is not used because it cannot preserve each chosen
route. Search paths encode day/month, not year: confirm dates on Aviasales.
Internal navigation may remove visible tracking parameters. Confirm clicks and
eligible bookings in Travelpayouts; URL validation cannot guarantee commission.

Validation: `node --test tests/flight-affiliate.test.js` uses mocked partner API
responses. Live attribution requires your credentials and dashboard verification.
