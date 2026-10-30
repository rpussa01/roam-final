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
app.use('/api',(req,res)=>err(res,404,`Unknown API route: ${req.path}`));
export default app;
