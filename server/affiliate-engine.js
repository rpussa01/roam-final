// Central ROAM affiliate engine. Never claim a link is tracked without an API success response.
const CACHE = new Map();
const TTL = 6 * 60 * 60 * 1000;
const TYPES = ['hotels', 'flights', 'activities'];
const DEFAULT_KLOOK = { London: 'https://www.klook.com/destination/c106-london/' };
const HOSTS = {
  activities: ['klook.com', 'www.klook.com'],
  hotels: ['booking.com', 'www.booking.com', 'agoda.com', 'www.agoda.com', 'trip.com', 'www.trip.com', 'hotels.com', 'www.hotels.com'],
  flights: ['aviasales.com', 'www.aviasales.com', 'aviasales.ge', 'www.aviasales.ge', 'trip.com', 'www.trip.com', 'kiwi.com', 'www.kiwi.com']
};
function readMap(name) {
  if (!process.env[name]) return {};
  const parsed = JSON.parse(process.env[name]);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw Error(`${name} must be a JSON object`);
  return parsed;
}
function interpolate(value, vars) {
  return String(value).replace(/\{(city|destination|origin|checkin|checkout|near)\}/gi, (_, k) => encodeURIComponent(vars[k.toLowerCase()] || ''));
}
function validateUrl(raw, kind) {
  const u = new URL(raw);
  if (u.protocol !== 'https:' || u.username || u.password || u.port || !HOSTS[kind].includes(u.hostname)) throw Error(`Unsupported ${kind} provider URL`);
  return u.toString();
}
function resolve(kind, vars) {
  const maps = {
    activities: { ...DEFAULT_KLOOK, ...readMap('KLOOK_DESTINATION_URLS'), ...readMap('ACTIVITY_DESTINATION_URLS') },
    hotels: readMap('HOTEL_DESTINATION_URLS'),
    flights: readMap('FLIGHT_DESTINATION_URLS')
  };
  const templates = {
    activities: process.env.KLOOK_DESTINATION_URL_TEMPLATE || '',
    hotels: process.env.HOTEL_DESTINATION_URL_TEMPLATE || '',
    flights: process.env.FLIGHT_DESTINATION_URL_TEMPLATE || ''
  };
  const source = maps[kind][vars.city] || templates[kind];
  return source ? validateUrl(interpolate(source, vars), kind) : null;
}
async function convertBatch(entries, city) {
  const response = await fetch('https://api.travelpayouts.com/links/v1/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Access-Token': process.env.TRAVELPAYOUTS_API_TOKEN },
    body: JSON.stringify({
      trs: Number(process.env.TRAVELPAYOUTS_TRS),
      marker: Number(process.env.TRAVELPAYOUTS_MARKER),
      shorten: true,
      links: entries.map(({ kind, original }) => ({ url: original, sub_id: `roam-${kind}-${city.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` }))
    }),
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw Error(`Travelpayouts HTTP ${response.status}`);
  const body = await response.json();
  return body?.result?.links || [];
}
// Aviasales route URLs encode airport IATA codes, day/month and passenger count.
// Confirm the selected dates on Aviasales: this path format does not encode a year.
const ARRIVAL_AIRPORTS = {
  Bangkok: 'BKK', Bali: 'DPS', Tokyo: 'TYO', Melbourne: 'MEL',
  Perth: 'PER', Singapore: 'SIN', London: 'LON', 'New York': 'NYC',
  Paris: 'PAR', Dubai: 'DXB', Sydney: 'SYD', Seoul: 'SEL', 'Sri Lanka': 'CMB'
};
function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
function dayMonth(date) { return date.slice(8, 10) + date.slice(5, 7); }
function validFlightPartnerUrl(raw, marker) {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return false;
    if (['aviasales.com', 'www.aviasales.com', 'aviasales.ge', 'www.aviasales.ge'].includes(url.hostname)) {
      const value = url.searchParams.get('marker') || '';
      return value === marker || value.startsWith(`${marker}.`);
    }
    // Accept Travelpayouts tracking redirects only after a successful API conversion.
    return url.hostname === 'tp.media' || url.hostname === 'avs.io' ||
      url.hostname.endsWith('.tpx.lv') || url.hostname.endsWith('.tp.st');
  } catch { return false; }
}
export function registerAffiliateEngine(app, cities) {
  app.get('/api/affiliate/flights', async (req, res) => {
    const origin = String(req.query.origin || '').trim().toUpperCase();
    const city = String(req.query.city || '').trim();
    const destination = String(req.query.destination || ARRIVAL_AIRPORTS[city] || '').trim().toUpperCase();
    const departureDate = String(req.query.departureDate || '');
    const returnDate = String(req.query.returnDate || '');
    const adults = Number(req.query.adults || 1);
    if (!/^[A-Z]{3}$/.test(origin) || !/^[A-Z]{3}$/.test(destination) || origin === destination ||
        !validDate(departureDate) || (returnDate && !validDate(returnDate)) ||
        (returnDate && returnDate <= departureDate) || !Number.isInteger(adults) || adults < 1 || adults > 9) {
      return res.status(400).json({ error: 'Enter valid airports, departure/return dates and passengers.' });
    }
    const route = `${origin}${dayMonth(departureDate)}${destination}${returnDate ? dayMonth(returnDate) : ''}${adults}`;
    const marker = String(process.env.TRAVELPAYOUTS_MARKER || '').trim();
    const searchUrl = `https://www.aviasales.com/search/${route}?marker=${encodeURIComponent(marker)}`;
    if (!(process.env.TRAVELPAYOUTS_API_TOKEN && process.env.TRAVELPAYOUTS_TRS && /^[1-9]\d*$/.test(marker))) {
      return res.status(503).json({ error: 'Flight affiliate conversion is not configured on the server.' });
    }
    try {
      const cached = CACHE.get(`flightsearch:${process.env.TRAVELPAYOUTS_TRS}:${searchUrl}`);
      if (cached && cached.expires > Date.now()) return res.json({ affiliateUrl: cached.url, tracked: true, searchUrl, note: 'Verify travel year and dates on the partner site.' });
      const links = await convertBatch([{ kind: 'flights', original: searchUrl }], city || destination);
      const link = links[0];
      if (link?.code !== 'success' || !validFlightPartnerUrl(link.partner_url, marker)) {
        return res.status(502).json({ error: link?.message || 'Aviasales did not approve this flight search affiliate link.' });
      }
      CACHE.set(`flightsearch:${process.env.TRAVELPAYOUTS_TRS}:${searchUrl}`, { url: link.partner_url, expires: Date.now() + TTL });
      res.json({ affiliateUrl: link.partner_url, tracked: true, searchUrl, note: 'Verify travel year and dates on the partner site.' });
    } catch (error) {
      console.error('Flight affiliate conversion failed:', error.message);
      res.status(502).json({ error: 'Unable to create a tracked flight search. Please try again.' });
    }
  });

  app.get('/api/affiliate/booking', async (req, res) => {
    const city = String(req.query.city || '').trim();
    if (!Object.hasOwn(cities, city)) return res.status(400).json({ error: 'Unsupported destination' });
    const vars = { city, destination: city, origin: String(req.query.origin || '').slice(0, 80), near: String(req.query.near || '').slice(0, 120), checkin: String(req.query.checkin || '').slice(0, 10), checkout: String(req.query.checkout || '').slice(0, 10) };
    const result = Object.fromEntries(TYPES.map(kind => [kind, { url: null, tracked: false, status: 'unavailable', message: 'Partner destination link not configured' }]));
    const pending = [];
    for (const kind of TYPES) {
      try {
        const original = resolve(kind, vars);
        if (!original) continue;
        const cached = CACHE.get(`${kind}:${original}`);
        if (cached && cached.expires > Date.now()) { result[kind] = { url: cached.url, tracked: true, status: 'ready' }; continue; }
        pending.push({ kind, original });
        result[kind].message = 'Affiliate conversion pending';
      } catch (e) { result[kind].message = e.message; }
    }
    if (pending.length && !(process.env.TRAVELPAYOUTS_API_TOKEN && process.env.TRAVELPAYOUTS_TRS && process.env.TRAVELPAYOUTS_MARKER)) {
      pending.forEach(({ kind }) => { result[kind].message = 'Travelpayouts credentials missing'; });
    } else if (pending.length) {
      try {
        const converted = await convertBatch(pending, city);
        pending.forEach(({ kind, original }, index) => {
          const item = converted[index];
          if (item?.code === 'success' && typeof item.partner_url === 'string' && /^https:\/\//.test(item.partner_url)) {
            result[kind] = { url: item.partner_url, tracked: true, status: 'ready' };
            CACHE.set(`${kind}:${original}`, { url: item.partner_url, expires: Date.now() + TTL });
          } else result[kind].message = item?.message || 'Partner program unavailable or link rejected';
        });
      } catch (e) { console.error('Affiliate conversion failed:', e.message); pending.forEach(({ kind }) => { result[kind].message = 'Affiliate service temporarily unavailable'; }); }
    }
    res.set('Cache-Control', 'private, max-age=60');
    res.json({ city, bookings: result });
  });
  app.get('/api/affiliate/booking-status', (_req, res) => res.json({ configured: Boolean(process.env.TRAVELPAYOUTS_API_TOKEN && process.env.TRAVELPAYOUTS_TRS && process.env.TRAVELPAYOUTS_MARKER), types: TYPES, note: 'Each brand requires Travelpayouts program access and an approved landing-page URL.' }));
}
