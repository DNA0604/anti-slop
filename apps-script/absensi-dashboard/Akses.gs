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
function pemilikAkses_(){if(konteksSesiPanitia_){if(konteksSesiPanitia_.peran!=='admin_pelatihan')throw Error('Hanya Admin Pelatihan yang dapat mengelola akses.');return konteksSesiPanitia_.email;}return wajibPemilikAsliAkses_();}
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
function mulaiUjiLoginGoogle(){return mulaiAlurGoogleAkses_('uji_identitas');}
function mulaiLoginAplikasiPanitia(){if(!aplikasiPanitiaAktif_())throw Error('Login aplikasi belum aktif.');return mulaiAlurGoogleAkses_('aplikasi');}
function mulaiAlurGoogleAkses_(tujuan){
  const cfg=konfigurasiAkses_(),google=konfigurasiGoogleAkses_();if(!cfg||cfg.status!=='SIAP'||!google||google.callback!==callbackGoogleAkses_())throw Error('Uji login belum disiapkan oleh pemilik.');
  const state='AKS-'+acakLoginAkses_(),browser=acakLoginAkses_(),verifier=acakLoginAkses_(),nonce=acakLoginAkses_();
  const challenge=Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,verifier,Utilities.Charset.UTF_8)).replace(/=+$/,'');
  const record={tujuan,secret_hash:hashAkses_(browser),verifier,nonce,expires:Date.now()+300000,config_hash:hashAkses_(serialAkses_([cfg,google,tujuan==='aplikasi'?modeAplikasiPanitia_():null]))};
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
    return {sukses:true,tujuan:'uji_identitas',email:identity.email,nama:identity.nama,peran:d.peran,jenjang:scopes,pembatasan_aplikasi_aktif:false,pesan:'Identitas Google dan akun panitia cocok. Ini hasil uji identitas; belum membuat sesi aplikasi.'};
  }finally{lock.releaseLock();}
}
function verifikasiUjiLoginGoogle(d){return tukarLoginGoogleAkses_(d,'uji_identitas');}
function selesaikanCallbackLoginPanitia(d){if(!/^AKS-[a-f0-9]{64}$/i.test(teksAkses_(d&&d.state)))throw Error('Permintaan login tidak valid.');const raw=cacheLoginAkses_().get('GOOGLE-AKSES|'+teksAkses_(d&&d.state));if(!raw)throw Error('Sesi uji kedaluwarsa/sudah dipakai. Mulai login baru.');const tujuan=JSON.parse(raw).tujuan||'uji_identitas';return tukarLoginGoogleAkses_(d,tujuan);}
function tukarLoginGoogleAkses_(d,tujuan){
  d=d||{};const state=teksAkses_(d.state),key=teksAkses_(d.browser_key),code=teksAkses_(d.code);
  if(!/^AKS-[a-f0-9]{64}$/i.test(state)||!/^[a-f0-9]{64}$/i.test(key)||!code||code.length>4096||/[\r\n]/.test(code))throw Error('Permintaan uji login tidak valid.');
  const lock=LockService.getScriptLock();lock.waitLock(10000);let pending,google;
  try{
    const cache=cacheLoginAkses_(),raw=cache.get('GOOGLE-AKSES|'+state);if(!raw)throw Error('Sesi uji kedaluwarsa/sudah dipakai. Mulai login baru dari tab yang sama.');pending=JSON.parse(raw);if((pending.tujuan||'uji_identitas')!==tujuan||!['aplikasi','uji_identitas'].includes(tujuan))throw Error('Tujuan login tidak sesuai.');if(tujuan==='aplikasi'&&!aplikasiPanitiaAktif_())throw Error('Login aplikasi belum aktif.');
    if(pending.expires<Date.now()||pending.secret_hash!==hashAkses_(key))throw Error('Sesi browser login tidak cocok. Mulai login baru dari tab yang sama.');
    google=konfigurasiGoogleAkses_();if(!google||pending.config_hash!==hashAkses_(serialAkses_([konfigurasiAkses_(),google,tujuan==='aplikasi'?modeAplikasiPanitia_():null]))||google.callback!==callbackGoogleAkses_())throw Error('Konfigurasi akses berubah. Mulai uji login baru.');
    cache.remove('GOOGLE-AKSES|'+state);
  }finally{lock.releaseLock();}
  const token=ambilGoogleAkses_('https://oauth2.googleapis.com/token',{method:'post',contentType:'application/x-www-form-urlencoded',payload:{client_id:google.client_id,client_secret:google.client_secret,code,code_verifier:pending.verifier,redirect_uri:google.callback,grant_type:'authorization_code'},muteHttpExceptions:true,followRedirects:false,validateHttpsCertificates:true});
  if(!token.access_token||typeof token.access_token!=='string'||/[\r\n]/.test(token.access_token)||String(token.token_type).toLowerCase()!=='bearer'||typeof token.id_token!=='string')throw Error('Token Google tidak lengkap.');
  // ID token is obtained only from the fixed Google TLS token endpoint, never from the browser.
  let claims;try{const parts=token.id_token.split('.');if(parts.length!==3||token.id_token.length>15000)throw Error();claims=JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[1])).getDataAsString('UTF-8'));}catch(e){throw Error('Identitas respons Google tidak dapat dibaca.');}
  if(!['https://accounts.google.com','accounts.google.com'].includes(claims.iss)||claims.aud!==google.client_id||claims.azp&&claims.azp!==google.client_id||claims.nonce!==pending.nonce||!Number.isFinite(claims.exp)||claims.exp<=Date.now()/1000||!Number.isFinite(claims.iat)||claims.iat>Date.now()/1000+300||claims.iat<Date.now()/1000-600||!/^[A-Za-z0-9_-]{1,255}$/.test(String(claims.sub||'')))throw Error('Klaim identitas Google tidak sesuai permintaan login.');
  const profile=ambilGoogleAkses_('https://openidconnect.googleapis.com/v1/userinfo',{headers:{Authorization:'Bearer '+token.access_token},muteHttpExceptions:true,followRedirects:false,validateHttpsCertificates:true});
  if(profile.email_verified!==true||profile.sub!==claims.sub)throw Error('Email/identitas Google belum terverifikasi.');
  const current=konfigurasiGoogleAkses_();if(!current||pending.config_hash!==hashAkses_(serialAkses_([konfigurasiAkses_(),current,tujuan==='aplikasi'?modeAplikasiPanitia_():null])))throw Error('Konfigurasi berubah selama uji login. Ulangi.');
  const identity=identitasDirektoriAkses_({email:emailAkses_(profile.email),sub:String(profile.sub),nama:teksAkses_(profile.name)||emailAkses_(profile.email)},state);return tujuan==='aplikasi'?simpanSesiPanitia_(identity):identity;
}
function keluaranHalamanAkses_(parameters){
  if(teksAkses_(parameters.page)==='masuk'){if(!aplikasiPanitiaAktif_())throw Error('Login aplikasi belum diaktifkan pemilik.');return HtmlService.createHtmlOutput(halamanUjiLoginAkses_(null,true)).setTitle('Masuk Monitoring Pelatihan').addMetaTag('viewport','width=device-width, initial-scale=1');}
  if(teksAkses_(parameters.page)==='uji-login')return HtmlService.createHtmlOutput(halamanUjiLoginAkses_()).setTitle('Uji Login Panitia').addMetaTag('viewport','width=device-width, initial-scale=1');
  if(/^AKS-[a-f0-9]{64}$/i.test(teksAkses_(parameters.state))&&(parameters.code||parameters.error))return HtmlService.createHtmlOutput(halamanUjiLoginAkses_({state:teksAkses_(parameters.state),code:teksAkses_(parameters.code),error:Boolean(parameters.error)},tujuanCallbackAkses_(parameters.state)==='aplikasi')).setTitle('Hasil Uji Login Panitia').addMetaTag('viewport','width=device-width, initial-scale=1');
  return null;
}
function jsonHalamanAkses_(value){return JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');}
function gayaHalamanAkses_(){return String.raw`<style>
:root{font:14px 'Avenir Next',Avenir,'Segoe UI',Arial,sans-serif;color:#192e50;background:#f0f3f8}*{box-sizing:border-box}body{margin:0;padding:24px}h1{font-size:26px;margin:6px 0}h2{font-size:18px;margin:0 0 14px}h3{font-size:15px}p{line-height:1.65}.muted{color:#61718b}.eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#61718b;font-weight:700}.head,.actions,.sectionhead{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}.head{margin-bottom:20px}.actions{justify-content:flex-start}.card{background:white;border:1px solid #dce3ef;border-radius:22px;padding:22px;margin:18px 0;min-width:0}.notice{padding:14px 18px;border-radius:12px;background:#e8eef8;line-height:1.6}.error{background:#fff0f1;color:#922b3a}.success{background:#eaf5ee;color:#246143}.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.grid>.card{margin:0}.field{margin:14px 0}label{display:block;font-size:12px;font-weight:600;margin-bottom:7px}input,select,button{font:inherit}input,select{width:100%;min-height:44px;border:1px solid #d6dfec;background:white;color:#192e50;border-radius:11px;padding:10px 12px}input[readonly]{background:#f3f6fa}button,.button{cursor:pointer;min-height:44px;padding:11px 16px;border-radius:11px;border:1px solid #d8e0ed;background:white;color:#203960;text-decoration:none;font-weight:600;display:inline-flex;align-items:center;justify-content:center;gap:8px}.primary{background:#203960;color:white;border-color:#203960}button:disabled{opacity:.5;cursor:wait}button:focus-visible,input:focus-visible,select:focus-visible,a:focus-visible{outline:3px solid #d99616;outline-offset:2px}.scroll{max-width:100%;overflow:auto;border:1px solid #e0e6f0;border-radius:13px}table{border-collapse:collapse;width:100%;font-size:13px;text-align:left;min-width:630px}th,td{padding:13px;vertical-align:top;border-bottom:1px solid #e4eaf4;overflow-wrap:anywhere}th{background:#f4f6fa;font-size:11px;text-transform:uppercase;color:#536988}tr:last-child td{border-bottom:0}.sub{display:block;font-size:12px;color:#61718b;margin-top:5px}.tag{display:inline-block;border-radius:7px;padding:5px 8px;background:#edf2f9;font-size:12px}.tag.off{background:#fff3dc;color:#7c561c}.small{font-size:12px}.stats{display:flex;gap:14px;flex-wrap:wrap;margin:14px 0}.stats span{background:#edf2f9;border-radius:10px;padding:12px}.toolbar{display:flex;gap:12px;align-items:end;margin-bottom:14px}.toolbar>*{flex:1}.break{overflow-wrap:anywhere}.pager{display:flex;gap:12px;justify-content:space-between;align-items:center;margin:14px 0}.proof{max-width:720px;margin:5vh auto}.proof ul{padding-left:20px;line-height:1.8}code{font-size:12px;overflow-wrap:anywhere}details summary{cursor:pointer;min-height:44px;font-weight:600;padding:10px 0}[hidden]{display:none!important}@media(max-width:650px){body{padding:14px}.grid{grid-template-columns:1fr}.card{padding:18px}.toolbar,.pager{flex-direction:column;align-items:stretch}.head{align-items:flex-start}h1{font-size:23px}.proof{margin:18px auto}}
</style>`;}
function halamanUjiLoginAkses_(callback,aplikasi){
 const cfg={callback:callback||null,aplikasi:!!aplikasi};
 const html=String.raw`<!doctype html><html lang="id"><head><base target="_top"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Masuk Panitia</title>__STYLE__</head><body><main class="proof"><div class="eyebrow">Monitoring Pelatihan Pegawai</div><h1 id="title">Uji Identitas Google</h1><p class="muted" id="intro">Gunakan akun Google panitia yang sudah didaftarkan pemilik.</p><section class="card"><p class="notice" id="purpose">Ini uji identitas dan kecocokan akun. Hasil uji tidak membuat sesi aplikasi atau memberikan hak tambahan.</p><p id="message" role="status" aria-live="polite">Siapkan login, lalu lanjutkan ke Google dari tab yang sama.</p><div class="actions"><button id="prepare" class="primary" type="button">Siapkan Login Google</button><a id="googleLink" class="button primary" target="_top" rel="noreferrer" hidden>Lanjutkan ke Google</a><a id="appLink" class="button primary" target="_top" rel="noreferrer" hidden>Buka Aplikasi</a></div><div id="identity" hidden><h2>Identitas Terverifikasi</h2><p id="name"></p><p id="email"></p><p id="role"></p><h3>Jenjang yang Ditugaskan</h3><ul id="assignments"></ul><p class="notice" id="identityNotice">Hasil uji ini belum membuat sesi masuk ke aplikasi utama.</p></div></section></main><script>
(function(){'use strict';const cfg=__CONFIG__,callback=cfg.callback,$=id=>document.getElementById(id);let busy=false;
function rpc(name,arg){return new Promise((ok,bad)=>google.script.run.withSuccessHandler(ok).withFailureHandler(bad)[name](arg));}
function message(text,error){$('message').textContent=text;$('message').className=error?'notice error':'';}
function appMode(){cfg.aplikasi=true;$('title').textContent='Masuk Monitoring Pelatihan';$('purpose').textContent='Masuk dengan akun Google panitia. Fitur dan data tersedia sesuai peran dan penugasan Jenjang Anda.';}
if(cfg.aplikasi)appMode();
$('prepare').addEventListener('click',async()=>{if(busy)return;busy=true;$('prepare').disabled=true;$('googleLink').hidden=true;$('appLink').hidden=true;$('identity').hidden=true;try{const r=await rpc(cfg.aplikasi?'mulaiLoginAplikasiPanitia':'mulaiUjiLoginGoogle');sessionStorage.setItem('AKSES-GOOGLE|'+r.state,r.browser_key);$('googleLink').href=r.url;$('googleLink').hidden=false;message('Klik Lanjutkan ke Google. Setelah memilih akun, Google mengembalikan Anda ke halaman ini.');}catch(e){message(e.message||'Persiapan login belum berhasil.',true);}finally{busy=false;$('prepare').disabled=false;}});
async function complete(){if(!callback)return;busy=true;$('prepare').disabled=true;try{
 if(callback.error)throw Error('Login Google dibatalkan atau ditolak. Silakan mulai login baru.');
 const key=sessionStorage.getItem('AKSES-GOOGLE|'+callback.state);if(!key)throw Error('Sesi browser login tidak ditemukan. Mulai uji dari halaman ini dan gunakan tab yang sama.');
 message('Memverifikasi identitas Google dan akun panitia…');const r=await rpc('selesaikanCallbackLoginPanitia',{state:callback.state,code:callback.code,browser_key:key});
 sessionStorage.removeItem('AKSES-GOOGLE|'+callback.state);$('name').textContent=r.nama;$('email').textContent=r.email;$('role').textContent='Peran terdaftar: '+(r.peran==='admin_pelatihan'?'Admin Pelatihan':'Petugas Kelas Pelatihan');$('assignments').replaceChildren();
 r.jenjang.forEach(j=>{const li=document.createElement('li');li.textContent=j.nama_program+' · '+j.nama;$('assignments').append(li);});
 if(!r.jenjang.length){const li=document.createElement('li');li.textContent=r.peran==='admin_pelatihan'?'Admin tidak memerlukan penugasan Jenjang.':'Belum ada penugasan Jenjang aktif yang valid.';$('assignments').append(li);}
 if(r.tujuan==='aplikasi'){
  appMode();sessionStorage.setItem(r.storage_key,r.token);$('appLink').href=r.url;$('appLink').hidden=false;$('identityNotice').textContent='Sesi berlaku maksimal 4 jam dan berakhir setelah 30 menit tanpa aktivitas. Keluar melalui tombol Log Out setelah selesai.';
 }
 $('identity').hidden=false;message(r.pesan);
}catch(e){message(e.message||'Identitas belum dapat diverifikasi.',true);}finally{try{if(callback.state)sessionStorage.removeItem('AKSES-GOOGLE|'+callback.state);}catch(ignored){}busy=false;$('prepare').disabled=false;}}
complete();}());
</script></body></html>`;
 return html.replace('__STYLE__',gayaHalamanAkses_()).replace('__CONFIG__',()=>jsonHalamanAkses_(cfg));
}
function halamanManajemenAkses_(){return String.raw`<!doctype html><html lang="id"><head><base target="_top"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Manajemen Akses Panitia</title>__STYLE__</head><body>
<header class="head"><div><div class="eyebrow">Persiapan akun dan penugasan</div><h1>Manajemen Akses Panitia</h1><p id="owner" class="muted"></p></div><div class="actions"><button id="reload" type="button">Muat Ulang</button><button id="close" type="button">Tutup</button></div></header>
<p class="notice">Data akun disimpan pada spreadsheet terpisah. Pendataan akun dan uji identitas <strong>tidak otomatis membuat sesi aplikasi</strong>. Akses operasional mengikuti aktivasi login, peran dan penugasan Jenjang.</p><p id="message" role="status" aria-live="polite">Memuat konfigurasi…</p>
<main id="app" hidden><section id="setupCard" class="card"><h2>Spreadsheet Akses Panitia</h2><p class="muted">Isi tautan/ID file akses yang dimiliki akun pemilik database. Kosongkan untuk membuat file baru. Database pelatihan tidak digunakan sebagai direktori akun.</p><form id="setupForm"><div class="field"><label for="accessSheet">Tautan atau ID spreadsheet akses</label><input id="accessSheet" autocomplete="off" placeholder="https://docs.google.com/spreadsheets/d/…"></div><button class="primary" type="submit">Siapkan / Sambungkan File Akses</button></form></section>
<section id="directory" hidden><section class="card"><div class="sectionhead"><h2>Direktori Panitia</h2><a id="bookLink" class="button" target="_blank" rel="noopener noreferrer">Buka Spreadsheet Akses</a></div><div class="stats"><span id="userCount"></span><span id="activeCount"></span><span id="assignmentCount"></span></div><p id="warning" class="muted"></p><div id="pending" class="notice error" hidden><p id="pendingText"></p><button id="recover" type="button">Periksa / Pulihkan Transaksi Akses</button></div></section>
<div class="grid"><section class="card"><h2 id="userTitle">Tambah Akun Panitia</h2><form id="userForm"><div class="field"><label for="userName">Nama panitia</label><input id="userName" required maxlength="100"></div><div class="field"><label for="userEmail">Email akun Google</label><input id="userEmail" type="email" required maxlength="254" autocomplete="off"></div><div class="field"><label for="userRole">Peran</label><select id="userRole"><option value="petugas_kelas">Petugas Kelas Pelatihan</option><option value="admin_pelatihan">Admin Pelatihan</option></select></div><div class="field"><label for="userStatus">Status akun</label><select id="userStatus"><option value="aktif">Aktif</option><option value="nonaktif">Nonaktif</option></select></div><div class="actions"><button class="primary" type="submit">Simpan Akun</button><button id="resetUser" type="button">Akun Baru</button></div><p class="muted small">Email harus sama dengan email yang ditampilkan akun Google. Tidak ada kata sandi yang disimpan di spreadsheet.</p></form></section>
<section class="card"><h2>Penugasan Petugas</h2><form id="assignmentForm"><div class="field"><label for="assignmentUser">Petugas aktif</label><select id="assignmentUser" required></select></div><div class="field"><label for="assignmentProgram">Program</label><select id="assignmentProgram" required></select></div><div class="field"><label for="assignmentJenjang">Jenjang</label><select id="assignmentJenjang" required></select></div><button class="primary" type="submit">Aktifkan Penugasan</button><p class="muted small">Satu petugas dapat ditugaskan pada beberapa Jenjang. Gunakan tombol pada daftar penugasan untuk menonaktifkan tanpa menghapus riwayat.</p></form></section></div>
<section class="card"><h2>Daftar Akun</h2><div class="field"><label for="userSearch">Cari nama atau email</label><input id="userSearch" type="search"></div><div class="scroll"><table><thead><tr><th>Panitia</th><th>Peran</th><th>Status</th><th>Google</th><th>Tindakan</th></tr></thead><tbody id="users"></tbody></table></div><div class="pager"><span id="pageInfo"></span><div class="actions"><button id="prevUsers" type="button">Sebelumnya</button><button id="nextUsers" type="button">Berikutnya</button></div></div></section>
<section class="card"><h2>Penugasan Tercatat</h2><div class="scroll"><table><thead><tr><th>Panitia</th><th>Program / Jenjang</th><th>Status</th><th>Tindakan</th></tr></thead><tbody id="assignments"></tbody></table></div><p class="muted small">Penugasan yang kehilangan referensi program/Jenjang tetap terlihat untuk diperiksa dan tidak digunakan sebagai cakupan uji identitas.</p></section>
<section class="card" id="googleConfigCard"><h2>Uji Login Google</h2><p class="muted">Gunakan OAuth Client bertipe Web application dari Google Cloud pada proyek pengujian. Salin Web app URL dari Deploy → Manage deployments ke kolom di bawah, lalu daftarkan URL yang sama sebagai Authorized redirect URI; untuk External dengan status Testing, tambahkan email panitia sebagai test user.</p><p id="callback" class="notice break"></p><form id="oauthForm"><div class="field"><label for="callbackUrl">URL deployment web app (/exec)</label><input id="callbackUrl" type="url" required autocomplete="off" placeholder="https://script.google.com/macros/s/…/exec"><p class="muted small">Pastikan URL ini milik proyek Apps Script salinan ini dan dapat dibuka. Gunakan URL /exec, tanpa ?page=uji-login. Deteksi otomatis dapat menunjuk deployment lain; ubah kolom ini jika berbeda.</p></div><div class="field"><label for="clientId">OAuth Client ID</label><input id="clientId" required autocomplete="off" placeholder="…apps.googleusercontent.com"></div><div class="field"><label for="clientSecret">OAuth Client Secret</label><input id="clientSecret" type="password" autocomplete="new-password" placeholder="Isi saat pertama kali atau saat mengganti Client ID"></div><div class="actions"><button type="submit">Simpan Konfigurasi Google</button><a id="loginLink" class="button primary" target="_blank" rel="noopener noreferrer" hidden>Buka Uji Login</a></div></form><p class="muted small">Client Secret hanya disimpan pada ScriptProperties server dan tidak dimuat kembali. Uji ini perlu dicoba pada Google sebelum pembatasan akses fitur diterapkan.</p></section>
<section class="card" id="appModeCard"><h2>Login Aplikasi Utama</h2><p id="appModeStatus" class="notice"></p><p class="muted">Aktifkan pada salinan setelah seluruh file paket tahap 4 terpasang dan uji identitas Admin/Petugas berhasil. Aplikasi akan meminta login Google dan memeriksa penugasan pada setiap permintaan. Pengaturan ini hanya dapat diubah pemilik dari menu spreadsheet.</p><button id="toggleAppMode" type="button">Aktifkan Login Aplikasi</button></section><section class="card"><h2>Riwayat Perubahan Akses</h2><p class="muted small">50 baris audit terbaru. Riwayat lengkap berada pada spreadsheet akses.</p><div class="scroll"><table><thead><tr><th>Aksi / target</th><th>Pelaku</th><th>Waktu Jakarta</th><th>Status</th></tr></thead><tbody id="history"></tbody></table></div></section></section></main>
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
async function load(){if(busy)return;busy=true;disabled();$('app').hidden=true;message('Memeriksa konfigurasi dan direktori akses…');try{data=await rpc('muatManajemenAksesPanitia');if(!data||!data.sukses)throw Error('Direktori belum tersedia.');$('owner').textContent='Pengelola: '+data.pemilik;$('setupCard').hidden=Boolean(data.konfigurasi&&data.konfigurasi.status==='SIAP');$('accessSheet').value=data.konfigurasi?data.konfigurasi.id:'';$('directory').hidden=!data.konfigurasi||data.konfigurasi.status!=='SIAP';if(!$('directory').hidden){$('bookLink').href=data.konfigurasi.url;$('appModeStatus').textContent=data.aplikasi&&data.aplikasi.aktif?'Login aplikasi aktif. Akses mengikuti peran dan penugasan.':'Login aplikasi belum aktif. Aplikasi operasional masih khusus pemilik.';$('toggleAppMode').textContent=data.aplikasi&&data.aplikasi.aktif?'Nonaktifkan Login Aplikasi':'Aktifkan Login Aplikasi';$('clientId').value=data.login.client_id;$('clientSecret').value='';$('callbackUrl').value=data.login.callback||'';$('callback').textContent=data.login.callback||'URL /exec belum tersedia. Buat deployment web app salinan untuk uji login.';$('loginLink').hidden=!data.login.siap||!data.login.callback;if(data.login.callback)$('loginLink').href=data.login.callback+'?page=uji-login';renderDirectory();}$('app').hidden=false;message(data.konfigurasi?(data.aplikasi&&data.aplikasi.aktif?'Direktori akses dimuat. Login aplikasi aktif; akses mengikuti peran dan penugasan Jenjang.':'Direktori akses dimuat. Akses petugas pada aplikasi utama masih belum diaktifkan.'):'Siapkan file spreadsheet akses terpisah untuk mulai mendata panitia.');return true;}catch(e){message(e.message||'Direktori gagal dimuat.',true);return false;}finally{busy=false;disabled();}}
async function run(name,arg,onSuccess){if(busy)return;busy=true;disabled();message('Memproses perubahan…');try{const r=await rpc(name,arg);busy=false;if(onSuccess)onSuccess();const loaded=await load();if(loaded)message(r.pesan);}catch(e){message(e.message||'Perubahan belum terkonfirmasi. Muat ulang atau periksa transaksi akses.',true);}finally{busy=false;disabled();}}
$('setupForm').addEventListener('submit',e=>{e.preventDefault();if(!confirm('Siapkan spreadsheet akses panitia terpisah dengan akun pemilik ini?'))return;run('siapkanManajemenAksesPanitia',{spreadsheet:$('accessSheet').value,konfirmasi:true});});
$('userForm').addEventListener('input',()=>{if(!busy)payload=null;});$('userForm').addEventListener('submit',e=>{e.preventDefault();payload=payload||{id:editing?editing.id:'',versi:editing?editing.versi:'',nama:$('userName').value,email:$('userEmail').value,peran:$('userRole').value,status:$('userStatus').value,id_permintaan:crypto.randomUUID()};run('simpanPenggunaPanitia',payload,resetUser);});
function saveAssignment(p){run('simpanPenugasanPanitia',p,()=>{assignPayload=null;});}
$('assignmentForm').addEventListener('change',()=>{if(!busy)assignPayload=null;});$('assignmentProgram').addEventListener('change',levels);$('assignmentForm').addEventListener('submit',e=>{e.preventDefault();const old=data.penugasan.find(p=>p.pengguna===$('assignmentUser').value&&p.jenjang===$('assignmentJenjang').value);assignPayload=assignPayload||{pengguna:$('assignmentUser').value,program:$('assignmentProgram').value,jenjang:$('assignmentJenjang').value,status:'aktif',versi:old?old.versi:'',id_permintaan:crypto.randomUUID()};saveAssignment(assignPayload);});
$('oauthForm').addEventListener('input',()=>{$('loginLink').hidden=true;});
$('oauthForm').addEventListener('submit',e=>{e.preventDefault();run('simpanKonfigurasiLoginGoogle',{client_id:$('clientId').value,client_secret:$('clientSecret').value,callback:$('callbackUrl').value},()=>{$('clientSecret').value='';});});
$('toggleAppMode').addEventListener('click',()=>{const aktif=!(data.aplikasi&&data.aplikasi.aktif);if(confirm(aktif?'Aktifkan login dan pembatasan peran pada web app salinan? Pastikan seluruh file tahap 4 sudah terpasang.':'Nonaktifkan login aplikasi dan akhiri seluruh sesi panitia? Akses operasional kembali khusus pemilik.'))run('aturLoginAplikasiPanitia',{aktif,konfirmasi:true});});
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
  const base={sukses:true,pemilik:actor,konfigurasi:cfg?{id:cfg.id,status:cfg.status,url:'https://docs.google.com/spreadsheets/d/'+cfg.id+'/edit'}:null,aplikasi:{aktif:aplikasiPanitiaAktif_()},login:{siap:Boolean(oauth),client_id:oauth?oauth.client_id:'',callback:callbackGoogleAkses_(),catatan:'Uji identitas saja. Pembatasan petugas pada aplikasi utama belum diaktifkan.'}};
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
    if(before&&emailAkses_(before.email_google)===emailAkses_(databaseAkses_().getOwner().getEmail())&&(input.email!==emailAkses_(databaseAkses_().getOwner().getEmail())||input.peran!=='admin_pelatihan'||input.status!=='aktif'))throw Error('Admin pemilik tetap aktif dan tidak dapat diganti email/perannya.');
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

/** Tahap 4: sesi aplikasi dan cakupan server, terpisah dari token absensi peserta. */
var konteksSesiPanitia_=null;
function modeAplikasiPanitia_(){const raw=PropertiesService.getScriptProperties().getProperty('AKSES_APLIKASI|'+databaseAkses_().getId());if(!raw)return {aktif:false};const m=JSON.parse(raw);if(m.schema!==1||typeof m.aktif!=='boolean')throw Error('Konfigurasi akses aplikasi tidak valid.');return m;}
function aplikasiPanitiaAktif_(){return modeAplikasiPanitia_().aktif;}
function wajibPemilikAsliAkses_(){const email=teksAkses_(Session.getActiveUser().getEmail()).toLowerCase(),owner=databaseAkses_().getOwner();if(!email||!owner||email!==emailAkses_(owner.getEmail()))throw Error('Hanya pemilik spreadsheet yang dapat mengatur penyiapan akses dari menu spreadsheet.');return email;}
function aturLoginAplikasiPanitia(d){
  wajibPemilikAsliAkses_();d=d||{};if(typeof d.aktif!=='boolean'||d.konfirmasi!==true)throw Error('Konfirmasi perubahan login aplikasi diperlukan.');
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    if(d.aktif){const book=bukuAkses_(),dir=direktoriAkses_(book),owner=emailAkses_(databaseAkses_().getOwner().getEmail());
      if(!konfigurasiGoogleAkses_()||!callbackGoogleAkses_())throw Error('Siapkan dan uji konfigurasi Google terlebih dahulu.');
      if(!dir.pengguna.records.some(r=>r.data.email_google===owner&&r.data.status==='aktif'&&r.data.peran==='admin_pelatihan'&&r.data.google_sub))throw Error('Selesaikan uji identitas Google dengan akun pemilik Admin terlebih dahulu.');
      if([...kelompokTransaksiAkses_(book).values()].some(r=>r.status_transaksi!=='SELESAI'))throw Error('Pulihkan transaksi akses yang belum selesai.');
      pastikanMigrasiJenjangSiap_();validasiIntegritasOperasionalJenjang_();periksaPaketLoginPanitia_();
    }
    const m={schema:1,aktif:d.aktif,epoch:Utilities.getUuid(),updated_at:new Date().toISOString()};
    PropertiesService.getScriptProperties().setProperty('AKSES_APLIKASI|'+databaseAkses_().getId(),JSON.stringify(m));
    return {sukses:true,pesan:d.aktif?'Login aplikasi aktif. Buka web app dan masuk dengan Google.':'Login aplikasi dinonaktifkan. Endpoint operasional kembali hanya untuk pemilik; seluruh sesi sebelumnya tidak berlaku.'};
  }finally{lock.releaseLock();}
}
function wajibEndpointAkses_(name){
  if(konteksSesiPanitia_)return;
  if(aplikasiPanitiaAktif_())throw Error('SESI_DIPERLUKAN: Masuk melalui halaman aplikasi untuk menjalankan tindakan ini.');
  wajibPemilikAsliAkses_();
}
function kunciBrowserSesiAkses_(){return 'MONITORING-SESI|'+hashAkses_(databaseAkses_().getId()).slice(0,20);}
function hashKonfigurasiSesiAkses_(){return hashAkses_(serialAkses_([modeAplikasiPanitia_(),konfigurasiAkses_(),konfigurasiGoogleAkses_()]));}
function simpanSesiPanitia_(identity){
  if(!aplikasiPanitiaAktif_())throw Error('Login aplikasi belum aktif.');
  const dir=direktoriAkses_(bukuAkses_()),user=dir.pengguna.records.find(r=>r.data.email_google===identity.email);
  if(!user||user.data.status!=='aktif'||!user.data.google_sub)throw Error('Akun tidak tersedia untuk sesi aplikasi.');
  const token=acakLoginAkses_(),now=Date.now(),record={uid:user.data.id_pengguna,sub:user.data.google_sub,versi:hashAkses_(serialAkses_(user.data)),created:now,last:now,expires:now+4*3600000,konfigurasi:hashKonfigurasiSesiAkses_()};
  cacheLoginAkses_().put('SESI-PANITIA|'+hashAkses_(token),JSON.stringify(record),4*3600);
  return {sukses:true,tujuan:'aplikasi',token,storage_key:kunciBrowserSesiAkses_(),url:callbackGoogleAkses_(),nama:user.data.nama,email:user.data.email_google,peran:user.data.peran,jenjang:identity.jenjang,pembatasan_aplikasi_aktif:true,pesan:'Berhasil masuk. Pilih Buka Aplikasi untuk melanjutkan.'};
}
function bacaSesiPanitia_(token,diDalamLock){if(diDalamLock)return bacaSesiPanitiaTerkunci_(token,false);const lock=LockService.getScriptLock();lock.waitLock(10000);try{return bacaSesiPanitiaTerkunci_(token,true);}finally{lock.releaseLock();}}
function bacaSesiPanitiaTerkunci_(token,perbarui){
  if(!aplikasiPanitiaAktif_())throw Error('SESI_BERAKHIR: Login aplikasi tidak aktif.');
  if(!/^[a-f0-9]{64}$/i.test(teksAkses_(token)))throw Error('SESI_BERAKHIR: Silakan masuk kembali.');
  const key='SESI-PANITIA|'+hashAkses_(token),cache=cacheLoginAkses_(),raw=cache.get(key),now=Date.now();
  if(!raw)throw Error('SESI_BERAKHIR: Silakan masuk kembali.');
  const saved=JSON.parse(raw);
  if(saved.expires<=now||saved.last+30*60000<=now||saved.konfigurasi!==hashKonfigurasiSesiAkses_()){cache.remove(key);throw Error('SESI_BERAKHIR: Sesi kedaluwarsa atau konfigurasi berubah. Silakan masuk kembali.');}
  const book=bukuAkses_(),dir=direktoriAkses_(book);
  if([...kelompokTransaksiAkses_(book).values()].some(r=>r.status_transaksi!=='SELESAI'))throw Error('AKSES_DITAHAN: Ada transaksi akses belum selesai. Hubungi Admin.');
  const found=dir.pengguna.records.find(r=>r.data.id_pengguna===saved.uid),u=found&&found.data;
  if(!u||u.status!=='aktif'||u.google_sub!==saved.sub||hashAkses_(serialAkses_(u))!==saved.versi){cache.remove(key);throw Error('SESI_BERAKHIR: Akun berubah atau dinonaktifkan. Silakan masuk kembali.');}
  const levels=daftarJenjangAkses_(),jenjang=dir.penugasan.records.filter(r=>r.data.id_pengguna===u.id_pengguna&&r.data.status==='aktif').map(r=>levels.find(j=>j.id===r.data.id_jenjang&&j.program===r.data.id_program)).filter(Boolean);
  if(perbarui){saved.last=now;cache.put(key,JSON.stringify(saved),Math.max(1,Math.floor((saved.expires-now)/1000)));}
  return {id:u.id_pengguna,nama:u.nama,email:u.email_google,peran:u.peran,jenjang,expires:saved.expires};
}
function muatSesiAplikasiPanitia(token){const i=bacaSesiPanitia_(token);return Object.assign({sukses:true},i);}
function keluarAplikasiPanitia(token){const lock=LockService.getScriptLock();lock.waitLock(10000);try{if(/^[a-f0-9]{64}$/i.test(teksAkses_(token)))cacheLoginAkses_().remove('SESI-PANITIA|'+hashAkses_(token));return {sukses:true};}finally{lock.releaseLock();}}
function petugasDalamKonteksAkses_(){return !!konteksSesiPanitia_&&konteksSesiPanitia_.peran==='petugas_kelas';}
function dalamJenjangAkses_(record){return !petugasDalamKonteksAkses_()||konteksSesiPanitia_.jenjang.some(j=>j.id===teksAkses_(record.id_jenjang)&&j.program===teksAkses_(record.id_program));}
function programDalamAkses_(id){return !petugasDalamKonteksAkses_()||konteksSesiPanitia_.jenjang.some(j=>j.program===teksAkses_(id));}
function barisTargetAkses_(name,key,id){const t=tabelIndex_(name,[key]),r=t.records.filter(r=>teksAkses_(r[key])===teksAkses_(id));if(r.length!==1)throw Error('Target tidak tersedia dalam penugasan Anda.');return r[0];}
function wajibJenjangTargetAkses_(r){if(!dalamJenjangAkses_(r))throw Error('AKSES_DITOLAK: Target berada di luar penugasan Jenjang Anda.');return r;}
function wajibSesiTargetAkses_(id){return wajibJenjangTargetAkses_(barisTargetAkses_('Sesi','id_sesi',id));}
function wajibHadirTargetAkses_(id){const h=barisTargetAkses_('Kehadiran','id_kehadiran',id),s=wajibSesiTargetAkses_(h.id_sesi),k=wajibJenjangTargetAkses_(barisTargetAkses_('Keikutsertaan','id_keikutsertaan',h.id_keikutsertaan));if(!sesuaiJenjang_(s,k))throw Error('Relasi target tidak sesuai.');return h;}
function fungsiAplikasiPanitia_(){return {
 muatBerandaIndex,muatAwalIndex,muatKehadiranIndex,muatRekapJPProgramIndex,muatCatatanPerilakuIndex,muatNilaiPerilakuProgramIndex,muatDaftarIzinIndex,muatPesertaProgramIndex,muatProfilPesertaIndex,muatJenjangProgramIndex,
 terbitkanQRAbsensiDariGenerator,simpanCatatanPerilakuIndex,simpanIzinIndex,unggahBuktiIndex,simpanKoreksiIndex,
 hitungJPSesiIndex,simpanValidasiPerilakuIndex,simpanAturanPerilakuProgramIndex,muatKelolaProgramIndex,tambahProgramIndex,tambahSesiIndex,tambahJenjangProgramIndex,
 pulihkanPembuatanSesiIndex,pratinjauImporPesertaIndex,cariPesertaLamaIndex,imporPesertaProgramIndex,pulihkanImporPesertaIndex,periksaDataIndex,muatEditDataIndex,simpanEditDataIndex,pulihkanEditDataIndex,tambahIndikatorIndex,muatRingkasanPesertaIndex,
 pratinjauHapusDataIndex,hapusDataIndex,muatPenghapusanTertundaIndex,lanjutkanPenghapusanIndex,muatMasterPesertaHapusIndex,muatPratinjauLaporanProgram,buatPDFLaporanProgram,otorisasiLaporanProgram,
 muatManajemenAksesPanitia,simpanPenggunaPanitia,simpanPenugasanPanitia,pulihkanTransaksiAksesPanitia,
 muatPengajuanKoreksiPanitia:muatPengajuanKoreksiPanitia_,putuskanPengajuanKoreksiPanitia:putuskanPengajuanKoreksiPanitia_
};}
function periksaIzinFungsiPanitia_(name,args){
  if(!petugasDalamKonteksAkses_())return;
  const sessionMethods=['muatKehadiranIndex','muatCatatanPerilakuIndex','muatDaftarIzinIndex','terbitkanQRAbsensiDariGenerator'];
  const programMethods=['muatRekapJPProgramIndex','muatNilaiPerilakuProgramIndex','muatPesertaProgramIndex','muatJenjangProgramIndex'];
  if(['muatAwalIndex','muatBerandaIndex','muatPengajuanKoreksiPanitia'].includes(name))return;
  if(sessionMethods.includes(name)){wajibSesiTargetAkses_(args[0]);return;}
  if(programMethods.includes(name)){
    if(!programDalamAkses_(args[0]))throw Error('AKSES_DITOLAK: Program tidak termasuk penugasan Anda.');
    if(name==='muatPesertaProgramIndex'&&teksAkses_(args[3]))wajibJenjangTargetAkses_({id_program:args[0],id_jenjang:args[3]});return;
  }
  const d=args[0]||{};
  if(name==='muatProfilPesertaIndex'){
    const memberships=tabelIndex_('Keikutsertaan',['id_keikutsertaan','id_peserta','id_program']).records;
    const matches=memberships.filter(k=>dalamJenjangAkses_(k)&&(!d.id_keikutsertaan||teksAkses_(k.id_keikutsertaan)===teksAkses_(d.id_keikutsertaan))&&(!d.id_peserta||teksAkses_(k.id_peserta)===teksAkses_(d.id_peserta))&&(!d.id_program||teksAkses_(k.id_program)===teksAkses_(d.id_program)));
    if((!d.id_peserta&&!d.id_keikutsertaan)||!matches.length)throw Error('AKSES_DITOLAK: Peserta tidak termasuk penugasan Anda.');return;
  }
  if(['simpanIzinIndex','simpanKoreksiIndex'].includes(name)){wajibHadirTargetAkses_(d.id_kehadiran);return;}
  if(name==='unggahBuktiIndex'&&d.jenis==='izin'){wajibHadirTargetAkses_(d.id_kehadiran);return;}
  if(name==='simpanCatatanPerilakuIndex'||name==='unggahBuktiIndex'&&d.jenis==='perilaku'){
    const s=wajibSesiTargetAkses_(d.id_sesi),k=wajibJenjangTargetAkses_(barisTargetAkses_('Keikutsertaan','id_keikutsertaan',d.id_keikutsertaan));if(!sesuaiJenjang_(s,k))throw Error('Relasi peserta/sesi tidak sesuai.');return;
  }
  throw Error('AKSES_DITOLAK: Tindakan ini hanya untuk Admin Pelatihan.');
}
function panggilAplikasiPanitia(d){
  d=d||{};const name=teksAkses_(d.nama),functions=fungsiAplikasiPanitia_();
  if(!Object.prototype.hasOwnProperty.call(functions,name)||!Array.isArray(d.args)||d.args.length>8)throw Error('Fungsi aplikasi tidak tersedia.');
  if(konteksSesiPanitia_)throw Error('Permintaan aplikasi bertingkat tidak diizinkan.');
  const context=bacaSesiPanitia_(d.token);context.token=d.token;context.method=name;context.args=d.args;konteksSesiPanitia_=context;
  try{periksaIzinFungsiPanitia_(name,d.args);if(name==='simpanKoreksiIndex'&&petugasDalamKonteksAkses_())return ajukanKoreksiPanitia_(d.args[0]);return functions[name].apply(null,d.args);}finally{konteksSesiPanitia_=null;}
}
function periksaUlangSesiPanitia_(){if(!konteksSesiPanitia_)return;const old=konteksSesiPanitia_,current=bacaSesiPanitia_(old.token,true);konteksSesiPanitia_=Object.assign(current,{token:old.token,method:old.method,args:old.args});periksaIzinFungsiPanitia_(old.method,old.args);}
function saringAwalPanitia_(r){if(!petugasDalamKonteksAkses_())return r;const data=r.data;data.program=data.program.filter(p=>programDalamAkses_(p.id_program));data.sesi=data.sesi.filter(dalamJenjangAkses_);data.jenjang=(data.jenjang||[]).filter(j=>dalamJenjangAkses_({id_jenjang:j.id,id_program:j.id_program}));data.program.forEach(p=>p.jenjang=data.jenjang.filter(j=>j.id_program===p.id_program).map(j=>j.nama).join(', '));return r;}
function saringBerandaPanitia_(d){
 if(!petugasDalamKonteksAkses_())return d;
 d.program=d.program.filter(p=>programDalamAkses_(p.id_program)).map(p=>Object.assign({},p,{jenjang:konteksSesiPanitia_.jenjang.filter(j=>j.program===teksAkses_(p.id_program)).map(j=>j.nama).join(', ')}));
 d.sesi=d.sesi.filter(dalamJenjangAkses_);d.ikut=d.ikut.filter(dalamJenjangAkses_);const s=new Set(d.sesi.map(s=>teksAkses_(s.id_sesi))),k=new Set(d.ikut.map(k=>teksAkses_(k.id_keikutsertaan))),p=new Set(d.ikut.map(k=>teksAkses_(k.id_peserta)));
 d.peserta=d.peserta.filter(r=>p.has(teksAkses_(r.id_peserta)));d.hadir=d.hadir.filter(r=>s.has(teksAkses_(r.id_sesi))&&k.has(teksAkses_(r.id_keikutsertaan)));d.catatan=d.catatan.filter(r=>s.has(teksAkses_(r.id_sesi))&&k.has(teksAkses_(r.id_keikutsertaan)));return d;
}

/** Pengajuan memakai jurnal append-only Riwayat_Akses; tidak menambah tab operasional. */
function daftarPengajuanKoreksi_(book){const map=new Map();tabelAkses_(book,'Riwayat_Akses').records.filter(r=>r.data.jenis_data==='Pengajuan_Koreksi').forEach(r=>{const p=JSON.parse(r.data.sesudah);if(p.schema!==1||p.id!==r.data.id_target)throw Error('Riwayat pengajuan koreksi tidak valid.');map.set(p.id,p);});return map;}
function catatPengajuanKoreksi_(book,p,aksi){
 const t=tabelAkses_(book,'Riwayat_Akses');if(t.records.length>=9997)throw Error('Kapasitas riwayat akses hampir penuh. Hubungi pemilik.');
 const row={id_riwayat:'AKR-'+Utilities.getUuid(),jenis_data:'Pengajuan_Koreksi',id_target:p.id,aksi,sebelum:'',sesudah:JSON.stringify(p),oleh:konteksSesiPanitia_.email,waktu:new Date(),id_permintaan:'KOR-'+Utilities.getUuid(),status_transaksi:'SELESAI'};
 if(row.sesudah.length>40000)throw Error('Pengajuan terlalu panjang.');t.sheet.appendRow(t.header.map(k=>row[k]===undefined?'':row[k]));SpreadsheetApp.flush();const verified=tabelAkses_(book,'Riwayat_Akses').records.filter(r=>r.data.id_riwayat===row.id_riwayat);if(verified.length!==1||serialAkses_(verified[0].data)!==serialAkses_(row))throw Error('Penyimpanan riwayat pengajuan belum terverifikasi. Muat ulang sebelum mengulang tindakan.');
}
function ajukanKoreksiPanitia_(d){
 const lock=LockService.getScriptLock();lock.waitLock(30000);
 try{
  periksaUlangSesiPanitia_();const h=wajibHadirTargetAkses_(d&&d.id_kehadiran),s=wajibSesiTargetAkses_(h.id_sesi),z=databaseAkses_().getSpreadsheetTimeZone();
  const data={id_kehadiran:teksAkses_(d.id_kehadiran),versi:teksAkses_(d.versi),datang:teksAkses_(d.datang),pulang:teksAkses_(d.pulang),alasan:teksAkses_(d.alasan),dasar:teksAkses_(d.dasar)};
  if(!data.alasan||!data.dasar||data.alasan.length>2000||data.dasar.length>2000||!data.datang&&!data.pulang)throw Error('Isi waktu koreksi, alasan dan dasar verifikasi (maksimal 2.000 karakter).');
  const a=data.datang?parseWaktuAbsensiManual_(data.datang.replace('T',' '),z):h.waktu_datang_terverifikasi||h.waktu_datang,b=data.pulang?parseWaktuAbsensiManual_(data.pulang.replace('T',' '),z):h.waktu_pulang_terverifikasi||h.waktu_pulang;
  if(a&&b&&b<=a)throw Error('Waktu pulang harus setelah waktu datang.');
  const book=bukuAkses_(),id='KOR-'+hashAkses_(serialAkses_([konteksSesiPanitia_.id,data])).slice(0,32),old=daftarPengajuanKoreksi_(book).get(id);
  if(old)return {sukses:true,pesan:'Pengajuan sebelumnya sudah tercatat dengan status '+old.status+'.',id};
  dataKoreksiIndex_(data);
  const p={schema:1,id,data,id_sesi:teksAkses_(h.id_sesi),id_keikutsertaan:teksAkses_(h.id_keikutsertaan),id_program:teksAkses_(s.id_program),id_jenjang:teksAkses_(s.id_jenjang),pengaju:konteksSesiPanitia_.id,email:konteksSesiPanitia_.email,status:'menunggu',created_at:new Date().toISOString()};
  catatPengajuanKoreksi_(book,p,'ajukan_koreksi');return {sukses:true,id,pesan:'Pengajuan koreksi terkirim kepada Admin. Waktu kehadiran belum diubah.'};
 }finally{lock.releaseLock();}
}
function muatPengajuanKoreksiPanitia_(){
 const rows=[...daftarPengajuanKoreksi_(bukuAkses_()).values()].filter(p=>!petugasDalamKonteksAkses_()||p.pengaju===konteksSesiPanitia_.id&&dalamJenjangAkses_(p));
 const people=tabelIndex_('Peserta',['id_peserta','nama_pegawai']).records,links=tabelIndex_('Keikutsertaan',['id_keikutsertaan','id_peserta']).records,sessions=tabelIndex_('Sesi',['id_sesi','nama_sesi']).records;return {sukses:true,pengajuan:rows.sort((a,b)=>b.created_at.localeCompare(a.created_at)).slice(0,100).map(p=>{const k=links.find(k=>teksAkses_(k.id_keikutsertaan)===p.id_keikutsertaan),person=k&&people.find(x=>teksAkses_(x.id_peserta)===teksAkses_(k.id_peserta)),s=sessions.find(s=>teksAkses_(s.id_sesi)===p.id_sesi);return Object.assign({},p,{nama_peserta:person?teksAkses_(person.nama_pegawai):p.id_keikutsertaan,nama_sesi:s?teksAkses_(s.nama_sesi):p.id_sesi});})};
}
function statusKoreksiOperasionalAkses_(id){const rows=tabelIndex_('Riwayat_Validasi',['id_transaksi_perubahan','status_transaksi']).records.filter(r=>r.id_transaksi_perubahan==='KOREKSI-PANITIA|'+id);return rows.length?teksAkses_(rows[rows.length-1].status_transaksi):'';}
function putuskanPengajuanKoreksiPanitia_(d){
 if(!konteksSesiPanitia_||petugasDalamKonteksAkses_())throw Error('Hanya Admin Pelatihan yang dapat memutuskan pengajuan.');
 d=d||{};if(!['setujui','tolak','periksa'].includes(d.keputusan)||!teksAkses_(d.id))throw Error('Keputusan pengajuan tidak valid.');
 let p;const lock=LockService.getScriptLock();lock.waitLock(30000);
 try{
  periksaUlangSesiPanitia_();const book=bukuAkses_();p=daftarPengajuanKoreksi_(book).get(d.id);if(!p)throw Error('Pengajuan tidak ditemukan.');
  if(['disetujui','ditolak'].includes(p.status))return {sukses:true,pesan:'Pengajuan sudah '+p.status+'.'};
  const audit=statusKoreksiOperasionalAkses_(p.id);
  if(audit==='SELESAI'){p.status='disetujui';p.diputuskan_oleh=p.diputuskan_oleh||konteksSesiPanitia_.email;p.diputuskan_pada=new Date().toISOString();catatPengajuanKoreksi_(book,p,'konfirmasi_hasil_koreksi');return {sukses:true,pesan:'Koreksi telah tersimpan; status pengajuan dikonfirmasi.'};}
  if(p.status!=='menunggu'||audit)throw Error('Pengajuan sedang diproses atau memerlukan pemeriksaan transaksi. Waktu tidak ditulis ulang. Periksa Riwayat_Validasi.');
  if(d.keputusan==='periksa')return {sukses:true,pesan:'Pengajuan masih menunggu keputusan Admin.'};
  const alasan=teksAkses_(d.alasan);if(!alasan||alasan.length>2000)throw Error('Alasan keputusan wajib diisi (maksimal 2.000 karakter).');
  if(d.keputusan==='setujui'){const h=barisTargetAkses_('Kehadiran','id_kehadiran',p.data.id_kehadiran),s=barisTargetAkses_('Sesi','id_sesi',h.id_sesi);if(teksAkses_(h.id_sesi)!==p.id_sesi||teksAkses_(h.id_keikutsertaan)!==p.id_keikutsertaan||teksAkses_(s.id_program)!==p.id_program||teksAkses_(s.id_jenjang)!==p.id_jenjang)throw Error('Relasi pengajuan sudah berubah. Tolak pengajuan dan periksa kembali.');dataKoreksiIndex_(p.data);}
  p.status=d.keputusan==='tolak'?'ditolak':'diproses';p.alasan_keputusan=alasan;p.diputuskan_oleh=konteksSesiPanitia_.email;p.diputuskan_pada=new Date().toISOString();catatPengajuanKoreksi_(book,p,'keputusan_koreksi');
  if(p.status==='ditolak')return {sukses:true,pesan:'Pengajuan ditolak. Waktu kehadiran tidak diubah.'};
 }finally{lock.releaseLock();}
 let error=null;
 try{konteksSesiPanitia_.koreksi_tx='KOREKSI-PANITIA|'+p.id;simpanKoreksiIndex(p.data);}catch(e){error=e;}finally{delete konteksSesiPanitia_.koreksi_tx;}
 lock.waitLock(30000);
 try{
  const book=bukuAkses_(),latest=daftarPengajuanKoreksi_(book).get(p.id);if(!latest||latest.status!=='diproses')throw Error('Status pengajuan berubah. Periksa hasil koreksi.');
  const audit=statusKoreksiOperasionalAkses_(p.id);
  latest.status=audit==='SELESAI'?'disetujui':audit?'perlu_pemeriksaan':'menunggu';catatPengajuanKoreksi_(book,latest,'hasil_koreksi');
  if(latest.status!=='disetujui')throw Error(error&&error.message||'Koreksi belum selesai; periksa transaksi sebelum mencoba lagi.');
  return {sukses:true,pesan:'Pengajuan disetujui dan koreksi tersimpan. Scan asli dipertahankan; JP menunggu perhitungan Admin.'};
 }finally{lock.releaseLock();}
}

/** Satu bridge disisipkan server pada halaman lama, sehingga tidak menggandakan HTML aplikasi. */
function keluaranAplikasiPanitia_(name,title){
 if(!aplikasiPanitiaAktif_())return null;
 if(!['Beranda','Index','Pengelolaan','Peserta','Profil','ManajemenAkses'].includes(name))throw Error('Halaman aplikasi tidak tersedia.');
 const source=name==='ManajemenAkses'?halamanManajemenAkses_():HtmlService.createHtmlOutputFromFile(name).getContent();
 const html=source.replace(/google\.script\.run/g,'window.pelatihanRun').replace(/<head>/i,'<head>'+bridgeAplikasiPanitia_({page:name,base:callbackGoogleAkses_(),storage_key:kunciBrowserSesiAkses_()}));
 return HtmlService.createHtmlOutput(html).setTitle(title).addMetaTag('viewport','width=device-width, initial-scale=1');
}
function bridgeAplikasiPanitia_(config){return String.raw`<style id="panitia-access-style">
html[data-panitia-locked] body>:not(#panitiaAuth):not(script):not(style){display:none!important}
#panitiaAuth{box-sizing:border-box;min-height:100vh;padding:64px 20px;background:#f0f3f8;color:#192e50;font:15px 'Avenir Next',Avenir,'Segoe UI',Arial,sans-serif}#panitiaAuth>section{max-width:580px;margin:0 auto;padding:32px;background:white;border:1px solid #dce3ef;border-radius:24px}#panitiaAuth p{line-height:1.7}#panitiaAuth a,#panitiaAuth button{display:inline-block;padding:12px 18px;border-radius:12px;background:#203960;color:white;font:inherit;text-decoration:none;border:0;cursor:pointer}#panitiaAuth[hidden]{display:none!important}
html.panitia-app :is(#googleConfigCard,#appModeCard,#setupCard){display:none!important}
html.role-petugas :is([data-sidebar-placeholder^="Pengaturan"],[data-dash-page="pengelolaan"],#openPengelolaan,#calculate,#indicatorDetails,#ruleDetails,#newIndicatorForm,#masterParticipantsCard,#deleteRecovery,#recoverEdits,#participantPreviewCard,#participantsPanel>.panel:first-child,#participantsBody td:last-child button,#behaviorBody td:last-child button){display:none!important}
#panitiaRequests{padding:24px;margin:24px 0;background:white;border:1px solid #dce3ef;border-radius:24px}#panitiaRequests .request-head{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}#panitiaRequests h2{margin:0;font-size:20px}#panitiaRequests p{line-height:1.7}#panitiaRequests .request-row{padding:18px 0;border-bottom:1px solid #dce3ef;overflow-wrap:anywhere}#panitiaRequests .request-row:last-child{border:0}#panitiaRequests button,#panitiaReview button{font:inherit;padding:10px 15px;border-radius:11px;border:1px solid #d6dfec;background:white;color:#203960;cursor:pointer;margin-right:8px}#panitiaRequests button:disabled,#panitiaReview button:disabled{opacity:.5;cursor:wait}#panitiaReview{max-width:620px;width:90vw;box-sizing:border-box;border:1px solid #dce3ef;border-radius:22px;padding:26px;color:#192e50;background:white}#panitiaReview::backdrop{background:#192e5080}#panitiaReview textarea{font:inherit;box-sizing:border-box;width:100%;min-height:100px;padding:12px;border:1px solid #d6dfec;border-radius:11px;margin:12px 0}#panitiaReview .primary{background:#203960;color:white}#panitiaReview p{line-height:1.65}
</style><script id="panitia-access-bridge">
(function(){'use strict';const cfg=__CONFIG__;document.documentElement.setAttribute('data-panitia-locked','');let identity=null,generation=0,resolveReady,rejectReady,idleTimer,absoluteTimer;const ready=new Promise((ok,bad)=>{resolveReady=ok;rejectReady=bad;});ready.catch(()=>{});
function native(name,arg){return new Promise((ok,bad)=>google.script.run.withSuccessHandler(ok).withFailureHandler(bad)[name](arg));}
function stored(){return sessionStorage.getItem(cfg.storage_key);}
function token(){const t=stored();if(!t)throw Error('SESI_BERAKHIR: Silakan masuk kembali.');return t;}
function touch(){clearTimeout(idleTimer);idleTimer=setTimeout(()=>lock('Sesi berakhir setelah 30 menit tanpa aktivitas. Silakan masuk kembali.',true),30*60000);}
function lock(message,clear){generation++;clearTimeout(idleTimer);clearTimeout(absoluteTimer);document.documentElement.setAttribute('data-panitia-locked','');if(clear)try{sessionStorage.removeItem(cfg.storage_key);}catch(ignored){}const a=document.getElementById('panitiaAuth');if(a)a.hidden=false;const m=document.getElementById('panitiaAuthMessage');if(m)m.textContent=message;}
async function send(name,args){const g=generation,t=token();try{const r=await native('panggilAplikasiPanitia',{token:t,nama:name,args});if(g!==generation||t!==stored())throw Error('SESI_BERAKHIR: Sesi halaman sudah berakhir.');touch();return r;}catch(e){if(/SESI_BERAKHIR|SESI_DIPERLUKAN/.test(e.message||''))lock('Sesi Anda berakhir. Silakan masuk kembali.',true);else if(/AKSES_DITAHAN/.test(e.message||''))lock(e.message,false);throw e;}}
function bridge(ok,bad,user){return new Proxy({}, {get(target,name){if(name==='withSuccessHandler')return f=>bridge(f,bad,user);if(name==='withFailureHandler')return f=>bridge(ok,f,user);if(name==='withUserObject')return u=>bridge(ok,bad,u);return (...args)=>{const g=generation;ready.then(()=>send(String(name),args)).then(r=>{if(g===generation)ok&&ok(r,user);},e=>bad&&bad(e,user));};}});}
window.pelatihanRun=bridge();
function el(tag,text){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;}
async function logout(){const t=stored();lock('Anda sudah keluar. Masuk kembali untuk melanjutkan.',true);try{await native('keluarAplikasiPanitia',t);}catch(err){document.getElementById('panitiaAuthMessage').textContent='Sesi di browser sudah dihapus. Logout server belum terkonfirmasi; sesi server tetap memiliki batas waktu.';}}
function refreshIdentity(){
 window.panitiaIdentity=identity;
 if(cfg.page==='ManajemenAkses'){const actions=document.querySelector('.head .actions'),out=el('button','Log Out');out.type='button';out.id='panitiaLogout';out.addEventListener('click',logout);if(actions)actions.append(out);const close=document.getElementById('close');if(close){close.textContent='Kembali ke Beranda';close.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();window.top.location.href=cfg.base;},true);}}
 document.querySelectorAll('.sidebar-account-text').forEach(box=>{const name=box.querySelector('strong'),role=box.querySelector('small');if(name)name.textContent=identity.nama;if(role)role.textContent=identity.peran==='admin_pelatihan'?'Admin Pelatihan':'Petugas Kelas';});
 document.querySelectorAll('.sidebar-account').forEach(b=>{b.removeAttribute('data-sidebar-placeholder');b.title=identity.email;b.setAttribute('aria-label',identity.nama+', '+(identity.peran==='admin_pelatihan'?'Admin Pelatihan':'Petugas Kelas'));});
 document.querySelectorAll('.sidebar-tool').forEach(b=>{if(b.textContent.trim()==='Pengaturan'&&identity.peran==='admin_pelatihan'){const link=el('a');link.className=b.className;link.innerHTML=b.innerHTML;link.href=cfg.base+'?page=akses';link.target='_top';link.setAttribute('aria-label','Manajemen Akses Panitia');link.title='Manajemen Akses Panitia';const label=link.querySelector('.sidebar-tool-label');if(label)label.textContent='Manajemen Akses';b.replaceWith(link);}if(b.textContent.trim()==='Log Out'){b.removeAttribute('data-sidebar-placeholder');b.removeAttribute('aria-disabled');b.setAttribute('aria-label','Log Out');b.addEventListener('click',async e=>{e.preventDefault();e.stopImmediatePropagation();await logout();},true);}});
 if(identity.peran==='petugas_kelas'){
  document.documentElement.classList.add('role-petugas');
  if(cfg.page==='Peserta'){const help=document.querySelector('#participantJenjangField .foot'),label=document.querySelector('label[for=participantJenjang]'),programLabel=document.querySelector('label[for=program]'),intro=document.querySelector('.brand .muted'),programHelp=document.querySelector('#app>section.panel>p.foot');if(help)help.textContent='Pilih Jenjang penugasan untuk melihat pesertanya.';if(label)label.textContent='FILTER JENJANG';if(programLabel)programLabel.textContent='PROGRAM PENUGASAN';if(intro)intro.textContent='Daftar peserta pada Jenjang penugasan Anda';if(programHelp)programHelp.textContent='Pilihan ini menentukan daftar peserta yang ditampilkan.';}
  if(identity.jenjang.length){const notice=el('p','Data yang ditampilkan terbatas pada Jenjang penugasan Anda.');notice.className='notice';notice.id='panitiaScopeNotice';(document.getElementById('app')||document.querySelector('main')||document.body).prepend(notice);}
  if(!identity.jenjang.length){const notice=el('p','Belum ada penugasan Jenjang aktif untuk akun ini. Hubungi Admin Pelatihan agar data kelas dapat ditampilkan.');notice.className='notice';notice.id='panitiaNoAssignment';(document.getElementById('app')||document.querySelector('main')||document.body).prepend(notice);}

 }
}
async function requests(){
 if(!['Beranda','Index'].includes(cfg.page))return;
 const target=document.getElementById('app')||document.querySelector('main')||document.body,card=el('section');card.id='panitiaRequests';const head=el('div');head.className='request-head';head.append(el('h2',identity.peran==='admin_pelatihan'?'Pengajuan Koreksi Waktu':'Pengajuan Koreksi Saya'));const refresh=el('button','Muat Ulang');refresh.type='button';head.append(refresh);const msg=el('p','Memuat pengajuan…'),list=el('div');msg.setAttribute('role','status');card.append(head,msg,list);target.append(card);
 const dialog=el('dialog');dialog.id='panitiaReview';const form=el('form'),title=el('h2','Tinjau Pengajuan Koreksi'),detail=el('p'),label=el('label','Alasan keputusan'),reason=el('textarea');reason.required=true;reason.maxLength=2000;reason.id='panitiaDecisionReason';label.htmlFor=reason.id;const result=el('p');result.setAttribute('role','status');const approve=el('button','Setujui Koreksi'),reject=el('button','Tolak'),close=el('button','Tutup');approve.className='primary';[approve,reject,close].forEach(b=>b.type='button');form.append(title,detail,label,reason,result,approve,reject,close);dialog.append(form);card.append(dialog);let selected=null,busy=false;
 function buttons(){[approve,reject,close,refresh].forEach(b=>b.disabled=busy);reason.disabled=busy;}
 async function load(){if(busy)return;busy=true;buttons();try{const r=await send('muatPengajuanKoreksiPanitia',[]);list.replaceChildren();msg.textContent=r.pengajuan.length?'Menampilkan '+r.pengajuan.length+' pengajuan terbaru. Persetujuan Admin mengubah waktu terverifikasi; scan asli dipertahankan.':'Belum ada pengajuan koreksi.';
  r.pengajuan.forEach(p=>{const row=el('div');row.className='request-row';row.append(el('strong',(p.nama_peserta||p.id_keikutsertaan)+' · '+(p.nama_sesi||p.id_sesi)),el('p','Status: '+p.status.replace(/_/g,' ')+' · Pengaju: '+p.email),el('p','Usulan datang: '+(p.data.datang||'tetap')+' · pulang: '+(p.data.pulang||'tetap')),el('p','Alasan: '+p.data.alasan),el('p','Dasar: '+p.data.dasar));if(p.alasan_keputusan)row.append(el('p','Keputusan: '+p.alasan_keputusan));if(identity.peran==='admin_pelatihan'&&!['disetujui','ditolak'].includes(p.status)){const b=el('button',p.status==='menunggu'?'Tinjau':'Periksa Hasil');b.type='button';b.addEventListener('click',async()=>{if(p.status!=='menunggu'){try{const r=await send('putuskanPengajuanKoreksiPanitia',[{id:p.id,keputusan:'periksa'}]);msg.textContent=r.pesan;}catch(e){msg.textContent=e.message;}return;}selected=p;detail.textContent=(p.nama_peserta||p.id_keikutsertaan)+' — '+(p.nama_sesi||p.id_sesi)+'. Datang: '+(p.data.datang||'tetap')+'; pulang: '+(p.data.pulang||'tetap')+'. '+p.data.alasan;reason.value='';result.textContent='';dialog.showModal();reason.focus();});row.append(b);}list.append(row);});
 }catch(e){msg.textContent=e.message||'Pengajuan tidak dapat dimuat.';}finally{busy=false;buttons();}}
 async function decide(keputusan){if(busy||!selected||!form.reportValidity())return;if(keputusan==='setujui'&&!confirm('Setujui pengajuan ini dan perbarui waktu kehadiran terverifikasi? Scan asli tetap tersimpan.'))return;busy=true;buttons();try{const r=await send('putuskanPengajuanKoreksiPanitia',[{id:selected.id,keputusan,alasan:reason.value}]);dialog.close();msg.textContent=r.pesan;busy=false;await load();}catch(e){result.textContent=e.message;}finally{busy=false;buttons();}}
 approve.addEventListener('click',()=>decide('setujui'));reject.addEventListener('click',()=>decide('tolak'));close.addEventListener('click',()=>{if(!busy)dialog.close();});dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});form.addEventListener('submit',e=>e.preventDefault());refresh.addEventListener('click',load);load();
}
async function boot(){
 const a=el('div');a.id='panitiaAuth';const panel=el('section'),h=el('h1','Monitoring Pelatihan Pegawai'),p=el('p','Memeriksa sesi…');p.id='panitiaAuthMessage';p.setAttribute('role','status');const login=el('a','Masuk dengan Google');login.href=cfg.base+'?page=masuk';login.target='_top';panel.append(h,p,login);a.append(panel);document.body.append(a);
 try{const t=token();identity=await native('muatSesiAplikasiPanitia',t);if(identity.peran==='petugas_kelas'&&['Pengelolaan','ManajemenAkses'].includes(cfg.page)){const home=el('a','Buka Beranda');home.href=cfg.base;home.target='_top';panel.append(home);throw Error('Halaman ini hanya tersedia untuk Admin Pelatihan.');}document.documentElement.classList.add('panitia-app');refreshIdentity();a.hidden=true;document.documentElement.removeAttribute('data-panitia-locked');touch();absoluteTimer=setTimeout(()=>lock('Batas sesi 4 jam tercapai. Silakan masuk kembali.',true),Math.max(0,identity.expires-Date.now()));resolveReady();requests();}
 catch(e){lock(e.message||'Silakan masuk dengan akun Google panitia.',/SESI_BERAKHIR/.test(e.message||''));rejectReady(e);}
}
window.addEventListener('pagehide',()=>document.documentElement.setAttribute('data-panitia-locked',''));
window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
}());</script>`.replace('__CONFIG__',()=>jsonHalamanAkses_(config));}

function tujuanCallbackAkses_(state){const raw=cacheLoginAkses_().get('GOOGLE-AKSES|'+state);return raw?(JSON.parse(raw).tujuan||'uji_identitas'):'uji_identitas';}

function periksaPaketLoginPanitia_(){
 const checks=[['Code.gs',typeof databasePelatihan_==='function'&&String(muatAwalIndex).includes('saringAwalPanitia_')&&String(muatAwalIndex).includes('wajibEndpointAkses_')],['Hapus.gs',String(hapusDataIndex).includes('wajibEndpointAkses_')],['Laporan.gs',String(buatPDFLaporanProgram).includes('wajibEndpointAkses_')],['Jenjang.gs',String(muatJenjangProgramIndex).includes('dalamJenjangAkses_')],['PemetaanJenjang.gs',String(bacaSnapshotPratinjauJenjang_).includes('databasePelatihan_')]];
 const html=HtmlService.createHtmlOutputFromFile('Index').getContent();checks.push(['Index.html',html.includes('data-kehadiran')&&html.includes('panitiaIdentity')]);
 const missing=checks.filter(x=>!x[1]).map(x=>x[0]);if(missing.length)throw Error('Paket login belum lengkap. Ganti seluruh file tahap 4, khususnya: '+missing.join(', ')+'. Simpan dan perbarui versi deployment sebelum aktivasi.');
}
