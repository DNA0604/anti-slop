/** Struktur operasional Jenjang. Identitas/aturan penilaian tetap pada model lama. */
function bacaMentahJenjang_(name, optional) {
  const sheet=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if(!sheet){if(optional)return null;throw Error('Sheet '+name+' belum tersedia.');}
  const values=sheet.getDataRange().getValues(),header=(values[0]||[]).map(v=>String(v==null?'':v).trim());
  if(new Set(header.filter(Boolean)).size!==header.filter(Boolean).length)throw Error('Header duplikat pada '+name+'.');
  return {header,records:values.slice(1).filter(row=>row.some(v=>v!==''&&v!=null)).map(row=>Object.fromEntries(header.map((h,i)=>[h,row[i]])))};
}
function kunciMigrasiJenjang_(){return 'MIGRASI_JENJANG|'+SpreadsheetApp.getActiveSpreadsheet().getId();}
function statusMigrasiJenjang_(){const raw=PropertiesService.getScriptProperties().getProperty(kunciMigrasiJenjang_());return raw?JSON.parse(raw):null;}
function pastikanMigrasiJenjangSiap_(){
  const state=statusMigrasiJenjang_();
  if(state&&!['SELESAI','DIBATALKAN'].includes(state.status))throw Error('Migrasi Jenjang belum selesai. Buka menu Persiapan Struktur Jenjang pada salinan spreadsheet untuk memeriksa / melanjutkan.');
  if(SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Jenjang')&&(!state||state.status!=='SELESAI'||state.schema!==1))throw Error('Versi struktur Jenjang belum terverifikasi. Periksa rencana migrasi dan properti proyek salinan; jangan menambah kolom secara manual.');
}
function konteksJenjang_(idProgram,idJenjang,wajib) {
  pastikanMigrasiJenjangSiap_();
  const txt=v=>String(v==null?'':v).trim(),p=txt(idProgram),id=txt(idJenjang),table=bacaMentahJenjang_('Jenjang',true);
  if(!table){
    if(id)throw Error('Struktur Jenjang belum dimigrasikan.');
    for(const n of ['Sesi','Keikutsertaan'])if(bacaMentahJenjang_(n).header.includes('id_jenjang'))throw Error('Struktur Jenjang sebagian; periksa migrasi sebelum menggunakan aplikasi.');
    return {aktif:false,id:'',daftar:[]};
  }
  if(!['id_jenjang','id_program','nama_jenjang'].every(k=>table.header.includes(k)))throw Error('Header Jenjang tidak sesuai.');
  const seen=new Set();table.records.forEach(r=>{const k=txt(r.id_jenjang);if(!k||seen.has(k)||!txt(r.id_program)||!txt(r.nama_jenjang))throw Error('Data Jenjang kosong/duplikat.');seen.add(k);});
  for(const n of ['Sesi','Keikutsertaan'])if(!bacaMentahJenjang_(n).header.includes('id_jenjang'))throw Error('Struktur Jenjang sebagian; kolom id_jenjang belum ada pada '+n+'.');
  const daftar=table.records.filter(r=>txt(r.id_program)===p).map(r=>({id:txt(r.id_jenjang),nama:txt(r.nama_jenjang),id_program:p}));
  if(id&&!daftar.some(r=>r.id===id))throw Error('Jenjang tidak ditemukan pada program yang dipilih.');
  const selected=id||(wajib&&daftar.length===1?daftar[0].id:'');
  if(wajib&&!selected)throw Error('Pilih satu Jenjang tujuan terlebih dahulu.');
  return {aktif:true,id:selected,daftar};
}
function kolomJenjang_(idProgram,idJenjang){const c=konteksJenjang_(idProgram,idJenjang,true);return c.aktif?{id_jenjang:c.id}:{};}
function namaJenjangProgram_(idProgram,legacy){const c=konteksJenjang_(idProgram,'',false);return c.aktif?c.daftar.map(j=>j.nama).join(', '):String(legacy||'');}
function muatJenjangProgramIndex(idProgram){wajibPemilikIndex_();pastikanProgramPeserta_(idProgram);return Object.assign({sukses:true},konteksJenjang_(idProgram,'',false));}
function tambahJenjangProgramIndex(d){
  wajibPemilikIndex_();d=d||{};const p=String(d.id_program||'').trim(),nama=String(d.nama||'').trim(),request=String(d.id_permintaan||'').trim();
  if(!nama||nama.length>100||nama.startsWith('=')||!/^[a-zA-Z0-9_-]{16,100}$/.test(request))throw Error('Nama Jenjang / ID permintaan tidak valid.');
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    pastikanTidakAdaHapusTertunda_();pastikanProgramPeserta_(p);
    if(!konteksJenjang_(p,'',false).aktif)throw Error('Jalankan persiapan struktur Jenjang terlebih dahulu.');
    return pembuatanKelola_('Jenjang',{id_program:p,nama},request,()=>{
      const t=tabelIndex_('Jenjang',['id_jenjang','id_program','nama_jenjang','created_at','updated_at']);
      if(t.records.some(r=>String(r.id_program).trim()===p&&String(r.nama_jenjang).trim().toLowerCase()===nama.toLowerCase()))throw Error('Nama Jenjang sudah digunakan pada program ini.');
      const id=nomorIdKelola_(t.records,'id_jenjang','JEN'),now=new Date();
      return {id,writes:[{sheet:'Jenjang',id_column:'id_jenjang',record:{id_jenjang:id,id_program:p,nama_jenjang:nama,created_at:now,updated_at:now}}],hasil:{id_jenjang:id,pesan:'Jenjang berhasil ditambahkan.'}};
    });
  }finally{lock.releaseLock();}
}
/** Called by tabelIndex_ without recursively calling that reader. */
function validasiTabelJenjang_(name,table){
  pastikanMigrasiJenjangSiap_();
  if(!['Sesi','Keikutsertaan','Kehadiran','Catatan_Perilaku','Log_Absensi'].includes(name))return;
  const jenjang=bacaMentahJenjang_('Jenjang',true);if(!jenjang)return;
  const txt=v=>String(v==null?'':v).trim(),js=new Map();
  jenjang.records.forEach(j=>{const id=txt(j.id_jenjang);if(!id||js.has(id))throw Error('ID Jenjang kosong/duplikat.');js.set(id,j);});
  if(['Sesi','Keikutsertaan'].includes(name)){
    if(!table.header.includes('id_jenjang'))throw Error('Kolom id_jenjang belum tersedia pada '+name+'.');
    table.records.forEach(r=>{const j=js.get(txt(r.id_jenjang));if(!j||txt(j.id_program)!==txt(r.id_program))throw Error('Relasi Jenjang tidak sesuai pada '+name+' '+txt(r.id_sesi||r.id_keikutsertaan)+'.');});
  }else{
    const sessions=bacaMentahJenjang_('Sesi').records,members=bacaMentahJenjang_('Keikutsertaan').records;
    const unique=(list,key)=>{const m=new Map();list.forEach(r=>{const id=txt(r[key]);if(!id||m.has(id))throw Error('ID relasi kosong/duplikat pada '+key+'.');m.set(id,r);});return m;};
    const sm=unique(sessions,'id_sesi'),km=unique(members,'id_keikutsertaan');
    table.records.forEach(r=>{
      const sid=txt(r.id_sesi),kid=txt(r.id_keikutsertaan),accepted=name==='Log_Absensi'&&txt(r.status_scan).toLowerCase()==='diterima';
      if((name==='Kehadiran'||accepted)&&(!sid||!kid)||name==='Catatan_Perilaku'&&(!kid||!sid&&txt(r.cakupan_kejadian)!=='program'))throw Error('Relasi sesi / peserta Jenjang belum lengkap pada '+name+'.');
      const s=sid?sm.get(sid):null,k=kid?km.get(kid):null;
      if(sid&&!s||kid&&!k||s&&k&&!sesuaiJenjang_(s,k))throw Error('Relasi sesi / peserta lintas Jenjang pada '+name+'. Periksa data terlebih dahulu.');
    });
  }
}
/** Shared mutation guard also covers older entry points that use their own raw readers. */
function validasiIntegritasOperasionalJenjang_(){
  pastikanMigrasiJenjangSiap_();
  if(!bacaMentahJenjang_('Jenjang',true))return;
  for(const name of ['Sesi','Keikutsertaan','Kehadiran','Catatan_Perilaku','Log_Absensi'])validasiTabelJenjang_(name,bacaMentahJenjang_(name));
}

