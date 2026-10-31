# ROAM departure airport update

- Trip planner now asks for optional **Flying from** 3-letter IATA airport code (e.g. PER, SYD, CMB).
- Valid characters are restricted to letters, uppercased, and limited to 3.
- Airport code and trip start date are saved inside each trip record (including Supabase trip JSON).
- BookingOptions sends `origin=PER` to `/api/affiliate/booking` for the saved trip.
- Flight card shows origin when present.

## Important limitations
- This is airport-code entry, **not airport autocomplete**. A typed IATA code is not verified against an airport database.
- The existing affiliate engine currently uses destination URLs and does not automatically generate a flight search using origin/dates. A supported flight partner integration is still needed to activate flight booking.
- Existing saved trips have no origin; create a new trip to include one.
- The date entered is trip start date, not necessarily flight departure date.

## Run
`npm install && npm run dev`

## Deploy
Commit the updated source to the GitHub repository connected to Vercel. Existing environment variables remain required.
