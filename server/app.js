import express from 'express';
const app=express();
app.use(express.json());
const cities={Bangkok:[13.7563,100.5018],Bali:[-8.65,115.2167],Tokyo:[35.6762,139.6503],Melbourne:[-37.8136,144.9631],Perth:[-31.9523,115.8613],Singapore:[1.3521,103.8198],London:[51.5074,-0.1278],'New York':[40.7128,-74.006],Paris:[48.8566,2.3522],Dubai:[25.2048,55.2708],Sydney:[-33.8688,151.2093],Seoul:[37.5665,126.978]};
const types={All:['tourist_attraction','restaurant','cafe','night_club','bar','museum','park'],Nightlife:['night_club','bar'],Cafés:['cafe'],Food:['restaurant'],Attractions:['tourist_attraction','museum','park'],Experiences:['tourist_attraction','amusement_park'],Stays:['lodging']};
const key=()=>process.env.GOOGLE_PLACES_API_KEY?.trim();
const err=(res,code,msg)=>res.status(code).json({error:msg});
app.get('/api/health',(_req,res)=>res.json({status:'ok',configured:!!key()&&key()!=='your_google_places_api_key_here',cities:Object.keys(cities),categories:Object.keys(types)}));
app.get('/api/places',async(req,res)=>{
 const city=String(req.query.city||'Bangkok'),category=String(req.query.category||'All');
 if(!cities[city]||!types[category])return err(res,400,'Unknown city or category');
 if(!key()||key()==='your_google_places_api_key_here')return err(res,503,'Google Places API key is not configured on the server.');
 try{
  const [latitude,longitude]=cities[city];
  const r=await fetch('https://places.googleapis.com/v1/places:searchNearby',{method:'POST',headers:{'Content-Type':'application/json','X-Goog-Api-Key':key(),'X-Goog-FieldMask':'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.photos,places.primaryType,places.googleMapsUri,places.websiteUri,places.currentOpeningHours.openNow,places.priceLevel'},body:JSON.stringify({includedTypes:types[category],maxResultCount:20,rankPreference:'POPULARITY',locationRestriction:{circle:{center:{latitude,longitude},radius:city==='Bali'?18000:12000}}})});
  const raw=await r.text();let data;try{data=JSON.parse(raw)}catch{return err(res,502,'Places service returned an unexpected response.')}if(!r.ok)return err(res,r.status,data.error?.message||'Google Places request failed');
  res.set('Cache-Control','private, max-age=120');res.json({city,category,attribution:'Place information provided by Google Maps',places:(data.places||[]).map(p=>({id:p.id,name:p.displayName?.text||'Unnamed place',city,category,description:p.formattedAddress||'',rating:p.rating??null,reviews:p.userRatingCount??null,lat:p.location?.latitude,lng:p.location?.longitude,photo:p.photos?.[0]?.name||null,googleMapsUri:p.googleMapsUri||null,websiteUri:p.websiteUri||null,openNow:p.currentOpeningHours?.openNow??null,primaryType:p.primaryType||null,priceLevel:p.priceLevel||null}))});
 }catch(e){console.error('Places request:',e);err(res,502,'Could not connect to Google Places.');}
});
app.get('/api/photo',async(req,res)=>{const name=String(req.query.name||'');if(!/^places\/[^/]+\/photos\/[^/]+$/.test(name))return err(res,400,'Invalid photo reference');if(!key())return err(res,503,'API key missing');try{const r=await fetch(`https://places.googleapis.com/v1/${name}/media?maxWidthPx=1000&skipHttpRedirect=true`,{headers:{'X-Goog-Api-Key':key()}});const raw=await r.text();let data;try{data=JSON.parse(raw)}catch{return err(res,502,'Invalid photo response')}if(!r.ok||!data.photoUri)return err(res,502,'Photo unavailable');const photo=await fetch(data.photoUri);if(!photo.ok)return err(res,502,'Photo unavailable');res.set('Content-Type',photo.headers.get('content-type')||'image/jpeg');res.set('Cache-Control','private, max-age=300');res.send(Buffer.from(await photo.arrayBuffer()));}catch{return err(res,502,'Photo unavailable')}});

