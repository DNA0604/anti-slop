/** Tahap 3: direktori panitia terpisah + uji identitas Google. Belum mengganti akses aplikasi utama. */
function skemaDirektoriAkses_(){return {
  Pengguna:['id_pengguna','nama','email_google','google_sub','peran','status','created_at','updated_at'],
  Penugasan_Jenjang:['id_penugasan','id_pengguna','id_program','id_jenjang','status','created_at','updated_at'],
  Riwayat_Akses:['id_riwayat','jenis_data','id_target','aksi','sebelum','sesudah','oleh','waktu','id_permintaan','status_transaksi']
};}
function teksAkses_(v){return String(v==null?'':v).trim();}
function emailAkses_(v){const s=teksAkses_(v).toLowerCase();if(s.length>254||!/^[a-z0-9][a-z0-9._%+-]*@[a-z0-9.-]+\.[a-z]{2,63}$/.test(s))throw Error('Alamat email Google tidak valid.');return s;}
function serialAkses_(value){return JSON.stringify(value,function(k,v){return v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(key=>[key,v[key]])):v;});}
function hashAkses_(v){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(v),Utilities.Charset.UTF_8).map(b=>('0'+(b&255).toString(16)).slice(-2)).join('');}
function databaseAkses_(){
  const active=SpreadsheetApp.getActiveSpreadsheet();if(active)return active;
  const id=PropertiesService.getScriptProperties().getProperty('AKSES_DATABASE_ID');
  if(!id)throw Error('Pemilik perlu menyiapkan direktori dari menu spreadsheet sebelum uji login.');
  return SpreadsheetApp.openById(id);
}
function kunciKonfigurasiAkses_(){return 'AKSES_PANITIA|'+databaseAkses_().getId();}
function konfigurasiAkses_(){const raw=PropertiesService.getScriptProperties().getProperty(kunciKonfigurasiAkses_());return raw?JSON.parse(raw):null;}
function simpanKonfigurasiAkses_(value){const p=PropertiesService.getScriptProperties(),raw=JSON.stringify(value);p.setProperty(kunciKonfigurasiAkses_(),raw);if(p.getProperty(kunciKonfigurasiAkses_())!==raw)throw Error('Penyimpanan konfigurasi akses belum terverifikasi.');}
function pemilikAkses_(){return wajibPemilikIndex_();}
function bukaManajemenAksesPanitia(){pemilikAkses_();SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(halamanManajemenAkses_()).setWidth(1160).setHeight(800),'Manajemen Akses Panitia');}
function idSpreadsheetAkses_(input){
  const raw=teksAkses_(input),match=raw.match(/^https:\/\/docs\.google\.com\/spreadsheets\/d\/([A-Za-z0-9_-]+)(?:[/?#].*)?$/),id=match?match[1]:raw;
  if(!/^[A-Za-z0-9_-]{20,150}$/.test(id))throw Error('Masukkan ID atau tautan spreadsheet akses yang valid.');
  if(id===databaseAkses_().getId())throw Error('Spreadsheet akses harus berupa file terpisah dari database pelatihan.');
  return id;
}
function bukuAkses_(pending){
  const cfg=konfigurasiAkses_();if(!cfg||(!pending&&cfg.status!=='SIAP')||cfg.schema!==1)throw Error('Manajemen akses belum disiapkan. Buka panel dari menu spreadsheet.');
  if(cfg.id===databaseAkses_().getId())throw Error('Konfigurasi akses tidak boleh menunjuk database utama.');
  const book=SpreadsheetApp.openById(cfg.id),owner=book.getOwner(),mainOwner=databaseAkses_().getOwner();
  if(!owner||!mainOwner||emailAkses_(owner.getEmail())!==emailAkses_(mainOwner.getEmail()))throw Error('Kepemilikan spreadsheet akses berubah/tidak sesuai dengan database utama.');
  return book;
}
function tabelAkses_(book,name){
  const keys=skemaDirektoriAkses_()[name],sheet=book.getSheetByName(name);if(!keys||!sheet)throw Error('Tab akses '+name+' belum tersedia.');
  if(sheet.getLastRow()>10001||sheet.getLastColumn()>keys.length)throw Error('Ukuran/kolom tab '+name+' di luar struktur direktori akses.');
  const range=sheet.getDataRange(),values=range.getValues(),formulas=range.getFormulas(),header=(values[0]||[]).map(teksAkses_);
  if(header.length!==keys.length||new Set(header).size!==keys.length||keys.some(k=>!header.includes(k))||formulas.some(row=>row.some(Boolean)))throw Error('Header/formula pada '+name+' tidak sesuai. Data yang sudah terisi tidak ditimpa otomatis.');
  const records=[];values.slice(1).forEach((row,i)=>{if(!row.some(v=>v!==''&&v!=null))return;records.push({baris:i+2,data:Object.fromEntries(header.map((k,c)=>[k,row[c]]))});});
  return {sheet,header,records};
}
function direktoriAkses_(book){
  const pengguna=tabelAkses_(book,'Pengguna'),penugasan=tabelAkses_(book,'Penugasan_Jenjang'),history=tabelAkses_(book,'Riwayat_Akses'),ids=new Set(),emails=new Set(),subs=new Set();
  if(pengguna.records.length>1000||penugasan.records.length>5000)throw Error('Direktori dibatasi 1.000 pengguna dan 5.000 penugasan.');
  pengguna.records.forEach(r=>{const d=r.data,id=teksAkses_(d.id_pengguna),email=emailAkses_(d.email_google),sub=teksAkses_(d.google_sub);if(!id||ids.has(id)||emails.has(email)||!teksAkses_(d.nama)||!['admin_pelatihan','petugas_kelas'].includes(teksAkses_(d.peran))||!['aktif','nonaktif'].includes(teksAkses_(d.status))||sub&&(subs.has(sub)||typeof d.google_sub!=='string'))throw Error('Pengguna memiliki ID/email/sub duplikat atau data tidak valid pada baris '+r.baris+'. google_sub wajib teks.');ids.add(id);emails.add(email);if(sub)subs.add(sub);});
  const pi=new Set(),pairs=new Set();penugasan.records.forEach(r=>{const d=r.data,id=teksAkses_(d.id_penugasan),pair=JSON.stringify([teksAkses_(d.id_pengguna),teksAkses_(d.id_jenjang)]);if(!id||pi.has(id)||pairs.has(pair)||!ids.has(teksAkses_(d.id_pengguna))||!teksAkses_(d.id_program)||!teksAkses_(d.id_jenjang)||!['aktif','nonaktif'].includes(teksAkses_(d.status)))throw Error('Penugasan tidak valid/duplikat pada baris '+r.baris+'.');pi.add(id);pairs.add(pair);});
  return {pengguna,penugasan,history};
}
function kelompokTransaksiAkses_(book){const groups=new Map();tabelAkses_(book,'Riwayat_Akses').records.forEach(r=>{const id=teksAkses_(r.data.id_permintaan),status=teksAkses_(r.data.status_transaksi).toUpperCase();if(!id||!status)throw Error('Riwayat akses memiliki transaksi/status kosong pada baris '+r.baris+'.');groups.set(id,r.data);});return groups;}
function auditAkses_(book,plan,status,actor){
  const t=tabelAkses_(book,'Riwayat_Akses'),r={id_riwayat:'AKR-'+Utilities.getUuid(),jenis_data:plan.sheet,id_target:plan.id,aksi:plan.action,sebelum:JSON.stringify(plan.before),sesudah:JSON.stringify(plan),oleh:actor,waktu:new Date(),id_permintaan:plan.tx,status_transaksi:status};
  t.sheet.appendRow(t.header.map(k=>r[k]===undefined?'':r[k]));SpreadsheetApp.flush();
}
/** Single-row transactional write; caller holds ScriptLock. Replay only before/after snapshots. */
function terapkanRencanaAkses_(book,plan,actor){
  if(!['Pengguna','Penugasan_Jenjang'].includes(plan.sheet)||!plan.id||!plan.after||plan.after[skemaDirektoriAkses_()[plan.sheet][0]]!==plan.id)throw Error('Rencana akses tidak valid.');
  const table=tabelAkses_(book,plan.sheet),key=skemaDirektoriAkses_()[plan.sheet][0],matches=table.records.filter(r=>teksAkses_(r.data[key])===plan.id);
  if(matches.length>1)throw Error('ID target akses duplikat.');
  const current=matches[0]?matches[0].data:null,same=(a,b)=>serialAkses_(a)===serialAkses_(b);
  if(!same(current,plan.after)){
    if(!same(current,plan.before))throw Error('Data akses berubah di luar transaksi. Periksa riwayat sebelum melanjutkan.');
    const row=table.header.map(k=>{const v=plan.after[k];return ['created_at','updated_at'].includes(k)&&v?new Date(v):v===undefined?'':v;});
    const targetRow=matches[0]?matches[0].baris:table.sheet.getLastRow()+1;
    if(plan.sheet==='Pengguna')table.sheet.getRange(targetRow,table.header.indexOf('google_sub')+1,1,1).setNumberFormat('@');
    table.sheet.getRange(targetRow,1,1,table.header.length).setValues([row]);SpreadsheetApp.flush();
    const verify=tabelAkses_(book,plan.sheet).records.filter(r=>teksAkses_(r.data[key])===plan.id);
    if(verify.length!==1||!same(verify[0].data,plan.after))throw Error('Verifikasi penyimpanan akses gagal.');
  }
  auditAkses_(book,plan,'SELESAI',actor);return {sukses:true,id:plan.id,pesan:'Perubahan akses tersimpan.'};
}

// Google login proof uses authorization code + PKCE; it never accepts a browser ID/access token.
function kunciGoogleAkses_(){return 'AKSES_GOOGLE_CLIENT|'+databaseAkses_().getId();}
function konfigurasiGoogleAkses_(){const raw=PropertiesService.getScriptProperties().getProperty(kunciGoogleAkses_());if(!raw)return null;let c;try{c=JSON.parse(raw);}catch(e){throw Error('Konfigurasi Google di server tidak dapat dibaca. Minta pemilik memeriksa pengaturannya.');}return c&&c.client_id&&c.client_secret&&c.callback?c:null;}
function urlDeploymentGoogleAkses_(value){const url=teksAkses_(value);return /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url)&&url.length<=512?url:'';}
function callbackGoogleAkses_(){
  // The service URL can select another deployment. An owner-selected URL takes precedence.
  const saved=konfigurasiGoogleAkses_();
  return urlDeploymentGoogleAkses_(saved?saved.callback:ScriptApp.getService().getUrl());
}
function simpanKonfigurasiLoginGoogle(d){
  pemilikAkses_();d=d||{};bukuAkses_();const id=teksAkses_(d.client_id),old=konfigurasiGoogleAkses_(),secret=teksAkses_(d.client_secret)||(old&&old.client_id===id?old.client_secret:'');
  const callback=urlDeploymentGoogleAkses_(d.callback===undefined?callbackGoogleAkses_():d.callback);if(!callback)throw Error('Salin Web app URL dari Deploy → Manage deployments. Gunakan https://script.google.com/macros/s/ID_DEPLOYMENT/exec tanpa parameter tambahan.');
  if(!/^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(id)||!secret||secret.length>512||/[\r\n]/.test(secret))throw Error('Client ID / Client Secret OAuth tidak valid. Isi melalui panel pemilik; jangan bagikan lewat percakapan.');
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try{const value=JSON.stringify({client_id:id,client_secret:secret,callback}),props=PropertiesService.getScriptProperties();props.setProperty(kunciGoogleAkses_(),value);if(props.getProperty(kunciGoogleAkses_())!==value)throw Error('Konfigurasi Google belum tersimpan.');return {sukses:true,pesan:'Konfigurasi uji login tersimpan. Client Secret tidak dikirim kembali ke browser.'};}finally{lock.releaseLock();}
}
function cacheLoginAkses_(){return CacheService.getScriptCache();}
function acakLoginAkses_(){return (Utilities.getUuid()+Utilities.getUuid()).replace(/-/g,'');}
function mulaiUjiLoginGoogle(){
  const cfg=konfigurasiAkses_(),google=konfigurasiGoogleAkses_();if(!cfg||cfg.status!=='SIAP'||!google||google.callback!==callbackGoogleAkses_())throw Error('Uji login belum disiapkan oleh pemilik.');
  const state='AKS-'+acakLoginAkses_(),browser=acakLoginAkses_(),verifier=acakLoginAkses_(),nonce=acakLoginAkses_();
  const challenge=Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,verifier,Utilities.Charset.UTF_8)).replace(/=+$/,'');
  const record={secret_hash:hashAkses_(browser),verifier,nonce,expires:Date.now()+300000,config_hash:hashAkses_(serialAkses_([cfg,google]))};
  cacheLoginAkses_().put('GOOGLE-AKSES|'+state,JSON.stringify(record),300);
  const params={client_id:google.client_id,redirect_uri:google.callback,response_type:'code',scope:'openid email profile',state,nonce,code_challenge:challenge,code_challenge_method:'S256',prompt:'select_account'};
  return {sukses:true,state,browser_key:browser,url:'https://accounts.google.com/o/oauth2/v2/auth?'+Object.keys(params).map(k=>encodeURIComponent(k)+'='+encodeURIComponent(params[k])).join('&')};
}
function responsGoogleAkses_(response){
  if(response.getResponseCode()!==200)throw Error('Google menolak verifikasi login. Mulai uji login baru dan periksa konfigurasi OAuth.');
  let data;try{data=JSON.parse(response.getContentText());}catch(e){throw Error('Respons Google tidak dapat diverifikasi.');}return data;
}
function ambilGoogleAkses_(url,options){let response;try{response=UrlFetchApp.fetch(url,options);}catch(e){throw Error('Koneksi verifikasi Google belum berhasil. Mulai uji login baru.');}return responsGoogleAkses_(response);}
function identitasDirektoriAkses_(identity,state){
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    const book=bukuAkses_(),dir=direktoriAkses_(book);
    if(Array.from(kelompokTransaksiAkses_(book).values()).some(r=>teksAkses_(r.status_transaksi).toUpperCase()!=='SELESAI'))throw Error('Direktori memiliki perubahan belum selesai. Minta pemilik memeriksa transaksi akses.');
    const user=dir.pengguna.records.find(r=>emailAkses_(r.data.email_google)===identity.email);if(!user||user.data.status!=='aktif')throw Error('Akun Google ini belum terdaftar aktif sebagai panitia.');
    const d=user.data;if(d.google_sub&&d.google_sub!==identity.sub)throw Error('Identitas Google berbeda dari akun yang sudah ditautkan. Hubungi pemilik.');
    if(dir.pengguna.records.some(r=>r.data.id_pengguna!==d.id_pengguna&&teksAkses_(r.data.google_sub)===identity.sub))throw Error('Identitas Google sudah tertaut pada akun panitia lain.');
    if(!d.google_sub)perubahanAkses_(book,'GOOGLE_BIND',{id:d.id_pengguna,sub:identity.sub},'bind_'+state,identity.email,()=>({sheet:'Pengguna',id:d.id_pengguna,action:'tautkan_google',before:d,after:Object.assign({},d,{google_sub:identity.sub,updated_at:new Date()})}));
    const levels=daftarJenjangAkses_(),scopes=dir.penugasan.records.filter(r=>r.data.id_pengguna===d.id_pengguna&&r.data.status==='aktif').map(r=>levels.find(j=>j.id===r.data.id_jenjang&&j.program===r.data.id_program)).filter(Boolean);
    return {sukses:true,tujuan:'uji_identitas',email:identity.email,nama:identity.nama,peran:d.peran,jenjang:scopes,pembatasan_aplikasi_aktif:false,pesan:'Identitas Google dan akun panitia cocok. Ini hasil uji; akses petugas pada aplikasi utama belum diaktifkan.'};
  }finally{lock.releaseLock();}
}
function verifikasiUjiLoginGoogle(d){
  d=d||{};const state=teksAkses_(d.state),key=teksAkses_(d.browser_key),code=teksAkses_(d.code);
  if(!/^AKS-[a-f0-9]{64}$/i.test(state)||!/^[a-f0-9]{64}$/i.test(key)||!code||code.length>4096||/[\r\n]/.test(code))throw Error('Permintaan uji login tidak valid.');
  const lock=LockService.getScriptLock();lock.waitLock(10000);let pending,google;
  try{
    const cache=cacheLoginAkses_(),raw=cache.get('GOOGLE-AKSES|'+state);if(!raw)throw Error('Sesi uji kedaluwarsa/sudah dipakai. Mulai login baru dari tab yang sama.');pending=JSON.parse(raw);
    if(pending.expires<Date.now()||pending.secret_hash!==hashAkses_(key))throw Error('Sesi browser login tidak cocok. Mulai login baru dari tab yang sama.');
    google=konfigurasiGoogleAkses_();if(!google||pending.config_hash!==hashAkses_(serialAkses_([konfigurasiAkses_(),google]))||google.callback!==callbackGoogleAkses_())throw Error('Konfigurasi akses berubah. Mulai uji login baru.');
    cache.remove('GOOGLE-AKSES|'+state);
  }finally{lock.releaseLock();}
  const token=ambilGoogleAkses_('https://oauth2.googleapis.com/token',{method:'post',contentType:'application/x-www-form-urlencoded',payload:{client_id:google.client_id,client_secret:google.client_secret,code,code_verifier:pending.verifier,redirect_uri:google.callback,grant_type:'authorization_code'},muteHttpExceptions:true,followRedirects:false,validateHttpsCertificates:true});
  if(!token.access_token||typeof token.access_token!=='string'||/[\r\n]/.test(token.access_token)||String(token.token_type).toLowerCase()!=='bearer'||typeof token.id_token!=='string')throw Error('Token Google tidak lengkap.');
  // ID token is obtained only from the fixed Google TLS token endpoint, never from the browser.
  let claims;try{const parts=token.id_token.split('.');if(parts.length!==3||token.id_token.length>15000)throw Error();claims=JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[1])).getDataAsString('UTF-8'));}catch(e){throw Error('Identitas respons Google tidak dapat dibaca.');}
  if(!['https://accounts.google.com','accounts.google.com'].includes(claims.iss)||claims.aud!==google.client_id||claims.azp&&claims.azp!==google.client_id||claims.nonce!==pending.nonce||!Number.isFinite(claims.exp)||claims.exp<=Date.now()/1000||!Number.isFinite(claims.iat)||claims.iat>Date.now()/1000+300||claims.iat<Date.now()/1000-600||!/^[A-Za-z0-9_-]{1,255}$/.test(String(claims.sub||'')))throw Error('Klaim identitas Google tidak sesuai permintaan login.');
  const profile=ambilGoogleAkses_('https://openidconnect.googleapis.com/v1/userinfo',{headers:{Authorization:'Bearer '+token.access_token},muteHttpExceptions:true,followRedirects:false,validateHttpsCertificates:true});
  if(profile.email_verified!==true||profile.sub!==claims.sub)throw Error('Email/identitas Google belum terverifikasi.');
  const current=konfigurasiGoogleAkses_();if(!current||pending.config_hash!==hashAkses_(serialAkses_([konfigurasiAkses_(),current])))throw Error('Konfigurasi berubah selama uji login. Ulangi.');
  return identitasDirektoriAkses_({email:emailAkses_(profile.email),sub:String(profile.sub),nama:teksAkses_(profile.name)||emailAkses_(profile.email)},state);
}
function keluaranHalamanAkses_(parameters){
  if(teksAkses_(parameters.page)==='uji-login')return HtmlService.createHtmlOutput(halamanUjiLoginAkses_()).setTitle('Uji Login Panitia').addMetaTag('viewport','width=device-width, initial-scale=1');
  if(/^AKS-[a-f0-9]{64}$/i.test(teksAkses_(parameters.state))&&(parameters.code||parameters.error))return HtmlService.createHtmlOutput(halamanUjiLoginAkses_({state:teksAkses_(parameters.state),code:teksAkses_(parameters.code),error:Boolean(parameters.error)})).setTitle('Hasil Uji Login Panitia').addMetaTag('viewport','width=device-width, initial-scale=1');
  return null;
}
function jsonHalamanAkses_(value){return JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');}
function gayaHalamanAkses_(){return String.raw`<style>
:root{font:14px 'Avenir Next',Avenir,'Segoe UI',Arial,sans-serif;color:#192e50;background:#f0f3f8}*{box-sizing:border-box}body{margin:0;padding:24px}h1{font-size:26px;margin:6px 0}h2{font-size:18px;margin:0 0 14px}h3{font-size:15px}p{line-height:1.65}.muted{color:#61718b}.eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#61718b;font-weight:700}.head,.actions,.sectionhead{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}.head{margin-bottom:20px}.actions{justify-content:flex-start}.card{background:white;border:1px solid #dce3ef;border-radius:22px;padding:22px;margin:18px 0;min-width:0}.notice{padding:14px 18px;border-radius:12px;background:#e8eef8;line-height:1.6}.error{background:#fff0f1;color:#922b3a}.success{background:#eaf5ee;color:#246143}.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.grid>.card{margin:0}.field{margin:14px 0}label{display:block;font-size:12px;font-weight:600;margin-bottom:7px}input,select,button{font:inherit}input,select{width:100%;min-height:44px;border:1px solid #d6dfec;background:white;color:#192e50;border-radius:11px;padding:10px 12px}input[readonly]{background:#f3f6fa}button,.button{cursor:pointer;min-height:44px;padding:11px 16px;border-radius:11px;border:1px solid #d8e0ed;background:white;color:#203960;text-decoration:none;font-weight:600;display:inline-flex;align-items:center;justify-content:center;gap:8px}.primary{background:#203960;color:white;border-color:#203960}button:disabled{opacity:.5;cursor:wait}button:focus-visible,input:focus-visible,select:focus-visible,a:focus-visible{outline:3px solid #d99616;outline-offset:2px}.scroll{max-width:100%;overflow:auto;border:1px solid #e0e6f0;border-radius:13px}table{border-collapse:collapse;width:100%;font-size:13px;text-align:left;min-width:630px}th,td{padding:13px;vertical-align:top;border-bottom:1px solid #e4eaf4;overflow-wrap:anywhere}th{background:#f4f6fa;font-size:11px;text-transform:uppercase;color:#536988}tr:last-child td{border-bottom:0}.sub{display:block;font-size:12px;color:#61718b;margin-top:5px}.tag{display:inline-block;border-radius:7px;padding:5px 8px;background:#edf2f9;font-size:12px}.tag.off{background:#fff3dc;color:#7c561c}.small{font-size:12px}.stats{display:flex;gap:14px;flex-wrap:wrap;margin:14px 0}.stats span{background:#edf2f9;border-radius:10px;padding:12px}.toolbar{display:flex;gap:12px;align-items:end;margin-bottom:14px}.toolbar>*{flex:1}.break{overflow-wrap:anywhere}.pager{display:flex;gap:12px;justify-content:space-between;align-items:center;margin:14px 0}.proof{max-width:720px;margin:5vh auto}.proof ul{padding-left:20px;line-height:1.8}code{font-size:12px;overflow-wrap:anywhere}details summary{cursor:pointer;min-height:44px;font-weight:600;padding:10px 0}[hidden]{display:none!important}@media(max-width:650px){body{padding:14px}.grid{grid-template-columns:1fr}.card{padding:18px}.toolbar,.pager{flex-direction:column;align-items:stretch}.head{align-items:flex-start}h1{font-size:23px}.proof{margin:18px auto}}
</style>`;}
function halamanUjiLoginAkses_(callback){
  const content=String.raw`<!doctype html><html lang="id"><head><base target="_top"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Uji Login Panitia</title>__STYLE__</head><body><main class="proof"><div class="eyebrow">Monitoring Pelatihan Pegawai · Persiapan akses</div><h1>Uji Identitas Google</h1><p class="muted">Gunakan akun Google panitia yang sudah didaftarkan pemilik.</p><section class="card"><p class="notice">Ini uji login dan kecocokan akun. Akses petugas pada aplikasi utama belum diaktifkan.</p><p id="message" role="status" aria-live="polite">Siapkan login, lalu lanjutkan ke Google dari tab yang sama.</p><div class="actions"><button id="prepare" class="primary" type="button">Siapkan Login Google</button><a id="googleLink" class="button primary" target="_top" rel="noreferrer" hidden>Lanjutkan ke Google</a></div><div id="identity" hidden><h2>Identitas Terverifikasi</h2><p id="name"></p><p id="email"></p><p id="role"></p><h3>Jenjang yang Ditugaskan</h3><ul id="assignments"></ul><p class="notice">Hasil ini belum membuat sesi masuk ke aplikasi utama. Tahap pembatasan setiap fitur masih menyusul.</p></div></section></main><script>
(function(){'use strict';const callback=__CALLBACK__,$=id=>document.getElementById(id);let busy=false;
function rpc(name,arg){return new Promise((ok,bad)=>google.script.run.withSuccessHandler(ok).withFailureHandler(bad)[name](arg));}
function message(text,error){$('message').textContent=text;$('message').className=error?'notice error':'';}
$('prepare').addEventListener('click',async()=>{if(busy)return;busy=true;$('prepare').disabled=true;$('googleLink').hidden=true;try{const r=await rpc('mulaiUjiLoginGoogle');sessionStorage.setItem('AKSES-GOOGLE|'+r.state,r.browser_key);$('googleLink').href=r.url;$('googleLink').hidden=false;message('Klik Lanjutkan ke Google. Setelah memilih akun, Google mengembalikan Anda ke halaman uji ini.');}catch(e){message(e.message||'Persiapan login belum berhasil.',true);}finally{busy=false;$('prepare').disabled=false;}});
async function complete(){if(!callback)return;busy=true;$('prepare').disabled=true;try{if(callback.error)throw Error('Login Google dibatalkan atau ditolak. Silakan mulai uji baru.');const key=sessionStorage.getItem('AKSES-GOOGLE|'+callback.state);if(!key)throw Error('Sesi browser login tidak ditemukan. Mulai uji dari halaman ini dan gunakan tab yang sama.');message('Memverifikasi identitas Google dan akun panitia…');const r=await rpc('verifikasiUjiLoginGoogle',{state:callback.state,code:callback.code,browser_key:key});sessionStorage.removeItem('AKSES-GOOGLE|'+callback.state);$('name').textContent=r.nama;$('email').textContent=r.email;$('role').textContent='Peran terdaftar: '+(r.peran==='admin_pelatihan'?'Admin Pelatihan':'Petugas Kelas Pelatihan');$('assignments').replaceChildren();r.jenjang.forEach(j=>{const li=document.createElement('li');li.textContent=j.nama_program+' · '+j.nama;$('assignments').append(li);});if(!r.jenjang.length){const li=document.createElement('li');li.textContent=r.peran==='admin_pelatihan'?'Admin tidak memerlukan penugasan Jenjang.':'Belum ada penugasan Jenjang aktif yang valid.';$('assignments').append(li);}$('identity').hidden=false;message(r.pesan);}catch(e){message(e.message||'Identitas belum dapat diverifikasi.',true);}finally{if(callback.state)sessionStorage.removeItem('AKSES-GOOGLE|'+callback.state);busy=false;$('prepare').disabled=false;}}
complete();}());
</script></body></html>`;
  return content.replace('__STYLE__',gayaHalamanAkses_()).replace('__CALLBACK__',()=>jsonHalamanAkses_(callback||null));
}
function halamanManajemenAkses_(){return String.raw`<!doctype html><html lang="id"><head><base target="_top"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Manajemen Akses Panitia</title>__STYLE__</head><body>
<header class="head"><div><div class="eyebrow">Persiapan akun dan penugasan</div><h1>Manajemen Akses Panitia</h1><p id="owner" class="muted"></p></div><div class="actions"><button id="reload" type="button">Muat Ulang</button><button id="close" type="button">Tutup</button></div></header>
<p class="notice">Data akun disimpan pada spreadsheet terpisah. Pendaftaran dan uji login pada tahap ini <strong>belum membuka akses petugas ke aplikasi utama</strong>.</p><p id="message" role="status" aria-live="polite">Memuat konfigurasi…</p>
<main id="app" hidden><section id="setupCard" class="card"><h2>Spreadsheet Akses Panitia</h2><p class="muted">Isi tautan/ID file akses yang dimiliki akun pemilik database. Kosongkan untuk membuat file baru. Database pelatihan tidak digunakan sebagai direktori akun.</p><form id="setupForm"><div class="field"><label for="accessSheet">Tautan atau ID spreadsheet akses</label><input id="accessSheet" autocomplete="off" placeholder="https://docs.google.com/spreadsheets/d/…"></div><button class="primary" type="submit">Siapkan / Sambungkan File Akses</button></form></section>
<section id="directory" hidden><section class="card"><div class="sectionhead"><h2>Direktori Panitia</h2><a id="bookLink" class="button" target="_blank" rel="noopener noreferrer">Buka Spreadsheet Akses</a></div><div class="stats"><span id="userCount"></span><span id="activeCount"></span><span id="assignmentCount"></span></div><p id="warning" class="muted"></p><div id="pending" class="notice error" hidden><p id="pendingText"></p><button id="recover" type="button">Periksa / Pulihkan Transaksi Akses</button></div></section>
<div class="grid"><section class="card"><h2 id="userTitle">Tambah Akun Panitia</h2><form id="userForm"><div class="field"><label for="userName">Nama panitia</label><input id="userName" required maxlength="100"></div><div class="field"><label for="userEmail">Email akun Google</label><input id="userEmail" type="email" required maxlength="254" autocomplete="off"></div><div class="field"><label for="userRole">Peran</label><select id="userRole"><option value="petugas_kelas">Petugas Kelas Pelatihan</option><option value="admin_pelatihan">Admin Pelatihan</option></select></div><div class="field"><label for="userStatus">Status akun</label><select id="userStatus"><option value="aktif">Aktif</option><option value="nonaktif">Nonaktif</option></select></div><div class="actions"><button class="primary" type="submit">Simpan Akun</button><button id="resetUser" type="button">Akun Baru</button></div><p class="muted small">Email harus sama dengan email yang ditampilkan akun Google. Tidak ada kata sandi yang disimpan di spreadsheet.</p></form></section>
<section class="card"><h2>Penugasan Petugas</h2><form id="assignmentForm"><div class="field"><label for="assignmentUser">Petugas aktif</label><select id="assignmentUser" required></select></div><div class="field"><label for="assignmentProgram">Program</label><select id="assignmentProgram" required></select></div><div class="field"><label for="assignmentJenjang">Jenjang</label><select id="assignmentJenjang" required></select></div><button class="primary" type="submit">Aktifkan Penugasan</button><p class="muted small">Satu petugas dapat ditugaskan pada beberapa Jenjang. Gunakan tombol pada daftar penugasan untuk menonaktifkan tanpa menghapus riwayat.</p></form></section></div>
<section class="card"><h2>Daftar Akun</h2><div class="field"><label for="userSearch">Cari nama atau email</label><input id="userSearch" type="search"></div><div class="scroll"><table><thead><tr><th>Panitia</th><th>Peran</th><th>Status</th><th>Google</th><th>Tindakan</th></tr></thead><tbody id="users"></tbody></table></div><div class="pager"><span id="pageInfo"></span><div class="actions"><button id="prevUsers" type="button">Sebelumnya</button><button id="nextUsers" type="button">Berikutnya</button></div></div></section>
<section class="card"><h2>Penugasan Tercatat</h2><div class="scroll"><table><thead><tr><th>Panitia</th><th>Program / Jenjang</th><th>Status</th><th>Tindakan</th></tr></thead><tbody id="assignments"></tbody></table></div><p class="muted small">Penugasan yang kehilangan referensi program/Jenjang tetap terlihat untuk diperiksa dan tidak digunakan sebagai cakupan uji identitas.</p></section>
<section class="card"><h2>Uji Login Google</h2><p class="muted">Gunakan OAuth Client bertipe Web application dari Google Cloud pada proyek pengujian. Salin Web app URL dari Deploy → Manage deployments ke kolom di bawah, lalu daftarkan URL yang sama sebagai Authorized redirect URI; untuk External dengan status Testing, tambahkan email panitia sebagai test user.</p><p id="callback" class="notice break"></p><form id="oauthForm"><div class="field"><label for="callbackUrl">URL deployment web app (/exec)</label><input id="callbackUrl" type="url" required autocomplete="off" placeholder="https://script.google.com/macros/s/…/exec"><p class="muted small">Pastikan URL ini milik proyek Apps Script salinan ini dan dapat dibuka. Gunakan URL /exec, tanpa ?page=uji-login. Deteksi otomatis dapat menunjuk deployment lain; ubah kolom ini jika berbeda.</p></div><div class="field"><label for="clientId">OAuth Client ID</label><input id="clientId" required autocomplete="off" placeholder="…apps.googleusercontent.com"></div><div class="field"><label for="clientSecret">OAuth Client Secret</label><input id="clientSecret" type="password" autocomplete="new-password" placeholder="Isi saat pertama kali atau saat mengganti Client ID"></div><div class="actions"><button type="submit">Simpan Konfigurasi Google</button><a id="loginLink" class="button primary" target="_blank" rel="noopener noreferrer" hidden>Buka Uji Login</a></div></form><p class="muted small">Client Secret hanya disimpan pada ScriptProperties server dan tidak dimuat kembali. Uji ini perlu dicoba pada Google sebelum pembatasan akses fitur diterapkan.</p></section>
<section class="card"><h2>Riwayat Perubahan Akses</h2><p class="muted small">50 baris audit terbaru. Riwayat lengkap berada pada spreadsheet akses.</p><div class="scroll"><table><thead><tr><th>Aksi / target</th><th>Pelaku</th><th>Waktu Jakarta</th><th>Status</th></tr></thead><tbody id="history"></tbody></table></div></section></section></main>
<script>
(function(){'use strict';const $=id=>document.getElementById(id);let data=null,busy=false,editing=null,payload=null,assignPayload=null,userPage=0;
const role=r=>r==='admin_pelatihan'?'Admin Pelatihan':'Petugas Kelas Pelatihan';
function rpc(name,...args){return new Promise((ok,bad)=>google.script.run.withSuccessHandler(ok).withFailureHandler(bad)[name](...args));}
function el(tag,text,klass){const e=document.createElement(tag);if(text!=null)e.textContent=String(text);if(klass)e.className=klass;return e;}
function cell(text,sub){const c=el('td',text);if(sub)c.append(el('span',sub,'sub'));return c;}
function message(text,error){$('message').textContent=text;$('message').className=error?'notice error':'';}
function options(select,label,rows){select.replaceChildren();const first=el('option',label);first.value='';select.append(first);rows.forEach(r=>{const o=el('option',r.label);o.value=r.id;select.append(o);});}
function disabled(){document.querySelectorAll('input,select,button').forEach(e=>e.disabled=busy);if(data&&data.konfigurasi)$('accessSheet').readOnly=true;if(data&&data.konfigurasi&&data.konfigurasi.status==='SIAP')$('setupCard').hidden=true;$('prevUsers').disabled=busy||userPage===0;const n=filteredUsers().length;$('nextUsers').disabled=busy||(userPage+1)*20>=n;}
function filteredUsers(){const q=$('userSearch').value.trim().toLowerCase();return (data&&data.pengguna||[]).filter(u=>(u.nama+' '+u.email).toLowerCase().includes(q));}
function renderUsers(){const list=filteredUsers();userPage=Math.min(userPage,Math.max(0,Math.ceil(list.length/20)-1));$('users').replaceChildren();list.slice(userPage*20,userPage*20+20).forEach(u=>{const tr=el('tr'),name=cell(u.nama);name.append(el('div',u.email));const action=el('td'),b=el('button','Edit');b.type='button';b.addEventListener('click',()=>{if(busy)return;editing=u;payload=null;$('userTitle').textContent='Edit Akun Panitia';$('userName').value=u.nama;$('userEmail').value=u.email;$('userRole').value=u.peran;$('userStatus').value=u.status;$('userForm').scrollIntoView({block:'start'});$('userName').focus();});action.append(b);tr.append(name,cell(role(u.peran)),cell(u.status),cell(u.google_terhubung?'Terhubung':'Belum diuji'),action);$('users').append(tr);});if(!list.length){const tr=el('tr'),c=cell('Tidak ada akun yang cocok.');c.colSpan=5;tr.append(c);$('users').append(tr);}$('pageInfo').textContent=list.length+' akun · halaman '+(userPage+1);disabled();}
function resetUser(){if(busy)return;editing=null;payload=null;$('userForm').reset();$('userTitle').textContent='Tambah Akun Panitia';}
function programs(){const m=new Map();(data.jenjang||[]).forEach(j=>m.set(j.program,j.nama_program));return [...m].map(([id,label])=>({id,label}));}
function levels(){options($('assignmentJenjang'),'Pilih Jenjang',(data.jenjang||[]).filter(j=>j.program===$('assignmentProgram').value).map(j=>({id:j.id,label:j.nama})));assignPayload=null;}
function renderDirectory(){const users=new Map(data.pengguna.map(u=>[u.id,u])),js=new Map(data.jenjang.map(j=>[j.id,j]));$('userCount').textContent=data.pengguna.length+' akun';$('activeCount').textContent=data.pengguna.filter(u=>u.status==='aktif').length+' akun aktif';$('assignmentCount').textContent=data.penugasan.filter(p=>p.status==='aktif'&&p.relasi_valid).length+' penugasan aktif valid';$('warning').textContent=data.peringatan||'';$('pending').hidden=!data.tertunda.length;$('pendingText').textContent=data.tertunda.map(t=>t.id+' · '+t.status).join('; ');options($('assignmentUser'),'Pilih petugas',data.pengguna.filter(u=>u.peran==='petugas_kelas'&&u.status==='aktif').map(u=>({id:u.id,label:u.nama+' · '+u.email})));options($('assignmentProgram'),'Pilih program',programs());levels();$('assignments').replaceChildren();data.penugasan.forEach(p=>{const u=users.get(p.pengguna),j=js.get(p.jenjang),tr=el('tr'),action=el('td'),b=el('button',p.status==='aktif'?'Nonaktifkan':'Aktifkan');b.type='button';b.addEventListener('click',()=>saveAssignment({pengguna:p.pengguna,program:p.program,jenjang:p.jenjang,status:p.status==='aktif'?'nonaktif':'aktif',versi:p.versi,id_permintaan:crypto.randomUUID()}));action.append(b);tr.append(cell(u?u.nama:p.pengguna),cell(j?j.nama_program+' · '+j.nama:p.program+' · '+p.jenjang+' (referensi tidak tersedia)'),cell(p.status),action);$('assignments').append(tr);});$('history').replaceChildren();data.riwayat.forEach(h=>{const tr=el('tr');tr.append(cell(h.aksi+' · '+h.target),cell(h.oleh),cell(new Date(h.waktu).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'})),cell(h.status));$('history').append(tr);});renderUsers();}
async function load(){if(busy)return;busy=true;disabled();$('app').hidden=true;message('Memeriksa konfigurasi dan direktori akses…');try{data=await rpc('muatManajemenAksesPanitia');if(!data||!data.sukses)throw Error('Direktori belum tersedia.');$('owner').textContent='Pengelola: '+data.pemilik;$('setupCard').hidden=Boolean(data.konfigurasi&&data.konfigurasi.status==='SIAP');$('accessSheet').value=data.konfigurasi?data.konfigurasi.id:'';$('directory').hidden=!data.konfigurasi||data.konfigurasi.status!=='SIAP';if(!$('directory').hidden){$('bookLink').href=data.konfigurasi.url;$('clientId').value=data.login.client_id;$('clientSecret').value='';$('callbackUrl').value=data.login.callback||'';$('callback').textContent=data.login.callback||'URL /exec belum tersedia. Buat deployment web app salinan untuk uji login.';$('loginLink').hidden=!data.login.siap||!data.login.callback;if(data.login.callback)$('loginLink').href=data.login.callback+'?page=uji-login';renderDirectory();}$('app').hidden=false;message(data.konfigurasi?'Direktori akses dimuat. Akses petugas pada aplikasi utama masih belum diaktifkan.':'Siapkan file spreadsheet akses terpisah untuk mulai mendata panitia.');return true;}catch(e){message(e.message||'Direktori gagal dimuat.',true);return false;}finally{busy=false;disabled();}}
async function run(name,arg,onSuccess){if(busy)return;busy=true;disabled();message('Memproses perubahan…');try{const r=await rpc(name,arg);busy=false;if(onSuccess)onSuccess();const loaded=await load();if(loaded)message(r.pesan);}catch(e){message(e.message||'Perubahan belum terkonfirmasi. Muat ulang atau periksa transaksi akses.',true);}finally{busy=false;disabled();}}
$('setupForm').addEventListener('submit',e=>{e.preventDefault();if(!confirm('Siapkan spreadsheet akses panitia terpisah dengan akun pemilik ini?'))return;run('siapkanManajemenAksesPanitia',{spreadsheet:$('accessSheet').value,konfirmasi:true});});
$('userForm').addEventListener('input',()=>{if(!busy)payload=null;});$('userForm').addEventListener('submit',e=>{e.preventDefault();payload=payload||{id:editing?editing.id:'',versi:editing?editing.versi:'',nama:$('userName').value,email:$('userEmail').value,peran:$('userRole').value,status:$('userStatus').value,id_permintaan:crypto.randomUUID()};run('simpanPenggunaPanitia',payload,resetUser);});
function saveAssignment(p){run('simpanPenugasanPanitia',p,()=>{assignPayload=null;});}
$('assignmentForm').addEventListener('change',()=>{if(!busy)assignPayload=null;});$('assignmentProgram').addEventListener('change',levels);$('assignmentForm').addEventListener('submit',e=>{e.preventDefault();const old=data.penugasan.find(p=>p.pengguna===$('assignmentUser').value&&p.jenjang===$('assignmentJenjang').value);assignPayload=assignPayload||{pengguna:$('assignmentUser').value,program:$('assignmentProgram').value,jenjang:$('assignmentJenjang').value,status:'aktif',versi:old?old.versi:'',id_permintaan:crypto.randomUUID()};saveAssignment(assignPayload);});
$('oauthForm').addEventListener('input',()=>{$('loginLink').hidden=true;});
$('oauthForm').addEventListener('submit',e=>{e.preventDefault();run('simpanKonfigurasiLoginGoogle',{client_id:$('clientId').value,client_secret:$('clientSecret').value,callback:$('callbackUrl').value},()=>{$('clientSecret').value='';});});
$('recover').addEventListener('click',()=>run('pulihkanTransaksiAksesPanitia'));$('resetUser').addEventListener('click',resetUser);$('userSearch').addEventListener('input',()=>{userPage=0;renderUsers();});$('prevUsers').addEventListener('click',()=>{userPage--;renderUsers();});$('nextUsers').addEventListener('click',()=>{userPage++;renderUsers();});$('reload').addEventListener('click',load);$('close').addEventListener('click',()=>{if(!busy)google.script.host.close();});load();
}());
</script></body></html>`.replace('__STYLE__',gayaHalamanAkses_());}
function perubahanAkses_(book,kind,payload,request,actor,builder){
  if(!/^[A-Za-z0-9_-]{16,100}$/.test(teksAkses_(request)))throw Error('ID permintaan akses tidak valid.');
  const tx='AKS-'+kind+'|'+request,signature=hashAkses_(JSON.stringify(payload)),groups=kelompokTransaksiAkses_(book),old=groups.get(tx);
  if(old){let plan;try{plan=JSON.parse(old.sesudah);}catch(e){throw Error('Rencana audit akses rusak.');}if(plan.signature!==signature)throw Error('ID permintaan dipakai untuk perubahan akses berbeda.');if(teksAkses_(old.status_transaksi).toUpperCase()==='SELESAI')return {sukses:true,id:plan.id,pesan:'Permintaan ini sudah tersimpan.'};return terapkanRencanaAkses_(book,plan,actor);}
  if(Array.from(groups.values()).some(r=>teksAkses_(r.status_transaksi).toUpperCase()!=='SELESAI'))throw Error('Ada perubahan akses belum selesai. Gunakan Periksa / Pulihkan Transaksi Akses.');
  if(tabelAkses_(book,'Riwayat_Akses').records.length>9997)throw Error('Riwayat akses mendekati batas 10.000 baris. Siapkan pengarsipan terverifikasi sebelum perubahan baru.');
  const plan=JSON.parse(JSON.stringify(Object.assign(builder(),{tx,signature})));
  if(JSON.stringify(plan).length>40000)throw Error('Rencana akses terlalu panjang.');
  auditAkses_(book,plan,'PENDING',actor);
  try{return terapkanRencanaAkses_(book,plan,actor);}catch(e){try{auditAkses_(book,plan,'PERLU_PEMULIHAN',actor);}catch(ignored){}throw Error('Perubahan akses belum selesai. Gunakan Periksa / Pulihkan Transaksi Akses; jangan membuat pengguna baru lagi.');}
}
function siapkanManajemenAksesPanitia(d){
  const actor=pemilikAkses_();d=d||{};if(d.konfirmasi!==true)throw Error('Konfirmasi file akses terpisah terlebih dahulu.');
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    let cfg=konfigurasiAkses_(),id=d.spreadsheet? idSpreadsheetAkses_(d.spreadsheet):cfg&&cfg.id,book;
    if(cfg&&id&&id!==cfg.id)throw Error('File akses sudah dikonfigurasi. Pergantian file tidak dilakukan melalui persiapan ulang.');
    if(id)book=SpreadsheetApp.openById(id);else {book=SpreadsheetApp.create('Manajemen Akses Panitia');id=book.getId();}
    const owner=book.getOwner();if(!owner||emailAkses_(owner.getEmail())!==actor)throw Error('Gunakan spreadsheet akses yang dimiliki akun pemilik database.');
    if(['Program','Sesi','Keikutsertaan'].every(name=>book.getSheetByName(name)))throw Error('File yang dipilih merupakan database pelatihan. Gunakan file terpisah khusus akses panitia.');
    // Validate all existing populated tabs before adding any missing headers.
    const schema=skemaDirektoriAkses_();Object.keys(schema).forEach(name=>{const s=book.getSheetByName(name);if(s){const v=s.getDataRange().getValues(),f=s.getDataRange().getFormulas();if(v.some(r=>r.some(x=>x!==''&&x!=null))||f.some(r=>r.some(Boolean)))tabelAkses_(book,name);}});
    PropertiesService.getScriptProperties().setProperty('AKSES_DATABASE_ID',databaseAkses_().getId());
    if(!cfg){cfg={schema:1,id,status:'MENYIAPKAN'};simpanKonfigurasiAkses_(cfg);}
    Object.keys(schema).forEach(name=>{const sheet=book.getSheetByName(name)||book.insertSheet(name),values=sheet.getDataRange().getValues();if(!values.some(r=>r.some(v=>v!==''&&v!=null)))sheet.getRange(1,1,1,schema[name].length).setValues([schema[name]]);});
    const dir=direktoriAkses_(book),root=dir.pengguna.records.find(r=>emailAkses_(r.data.email_google)===actor);
    if(root&&(root.data.peran!=='admin_pelatihan'||root.data.status!=='aktif'))throw Error('Akun pemilik yang sudah tercatat harus Admin Pelatihan aktif. Periksa direktori akses.');
    if(!root)perubahanAkses_(book,'BOOTSTRAP',{email:actor},'bootstrap_owner_access_0001',actor,()=>{const now=new Date(),id='USR-'+Utilities.getUuid();return {sheet:'Pengguna',id,action:'admin_awal',before:null,after:{id_pengguna:id,nama:'Admin Pelatihan',email_google:actor,google_sub:'',peran:'admin_pelatihan',status:'aktif',created_at:now,updated_at:now}};});
    cfg.status='SIAP';simpanKonfigurasiAkses_(cfg);
    return {sukses:true,pesan:'Spreadsheet akses siap. Pendaftaran ini belum mengaktifkan akses petugas pada aplikasi utama.',url:'https://docs.google.com/spreadsheets/d/'+id+'/edit'};
  }finally{lock.releaseLock();}
}
function daftarJenjangAkses_(){
  const main=databaseAkses_(),sheet=main.getSheetByName('Jenjang');if(!sheet)return [];
  const raw=PropertiesService.getScriptProperties().getProperty('MIGRASI_JENJANG|'+main.getId()),state=raw?JSON.parse(raw):null;
  if(!state||state.status!=='SELESAI'||state.schema!==1)throw Error('Struktur Jenjang belum selesai/terverifikasi.');
  function read(name,required){const s=main.getSheetByName(name);if(!s)throw Error('Sumber '+name+' tidak tersedia.');const v=s.getDataRange().getValues(),h=v[0].map(teksAkses_);if(new Set(h.filter(Boolean)).size!==h.filter(Boolean).length||required.some(k=>!h.includes(k)))throw Error('Header sumber Jenjang tidak sesuai.');const seen=new Set();return v.slice(1).filter(row=>row.some(x=>x!==''&&x!=null)).map(row=>{const r=Object.fromEntries(h.map((key,i)=>[key,row[i]])),id=teksAkses_(r[required[0]]);if(!id||seen.has(id))throw Error('ID sumber Jenjang kosong/duplikat.');seen.add(id);return r;});}
  const programs=new Map(read('Program',['id_program','nama_program']).map(p=>[teksAkses_(p.id_program),teksAkses_(p.nama_program)]));
  return read('Jenjang',['id_jenjang','id_program','nama_jenjang']).filter(j=>programs.has(teksAkses_(j.id_program))).map(j=>({id:teksAkses_(j.id_jenjang),program:teksAkses_(j.id_program),nama:teksAkses_(j.nama_jenjang),nama_program:programs.get(teksAkses_(j.id_program))}));
}
function muatManajemenAksesPanitia(){
  const actor=pemilikAkses_(),cfg=konfigurasiAkses_(),oauth=konfigurasiGoogleAkses_();
  const base={sukses:true,pemilik:actor,konfigurasi:cfg?{id:cfg.id,status:cfg.status,url:'https://docs.google.com/spreadsheets/d/'+cfg.id+'/edit'}:null,login:{siap:Boolean(oauth),client_id:oauth?oauth.client_id:'',callback:callbackGoogleAkses_(),catatan:'Uji identitas saja. Pembatasan petugas pada aplikasi utama belum diaktifkan.'}};
  if(!cfg||cfg.status!=='SIAP')return base;
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    const book=bukuAkses_(),dir=direktoriAkses_(book),groups=kelompokTransaksiAkses_(book);let levels=[],warning='';try{levels=daftarJenjangAkses_();}catch(e){warning='Daftar Jenjang belum tersedia. Pastikan persiapan struktur selesai.';}
    const valid=new Set(levels.map(j=>j.id+'|'+j.program));
    return Object.assign(base,{pengguna:dir.pengguna.records.map(r=>{const d=r.data;return {id:d.id_pengguna,nama:d.nama,email:d.email_google,peran:d.peran,status:d.status,google_terhubung:Boolean(d.google_sub),versi:hashAkses_(JSON.stringify(d))};}),
      penugasan:dir.penugasan.records.map(r=>{const d=r.data;return {id:d.id_penugasan,pengguna:d.id_pengguna,program:d.id_program,jenjang:d.id_jenjang,status:d.status,relasi_valid:valid.has(d.id_jenjang+'|'+d.id_program),versi:hashAkses_(JSON.stringify(d))};}),jenjang:levels,peringatan:warning,
      tertunda:Array.from(groups.values()).filter(r=>teksAkses_(r.status_transaksi).toUpperCase()!=='SELESAI').map(r=>({id:r.id_permintaan,jenis:r.jenis_data,target:r.id_target,status:r.status_transaksi})),
      riwayat:dir.history.records.slice(-50).reverse().map(r=>{const d=r.data;return {aksi:d.aksi,target:d.id_target,oleh:d.oleh,waktu:d.waktu instanceof Date?d.waktu.toISOString():String(d.waktu),status:d.status_transaksi};})});
  }finally{lock.releaseLock();}
}
function simpanPenggunaPanitia(d){
  const actor=pemilikAkses_();d=d||{};const input={id:teksAkses_(d.id),nama:teksAkses_(d.nama),email:emailAkses_(d.email),peran:teksAkses_(d.peran),status:teksAkses_(d.status),versi:teksAkses_(d.versi)};
  if(!input.nama||input.nama.length>100||input.nama.startsWith('=')||!['admin_pelatihan','petugas_kelas'].includes(input.peran)||!['aktif','nonaktif'].includes(input.status))throw Error('Nama, peran atau status pengguna tidak valid.');
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try{const book=bukuAkses_();return perubahanAkses_(book,'PENGGUNA',input,d.id_permintaan,actor,()=>{
    const dir=direktoriAkses_(book),old=dir.pengguna.records.find(r=>r.data.id_pengguna===input.id),before=old?old.data:null;
    if(input.id&&(!old||hashAkses_(JSON.stringify(before))!==input.versi))throw Error('Pengguna berubah sejak dimuat. Muat ulang terlebih dahulu.');
    if(!old&&dir.pengguna.records.length>=1000)throw Error('Batas 1.000 pengguna tercapai.');
    if(dir.pengguna.records.some(r=>r.data.id_pengguna!==input.id&&emailAkses_(r.data.email_google)===input.email))throw Error('Email sudah terdaftar.');
    if(before&&emailAkses_(before.email_google)===actor&&(input.email!==actor||input.peran!=='admin_pelatihan'||input.status!=='aktif'))throw Error('Admin pemilik tetap aktif dan tidak dapat diganti email/perannya.');
    if(before&&before.google_sub&&input.email!==emailAkses_(before.email_google))throw Error('Email akun yang sudah terhubung Google tidak diganti. Buat akun baru dan nonaktifkan akun lama.');
    const now=new Date(),id=input.id||'USR-'+Utilities.getUuid();return {sheet:'Pengguna',id,action:before?'ubah_pengguna':'tambah_pengguna',before,after:{id_pengguna:id,nama:input.nama,email_google:input.email,google_sub:before?before.google_sub:'',peran:input.peran,status:input.status,created_at:before?before.created_at:now,updated_at:now}};
  });}finally{lock.releaseLock();}
}
function simpanPenugasanPanitia(d){
  const actor=pemilikAkses_();d=d||{};const input={pengguna:teksAkses_(d.pengguna),program:teksAkses_(d.program),jenjang:teksAkses_(d.jenjang),status:teksAkses_(d.status),versi:teksAkses_(d.versi)};
  if(!['aktif','nonaktif'].includes(input.status))throw Error('Status penugasan tidak valid.');
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try{const book=bukuAkses_();return perubahanAkses_(book,'PENUGASAN',input,d.id_permintaan,actor,()=>{
    const dir=direktoriAkses_(book),user=dir.pengguna.records.find(r=>r.data.id_pengguna===input.pengguna);if(!user)throw Error('Pengguna tidak ditemukan.');
    const old=dir.penugasan.records.find(r=>r.data.id_pengguna===input.pengguna&&r.data.id_jenjang===input.jenjang),before=old?old.data:null;
    if(!before&&dir.penugasan.records.length>=5000)throw Error('Batas 5.000 penugasan tercapai.');
    if(before&&hashAkses_(JSON.stringify(before))!==input.versi)throw Error('Penugasan berubah sejak dimuat. Muat ulang.');
    if(input.status==='aktif'){
      if(user.data.peran!=='petugas_kelas'||user.data.status!=='aktif')throw Error('Penugasan aktif hanya untuk Petugas Kelas aktif.');
      if(!daftarJenjangAkses_().some(j=>j.id===input.jenjang&&j.program===input.program))throw Error('Jenjang tidak ditemukan pada program yang dipilih.');
    }else if(!before)throw Error('Penugasan yang akan dinonaktifkan tidak ditemukan.');
    const id=before?before.id_penugasan:'TGS-'+Utilities.getUuid(),now=new Date();return {sheet:'Penugasan_Jenjang',id,action:'ubah_penugasan',before,after:{id_penugasan:id,id_pengguna:input.pengguna,id_program:before?before.id_program:input.program,id_jenjang:input.jenjang,status:input.status,created_at:before?before.created_at:now,updated_at:now}};
  });}finally{lock.releaseLock();}
}
function pulihkanTransaksiAksesPanitia(){
  const actor=pemilikAkses_(),lock=LockService.getScriptLock();lock.waitLock(30000);
  try{const book=bukuAkses_(true),groups=kelompokTransaksiAkses_(book);let n=0;for(const r of groups.values()){if(teksAkses_(r.status_transaksi).toUpperCase()==='SELESAI')continue;const plan=JSON.parse(r.sesudah);terapkanRencanaAkses_(book,plan,actor);n++;}return {sukses:true,pesan:n+' transaksi akses diperiksa/diselesaikan.'};}finally{lock.releaseLock();}
}
