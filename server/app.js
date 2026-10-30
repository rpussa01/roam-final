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
app.use('/api',(req,res)=>err(res,404,`Unknown API route: ${req.path}`));
export default app;