// Authenticated AI planning: the API key never reaches the browser.
app.post('/api/itinerary',async(req,res)=>{
 if(!process.env.OPENAI_API_KEY)return err(res,503,'OpenAI is not configured. Add OPENAI_API_KEY to server environment.');
 if(!process.env.VITE_SUPABASE_URL||!process.env.VITE_SUPABASE_ANON_KEY)return err(res,503,'Supabase authentication is not configured.');
 const bearer=req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
 if(!bearer)return err(res,401,'Sign in to generate AI itineraries.');
 try{
  const auth=await fetch(`${process.env.VITE_SUPABASE_URL}/auth/v1/user`,{headers:{apikey:process.env.VITE_SUPABASE_ANON_KEY,Authorization:`Bearer ${bearer}`}});
  if(!auth.ok)return err(res,401,'Your session expired. Please sign in again.');
  const {city,days,places,preferences,tripName,startDate,notes,previousPlan}=req.body||{};
  if(!cities[city]||!Number.isInteger(days)||days<1||days>14||!Array.isArray(places)||places.length>60)return err(res,400,'Invalid itinerary inputs (1–14 days, maximum 60 places).');
  const candidates=places.filter(p=>p&&typeof p.name==='string').slice(0,60).map(p=>({id:String(p.id||'').slice(0,120),name:p.name.slice(0,150),address:String(p.description||'').slice(0,200),lat:p.lat,lng:p.lng,category:p.category,openNow:p.openNow}));
  const instructions=`You are ROAM, a careful travel itinerary planner. Return JSON only matching the supplied schema. Plan realistic routes, grouping geographically close places. Prioritise the user's saved places and preferences. Use only candidate place IDs for stops; do not invent venues. If there are too few candidates, schedule fewer stops and explain free time. Do not claim live opening hours, confirmed reservations, accurate transit times, or verified prices. Times are approximate local time, 24-hour HH:MM. Provide concise practical explanations. When refining, respect the requested changes and preserve unaffected days where feasible.`;
  const payload={model:process.env.OPENAI_MODEL||'gpt-4.1-mini',instructions,input:JSON.stringify({city,days,tripName:String(tripName||'').slice(0,100),startDate:String(startDate||'').slice(0,20),notes:String(notes||'').slice(0,1000),preferences,candidates,previousPlan}),text:{format:{type:'json_schema',name:'roam_itinerary',strict:true,schema:{type:'object',additionalProperties:false,required:['summary','days'],properties:{summary:{type:'string'},days:{type:'array',items:{type:'object',additionalProperties:false,required:['day','theme','stops','tips'],properties:{day:{type:'integer'},theme:{type:'string'},tips:{type:'string'},stops:{type:'array',items:{type:'object',additionalProperties:false,required:['placeId','time','reason'],properties:{placeId:{type:'string'},time:{type:'string'},reason:{type:'string'}}}}}}}}}}},max_output_tokens:3500};
  const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const data=await r.json();if(!r.ok)return err(res,502,data.error?.message||'OpenAI itinerary generation failed.');
  const output=data.output?.flatMap(x=>x.content||[]).find(x=>x.type==='output_text')?.text;
  if(!output)return err(res,502,'AI returned no itinerary. Please try again.');
  const plan=JSON.parse(output);const byId=new Map(candidates.map(p=>[p.id,p]));
  res.json({summary:plan.summary,days:plan.days.slice(0,days).map(d=>({day:d.day,theme:d.theme,tips:d.tips,places:d.stops.filter(st=>byId.has(st.placeId)).map(st=>({...places.find(p=>String(p.id)===st.placeId),time:st.time,reason:st.reason}))}))});
 }catch(e){console.error('AI itinerary error:',e);return err(res,502,'Could not generate the itinerary. Please retry.');}
});

