# AdSense placeholder setup

The My Trip itinerary page now always displays an advertisement area. Until Google fills a manual ad slot, the box says “Google ads are coming”. This is a status placeholder, not a real ad.

Publisher ID: ca-pub-9969211443466723 (already in index.html).

For manual ads: create a Display ad unit in Google AdSense, set `VITE_ADSENSE_SLOT` to its numeric slot ID in Vercel environment variables, then redeploy. The placeholder remains until the ad element reports `data-ad-status="filled"`. Without a slot ID the placeholder still displays, but no manual ad request is made.

Alternatively enable Auto ads in AdSense; those placements are controlled by Google and do not replace this placeholder automatically. Ad delivery requires site approval and inventory. Never click your own live ads.
