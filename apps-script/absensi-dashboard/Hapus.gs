/** Penghapusan fisik, hanya pemilik. Cadangan/audit dipertahankan; tidak menyentuh Drive. */
function skemaHapus_() {
  const schema={
    Program: ['id_program'], Peserta: ['id_peserta'],
    Keikutsertaan: ['id_keikutsertaan','id_program','id_peserta'],
    Sesi: ['id_sesi','id_program'], Jeda_Sesi: ['id_jeda','id_sesi'],
    Kehadiran: ['id_kehadiran','id_sesi','id_keikutsertaan'],
    Catatan_Perilaku: ['id_catatan','id_sesi','id_keikutsertaan','id_kehadiran'],
    Token_QR: ['id_token_qr','id_sesi'],
    Log_Absensi: ['id_log','id_sesi','id_keikutsertaan','id_token_qr']
  };
  if(typeof bacaMentahJenjang_==='function'&&bacaMentahJenjang_('Jenjang',true))schema.Jenjang=['id_jenjang','id_program'];
  return schema;
}
function teksHapus_(v) { return String(v == null ? '' : v).trim(); }
function nilaiHapus_(v) { return v instanceof Date ? {$date:v.toISOString()} : v; }
function auditHapus_() {
  const sheet=SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Riwayat_Validasi');if(!sheet)throw Error('Sheet Riwayat_Validasi tidak ditemukan.');
  const values=sheet.getDataRange().getValues(),header=values[0].map(teksHapus_),required=['id_riwayat','jenis_data','id_referensi','jenis_tindakan','kolom_diubah','nilai_sebelum','nilai_sesudah','alasan_perubahan','diubah_oleh','waktu_perubahan','id_transaksi_perubahan','status_transaksi'];
  if(required.some(k=>!header.includes(k))||new Set(header.filter(Boolean)).size!==header.filter(Boolean).length)throw Error('Header Riwayat_Validasi tidak sesuai.');
  const records=[];values.slice(1).forEach((row,i)=>{if(!row.some(v=>v!==''&&v!=null))return;const r={__baris:i+2};header.forEach((h,c)=>{if(h)r[h]=row[c];});records.push(r);});return {header,records};
}
function transaksiHapus_() {
  const m=new Map();
  auditHapus_().records.filter(r=>teksHapus_(r.jenis_tindakan).toLowerCase()==='hapus_data').forEach(r=>{const status=statusTransaksiHapus_(r.status_transaksi);if(status)m.set(teksHapus_(r.id_transaksi_perubahan)||'TANPA-ID-BARIS-'+r.__baris,Object.assign({},r,{status_transaksi:status}));});
  return m;
}
function pastikanTidakAdaHapusTertunda_() {
  if(typeof pastikanMigrasiJenjangSiap_==='function')pastikanMigrasiJenjangSiap_();
  if(typeof validasiIntegritasOperasionalJenjang_==='function')validasiIntegritasOperasionalJenjang_();
  if(Array.from(transaksiHapus_().values()).some(r=>!['SELESAI','DIBATALKAN'].includes(r.status_transaksi)))
    throw Error('Ada penghapusan belum selesai. Buka Pengelolaan atau Peserta → Penghapusan tertunda → Periksa / lanjutkan.');
}
/** Read-only audit classification. Blank legacy statuses are not transaction locks. */
function statusTransaksiHapus_(v) { return teksHapus_(v).toUpperCase(); }
function kelompokAuditTransaksiHapus_() {
  const groups=new Map();let legacy=0;
  auditHapus_().records.forEach(r=>{
    if(teksHapus_(r.jenis_tindakan).toLowerCase()==='cadangan_hapus')return;
    const tx=teksHapus_(r.id_transaksi_perubahan),status=statusTransaksiHapus_(r.status_transaksi);
    if(!status){legacy++;return;}
    const key=tx||'TANPA-ID-BARIS-'+r.__baris;
    if(!groups.has(key))groups.set(key,{id:key,rows:[],row:r,status});
    const g=groups.get(key);g.rows.push(r);g.row=r;g.status=status;
  });
  return {legacy,groups:Array.from(groups.values()).filter(g=>!['SELESAI','DIBATALKAN'].includes(g.status))};
}
function petaDataTransaksiHapus_() {
  const maps={},schema=skemaHapus_();
  Object.keys(schema).forEach(name=>maps[name]=new Map(tabelIndex_(name,[schema[name][0]]).records.map(r=>[teksHapus_(r[schema[name][0]]),r])));
  return maps;
}
function cakupanAuditTransaksiHapus_(group,maps) {
  const schema=skemaHapus_(),names=Object.keys(schema).concat(['Aturan_Penilaian','Indikator_Perilaku']),refKeys={};
  Object.keys(schema).forEach(n=>refKeys[schema[n][0]]=n);
  refKeys.id_aturan_penilaian='Aturan_Penilaian';refKeys.id_aturan_penilaian_aktif='Aturan_Penilaian';refKeys.id_indikator='Indikator_Perilaku';
  const canonical=v=>names.find(n=>n.toLowerCase()===teksHapus_(v).toLowerCase())||(teksHapus_(v).toLowerCase()==='impor_peserta'?'Program':'');
  const refs=new Map(),programs=new Set(),people=new Set();let invalid=group.rows.some(r=>!teksHapus_(r.id_transaksi_perubahan)),budget=20000;
  function add(name,id){id=teksHapus_(id);if(name&&id)refs.set(name+'|'+id,{name,id});}
  function scan(value,depth){
    if(--budget<0||depth>20){invalid=true;return;}if(!value||typeof value!=='object')return;
    if(Array.isArray(value)){value.forEach(v=>scan(v,depth+1));return;}
    const name=canonical(value.sheet||value.jenis);if(name&&value.id)add(name,value.id);
    Object.keys(value).forEach(k=>{if(refKeys[k]&&value[k]!=null&&typeof value[k]!=='object')add(refKeys[k],value[k]);if(value[k]&&typeof value[k]==='object')scan(value[k],depth+1);});
  }
  group.rows.forEach(r=>{
    const name=canonical(r.jenis_data);if(!name||!teksHapus_(r.id_referensi))invalid=true;else add(name,r.id_referensi);
    ['nilai_sebelum','nilai_sesudah'].forEach(key=>{const raw=teksHapus_(r[key]);if(!raw)return;try{const parsed=JSON.parse(raw);if(parsed!=null&&typeof parsed!=='object')invalid=true;else scan(parsed,0);}catch(e){invalid=true;}});
  });
  // Resolve parent programs from stored IDs too, including older flat JP/correction audits.
  const queue=Array.from(refs.values()),seen=new Set();
  for(let i=0;i<queue.length;i++){
    const x=queue[i],key=x.name+'|'+x.id;if(seen.has(key))continue;seen.add(key);
    if(x.name==='Program')programs.add(x.id);if(x.name==='Peserta')people.add(x.id);
    const row=maps[x.name]&&maps[x.name].get(x.id);if(!row)continue;
    Object.keys(refKeys).forEach(k=>{const id=teksHapus_(row[k]),name=refKeys[k];if(id&&!(name===x.name&&id===x.id)&&!seen.has(name+'|'+id))queue.push({name,id});});
  }
  const root=canonical(group.row.jenis_data),catalog=['Indikator_Perilaku','Aturan_Penilaian'].includes(root);
  return {refs,programs,people,unknown:invalid||(!programs.size&&!people.size&&!catalog)};
}
function petunjukAuditTransaksiHapus_(g,scope) {
  const action=teksHapus_(g.row.jenis_tindakan).toLowerCase(),program=scope.programs.size===1?Array.from(scope.programs)[0]:'',kind=teksHapus_(g.row.jenis_data),ref=teksHapus_(g.row.id_referensi);
  let saran='Periksa Riwayat_Validasi dan data '+kind+' '+ref+'. Jangan mengubah status menjadi SELESAI tanpa verifikasi data.',page='pengelolaan';
  if(action==='edit_data')saran='Buka Pengelolaan → Pulihkan Edit Tertunda. Sistem memeriksa nilai sebelum melanjutkan edit.';
  else if(action==='impor_peserta_program'||kind==='Impor_Peserta'){page='peserta';saran='Buka Peserta Program'+(program?' untuk '+program:'')+' → Pulihkan Impor Tertunda.';}
  else if(action==='tambah_sesi'||action==='pemulihan_pembuatan_sesi')saran='Buka Pengelolaan'+(program?' untuk '+program:'')+' → Periksa / Pulihkan Sesi.';
  else if(/konfirmasi_jp|perubahan_jp/.test(action))saran='Transaksi konfirmasi JP sesi '+ref+' perlu diperiksa pada Riwayat_Validasi. Pemeriksaan ini tidak menjalankan perhitungan atau pemulihan otomatis.';
  return {id_transaksi:g.id,jenis:kind,referensi:ref,tindakan:action,status:g.status,baris:g.row.__baris,programs:Array.from(scope.programs),program,page,saran,cakupan_tidak_diketahui:scope.unknown};
}
function periksaAuditSebelumHapus_(plan) {
  const audit=kelompokAuditTransaksiHapus_();if(!audit.groups.length)return {legacy:audit.legacy,transaksi:[],blokir:[]};
  const maps=petaDataTransaksiHapus_(),targets=new Set(),programs=new Set(),people=new Set();
  if(plan)plan.tables.forEach(t=>t.rows.forEach(r=>{
    targets.add(t.name+'|'+r.id);const row=Object.fromEntries(t.header.map((k,i)=>[k,r.values[i]]));
    if(t.name==='Program')programs.add(r.id);if(row.id_program)programs.add(teksHapus_(row.id_program));
    if(t.name==='Peserta')people.add(r.id);if(row.id_peserta)people.add(teksHapus_(row.id_peserta));
  }));
  const transaksi=audit.groups.map(g=>{
    const scope=cakupanAuditTransaksiHapus_(g,maps),detail=petunjukAuditTransaksiHapus_(g,scope);
    const deletion=g.rows.some(r=>teksHapus_(r.jenis_tindakan).toLowerCase()==='hapus_data');
    const unknownStatus=!['PENDING','PERLU_PEMULIHAN','MENYIAPKAN'].includes(g.status);
    detail.penghapusan=deletion;
    detail.menghalangi=!plan||deletion||scope.unknown||unknownStatus||Array.from(scope.refs.keys()).some(k=>targets.has(k))||Array.from(scope.programs).some(id=>programs.has(id))||(!scope.programs.size&&Array.from(scope.people).some(id=>people.has(id)));
    return detail;
  });
  return {legacy:audit.legacy,transaksi,blokir:transaksi.filter(t=>t.menghalangi)};
}
function pastikanTransaksiSebelumHapus_(plan) {
  const r=periksaAuditSebelumHapus_(plan);if(!r.blokir.length)return;
  const detail=r.blokir.slice(0,3).map(t=>t.jenis+' '+t.referensi+' — status '+t.status+'; transaksi '+t.id_transaksi+'; Riwayat_Validasi baris '+t.baris+'. '+t.saran).join('\n');
  throw Error('Ada transaksi belum selesai yang terkait data ini atau belum dapat dipastikan cakupannya ('+r.blokir.length+').\n'+detail+'\nBuka kartu Transaksi yang Perlu Diperiksa untuk rincian.');
}