// Klook destination URLs must be verified: Klook uses numeric city IDs.
// London is verified from the supplied Klook destination page. Additional destinations
// can be supplied via KLOOK_DESTINATION_URLS without changing the application.
const VERIFIED_KLOOK_DESTINATIONS = Object.freeze({
  London: 'https://www.klook.com/destination/c106-london/'
});
const affiliateCache = new Map();
function resolveKlookUrl(city) {
  let mapping = {};
  try { mapping = JSON.parse(process.env.KLOOK_DESTINATION_URLS || '{}'); }
  catch { throw new Error('KLOOK_DESTINATION_URLS must be valid JSON'); }
  const template = mapping[city] || VERIFIED_KLOOK_DESTINATIONS[city] || process.env.KLOOK_DESTINATION_URL_TEMPLATE;
  if (!template) return null;
  const url = new URL(template.replaceAll('{destination}', encodeURIComponent(city)).replaceAll('{city}', encodeURIComponent(city)));
  if (url.protocol !== 'https:' || !['klook.com', 'www.klook.com'].includes(url.hostname) || url.username || url.password)
    throw new Error('Destination must be an HTTPS Klook URL');
  return url.toString();
}
async function klookAffiliate(req, res) {
  const city = String(req.method === 'POST' ? req.body?.city : req.query.city || '').trim();
  if (!Object.hasOwn(cities, city)) return err(res, 400, 'Choose a supported destination.');
  let destinationUrl;
  try { destinationUrl = resolveKlookUrl(city); }
  catch (e) { return err(res, 503, e.message); }
  if (!destinationUrl) return res.json({city, url:null, tracked:false, fallback:false, message:`A verified Klook destination page is not available for ${city}. Configure KLOOK_DESTINATION_URLS to enable tracked bookings.`});
  if (!process.env.TRAVELPAYOUTS_API_TOKEN || !process.env.TRAVELPAYOUTS_TRS || !process.env.TRAVELPAYOUTS_MARKER) return err(res,503,'Travelpayouts API credentials are not configured on the server.');
  const cached = affiliateCache.get(destinationUrl);
  if (cached && cached.expires > Date.now()) return res.json({ city, url: cached.url, source: 'cache', tracked:true });
  try {
    const response = await fetch('https://api.travelpayouts.com/links/v1/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Access-Token': process.env.TRAVELPAYOUTS_API_TOKEN },
      body: JSON.stringify({
        trs: Number(process.env.TRAVELPAYOUTS_TRS),
        marker: Number(process.env.TRAVELPAYOUTS_MARKER),
        shorten: true,
        links: [{ url: destinationUrl, sub_id: `roam-${city.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` }]
      }),
      signal: AbortSignal.timeout(12000)
    });
    const data = await response.json();
    if (!response.ok) {
      console.error('Travelpayouts API HTTP status:', response.status);
      return err(res, 502, 'Travelpayouts rejected the request. Check API token, partner access and link format.');
    }
    const item = data?.result?.links?.[0] || data?.links?.[0];
    const candidate = item?.partner_url || item?.affiliate_url;
    if (item?.code && item.code !== 'success') return err(res, 502, 'Travelpayouts did not approve this destination link.');
    if (typeof candidate !== 'string' || !candidate.startsWith('https://'))
      return err(res, 502, 'Travelpayouts returned no valid affiliate link. Confirm the response schema for your account.');
    affiliateCache.set(destinationUrl, { url: candidate, expires: Date.now() + 6 * 60 * 60 * 1000 });
    return res.json({ city, url: candidate, source: 'travelpayouts', tracked:true });
  } catch (e) {
    console.error('Travelpayouts request failed:', e.message);
    return err(res, 502, 'Could not generate a Klook affiliate link right now.');
  }
}
app.get('/api/affiliate/klook', klookAffiliate);
app.post('/api/affiliate/klook', klookAffiliate);
app.get('/api/affiliate/status', (_req, res) => {
  let configuredCities = [];
  try { configuredCities = Object.keys(JSON.parse(process.env.KLOOK_DESTINATION_URLS || '{}')); } catch {}
  res.json({ credentialsConfigured: Boolean(process.env.TRAVELPAYOUTS_API_TOKEN && process.env.TRAVELPAYOUTS_TRS && process.env.TRAVELPAYOUTS_MARKER),
    configuredCities: [...new Set([...Object.keys(VERIFIED_KLOOK_DESTINATIONS), ...configuredCities])], templateConfigured: Boolean(process.env.KLOOK_DESTINATION_URL_TEMPLATE) });
});
app.use('/api',(req,res)=>err(res,404,`Unknown API route: ${req.path}`));
export default app;
