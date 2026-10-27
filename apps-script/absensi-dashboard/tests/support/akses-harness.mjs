import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
import {harness as jenjangHarness,plain} from './jenjang-harness.mjs';
export {plain};
export function harness(options={}){
 const h=jenjangHarness();h.migrate();const access=jenjangHarness();for(const k of Object.keys(access.store))delete access.store[k];access.put('Sheet1',[['']]);
 const bookId='ACCESS_DATABASE_12345678901234567890',calls=[],cache=new Map(),fetches=[];let createCount=0,networkFail=false;
 access.ss.getId=()=>bookId;access.ss.getName=()=> 'Manajemen Akses Uji';
 h.c.SpreadsheetApp.openById=id=>{calls.push(id);if(id===h.ss.getId())return h.ss;if(id!==bookId)throw Error('Unknown spreadsheet');return access.ss;};
 h.c.SpreadsheetApp.create=()=>{createCount++;return access.ss;};
 h.c.CacheService={getScriptCache:()=>({get:k=>cache.get(k)||null,put:(k,v)=>cache.set(k,v),remove:k=>cache.delete(k)})};
 h.c.Utilities.base64EncodeWebSafe=b=>Buffer.from(b).toString('base64url');h.c.Utilities.base64DecodeWebSafe=s=>Array.from(Buffer.from(s,'base64url'));h.c.Utilities.newBlob=b=>({getDataAsString:()=>Buffer.from(b).toString('utf8')});
 const originalHTML=h.c.HtmlService.createHtmlOutput;h.c.HtmlService.createHtmlOutput=content=>Object.assign(originalHTML(content),{setTitle(title){this.title=title;return this;},addMetaTag(){return this;}});
 vm.runInContext(fs.readFileSync(new URL('../../Akses.gs',import.meta.url),'utf8'),h.c,{filename:'Akses.gs'});
 let profile={sub:'112233445566778899001',email:'owner@test.invalid',email_verified:true,name:'Owner Uji'},claimsPatch={},tokenPatch={},tokenStatus=200,profileStatus=200,afterToken=()=>{};
 h.c.UrlFetchApp={fetch(url,opts){assert.equal(h.locks.held,false,'HTTP requests must not hold ScriptLock');fetches.push({url,opts});if(networkFail)throw Error('simulated failure including CLIENT_SECRET_TEST');if(url==='https://oauth2.googleapis.com/token'){
   const entry=[...cache.values()].map(JSON.parse).find(p=>p.verifier===opts.payload.code_verifier)||lastPending;
   const claims={iss:'https://accounts.google.com',aud:'client-test.apps.googleusercontent.com',nonce:entry?.nonce,sub:profile.sub,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600,...claimsPatch};
   const token={access_token:'SERVER_ONLY_ACCESS_TOKEN',id_token:'header.'+Buffer.from(JSON.stringify(claims)).toString('base64url')+'.signature',token_type:'Bearer',...tokenPatch};afterToken();return {getResponseCode:()=>tokenStatus,getContentText:()=>JSON.stringify(token)};
  }if(url==='https://openidconnect.googleapis.com/v1/userinfo')return {getResponseCode:()=>profileStatus,getContentText:()=>JSON.stringify(profile)};throw Error('Unexpected external URL');}};
 let lastPending;
 function setup(){return h.c.siapkanManajemenAksesPanitia({spreadsheet:bookId,konfirmasi:true});}
 function google(){return h.c.simpanKonfigurasiLoginGoogle({client_id:'client-test.apps.googleusercontent.com',client_secret:'CLIENT_SECRET_TEST'});}
 function start(){const r=plain(h.c.mulaiUjiLoginGoogle());lastPending=JSON.parse(cache.get('GOOGLE-AKSES|'+r.state));return r;}
 function finish(r,extra={}){return h.c.verifikasiUjiLoginGoogle({state:r.state,browser_key:r.browser_key,code:'authorization_code_test',...extra});}
 function addUser(patch={}){return h.c.simpanPenggunaPanitia({nama:'Petugas Uji',email:'petugas@gmail.com',peran:'petugas_kelas',status:'aktif',id_permintaan:'new_user_access_request_001',...patch});}
 function users(){return plain(h.c.muatManajemenAksesPanitia()).pengguna;}
 function deny(){h.c.Session={getActiveUser:()=>({getEmail:()=>options.emptyIdentity?'':'stranger@test.invalid'})};}
 const baselineMain=plain(h.store);
 return {h,c:h.c,access,bookId,calls,cache,fetches,baselineMain,setup,google,start,finish,addUser,users,deny,created:()=>createCount,
  provider(o={}){if(o.profile)profile={...profile,...o.profile};if(o.claims)claimsPatch=o.claims;if(o.token)tokenPatch=o.token;if(o.tokenStatus)tokenStatus=o.tokenStatus;if(o.profileStatus)profileStatus=o.profileStatus;if(o.afterToken)afterToken=o.afterToken;if(o.networkFail)networkFail=true;}};
}
