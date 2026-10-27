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
