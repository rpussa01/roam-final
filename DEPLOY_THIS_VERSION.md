# ROAM — fixed Aviasales flight button

The **Get there** card now always displays **Compare flights ↗**, which links directly to https://aviasales.tpx.lv/29Zr4QyL in a new tab. It does not depend on the affiliate booking API or departure airport. This is a general affiliate link; it does not prefill airports or dates.

Hotel links still need a configured hotel affiliate program. Activity links continue to use the existing affiliate backend.

## Deploy

1. Extract this ZIP.
2. Copy the files from `roam-rebuilt/` into the ROOT of your existing `roam-final` GitHub repository (do not nest the `roam-rebuilt` directory).
3. In that repository, run:

   git add .
   git commit -m "Fix ROAM Aviasales flight button"
   git push origin main

4. In Vercel, verify the latest production deployment is Ready and its commit matches the push.
5. Hard-refresh your deployed site (Cmd+Shift+R). If it still shows the old flight card, verify Vercel's Production domain and connected branch.

Existing environment variables should be retained in Vercel; do not overwrite them with placeholders from `.env.example`.
