# ROAM progressive discovery

- Loads 20 places per Google Places Text Search page.
- Prefetches when five cards remain; automatically appends results and removes duplicate Place IDs.
- Uses Google nextPageToken to paginate a query; once exhausted moves to another category-specific search (including nightlife streets).
- Stops when all configured searches have been exhausted; this is not literally infinite.
- Google Places API (New) Text Search must be enabled and billed on your API key.
- Additional queries and pages incur Google Places usage charges. Check your quota and billing.
- This update retains the existing AdSense placeholder and affiliate integrations.
