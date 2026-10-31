import test from 'node:test';
import assert from 'node:assert/strict';
import { registerAffiliateEngine } from '../server/affiliate-engine.js';

test('flight route conversion and failure handling', async () => {
 const routes = {};
 registerAffiliateEngine({get:(path, handler)=>routes[path]=handler}, {});
 const run=async(query)=>{ const res={statusCode:200,status(n){this.statusCode=n;return this},json(body){this.body=body;return this}}; await routes['/api/affiliate/flights']({query},res); return res; };
 const originalFetch=global.fetch;
 const originalEnv={...process.env};
 try {
  Object.assign(process.env,{TRAVELPAYOUTS_API_TOKEN:'test-only',TRAVELPAYOUTS_TRS:'593702',TRAVELPAYOUTS_MARKER:'798359'});
  let payload;
  global.fetch=async(_,options)=>{payload=JSON.parse(options.body);return {ok:true,json:async()=>({result:{links:[{code:'success',partner_url:'https://aviasales.tpx.lv/test-only'}]}})}};
  const query={origin:'PER',city:'Bali',departureDate:'2027-02-15',returnDate:'2027-03-01',adults:'1'};
  let result=await run(query);
  assert.equal(payload.links[0].url,'https://www.aviasales.com/search/PER1502DPS01031?marker=798359');
  assert.equal(payload.marker,798359);
  assert.equal(result.body.affiliateUrl,'https://aviasales.tpx.lv/test-only');
  assert.equal((await run({...query,returnDate:'2027-02-01'})).statusCode,400);
  global.fetch=async()=>({ok:true,json:async()=>({result:{links:[{code:'success',partner_url:'https://www.aviasales.com/search/PER1602DPS1'}]}})});
  result=await run({...query,departureDate:'2027-02-16'});
  assert.equal(result.statusCode,502);
  assert.equal(result.body.affiliateUrl,undefined);
  global.fetch=async()=>({ok:false,status:401});
  assert.equal((await run({...query,departureDate:'2027-02-17'})).statusCode,502);
  delete process.env.TRAVELPAYOUTS_API_TOKEN;
  assert.equal((await run(query)).statusCode,503);
 } finally {global.fetch=originalFetch;process.env=originalEnv;}
});
