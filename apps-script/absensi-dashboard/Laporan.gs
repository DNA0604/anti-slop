// Owner-only reports. Existing attendance/scoring helpers remain the source of truth.
function programLaporanSelesai_(id) {
  const key = String(id || '').trim();
  const rows = tabelIndex_('Program', ['id_program','nama_program','status_program']).records.filter(p => String(p.id_program).trim() === key);
  if (!key || rows.length !== 1) throw Error('Pilih satu program yang valid.');
  if (String(rows[0].status_program).trim().toLowerCase() !== 'selesai') throw Error('Laporan hanya tersedia untuk program berstatus selesai.');
  return rows[0];
}
function dataLaporanProgram_(id) {
  wajibPemilikIndex_();
  const program = programLaporanSelesai_(id), txt = v => String(v == null ? '' : v).trim();
  const zona = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
  function scoped(sheet, fields, key) {
    const all=tabelIndex_(sheet,fields).records, selected=all.filter(r=>txt(r.id_program)===txt(id));
    const selectedIds=new Set(selected.map(r=>txt(r[key]))),counts=new Map();
    all.forEach(r=>{const value=txt(r[key]);if(selectedIds.has(value))counts.set(value,(counts.get(value)||0)+1);});
    if(Array.from(counts.values()).some(n=>n!==1))throw Error('ID lintas program duplikat pada '+sheet+'. Periksa Data.');
    return selected;
  }
  const data = {
    program: program, sesi: scoped('Sesi',['id_sesi','id_program','nama_sesi','tanggal_sesi','jam_mulai','jam_selesai'],'id_sesi'),
    ikut: scoped('Keikutsertaan',['id_keikutsertaan','id_program','id_peserta','status_keikutsertaan','unit_kerja_saat_pelatihan'],'id_keikutsertaan'),
    peserta: tabelIndex_('Peserta',['id_peserta','nama_pegawai']).records,
    hadir: tabelIndex_('Kehadiran',['id_kehadiran','id_sesi','id_keikutsertaan','waktu_datang','waktu_pulang','waktu_datang_terverifikasi','waktu_pulang_terverifikasi']).records,
    catatan: tabelIndex_('Catatan_Perilaku',['id_catatan','id_keikutsertaan','id_sesi','id_indikator','status_validasi','keterangan','waktu_kejadian']).records,
    indikator: tabelIndex_('Indikator_Perilaku',['id_indikator','kode_indikator','jenis_indikator','definisi_indikator']).records
  };
  const r = ringkasLaporanProgram_(data, Date.now(), zona);
  try { r.jadwal = muatKelolaProgramIndex(id).sesi; } catch(e) { r.jadwal=[];r.peringatan.push('Rincian jeda/durasi tidak tersedia: '+e.message); }
  try { r.jp = muatRekapJPProgramIndex(id); } catch(e) { r.peringatan.push('Rekap JP tidak tersedia: '+e.message); }
  try { r.nilai = muatNilaiPerilakuProgramIndex(id); if (!r.nilai.aturan) r.peringatan.push('Aturan nilai perilaku belum tersedia.'); } catch(e) { r.peringatan.push('Nilai perilaku tidak tersedia: '+e.message); }
  programLaporanSelesai_(id);
  return r;
}
function ringkasLaporanProgram_(d, now, zona) {
  const txt = v => String(v == null ? '' : v).trim(), norm = v => txt(v).toLowerCase();
  if (norm(d.program.status_program) !== 'selesai') throw Error('Program belum selesai.');
  if (d.ikut.length > 1000 || d.sesi.length > 300) throw Error('Laporan mendukung maksimal 1.000 peserta dan 300 sesi per program.');
  function map(rows,key,label) { const m=new Map(); rows.forEach(r=>{const id=txt(r[key]);if(!id||m.has(id))throw Error('ID kosong/duplikat pada '+label+'. Periksa Data terlebih dahulu.');m.set(id,r);});return m; }
  const people=map(d.peserta,'id_peserta','Peserta'), members=map(d.ikut,'id_keikutsertaan','Keikutsertaan'), sessions=map(d.sesi,'id_sesi','Sesi'), indicators=map(d.indikator,'id_indikator','Indikator');
  const seenPeople=new Set(), peringatan=[];
  const peserta=d.ikut.map(k=>{
    const person=people.get(txt(k.id_peserta));if(!person||seenPeople.has(txt(k.id_peserta)))throw Error('Relasi peserta hilang/duplikat dalam program.');seenPeople.add(txt(k.id_peserta));
    return {id:txt(k.id_keikutsertaan),nama:txt(person.nama_pegawai),unit:txt(k.unit_kerja_saat_pelatihan),status:norm(k.status_keikutsertaan),lengkap:0,belum_lengkap:0,belum_tercatat:0,verifikasi:0,terlambat:0,sasaran:0};
  }).sort((a,b)=>a.nama.localeCompare(b.nama,'id'));
  const aktif=peserta.filter(p=>p.status==='terdaftar'), records=new Map();let foreign=0;
  d.hadir.forEach(h=>{const sid=txt(h.id_sesi),kid=txt(h.id_keikutsertaan);if(!sessions.has(sid))return;if(!members.has(kid)){foreign++;return;}const key=JSON.stringify([sid,kid]);if(records.has(key))throw Error('Kehadiran duplikat pada sesi '+sid);records.set(key,h);});
  const total={lengkap:0,belum_lengkap:0,belum_tercatat:0,verifikasi:0,sasaran:0,terlambat:0};let selesai=0,mendatang=0,invalid=0;
  const tanggal=v=>v instanceof Date?Utilities.formatDate(v,zona,'yyyy-MM-dd'):txt(v);
  const jam=v=>v instanceof Date?Utilities.formatDate(v,zona,'HH:mm'):txt(v);
  const sesi=d.sesi.map(s=>{
    const row={id:txt(s.id_sesi),nama:txt(s.nama_sesi),tanggal:tanggal(s.tanggal_sesi),mulai:jam(s.jam_mulai),selesai:jam(s.jam_selesai),jp:txt(s.status_jp),lengkap:0,belum_lengkap:0,belum_tercatat:0,verifikasi:0,sasaran:0,status:'jadwal_bermasalah'};
    let end;try{const start=waktuJadwalJP_(s.tanggal_sesi,s.jam_mulai,zona);end=waktuJadwalJP_(s.tanggal_sesi,s.jam_selesai,zona);if(end<=start)throw Error('Jam tidak valid');}catch(e){invalid++;return row;}
    if(end>now){mendatang++;row.status='belum_selesai';return row;}selesai++;row.status='selesai';
    aktif.forEach(p=>{const state=statusKehadiranProfil_(s,records.get(JSON.stringify([row.id,p.id])),now,zona);const key=state.status==='hadir_lengkap'?'lengkap':state.status==='belum_lengkap'?'belum_lengkap':state.status==='belum_tercatat_hadir'?'belum_tercatat':'verifikasi';p[key]++;row[key]++;total[key]++;p.sasaran++;row.sasaran++;total.sasaran++;if(Number.isFinite(state.terlambat)&&state.terlambat>10){p.terlambat++;total.terlambat++;}});
    return row;
  }).sort((a,b)=>a.tanggal.localeCompare(b.tanggal)||a.mulai.localeCompare(b.mulai));
  const validasi={disetujui:0,belum_divalidasi:0,ditolak:0,lainnya:0}, jenis={positif:0,negatif:0,izin:0,lainnya:0}, byIndicator=new Map(), seenNotes=new Set();
  const catatan=[];
  d.catatan.forEach(c=>{
    const kid=txt(c.id_keikutsertaan),sid=txt(c.id_sesi);if(!members.has(kid)){if(sessions.has(sid))foreign++;return;}
    if(sid&&!sessions.has(sid)){foreign++;return;}
    const id=txt(c.id_catatan);if(!id||seenNotes.has(id))throw Error('ID catatan kosong/duplikat.');seenNotes.add(id);
    const i=indicators.get(txt(c.id_indikator));if(!i)peringatan.push('Indikator catatan '+id+' tidak ditemukan.');
    const status=norm(c.status_validasi)||'belum_divalidasi';validasi[Object.prototype.hasOwnProperty.call(validasi,status)?status:'lainnya']++;
    const tipe=i&&txt(i.kode_indikator)==='IZIN_SESI'?'izin':i&&['positif','negatif'].includes(norm(i.jenis_indikator))?norm(i.jenis_indikator):'lainnya';jenis[tipe]++;
    const label=i?(txt(i.definisi_indikator)||txt(i.kode_indikator)):'Indikator tidak tersedia';
    if(status==='disetujui')byIndicator.set(label,(byIndicator.get(label)||0)+1);
    catatan.push({nama:people.get(txt(members.get(kid).id_peserta)).nama_pegawai,sesi:sid?txt(sessions.get(sid).nama_sesi):'Cakupan program',waktu:c.waktu_kejadian instanceof Date?Utilities.formatDate(c.waktu_kejadian,zona,'yyyy-MM-dd HH:mm:ss'):txt(c.waktu_kejadian),indikator:label,jenis:tipe,status:status,keterangan:txt(c.keterangan)});
  });
  if(catatan.length>3000)throw Error('Laporan mendukung maksimal 3.000 catatan per program.');
  if(!d.sesi.length)peringatan.push('Program tidak memiliki sesi.');if(!aktif.length)peringatan.push('Tidak ada peserta berstatus terdaftar.');
  if(mendatang)peringatan.push(mendatang+' sesi belum selesai menurut jadwal; tidak dihitung dalam persentase kehadiran.');
  if(invalid)peringatan.push(invalid+' jadwal sesi tidak valid; dikeluarkan dari penyebut kehadiran.');
  if(foreign)peringatan.push(foreign+' baris dengan relasi lintas program/tidak sesuai dikeluarkan dari laporan.');
  if(total.belum_lengkap+total.verifikasi)peringatan.push('Masih ada catatan kehadiran yang perlu dilengkapi atau diverifikasi.');
  if(validasi.belum_divalidasi)peringatan.push(validasi.belum_divalidasi+' catatan belum divalidasi.');
  return {sukses:true,program:{id:txt(d.program.id_program),nama:txt(d.program.nama_program),kategori:txt(d.program.kategori_pelatihan),jenjang:txt(d.program.jenjang),mulai:tanggal(d.program.tanggal_mulai),selesai:tanggal(d.program.tanggal_selesai)},waktu:Utilities.formatDate(new Date(now),zona,'yyyy-MM-dd HH:mm:ss'),zona:zona,peserta:peserta,sesi:sesi,total:total,sesi_selesai:selesai,jenis:jenis,validasi:validasi,catatan:catatan,indikator:Array.from(byIndicator,([nama,jumlah])=>({nama:nama,jumlah:jumlah})).sort((a,b)=>b.jumlah-a.jumlah),peringatan:peringatan,jp:null,nilai:null};
}
function muatPratinjauLaporanProgram(id) {
  const r=dataLaporanProgram_(String(id||'').trim());
  return {sukses:true,program:r.program,waktu:r.waktu,peserta:r.peserta.length,sesi:r.sesi.length,catatan:r.catatan.length,peringatan:r.peringatan};
}
function buatPDFLaporanProgram(id) {
  wajibPemilikIndex_();const lock=LockService.getUserLock();if(!lock.tryLock(1000))throw Error('Pembuatan laporan masih berjalan. Tunggu proses sebelumnya.');
  let doc=null,docId='',result=null;
  try {
    const r=dataLaporanProgram_(String(id||'').trim());
    const filename=('Laporan '+r.program.nama).replace(/[\\/:*?"<>|\r\n]/g,' ').slice(0,130)+'.pdf';
    doc=DocumentApp.create('TEMP Laporan Pelatihan '+Utilities.getUuid());docId=doc.getId();
    tulisDokumenLaporan_(doc,r);doc.saveAndClose();
    programLaporanSelesai_(id);
    const blob=DriveApp.getFileById(docId).getAs('application/pdf').setName(filename),bytes=blob.getBytes();
    if(bytes.length>8*1024*1024)throw Error('PDF melebihi 8 MB. Kurangi ukuran data melalui evaluasi laporan terpisah.');
    programLaporanSelesai_(id);
    result={sukses:true,nama:filename,mime:'application/pdf',base64:Utilities.base64Encode(bytes),waktu:r.waktu,peringatan:r.peringatan};
    return result;
  } finally {
    try { if(doc)doc.saveAndClose(); } catch(ignored) {}
    try { if(docId)DriveApp.getFileById(docId).setTrashed(true); } catch(e) { console.error('Pembersihan dokumen sementara laporan gagal.');if(result)result.peringatan.push('Dokumen TEMP Laporan Pelatihan belum dapat dipindahkan ke Sampah. Hapus manual melalui Drive pemilik.'); } finally { lock.releaseLock(); }
  }
}
function tulisDokumenLaporan_(doc,r) {
  const b=doc.getBody(),H=DocumentApp.ParagraphHeading;
  b.setPageWidth(595.28).setPageHeight(841.89).setMarginTop(48).setMarginBottom(48).setMarginLeft(44).setMarginRight(44);
  b.setAttributes({[DocumentApp.Attribute.FONT_FAMILY]:'Arial',[DocumentApp.Attribute.FONT_SIZE]:10,[DocumentApp.Attribute.FOREGROUND_COLOR]:'#192e50'});
  function p(text){return b.appendParagraph(String(text)).setSpacingAfter(8);}
  function h(text){return b.appendParagraph(text).setHeading(H.HEADING1).setSpacingBefore(16).setSpacingAfter(10);}
  function table(headers,rows){const t=b.appendTable([headers,...rows.map(row=>row.map(x=>String(x==null?'—':x)))]);for(let c=0;c<headers.length;c++){t.getCell(0,c).setBackgroundColor('#203960').editAsText().setBold(true).setForegroundColor('#ffffff');}return t;}
  const num=v=>v==null||v===''||!Number.isFinite(Number(v))?'—':Number(v).toLocaleString('id-ID',{maximumFractionDigits:2});
  const percent=(n,d)=>d?num(100*n/d)+'%':'Tidak tersedia';
  function chart(title,headers,rows,pie){
    if(!rows.length||!rows.some(x=>Number(x[1])>0)){p(title+': belum ada data untuk grafik.');return;}
    const data=Charts.newDataTable().addColumn(Charts.ColumnType.STRING,headers[0]).addColumn(Charts.ColumnType.NUMBER,headers[1]);rows.forEach(row=>data.addRow(row));
    const chart=(pie?Charts.newPieChart():Charts.newBarChart()).setDataTable(data.build()).setTitle(title).setDimensions(660,320).setColors(['#203960','#4b8d9b','#d6a64e','#a35b62']).build();
    b.appendImage(chart.getAs('image/png')).setWidth(480).setHeight(233);
  }
  doc.addHeader().appendParagraph('PUSAT PENGEMBANGAN APARATUR KOMDIGI').editAsText().setFontSize(9);
  doc.addFooter().appendParagraph('Bahan evaluasi internal • Snapshot '+r.waktu+' ('+r.zona+')').editAsText().setFontSize(8);
  p('Kementerian Komunikasi dan Digital').editAsText().setFontSize(12);
  p('LAPORAN EVALUASI\nPELAKSANAAN PROGRAM PELATIHAN').setHeading(H.TITLE);
  p(r.program.nama).setHeading(H.SUBTITLE);
  table(['Identitas','Keterangan'],[['Program',r.program.id],['Kategori / jenjang',r.program.kategori+' / '+(r.program.jenjang||'—')],['Periode tercatat',r.program.mulai+' s.d. '+r.program.selesai],['Status program','Selesai'],['Data dihimpun',r.waktu+' ('+r.zona+')']]);
  p('Dokumen ini merupakan rangkuman administratif untuk evaluasi, bukan sertifikat kelulusan atau penetapan nilai akhir. Status selesai mengikuti penandaan pengelola. Jadwal bukan bukti otomatis bahwa seluruh sesi telah terlaksana.');
  p(r.peringatan.length?'STATUS DATA: PERLU TINDAK LANJUT — baca bagian keterbatasan dan rekomendasi.':'STATUS DATA: ringkasan tersedia berdasarkan catatan saat laporan dibuat.');
  b.appendPageBreak();h('1. Ringkasan eksekutif');
  table(['Indikator','Hasil'],[['Peserta tercatat',r.peserta.length],['Peserta berstatus terdaftar',r.peserta.filter(x=>x.status==='terdaftar').length],['Sesi tercatat / selesai menurut jadwal',r.sesi.length+' / '+r.sesi_selesai],['Kehadiran lengkap / kesempatan peserta-sesi',r.total.lengkap+' / '+r.total.sasaran],['Persentase kelengkapan',percent(r.total.lengkap,r.total.sasaran)],['Catatan perilaku dan izin',r.catatan.length]]);
  p('Penyebut kehadiran adalah peserta berstatus terdaftar saat pengambilan data × sesi dengan jadwal valid yang sudah berakhir. Sesi tanpa JP tetap termasuk. Peserta berstatus lain tidak masuk penyebut. Perubahan pendaftaran historis tidak dapat direkonstruksi dari snapshot ini.');
  h('2. Jadwal dan rekap sesi');
  const jadwal=new Map((r.jadwal||[]).map(x=>[x.id,x]));
  table(['Tanggal / sesi','Jam / jeda / efektif','Lengkap / sasaran','Kelengkapan','Status'],r.sesi.map(s=>{const j=jadwal.get(s.id);return [s.tanggal+'\n'+s.nama,s.mulai+'–'+s.selesai+'\nJeda: '+(j?j.jeda||'Tidak ada':'—')+'\nEfektif: '+(j?num(j.durasi_efektif):'—')+' menit',s.lengkap+' / '+s.sasaran,percent(s.lengkap,s.sasaran),s.status.replace(/_/g,' ')];}));
  p('Jadwal jeda dan durasi efektif mengikuti pengaturan sesi pada aplikasi; rekap JP di bagian 5 menggunakan hasil perhitungan yang telah tersedia, tanpa menjalankan hitung ulang.');
  h('3. Kehadiran peserta');
  chart('Distribusi kesempatan kehadiran peserta-sesi',['Kondisi','Jumlah'],[['Lengkap',r.total.lengkap],['Belum lengkap',r.total.belum_lengkap],['Belum tercatat',r.total.belum_tercatat],['Perlu verifikasi',r.total.verifikasi]],false);
  p('Belum tercatat tidak otomatis berarti tidak hadir. Waktu terverifikasi digunakan bila tersedia. Terlambat dihitung hanya bila melewati toleransi 10 menit dan waktunya dapat dinilai; dapat beririsan dengan kategori kehadiran lain.');
  table(['Peserta / unit','Status','Lengkap / sasaran','Belum lengkap / tercatat','Verifikasi / terlambat'],r.peserta.map(x=>[x.nama+'\n'+x.unit,x.status,x.lengkap+' / '+x.sasaran+' ('+percent(x.lengkap,x.sasaran)+')',x.belum_lengkap+' / '+x.belum_tercatat,x.verifikasi+' / '+x.terlambat]));
  h('4. Aktivitas, perilaku dan izin');
  table(['Jenis catatan (semua status)','Jumlah'],Object.entries(r.jenis));
  chart('Status validasi catatan (termasuk izin)',['Status','Catatan'],Object.entries(r.validasi).map(([k,v])=>[k.replace(/_/g,' '),v]),true);
  chart('Indikator dengan catatan disetujui terbanyak',['Indikator','Catatan'],r.indikator.slice(0,10).map(x=>[x.nama.length>80?x.nama.slice(0,77)+'…':x.nama,x.jumlah]),false);
  p('Grafik indikator menampilkan maksimal 10 indikator menurut jumlah catatan disetujui, bukan peringkat peserta. Catatan pending/ditolak tidak dianggap sebagai temuan yang telah disahkan. Jenis izin dipisahkan dari positif/negatif agar tidak dihitung dua kali.');
  h('5. Rekap JP dan nilai perilaku');
  p('Angka berikut memakai rekap aplikasi yang sudah ada. Status sementara berarti data belum lengkap. Nilai perilaku dan kontribusi berbobot bukan nilai akhir keseluruhan pelatihan. Tanda — berarti belum tersedia; nol hanya ditampilkan bila memang bernilai nol.');
  if(r.nilai&&r.nilai.aturan)p('Aturan perilaku: '+String(r.nilai.aturan.nama||'')+'; versi '+String(r.nilai.aturan.versi||'—')+'.');
  const jp=new Map((r.jp&&r.jp.peserta||[]).map(x=>[x.id_keikutsertaan,x])),nilai=new Map((r.nilai&&r.nilai.peserta||[]).map(x=>[x.id_keikutsertaan,x]));
  table(['Peserta','JP diperoleh / acuan','Status JP','Nilai perilaku','Status nilai'],r.peserta.map(x=>{const j=jp.get(x.id),n=nilai.get(x.id);return [x.nama,j?num(j.jp_diperoleh)+' / '+num(j.jp_acuan):'—',j?j.status:'Tidak tersedia',n?num(n.nilai):'—',n?n.status:'Tidak tersedia'];}));
  h('6. Keterbatasan dan tindak lanjut');
  const notes=[...r.peringatan];if(r.total.belum_tercatat)notes.push('Konfirmasi '+r.total.belum_tercatat+' kesempatan kehadiran yang belum tercatat sebelum menyimpulkan ketidakhadiran.');
  if(!notes.length)notes.push('Lakukan pemeriksaan silang dengan penyelenggara sebelum laporan disahkan. Kelengkapan catatan bukan bukti kelulusan atau efektivitas pelatihan.');
  notes.forEach((x,i)=>p((i+1)+'. '+x));
  p('Sumber: Program, Sesi, Keikutsertaan, Peserta, Kehadiran, Catatan_Perilaku, Indikator_Perilaku serta rekap JP/perilaku aplikasi. Data merupakan snapshot pada waktu pengambilan; perubahan setelah waktu tersebut tidak tercermin. Tidak ada formula penilaian institusi baru yang diterapkan.');
  b.appendPageBreak();h('Lampiran. Riwayat aktivitas peserta');
  p('Seluruh status catatan terkait program disertakan, termasuk peserta dengan status keikutsertaan nonaktif. Bukti lampiran tidak disalin ke PDF; periksa melalui aplikasi dengan akun yang berhak.');
  if(!r.catatan.length)p('Belum ada catatan aktivitas/perilaku/izin pada program ini.');
  else table(['Peserta / waktu','Sesi / indikator','Jenis / validasi','Keterangan'],r.catatan.map(c=>[c.nama+'\n'+c.waktu,c.sesi+'\n'+c.indikator,c.jenis+' / '+c.status,c.keterangan]));
}

// Run manually in the Apps Script editor as the owner to grant Docs/Drive access.
function otorisasiLaporanProgram() {
  wajibPemilikIndex_();let id='';
  try {const doc=DocumentApp.create('TEMP Otorisasi Laporan');id=doc.getId();doc.getBody().appendParagraph('Pemeriksaan izin laporan.');doc.saveAndClose();DriveApp.getFileById(id).getAs('application/pdf');return 'Izin laporan siap. Kembali ke Pengelolaan.';}
  finally {if(id)DriveApp.getFileById(id).setTrashed(true);}
}