/** Migrasi eksplisit untuk SALINAN database: satu Jenjang yang ditinjau per program lama. */
function bukaPersiapanStrukturJenjang(){
  wajibPemilikIndex_();
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(halamanMigrasiJenjang_()).setWidth(1000).setHeight(800),'Persiapan Struktur Jenjang');
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

/** Tampilan panel disertakan agar cukup satu file Script Jenjang. */
function halamanMigrasiJenjang_() {
  return String.raw`<!doctype html><html lang="id"><head><base target="_top"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Persiapan Struktur Jenjang</title><style>
    :root{font-family:"Avenir Next",Avenir,"Segoe UI",Arial,sans-serif;color:#192e50;background:#f0f3f8;font-size:14px}
    *{box-sizing:border-box}body{margin:0;padding:24px}button,input,select{font:inherit}button{cursor:pointer;border:1px solid #d9e1ed;background:white;color:#203960;border-radius:12px;padding:11px 16px;min-height:44px;font-weight:600}button.primary{background:#203960;color:white;border-color:#203960}button:disabled{opacity:.5;cursor:wait}button:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #d99616;outline-offset:3px}
    h1{font-size:25px;line-height:1.25;margin:8px 0}h2{font-size:18px;margin:0 0 12px}h3{font-size:15px;margin:20px 0 10px}p{line-height:1.65;margin:8px 0}.muted{color:#61718b}.eyebrow{text-transform:uppercase;letter-spacing:.12em;font-size:11px;font-weight:700;color:#61718b}.header{display:flex;justify-content:space-between;align-items:center;gap:20px;margin-bottom:20px}.actions{display:flex;gap:8px;flex-wrap:wrap}.card{padding:24px;background:white;border:1px solid #dce3ef;border-radius:22px;margin-bottom:18px;min-width:0}.notice{background:#e9eff8;border-radius:12px;padding:14px 18px;line-height:1.6}.error{background:#fff0f1;color:#9d2938;border:1px solid #efc6cd}.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:18px 0}.stat{border:1px solid #dce3ef;background:white;border-radius:18px;padding:18px}.stat strong{font-size:28px;display:block;margin:5px 0}.toolbar{display:flex;gap:12px;margin:18px 0}.field{flex:1;min-width:0}label{display:block;font-weight:600;font-size:12px;margin-bottom:7px}input,select{width:100%;min-height:44px;padding:10px 12px;border:1px solid #d5deec;border-radius:12px;background:white;color:#192e50}.scroll{overflow:auto;border:1px solid #e0e6ef;border-radius:14px}table{border-collapse:collapse;width:100%;text-align:left;font-size:13px}th,td{padding:14px;vertical-align:top;border-bottom:1px solid #e5ebf4}th{background:#f4f6fa;font-size:11px;text-transform:uppercase;letter-spacing:.03em;color:#526685}tr:last-child td{border-bottom:0}td{overflow-wrap:anywhere}.program-table{min-width:790px}.badge{display:inline-block;font-size:12px;line-height:1.4;border-radius:8px;padding:6px 9px;background:#edf2f9;color:#304c72}.badge.block{background:#fff0f1;color:#9d2938}.badge.review{background:#fff5de;color:#785512}.sub{display:block;font-size:12px;color:#61718b;margin-top:5px}.empty{padding:24px;text-align:center;color:#61718b}.pager{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:14px}.metadata{overflow-wrap:anywhere;font-size:12px}.finding{padding:14px 0;border-bottom:1px solid #e4eaf2}.finding:last-child{border:0}.finding p{margin:5px 0}.finding b{font-size:12px}.counts{display:flex;flex-wrap:wrap;gap:10px;margin:16px 0}.counts span{border-radius:9px;background:#f0f3f8;padding:9px 12px}.details-grid>section,.dialog-head>div{min-width:0}.details-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}dialog{width:min(1000px,calc(100vw - 24px));max-height:90vh;border:1px solid #dce3ef;border-radius:22px;padding:24px;color:#192e50}dialog::backdrop{background:#192e5080}.dialog-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;position:sticky;top:-24px;background:white;padding:10px 0;z-index:1}.detail-table{min-width:350px}#detailFindings{margin-top:20px}#result[hidden],#error[hidden],#loading[hidden]{display:none}.list-limit{font-size:12px;color:#61718b}.footer{font-size:12px;color:#61718b;margin:20px 0}.break{overflow-wrap:anywhere}
    @media(max-width:650px){body{padding:14px}.header{align-items:flex-start;flex-direction:column}.card{padding:18px}.stats{grid-template-columns:repeat(2,minmax(0,1fr))}.toolbar,.details-grid{display:flex;flex-direction:column}.pager{flex-wrap:wrap}.actions{width:100%}.actions button{flex:1}h1{font-size:22px}dialog{padding:18px}.dialog-head{top:-18px}.metadata{font-size:11px}}
  </style></head><body>
<header class="header"><div><div class="eyebrow">Persiapan pada salinan database</div><h1>Struktur Jenjang Pelatihan</h1><p class="muted">Satu Jenjang awal untuk setiap program lama. Jenjang berikutnya ditambahkan melalui Pengelolaan.</p></div><button id="reload" type="button">Muat Ulang</button></header>
<div class="notice">Gunakan <strong>salinan spreadsheet dan proyek Apps Script</strong>. Proses menambahkan sheet Jenjang serta kolom id_jenjang pada Sesi dan Keikutsertaan. ID lama, rumus, nilai dan histori tetap dipertahankan.</div>
<p id="status" role="status" aria-live="polite">Memuat pemeriksaan sumber…</p><p id="error" class="notice error" role="alert" hidden></p>
<section id="mapping" class="card" hidden><h2>Pemetaan yang Akan Digunakan</h2><p id="source" class="muted"></p><div class="scroll"><table><thead><tr><th>Program</th><th>Sesi / Keikutsertaan</th><th>Nama Jenjang Tujuan</th></tr></thead><tbody id="rows"></tbody></table></div><p class="foot">Umum digunakan untuk program tanpa tingkatan. Periksa nama dan pastikan satu program lama tidak mencampur beberapa kelompok.</p></section>
<section id="recovery" class="card" hidden><h2>Migrasi Tersimpan</h2><p id="recoveryInfo" class="break"></p><p class="muted">Kelanjutan memakai rencana dan cadangan sebelumnya. Data baru atau perubahan di luar rencana akan menghentikan proses.</p></section>
<section id="actions" class="card" hidden><label><input id="copy" type="checkbox" style="width:auto;min-height:0"> Saya menggunakan salinan spreadsheet/proyek untuk pengujian.</label><label><input id="reviewed" type="checkbox" style="width:auto;min-height:0"> Pemetaan telah diperiksa; setiap program lama merupakan satu kelompok Jenjang.</label><p>Cadangan rencana disimpan pada Riwayat_Validasi. Bila proses terputus, penulisan aplikasi ditahan sampai migrasi selesai atau persiapan yang belum mengubah struktur dibatalkan.</p><div class="actions"><button id="start" class="primary" type="button" disabled>Siapkan Struktur Jenjang</button><button id="resume" class="primary" type="button" hidden disabled>Periksa / Lanjutkan</button><button id="cancelPrepare" type="button" hidden>Batalkan Persiapan</button></div></section>
<dialog id="confirm" aria-labelledby="confirmTitle"><h2 id="confirmTitle">Lanjutkan persiapan struktur Jenjang?</h2><p>Pastikan sumber adalah salinan database. Proses akan memakai pemetaan yang telah diperiksa dan mempertahankan data lama.</p><div class="actions"><button id="cancel" type="button" autofocus>Kembali</button><button id="approve" class="primary" type="button">Ya, Lanjutkan pada Salinan</button></div></dialog>
<script>
(function(){'use strict';const $=id=>document.getElementById(id);let state=null,busy=false,payload=null,action='';
function rpc(name,...args){return new Promise((ok,bad)=>google.script.run.withSuccessHandler(ok).withFailureHandler(bad)[name](...args));}
function node(tag,text){const n=document.createElement(tag);n.textContent=text;return n;}
function controls(){const agreed=$('copy').checked&&$('reviewed').checked;$('start').disabled=busy||!agreed||!state||!state.dapat_diproses;$('resume').disabled=busy||!agreed;$('reload').disabled=busy;$('cancelPrepare').disabled=busy;document.querySelectorAll('#rows input').forEach(i=>i.disabled=busy);}
async function load(){if(busy)return;busy=true;state=null;$('mapping').hidden=$('recovery').hidden=$('actions').hidden=true;$('error').hidden=true;$('status').textContent='Memeriksa sumber…';controls();try{state=await rpc('muatPersiapanStrukturJenjang');if(!state||!state.sukses)throw Error('Hasil pemeriksaan belum tersedia.');$('status').textContent=state.pesan||'Periksa seluruh pemetaan sebelum menyiapkan struktur.';$('rows').replaceChildren();if(state.status==='BELUM_DIMIGRASI'){$('mapping').hidden=false;$('source').textContent=state.sumber+' · '+state.masalah+' masalah data';(state.program||[]).forEach(p=>{const tr=node('tr',''),name=node('td',p.nama+' · '+p.id),count=node('td',p.jumlah_sesi+' sesi / '+p.jumlah_keikutsertaan+' keikutsertaan'),cell=node('td',''),i=document.createElement('input');i.value=p.nama_jenjang;i.maxLength=100;i.required=true;i.dataset.program=p.id;i.setAttribute('aria-label','Jenjang tujuan '+p.nama);i.addEventListener('input',()=>{payload=null;$('reviewed').checked=false;controls();});cell.append(i);tr.append(name,count,cell);$('rows').append(tr);});$('actions').hidden=false;$('start').hidden=false;$('resume').hidden=$('cancelPrepare').hidden=true;if(!state.dapat_diproses)$('status').textContent='Ada masalah atau kelompok ambigu. Periksa panel pratinjau baca saja terlebih dahulu.';}else if(state.status!=='SELESAI'){$('recovery').hidden=$('actions').hidden=false;$('recoveryInfo').textContent=state.sumber+' · '+state.status+' · '+state.transaksi;$('start').hidden=true;$('resume').hidden=false;$('cancelPrepare').hidden=state.status!=='MENYIAPKAN';}}catch(e){$('status').textContent='Pemeriksaan belum berhasil.';$('error').textContent=e.message||'Gagal membaca data.';$('error').hidden=false;}finally{busy=false;controls();}}
async function run(){if(busy)return;busy=true;controls();$('error').hidden=true;$('status').textContent='Memeriksa dan menjalankan rencana. Jangan mengedit spreadsheet selama proses berlangsung…';try{const r=action==='start'?await rpc('mulaiMigrasiJenjang',payload):action==='resume'?await rpc('lanjutkanMigrasiJenjang'):await rpc('batalkanPersiapanMigrasiJenjang');$('status').textContent=r.pesan;payload=null;busy=false;await load();}catch(e){$('error').textContent=(e.message||'Hasil belum terkonfirmasi.')+' Klik Muat Ulang untuk memeriksa status tersimpan sebelum tindakan berikutnya.';$('error').hidden=false;$('status').textContent='Proses perlu diperiksa. Data tidak boleh dipindahkan secara manual.';}finally{busy=false;controls();}}
function ask(type){if(busy)return;if(type!=='cancel'&&(!$('copy').checked||!$('reviewed').checked))return;action=type;if(type==='start'){if(!state||!state.dapat_diproses)return;const inputs=[...document.querySelectorAll('#rows input')];if(inputs.some(i=>!i.reportValidity()))return;payload=payload||{versi:state.versi,id_permintaan:crypto.randomUUID(),salinan:true,konfirmasi:true,pemetaan:inputs.map(i=>({id_program:i.dataset.program,nama_jenjang:i.value.trim()}))};}$('confirmTitle').textContent=type==='cancel'?'Batalkan persiapan sebelum perubahan struktur?':'Lanjutkan persiapan struktur Jenjang?';$('confirm').showModal();}
$('start').addEventListener('click',()=>ask('start'));$('resume').addEventListener('click',()=>ask('resume'));$('cancelPrepare').addEventListener('click',()=>ask('cancel'));$('cancel').addEventListener('click',()=>$('confirm').close());$('approve').addEventListener('click',()=>{$('confirm').close();run();});$('reload').addEventListener('click',()=>{payload=null;load();});['copy','reviewed'].forEach(id=>$(id).addEventListener('change',controls));load();
}());
</script></body></html>`;
}
