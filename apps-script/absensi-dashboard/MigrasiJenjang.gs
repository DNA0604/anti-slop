/** Migrasi eksplisit untuk SALINAN database: satu Jenjang yang ditinjau per program lama. */
function bukaPersiapanStrukturJenjang(){
  wajibPemilikIndex_();
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutputFromFile('MigrasiJenjang').setWidth(1000).setHeight(800),'Persiapan Struktur Jenjang');
}
function muatPersiapanStrukturJenjang(){
  wajibPemilikIndex_();const lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    const state=statusMigrasiJenjang_();
    if(state&&!['DIBATALKAN'].includes(state.status))return {sukses:true,status:state.status,transaksi:state.tx,pesan:state.status==='SELESAI'?'Struktur Jenjang sudah selesai disiapkan.':'Ada persiapan/migrasi yang perlu diperiksa dan dilanjutkan.',sumber:SpreadsheetApp.getActiveSpreadsheet().getName()};
    const r=bacaSnapshotPratinjauJenjang_();
    if(r.ringkasan.struktur_baru)throw Error('Sudah ada struktur Jenjang. Migrasi awal tidak boleh dijalankan ulang atau menimpa data.');
    return {sukses:true,status:'BELUM_DIMIGRASI',versi:r.versi,sumber:r.sumber,masalah:r.ringkasan.masalah,
      program:r.program.map(p=>({id:p.id,nama:p.nama,jenjang_lama:p.jenjang_lama,nama_jenjang:p.usulan||(!p.jenjang_lama?'Umum':''),status:p.status,jumlah_sesi:p.jumlah_sesi,jumlah_keikutsertaan:p.jumlah_keikutsertaan})),
      dapat_diproses:r.ringkasan.masalah===0&&r.program.every(p=>['usulan_tunggal','perlu_jenjang'].includes(p.status))};
  }finally{lock.releaseLock();}
}
function tulisAuditMigrasiJenjang_(state,status,payload,backup){
  const sheet=SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Riwayat_Validasi'),h=sheet.getDataRange().getValues()[0].map(v=>String(v).trim());
  const row={id_riwayat:'RV-'+Utilities.getUuid(),jenis_data:'Program',id_referensi:'STRUKTUR_JENJANG',jenis_tindakan:backup?'cadangan_migrasi_jenjang':'migrasi_jenjang',kolom_diubah:'Jenjang;Sesi.id_jenjang;Keikutsertaan.id_jenjang',nilai_sebelum:backup?JSON.stringify(payload.chunk):'',nilai_sesudah:JSON.stringify(backup?{bagian:payload.bagian}:payload||{}),alasan_perubahan:'Persiapan Jenjang pada salinan database, dikonfirmasi pengelola.',diubah_oleh:Session.getActiveUser().getEmail(),waktu_perubahan:new Date(),id_transaksi_perubahan:state.tx,status_transaksi:status};
  const required=Object.keys(row);if(required.some(k=>!h.includes(k)))throw Error('Header audit migrasi belum lengkap.');
  sheet.appendRow(h.map(k=>row[k]===undefined?'':row[k]));SpreadsheetApp.flush();
}
function simpanStatusMigrasiJenjang_(state){
  const props=PropertiesService.getScriptProperties(),raw=JSON.stringify(state);props.setProperty(kunciMigrasiJenjang_(),raw);
  if(props.getProperty(kunciMigrasiJenjang_())!==raw)throw Error('Status migrasi belum terverifikasi. Jangan mengubah struktur secara manual.');
}
function serialMigrasiJenjang_(value){return JSON.stringify(value,function(k,v){return this[k] instanceof Date?{$date:this[k].toISOString()}:v;});}
function muatCadanganMigrasiJenjang_(state){
  const rows=bacaMentahJenjang_('Riwayat_Validasi').records.filter(r=>String(r.id_transaksi_perubahan)===state.tx&&r.jenis_tindakan==='cadangan_migrasi_jenjang'),parts=new Map();
  rows.forEach(r=>{const n=JSON.parse(r.nilai_sesudah).bagian;if(!Number.isInteger(n)||n<0||n>=state.bagian||parts.has(n))throw Error('Bagian cadangan migrasi tidak valid/duplikat.');const chunk=JSON.parse(r.nilai_sebelum);if(typeof chunk!=='string')throw Error('Cadangan migrasi bukan teks.');parts.set(n,chunk);});
  if(parts.size!==state.bagian)throw Error('Cadangan persiapan belum lengkap. Jika status MENYIAPKAN, gunakan Batalkan Persiapan lalu buat pratinjau baru.');
  const raw=Array.from({length:state.bagian},(_,i)=>parts.get(i)).join('');
  if(hashPratinjauJenjang_(raw)!==state.hash)throw Error('Sidik cadangan migrasi berbeda. Proses dihentikan.');
  return JSON.parse(raw,(k,v)=>v&&typeof v==='object'&&Object.keys(v).length===1&&v.$date?new Date(v.$date):v);
}
function mulaiMigrasiJenjang(d){
  wajibPemilikIndex_();d=d||{};
  if(d.salinan!==true||d.konfirmasi!==true||!/^[a-zA-Z0-9_-]{16,100}$/.test(String(d.id_permintaan||''))||!Array.isArray(d.pemetaan))throw Error('Periksa salinan proyek, pemetaan dan konfirmasi terlebih dahulu.');
  const signature=hashPratinjauJenjang_(JSON.stringify({versi:d.versi,pemetaan:d.pemetaan})),lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    const old=statusMigrasiJenjang_();
    if(old&&old.status!=='DIBATALKAN'){
      if(old.signature!==signature||old.request!==d.id_permintaan)throw Error('Ada migrasi sebelumnya. Muat Ulang dan gunakan Periksa / Lanjutkan dengan rencana yang tersimpan.');
      if(old.status==='SELESAI')return {sukses:true,pesan:'Migrasi ini sudah selesai; data tidak ditambahkan ulang.'};
      return lanjutRencanaMigrasiJenjang_(old);
    }
    const snapshot=bacaSnapshotPratinjauJenjang_();
    if(snapshot.versi!==d.versi)throw Error('Sumber berubah sejak pratinjau. Muat ulang dan periksa pemetaan kembali.');
    if(snapshot.ringkasan.masalah||snapshot.ringkasan.struktur_baru||snapshot.program.some(p=>!['usulan_tunggal','perlu_jenjang'].includes(p.status)))throw Error('Pemetaan terhalang masalah data/kelompok ambigu/struktur sebelumnya. Periksa pratinjau baca saja.');
    const mapping=new Map();d.pemetaan.forEach(r=>{const id=String(r.id_program||'').trim(),nama=String(r.nama_jenjang||'').trim();if(mapping.has(id)||!nama||nama.length>100||nama.startsWith('='))throw Error('Nama/pasangan pemetaan Jenjang tidak valid.');mapping.set(id,nama);});
    if(mapping.size!==snapshot.program.length||snapshot.program.some(p=>!mapping.has(p.id)))throw Error('Pemetaan harus mencakup tepat seluruh program pada pratinjau.');
    const ss=SpreadsheetApp.getActiveSpreadsheet(),tables={};
    ['Program','Sesi','Keikutsertaan'].forEach(n=>{const range=ss.getSheetByName(n).getDataRange();tables[n]={values:range.getValues(),formulas:range.getFormulas()};});
    if(tables.Sesi.values.length+tables.Keikutsertaan.values.length>5002)throw Error('Migrasi awal mendukung maksimal 5.000 baris sesi dan keikutsertaan.');
    const now=new Date(),jenjang=[['id_jenjang','id_program','nama_jenjang','created_at','updated_at']],ids={};let nomor=batasNomorIdHapus_('JEN');
    snapshot.program.forEach(p=>{const id='JEN'+String(++nomor).padStart(3,'0');ids[p.id]=id;jenjang.push([id,p.id,mapping.get(p.id),now,now]);});
    const plan={tables,jenjang,ids,versi:d.versi},raw=serialMigrasiJenjang_(plan);
    if(raw.length>2000000)throw Error('Cadangan migrasi melebihi 2 juta karakter. Tidak ada struktur diubah.');
    const chunks=[];for(let at=0;at<raw.length;){let end=Math.min(at+16000,raw.length);const code=raw.charCodeAt(end-1);if(end<raw.length&&code>=0xD800&&code<=0xDBFF)end--;chunks.push(raw.slice(at,end));at=end;}
    const state={schema:1,status:'MENYIAPKAN',tx:'MIGRASI-JENJANG|'+d.id_permintaan,request:d.id_permintaan,signature,hash:hashPratinjauJenjang_(raw),bagian:chunks.length};
    simpanStatusMigrasiJenjang_(state);
    chunks.forEach((chunk,bagian)=>tulisAuditMigrasiJenjang_(state,'CADANGAN',{chunk,bagian},true));
    muatCadanganMigrasiJenjang_(state);
    return lanjutRencanaMigrasiJenjang_(state);
  }finally{lock.releaseLock();}
}
function periksaSumberMigrasiJenjang_(plan,final){
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(plan.tables).forEach(name=>{
    const old=plan.tables[name],sheet=ss.getSheetByName(name);if(!sheet)throw Error('Sumber migrasi hilang: '+name);
    const range=sheet.getDataRange(),values=range.getValues(),formulas=range.getFormulas(),width=old.values[0].length;
    if(values.length!==old.values.length||values[0].length<width||values[0].length>width+(name==='Program'?0:1))throw Error('Ukuran sumber berubah di luar migrasi: '+name);
    if(serialMigrasiJenjang_(values.map(r=>r.slice(0,width)))!==serialMigrasiJenjang_(old.values)||JSON.stringify(formulas.map(r=>r.slice(0,width)))!==JSON.stringify(old.formulas))throw Error('Nilai/formula sumber berubah di luar migrasi: '+name);
    if(name!=='Program'){
      const pi=old.values[0].map(v=>String(v).trim()).indexOf('id_program');
      values.forEach((row,i)=>{const expected=i===0?'id_jenjang':plan.ids[String(row[pi]||'').trim()]||'',actual=row[width]||'';if((actual&&actual!==expected)||(final&&actual!==expected)||(formulas[i][width]||''))throw Error('Kolom Jenjang tidak sesuai rencana pada '+name+' baris '+(i+1));});
    }
  });
  const sheet=ss.getSheetByName('Jenjang');
  if(sheet){const range=sheet.getDataRange(),values=range.getValues(),formulas=range.getFormulas();if(values.length>plan.jenjang.length||values[0].length>5)throw Error('Sheet Jenjang memiliki data di luar rencana migrasi.');values.forEach((row,i)=>row.forEach((v,j)=>{if((v!==''&&v!=null&&serialMigrasiJenjang_(v)!==serialMigrasiJenjang_(plan.jenjang[i][j]))||formulas[i][j])throw Error('Isi Jenjang berubah di luar rencana.');}));if(final&&serialMigrasiJenjang_(values)!==serialMigrasiJenjang_(plan.jenjang))throw Error('Verifikasi akhir sheet Jenjang belum sesuai.');}
  else if(final)throw Error('Sheet Jenjang belum tersedia.');
}
/** Caller owns ScriptLock. Every replay accepts only blank or exactly planned new cells. */
function lanjutRencanaMigrasiJenjang_(state){
  const plan=muatCadanganMigrasiJenjang_(state),ss=SpreadsheetApp.getActiveSpreadsheet();
  periksaSumberMigrasiJenjang_(plan,false);
  state.status='PENDING';simpanStatusMigrasiJenjang_(state);tulisAuditMigrasiJenjang_(state,'PENDING',{hash:state.hash});
  const sheet=ss.getSheetByName('Jenjang')||ss.insertSheet('Jenjang');sheet.getRange(1,1,plan.jenjang.length,5).setValues(plan.jenjang);SpreadsheetApp.flush();
  for(const name of ['Sesi','Keikutsertaan']){
    const old=plan.tables[name],width=old.values[0].length,pi=old.values[0].map(v=>String(v).trim()).indexOf('id_program');
    const col=old.values.map((row,i)=>[i===0?'id_jenjang':plan.ids[String(row[pi]||'').trim()]||'']);
    ss.getSheetByName(name).getRange(1,width+1,col.length,1).setValues(col);SpreadsheetApp.flush();
  }
  periksaSumberMigrasiJenjang_(plan,true);
  tulisAuditMigrasiJenjang_(state,'SELESAI',{hash:state.hash,jumlah_jenjang:plan.jenjang.length-1});state.status='SELESAI';simpanStatusMigrasiJenjang_(state);
  return {sukses:true,pesan:'Struktur Jenjang berhasil disiapkan. ID, nilai, formula dan riwayat lama tetap dipertahankan. Muat ulang aplikasi salinan untuk pengujian.'};
}
function lanjutkanMigrasiJenjang(){
  wajibPemilikIndex_();const lock=LockService.getScriptLock();lock.waitLock(30000);
  try{const state=statusMigrasiJenjang_();if(!state||state.status==='DIBATALKAN')throw Error('Tidak ada migrasi untuk dilanjutkan.');if(state.status==='SELESAI')return {sukses:true,pesan:'Migrasi sudah selesai.'};return lanjutRencanaMigrasiJenjang_(state);}finally{lock.releaseLock();}
}
function batalkanPersiapanMigrasiJenjang(){
  wajibPemilikIndex_();const lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    const state=statusMigrasiJenjang_();if(!state||state.status!=='MENYIAPKAN')throw Error('Hanya persiapan sebelum perubahan struktur yang dapat dibatalkan.');
    if(bacaMentahJenjang_('Jenjang',true)||['Sesi','Keikutsertaan'].some(n=>bacaMentahJenjang_(n).header.includes('id_jenjang')))throw Error('Struktur sudah berubah. Jangan membatalkan; periksa / lanjutkan migrasi.');
    tulisAuditMigrasiJenjang_(state,'DIBATALKAN',{alasan:'Persiapan ditutup sebelum perubahan struktur.'});state.status='DIBATALKAN';simpanStatusMigrasiJenjang_(state);return {sukses:true,pesan:'Persiapan ditutup. Muat ulang pratinjau untuk menyiapkan rencana baru.'};
  }finally{lock.releaseLock();}
}