function bacaTabelHapus_(name,required) {
  const sheet=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if(!sheet)throw Error('Sheet tidak ditemukan: '+name+'. Penghapusan dibatalkan.');
  const range=sheet.getDataRange(),values=range.getValues(),formulas=range.getFormulas(),header=values[0].map(teksHapus_);
  if(new Set(header.filter(Boolean)).size!==header.filter(Boolean).length||required.some(k=>!header.includes(k)))throw Error('Header tidak sesuai pada '+name+'.');
  const ids=new Set(),rows=[];
  values.slice(1).forEach((row,i)=>{
    if(!row.some(v=>v!==''&&v!=null))return;
    const record={};header.forEach((h,c)=>{if(h)record[h]=row[c];});const id=teksHapus_(record[required[0]]);
    if(!id||ids.has(id))throw Error('ID kosong/duplikat pada '+name+'. Periksa Data sebelum menghapus.');ids.add(id);
    rows.push({id,record,values:row.map(nilaiHapus_),formulas:formulas[i+1],nomor:i+2});
  });
  return {name,key:required[0],header,rows};
}
function rencanaHapus_(jenis,id,seed) {
  if(typeof pastikanMigrasiJenjangSiap_==='function')pastikanMigrasiJenjangSiap_();
  if(!['Program','Sesi','Keikutsertaan','Peserta'].includes(jenis)||!/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(id))throw Error('Target penghapusan tidak valid.');
  const spec=skemaHapus_(),tables={};Object.keys(spec).forEach(n=>tables[n]=bacaTabelHapus_(n,spec[n]));
  const root=tables[jenis].rows.find(r=>r.id===id);
  if(!root&&!seed)throw Error('Data sudah tidak ditemukan. Muat ulang daftar.');
  const sets={};Object.keys(spec).forEach(n=>sets[n]=new Set());
  if(seed)seed.tables.forEach(t=>t.rows.forEach(r=>sets[t.name].add(r.id)));
  sets[jenis].add(id);
  const txt=teksHapus_,has=(n,v)=>sets[n].has(txt(v));
  const pick=(name,pred)=>tables[name].rows.forEach(r=>{if(pred(r.record))sets[name].add(r.id);});
  if(jenis==='Peserta'&&tables.Keikutsertaan.rows.some(r=>txt(r.record.id_peserta)===id))throw Error('Identitas peserta masih dipakai pada program. Hapus pendaftarannya dari masing-masing program terlebih dahulu; riwayat program lain tetap dilindungi.');
  if(tables.Jenjang)pick('Jenjang',r=>has('Program',r.id_program));
  pick('Sesi',r=>has('Program',r.id_program));
  pick('Keikutsertaan',r=>has('Program',r.id_program));
  pick('Jeda_Sesi',r=>has('Sesi',r.id_sesi));
  pick('Kehadiran',r=>has('Sesi',r.id_sesi)||has('Keikutsertaan',r.id_keikutsertaan));
  pick('Catatan_Perilaku',r=>has('Sesi',r.id_sesi)||has('Keikutsertaan',r.id_keikutsertaan)||has('Kehadiran',r.id_kehadiran));
  pick('Token_QR',r=>has('Sesi',r.id_sesi));
  pick('Log_Absensi',r=>has('Sesi',r.id_sesi)||has('Keikutsertaan',r.id_keikutsertaan)||has('Token_QR',r.id_token_qr));
  // A malformed cross-program row must not cause deletion in the other program.
  const sessionProgram=new Map(tables.Sesi.rows.map(r=>[r.id,txt(r.record.id_program)])),memberProgram=new Map(tables.Keikutsertaan.rows.map(r=>[r.id,txt(r.record.id_program)]));
  ['Kehadiran','Catatan_Perilaku','Log_Absensi'].forEach(n=>tables[n].rows.filter(r=>sets[n].has(r.id)).forEach(r=>{
    const a=sessionProgram.get(txt(r.record.id_sesi)),b=memberProgram.get(txt(r.record.id_keikutsertaan));
    if(a&&b&&(a!==b||(typeof sesuaiJenjang_==='function'&&!sesuaiJenjang_(tables.Sesi.rows.find(s=>s.id===txt(r.record.id_sesi)).record,tables.Keikutsertaan.rows.find(k=>k.id===txt(r.record.id_keikutsertaan)).record))))throw Error('Relasi lintas program/Jenjang pada '+n+' '+r.id+'. Perbaiki relasi sebelum menghapus.');
  }));
  const attendance=new Map(tables.Kehadiran.rows.map(r=>[r.id,r.record])),tokens=new Map(tables.Token_QR.rows.map(r=>[r.id,r.record]));
  tables.Catatan_Perilaku.rows.filter(r=>sets.Catatan_Perilaku.has(r.id)).forEach(r=>{const h=attendance.get(txt(r.record.id_kehadiran));if(h&&(['id_sesi','id_keikutsertaan'].some(k=>txt(r.record[k])&&txt(r.record[k])!==txt(h[k]))))throw Error('Relasi catatan/kehadiran tidak sesuai pada '+r.id+'.');});
  tables.Log_Absensi.rows.filter(r=>sets.Log_Absensi.has(r.id)).forEach(r=>{const t=tokens.get(txt(r.record.id_token_qr));if(t&&txt(r.record.id_sesi)!==txt(t.id_sesi))throw Error('Relasi log/token tidak sesuai pada '+r.id+'.');});
  // Block references from additional/custom sheets rather than silently orphaning them.
  const ref={};Object.keys(spec).forEach(n=>ref[spec[n][0]]=sets[n]);
  Object.keys(tables).forEach(n=>tables[n].rows.filter(r=>!sets[n].has(r.id)).forEach(r=>{if(Object.keys(ref).some(k=>ref[k].has(txt(r.record[k]))))throw Error('Masih ada referensi di luar cakupan pada '+n+' '+r.id+'. Periksa relasinya terlebih dahulu.');}));
  const retained=new Set(['Riwayat_Validasi','Aturan_Penilaian','Indikator_Perilaku']);
  SpreadsheetApp.getActiveSpreadsheet().getSheets().forEach(sheet=>{
    const name=sheet.getName();if(spec[name]||retained.has(name))return;
    const v=sheet.getDataRange().getValues(),header=(v[0]||[]).map(teksHapus_);
    if(v.slice(1).some(row=>header.some((h,c)=>ref[h]&&ref[h].has(txt(row[c])))))throw Error('Data masih dirujuk sheet tambahan '+name+'. Penghapusan belum mendukung relasi ini; periksa terlebih dahulu.');
  });
  // Child-first; Program/Peserta can only disappear after their relations are removed.
  const order=['Log_Absensi','Catatan_Perilaku','Kehadiran','Token_QR','Jeda_Sesi','Sesi','Keikutsertaan','Jenjang','Program','Peserta'];
  const plan={schema:1,jenis,id,nama:seed?seed.nama:txt(root.record.nama_program||root.record.nama_sesi||root.record.nama_pegawai||id),tables:[]};
  if(jenis==='Keikutsertaan'&&root){const p=tables.Peserta.rows.find(p=>p.id===txt(root.record.id_peserta)),g=tables.Program.rows.find(p=>p.id===txt(root.record.id_program));plan.nama=(p?txt(p.record.nama_pegawai):id)+' — '+(g?txt(g.record.nama_program):txt(root.record.id_program));}
  order.filter(n=>tables[n]).forEach(n=>{const t=tables[n],rows=t.rows.filter(r=>sets[n].has(r.id)).map(r=>({id:r.id,values:r.values,formulas:r.formulas})).sort((a,b)=>a.id.localeCompare(b.id));if(rows.length)plan.tables.push({name:n,key:t.key,header:t.header,rows});});
  if(plan.tables.reduce((n,t)=>n+t.rows.length,0)>3000)throw Error('Maksimal 3.000 baris terkait per penghapusan. Hapus per sesi/pendaftaran terlebih dahulu.');
  return plan;
}
function ringkasanHapus_(plan) {
  return {jenis:plan.jenis,id:plan.id,nama:plan.nama,jumlah:plan.tables.map(t=>({sheet:t.name,jumlah:t.rows.length})),total:plan.tables.reduce((n,t)=>n+t.rows.length,0),catatan:'Data terkait akan dihapus dari sheet operasional. Cadangan dan riwayat audit, identitas peserta pada penghapusan program/pendaftaran, katalog indikator, aturan penilaian, serta file bukti di Drive tetap disimpan. Laporan/rekap berikutnya mengikuti data yang tersisa. Tidak tersedia pemulihan otomatis data yang sudah selesai dihapus.'};
}
function pratinjauHapusDataIndex(jenis,id) {
  wajibPemilikIndex_();const lock=LockService.getScriptLock();lock.waitLock(30000);
  try{const plan=rencanaHapus_(teksHapus_(jenis),teksHapus_(id));pastikanTransaksiSebelumHapus_(plan);return Object.assign({sukses:true,versi:versiBarisIndex_(plan)},ringkasanHapus_(plan));}finally{lock.releaseLock();}
}
function batasNomorIdHapus_(prefix) {
  const ss=SpreadsheetApp.getActiveSpreadsheet(),v=PropertiesService.getScriptProperties().getProperty('BATAS_ID_HAPUS|'+ss.getId());
  const map=v?JSON.parse(v):{};return Number(map[prefix]||0);
}
function simpanBatasIdHapus_(plan) {
  const props=PropertiesService.getScriptProperties(),key='BATAS_ID_HAPUS|'+SpreadsheetApp.getActiveSpreadsheet().getId(),raw=props.getProperty(key),map=raw?JSON.parse(raw):{};
  plan.tables.forEach(t=>t.rows.forEach(r=>{const m=r.id.match(/^(PRG|SES|KST|PST|JDA|JEN)(\d+)$/);if(m)map[m[1]]=Math.max(Number(map[m[1]]||0),Number(m[2]));}));
  const value=JSON.stringify(map);props.setProperty(key,value);if(props.getProperty(key)!==value)throw Error('Penyimpanan batas ID gagal. Belum melanjutkan penghapusan.');
}
function tulisAuditHapus_(tx,meta,status,petugas,before,action,header) {
  const a=header?{header}:auditHapus_(),r={id_riwayat:'RV-'+Utilities.getUuid(),jenis_data:meta.jenis,id_referensi:meta.id,jenis_tindakan:action||'hapus_data',kolom_diubah:'penghapusan_dengan_cadangan',nilai_sebelum:before===undefined?'':JSON.stringify(before),nilai_sesudah:JSON.stringify(meta),alasan_perubahan:meta.alasan||'',diubah_oleh:petugas,waktu_perubahan:new Date(),id_transaksi_perubahan:tx,status_transaksi:status};
  if(String(r.nilai_sebelum).length>40000||r.nilai_sesudah.length>40000)throw Error('Bagian cadangan terlalu besar.');
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Riwayat_Validasi').appendRow(a.header.map(h=>r[h]===undefined?'':r[h]));SpreadsheetApp.flush();
}
function bacaCadanganHapus_(tx,meta) {
  const rows=auditHapus_().records.filter(r=>r.jenis_tindakan==='cadangan_hapus'&&teksHapus_(r.id_transaksi_perubahan)===tx),parts=new Map();
  rows.forEach(r=>{const n=JSON.parse(r.nilai_sesudah).bagian;if(!Number.isInteger(n)||n<0||n>=meta.bagian||parts.has(n))throw Error('Bagian cadangan duplikat/tidak valid.');const chunk=JSON.parse(String(r.nilai_sebelum));if(typeof chunk!=='string')throw Error('Bagian cadangan bukan teks.');parts.set(n,chunk);});
  if(parts.size!==meta.bagian)throw Error('Cadangan belum lengkap.');
  const raw=Array.from({length:meta.bagian},(_,i)=>parts.get(i)).join('');
  const plan=JSON.parse(raw);if(versiBarisIndex_(plan)!==meta.versi||plan.jenis!==meta.jenis||plan.id!==meta.id)throw Error('Verifikasi cadangan gagal.');return plan;
}
function jalankanHapus_(tx,meta,plan,petugas) {
  const state=transaksiHapus_().get(tx);if(!state||state.status_transaksi!=='PENDING'||JSON.parse(state.nilai_sesudah).versi!==meta.versi)throw Error('Status audit belum terverifikasi. Belum melanjutkan penghapusan.');
  // Recheck the ENTIRE remaining graph before any deletion, including newly added children.
  const actual=rencanaHapus_(plan.jenis,plan.id,plan),expected=new Map(plan.tables.flatMap(t=>t.rows.map(r=>[t.name+'|'+r.id,{table:t,row:r}])));
  actual.tables.forEach(t=>t.rows.forEach(r=>{const old=expected.get(t.name+'|'+r.id);if(!old||JSON.stringify(t.header)!==JSON.stringify(old.table.header)||versiBarisIndex_(r)!==versiBarisIndex_(old.row))throw Error('Data berubah di luar transaksi: '+t.name+' '+r.id+'. Periksa cadangan/audit; data baru tidak dihapus.');}));
  simpanBatasIdHapus_(plan);
  const start=Date.now(),ss=SpreadsheetApp.getActiveSpreadsheet();
  for(const t of plan.tables){
    const current=bacaTabelHapus_(t.name,[t.key]);if(JSON.stringify(current.header)!==JSON.stringify(t.header))throw Error('Header berubah pada '+t.name+'.');
    const saved=new Map(t.rows.map(r=>[r.id,r]));current.rows.filter(r=>saved.has(r.id)).forEach(r=>{if(versiBarisIndex_({id:r.id,values:r.values,formulas:r.formulas})!==versiBarisIndex_(saved.get(r.id)))throw Error('Data berubah sebelum penghapusan: '+t.name+' '+r.id+'.');});
    const ids=new Set(t.rows.map(r=>r.id)),positions=current.rows.filter(r=>ids.has(r.id)).map(r=>r.nomor).sort((a,b)=>b-a),groups=[];
    positions.forEach(n=>{const g=groups[groups.length-1];if(g&&n===g.start-1){g.start=n;g.count++;}else groups.push({start:n,count:1});});
    for(const g of groups){if(Date.now()-start>230000)throw Error('Batas waktu penghapusan mendekat. Gunakan Penghapusan tertunda untuk melanjutkan.');ss.getSheetByName(t.name).deleteRows(g.start,g.count);SpreadsheetApp.flush();}
  }
  const remaining=rencanaHapus_(plan.jenis,plan.id,plan);if(remaining.tables.some(t=>t.rows.length))throw Error('Masih ada data terkait. Gunakan Penghapusan tertunda untuk memeriksa.');
  tulisAuditHapus_(tx,meta,'SELESAI',petugas);
  return {sukses:true,pesan:'Penghapusan '+meta.jenis+' '+meta.id+' selesai. Cadangan tersimpan pada Riwayat_Validasi.',jenis:meta.jenis,id:meta.id};
}
function hapusDataIndex(d) {
  const petugas=wajibPemilikIndex_();d=d||{};
  const jenis=teksHapus_(d.jenis),id=teksHapus_(d.id),alasan=teksHapus_(d.alasan),request=teksHapus_(d.id_permintaan);
  if(!/^[a-zA-Z0-9_-]{16,100}$/.test(request)||!alasan||alasan.length>2000||/^\s*=/.test(alasan)||teksHapus_(d.konfirmasi)!==id||d.setuju!==true||!/^[a-f0-9]{64}$/.test(teksHapus_(d.versi)))throw Error('Konfirmasi ID, persetujuan dampak, alasan, atau versi pratinjau tidak valid.');
  const tx='HAPUS|'+request,signature=versiBarisIndex_({jenis,id,alasan,versi:d.versi}),lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    const old=transaksiHapus_().get(tx);
    if(old){const meta=JSON.parse(old.nilai_sesudah);if(meta.signature!==signature)throw Error('ID permintaan sudah digunakan untuk isi berbeda.');if(old.status_transaksi==='SELESAI')return {sukses:true,pesan:'Penghapusan sudah selesai; tidak diulang.',jenis,id};throw Error('Permintaan sebelumnya belum selesai. Gunakan Penghapusan tertunda → Periksa / lanjutkan.');}
    const plan=rencanaHapus_(jenis,id);pastikanTransaksiSebelumHapus_(plan);if(versiBarisIndex_(plan)!==d.versi)throw Error('Data berubah sejak pratinjau. Tutup, muat ulang dan periksa dampak penghapusan kembali.');
    const raw=JSON.stringify(plan);if(raw.length>2000000)throw Error('Cadangan melebihi 2 juta karakter. Hapus per sesi/pendaftaran terlebih dahulu.');
    const parts=[];for(let at=0;at<raw.length;){let end=Math.min(at+16000,raw.length);const code=raw.charCodeAt(end-1);if(end<raw.length&&code>=0xD800&&code<=0xDBFF)end--;parts.push(raw.slice(at,end));at=end;}
    const meta=Object.assign(ringkasanHapus_(plan),{signature,versi:d.versi,bagian:parts.length,alasan});
    // No source row is removed until every backup chunk has been read back and verified.
    tulisAuditHapus_(tx,meta,'MENYIAPKAN',petugas);
    const header=auditHapus_().header;parts.forEach((part,i)=>tulisAuditHapus_(tx,{bagian:i},'CADANGAN',petugas,part,'cadangan_hapus',header));
    bacaCadanganHapus_(tx,meta);tulisAuditHapus_(tx,meta,'PENDING',petugas);
    return jalankanHapus_(tx,meta,plan,petugas);
  }finally{lock.releaseLock();}
}
function muatPenghapusanTertundaIndex() {
  wajibPemilikIndex_();const audit=periksaAuditSebelumHapus_(null);return {sukses:true,transaksi_lain:audit.transaksi.filter(t=>!t.penghapusan),jumlah_riwayat_lama:audit.legacy,transaksi:Array.from(transaksiHapus_(),([tx,r])=>({tx,row:r})).filter(x=>!['SELESAI','DIBATALKAN'].includes(x.row.status_transaksi)).map(x=>Object.assign({id_transaksi:x.tx,status:x.row.status_transaksi},JSON.parse(x.row.nilai_sesudah)))};
}
function lanjutkanPenghapusanIndex(d) {
  const petugas=wajibPemilikIndex_(),lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    const tx=teksHapus_(d&&d.id_transaksi),r=transaksiHapus_().get(tx);if(!r)throw Error('Transaksi tidak ditemukan.');const meta=JSON.parse(r.nilai_sesudah);
    if(teksHapus_(d.konfirmasi)!==meta.id||d.setuju!==true)throw Error('Ketik ID target dan setujui dampaknya sebelum melanjutkan.');
    if(r.status_transaksi==='SELESAI'||r.status_transaksi==='DIBATALKAN')return {sukses:true,pesan:'Transaksi sudah ditutup.',jenis:meta.jenis,id:meta.id};
    let plan;
    if(r.status_transaksi==='MENYIAPKAN'){
      try{plan=bacaCadanganHapus_(tx,meta);}catch(e){tulisAuditHapus_(tx,meta,'DIBATALKAN',petugas);return {sukses:true,pesan:'Persiapan cadangan belum lengkap dan dibatalkan. Belum ada data operasional dihapus oleh transaksi ini. Buka Hapus kembali untuk membuat pratinjau baru.',jenis:meta.jenis,id:meta.id};}
      tulisAuditHapus_(tx,meta,'PENDING',petugas);
    }else plan=bacaCadanganHapus_(tx,meta);
    return jalankanHapus_(tx,meta,plan,petugas);
  }finally{lock.releaseLock();}
}
function muatMasterPesertaHapusIndex(q,page) {
  wajibPemilikIndex_();q=teksHapus_(q).toLowerCase();page=Math.max(0,Math.floor(Number(page)||0));
  const p=tabelIndex_('Peserta',['id_peserta','nama_pegawai','nip','unit_kerja']).records,k=tabelIndex_('Keikutsertaan',['id_peserta']).records;
  const counts=new Map();k.forEach(r=>{const id=teksHapus_(r.id_peserta);counts.set(id,(counts.get(id)||0)+1);});
  const all=p.filter(r=>[r.id_peserta,r.nama_pegawai,r.nip,r.unit_kerja].some(v=>teksHapus_(v).toLowerCase().includes(q))).sort((a,b)=>teksHapus_(a.nama_pegawai).localeCompare(teksHapus_(b.nama_pegawai),'id'));
  return {sukses:true,total:all.length,page,peserta:all.slice(page*50,page*50+50).map(r=>({id:teksHapus_(r.id_peserta),nama:teksHapus_(r.nama_pegawai),nip:teksHapus_(r.nip),unit:teksHapus_(r.unit_kerja),program:counts.get(teksHapus_(r.id_peserta))||0}))};
}
