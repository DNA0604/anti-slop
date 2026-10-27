/** Tahap 1: pratinjau baca saja. Tidak membuat Jenjang atau mengubah data/properti. */
function bukaPratinjauPemetaanJenjang() {
  wajibPemilikIndex_();
  let ui;
  try { ui = SpreadsheetApp.getUi(); }
  catch (e) {
    throw Error('Panel perlu dibuka dari spreadsheet, bukan dari konteks eksekusi ini. Buka salinan spreadsheet → Ekstensi → Apps Script; pastikan kode disimpan di proyek yang terikat pada spreadsheet tersebut. Muat ulang tab spreadsheet, lalu pilih Manajemen Pelatihan → Pratinjau Pemetaan Jenjang. Tidak perlu mengisi ID Spreadsheet.');
  }
  ui.showModalDialog(
    HtmlService.createHtmlOutputFromFile('PratinjauJenjang').setWidth(1180).setHeight(800),
    'Pratinjau Pemetaan Jenjang'
  );
}

function skemaPratinjauJenjang_() {
  return {
    Program: ['id_program','nama_program','jenjang','status_program'],
    Peserta: ['id_peserta','nama_pegawai'],
    Sesi: ['id_sesi','id_program','nama_sesi'],
    Keikutsertaan: ['id_keikutsertaan','id_program','id_peserta','status_keikutsertaan'],
    Kehadiran: ['id_kehadiran','id_sesi','id_keikutsertaan'],
    Catatan_Perilaku: ['id_catatan','id_sesi','id_keikutsertaan','id_kehadiran','cakupan_kejadian'],
    Jeda_Sesi: ['id_jeda','id_sesi'],
    Token_QR: ['id_token_qr','id_sesi'],
    Log_Absensi: ['id_log','id_sesi','id_keikutsertaan','id_token_qr','status_scan'],
    Riwayat_Validasi: ['id_riwayat','id_transaksi_perubahan','status_transaksi','jenis_tindakan'],
    Jenjang: ['id_jenjang','id_program','nama_jenjang']
  };
}

/** Owner checked on every RPC, before lock, reads or HTML rendering. */
function muatPratinjauPemetaanJenjang() {
  wajibPemilikIndex_();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw Error('Database sedang digunakan. Tunggu proses lain selesai, lalu muat ulang pratinjau.');
  try {
    return bacaSnapshotPratinjauJenjang_();
  } finally { lock.releaseLock(); }
}

/** Private reader; caller holds ScriptLock and performs the owner check. */
function bacaSnapshotPratinjauJenjang_() {
    const ss = SpreadsheetApp.getActiveSpreadsheet(), spec = skemaPratinjauJenjang_(), tables = {};
    let cells = 0, rows = 0, size = 0;
    const fingerprints = [];
    Object.keys(spec).forEach(name => {
      const sheet = ss.getSheetByName(name);
      if (!sheet) {
        if (name === 'Jenjang') { tables[name] = null; fingerprints.push([name, null]); return; }
        throw Error('Pratinjau belum dapat dibaca: sheet '+name+' tidak ditemukan. Tidak ada data diubah.');
      }
      const height = sheet.getLastRow(), width = sheet.getLastColumn();
      rows += Math.max(0, height-1); cells += Math.max(1,height)*Math.max(1,width);
      if (rows > 50000 || cells > 600000) throw Error('Pratinjau dibatasi 50.000 baris / 600.000 sel total. Data tidak dibaca sebagian; periksa kapasitas pada salinan proyek.');
      const range = sheet.getDataRange(), values = range.getValues(), formulas = range.getFormulas();
      const header = (values[0] || []).map(teksPratinjauJenjang_);
      const missing = spec[name].filter(k => !header.includes(k));
      if (missing.length || new Set(header.filter(Boolean)).size !== header.filter(Boolean).length)
        throw Error('Header '+name+' tidak sesuai'+(missing.length ? ': kolom '+missing.join(', ')+' belum ada' : ': kolom duplikat')+'. Tidak ada data diubah.');
      const records = [];
      values.slice(1).forEach((row, i) => {
        if (!row.some(v => v !== '' && v != null) && !formulas[i+1].some(Boolean)) return;
        const data = Object.create(null);
        header.forEach((key, col) => { if (key) data[key] = row[col]; });
        records.push({baris:i+2, data});
      });
      const serialized = JSON.stringify([name,values.map(row => row.map(v => v instanceof Date ? {$date:v.toISOString()} : v)),formulas]); size += serialized.length;
      if (size > 8000000) throw Error('Isi sumber melebihi batas pratinjau 8 juta karakter. Tidak ada data diubah dan tidak ada hasil parsial.');
      fingerprints.push([name,hashPratinjauJenjang_(serialized)]);
      tables[name] = {header,records};
    });
    if (tables.Program.records.length > 1000) throw Error('Pratinjau mendukung maksimal 1.000 program. Tidak ada hasil parsial.');
    const result = analisisPratinjauJenjang_(tables);
    result.sumber = ss.getName();
    result.waktu = Utilities.formatDate(new Date(),ss.getSpreadsheetTimeZone(),'yyyy-MM-dd HH:mm:ss');
    result.zona = ss.getSpreadsheetTimeZone();
    result.versi = hashPratinjauJenjang_(JSON.stringify([ss.getId(),fingerprints]));
    if (JSON.stringify(result).length > 4000000) throw Error('Rincian pratinjau melebihi batas 4 juta karakter. Tidak ada hasil parsial.');
    return result;
}

function teksPratinjauJenjang_(v) { return String(v == null ? '' : v).trim(); }
function hashPratinjauJenjang_(text) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,text,Utilities.Charset.UTF_8)
    .map(b => ('0'+(b & 255).toString(16)).slice(-2)).join('');
}

/** Pure analysis: input is a snapshot, output contains no NIP, QR token, evidence or audit payload. */
function analisisPratinjauJenjang_(tables) {
  const txt = teksPratinjauJenjang_, spec = skemaPratinjauJenjang_(), indexes = {}, findings = [];
  const records = name => tables[name] ? tables[name].records : [];
  Object.keys(spec).forEach(name => {
    indexes[name] = new Map();
    records(name).forEach(row => {
      const id = txt(row.data[spec[name][0]]);
      if (!indexes[name].has(id)) indexes[name].set(id,[]);
      indexes[name].get(id).push(row);
    });
  });
  const lookup = (name,id) => { const a = indexes[name].get(txt(id)) || []; return a.length === 1 ? a[0] : null; };
  const personPrograms = new Map();
  records('Keikutsertaan').forEach(r => {
    const id = txt(r.data.id_peserta);
    if (!personPrograms.has(id)) personPrograms.set(id,new Set());
    personPrograms.get(id).add(txt(r.data.id_program));
  });
  const programsFor = (name,row) => {
    const data = row.data, ids = new Set();
    if (name === 'Program') ids.add(txt(data.id_program));
    if (data.id_program) ids.add(txt(data.id_program));
    ['Sesi','Keikutsertaan'].forEach(n => {
      const key = spec[n][0];
      (indexes[n].get(txt(data[key])) || []).forEach(r => ids.add(txt(r.data.id_program)));
    });
    if (name === 'Peserta') (personPrograms.get(txt(data.id_peserta)) || []).forEach(id => ids.add(id));
    // Unresolvable program IDs are global findings, not silently scoped to an absent program.
    return Array.from(ids).filter(id => id && indexes.Program.has(id));
  };
  function add(level,name,row,message,advice) {
    findings.push({tingkat:level,sheet:name,baris:row ? row.baris : 1,
      id:row ? txt(row.data[spec[name][0]]) : '',program:row ? programsFor(name,row) : [],
      pesan:message,saran:advice || 'Periksa sumber data dan hubungan ID pada salinan database; jangan mengubah histori secara otomatis.'});
  }
  Object.keys(spec).filter(n => n !== 'Riwayat_Validasi').forEach(name => {
    indexes[name].forEach((group,id) => {
      const locations = group.slice(0,10).map(r=>r.baris).join(', ')+(group.length > 10 ? ' dan '+(group.length-10)+' baris lainnya' : '');
      if (!id || group.length > 1) group.forEach(row => add('masalah',name,row,
        !id ? 'ID utama kosong.' : 'ID '+id+' duplikat pada baris '+locations+'.'));
    });
  });
  function reference(name,row,key,target,optional) {
    const id = txt(row.data[key]);
    if (!id && optional) return null;
    const found = id ? lookup(target,id) : null;
    if (!id || !found) add('masalah',name,row,key+' '+(id || '(kosong)')+' tidak menunjuk tepat satu record '+target+'.');
    return found;
  }
  records('Program').forEach(r => {
    if (!txt(r.data.nama_program)) add('masalah','Program',r,'Nama program kosong.');
  });
  records('Peserta').forEach(r => {
    if (!txt(r.data.nama_pegawai)) add('masalah','Peserta',r,'Nama peserta kosong.');
  });
  records('Keikutsertaan').forEach(r => {
    reference('Keikutsertaan',r,'id_program','Program'); reference('Keikutsertaan',r,'id_peserta','Peserta');
    if (!txt(r.data.status_keikutsertaan)) add('masalah','Keikutsertaan',r,'Status keikutsertaan kosong.');
  });
  ['Sesi','Jenjang'].forEach(name => records(name).forEach(r => {
    reference(name,r,'id_program','Program');
    if (!txt(r.data[name === 'Sesi' ? 'nama_sesi' : 'nama_jenjang'])) add('masalah',name,r,'Nama '+name.toLowerCase()+' kosong.');
  }));
  ['Jeda_Sesi','Token_QR'].forEach(name => records(name).forEach(r => reference(name,r,'id_sesi','Sesi')));
  function uniquePair(name,keys) {
    const seen = new Map();
    records(name).forEach(r => {
      const parts = keys.map(k => txt(r.data[k])); if (parts.some(p => !p)) return;
      const key = JSON.stringify(parts), old = seen.get(key);
      if (old) {
        add('masalah',name,r,'Pasangan '+keys.join(' + ')+' duplikat dengan baris '+old.baris+'.');
        add('masalah',name,old,'Pasangan '+keys.join(' + ')+' duplikat dengan baris '+r.baris+'.');
      } else seen.set(key,r);
    });
  }
  uniquePair('Keikutsertaan',['id_program','id_peserta']);
  uniquePair('Kehadiran',['id_sesi','id_keikutsertaan']);
  ['Sesi','Keikutsertaan'].forEach(name => records(name).forEach(r => {
    if (tables[name].header.includes('id_jenjang')) {
      const j = reference(name,r,'id_jenjang','Jenjang');
      if (j && txt(j.data.id_program) !== txt(r.data.id_program)) add('masalah',name,r,'Jenjang dan record berasal dari program berbeda.');
    }
  }));
  ['Kehadiran','Catatan_Perilaku','Log_Absensi'].forEach(name => records(name).forEach(r => {
    const d = r.data, log = name === 'Log_Absensi', incompleteLog = log && txt(d.status_scan).toLowerCase() !== 'diterima';
    const programNote = name === 'Catatan_Perilaku' && txt(d.cakupan_kejadian) === 'program';
    const s = reference(name,r,'id_sesi','Sesi',incompleteLog || programNote);
    const k = reference(name,r,'id_keikutsertaan','Keikutsertaan',incompleteLog);
    if (s && k) {
      if (txt(s.data.id_program) !== txt(k.data.id_program)) add('masalah',name,r,'Sesi dan keikutsertaan berasal dari program berbeda.');
      const sj = txt(s.data.id_jenjang), kj = txt(k.data.id_jenjang);
      if (sj && kj && sj !== kj) add('masalah',name,r,'Aktivitas sesi dan keikutsertaan berasal dari Jenjang berbeda.');
    }
    if (name === 'Catatan_Perilaku') {
      const h = reference(name,r,'id_kehadiran','Kehadiran',true);
      if (h && (txt(h.data.id_keikutsertaan) !== txt(d.id_keikutsertaan) || txt(h.data.id_sesi) !== txt(d.id_sesi)))
        add('masalah',name,r,'Catatan dan kehadiran merujuk sesi/keikutsertaan yang berbeda.');
    }
    if (log) {
      const t = reference(name,r,'id_token_qr','Token_QR',true);
      if (t && txt(d.id_sesi) !== txt(t.data.id_sesi)) add('masalah',name,r,'Log dan token QR merujuk sesi yang berbeda.');
    }
  }));
  const transactions = new Map(); let legacy = 0;
  records('Riwayat_Validasi').forEach(r => {
    if (txt(r.data.jenis_tindakan).toLowerCase() === 'cadangan_hapus') return;
    const status = txt(r.data.status_transaksi).toUpperCase();
    if (!status) { legacy++; return; }
    const id = txt(r.data.id_transaksi_perubahan) || 'TANPA-ID-BARIS-'+r.baris;
    transactions.set(id,{row:r,status});
  });
  transactions.forEach((t,id) => {
    if (!['SELESAI','DIBATALKAN'].includes(t.status)) add('masalah','Riwayat_Validasi',t.row,
      'Transaksi '+id+' berstatus '+t.status+'. Pemetaan seluruh database perlu menunggu pemeriksaan transaksi.',
      'Buka kartu Transaksi yang Perlu Diperiksa di Pengelolaan/Peserta atau periksa Riwayat_Validasi. Pratinjau ini tidak memulihkan/menutup transaksi.');
  });
  const existing = Boolean(tables.Jenjang) || ['Sesi','Keikutsertaan'].some(n => tables[n].header.includes('id_jenjang'));
  if (existing) add('periksa','Jenjang',null,'Ditemukan sheet Jenjang atau kolom id_jenjang. Periksa migrasi sebelumnya; tidak dibuat usulan pengisian ulang.');
  const global = findings.filter(f => !f.program.length), globalBlock = global.filter(f => f.tingkat === 'masalah').length;
  const byProgram = new Map();
  findings.forEach(f => f.program.forEach(id => {
    if (!byProgram.has(id)) byProgram.set(id,[]);
    byProgram.get(id).push(f);
  }));
  const program = records('Program').map(r => {
    const p = r.data, id = txt(p.id_program), level = txt(p.jenjang);
    const own = byProgram.get(id) || [];
    const mixed = /[,;\/|&+\n]|\b(?:dan|and|sampai|hingga|s\.?d\.?)\b|\d\s*[-–—]\s*\d|\b[IVXLCDM]+\s*[-–—]\s*[IVXLCDM]+\b|\s[-–—]\s/i.test(level);
    let state = 'usulan_tunggal', message = 'Usulan satu Jenjang; pengelola tetap perlu memastikan tidak ada kelompok yang tercampur.';
    if (!level) { state='perlu_jenjang'; message='Jenjang lama kosong. Tentukan nama dan penempatan; Umum hanya contoh, bukan keputusan otomatis.'; }
    if (mixed) { state='perlu_pemetaan'; message='Teks mungkin memuat beberapa Jenjang. Periksa pemetaan setiap sesi dan peserta; teks tidak dipecah otomatis.'; }
    if (existing) { state='periksa_migrasi'; message='Ada struktur Jenjang baru/sebagian. Cocokkan dengan rencana sebelumnya sebelum melanjutkan.'; }
    const blocks = own.filter(f=>f.tingkat==='masalah').length;
    if (blocks || globalBlock) { state='terhalang'; message='Ada masalah data/transaksi yang perlu diperiksa sebelum pemetaan dilanjutkan.'; }
    const sessions = records('Sesi').filter(s=>txt(s.data.id_program)===id);
    const members = records('Keikutsertaan').filter(k=>txt(k.data.id_program)===id);
    return {id,nama:txt(p.nama_program),status_program:txt(p.status_program),baris:r.baris,jenjang_lama:level,
      usulan:!existing && level && !mixed && !blocks && !globalBlock ? level : '',status:state,pesan:message,
      jumlah_sesi:sessions.length,jumlah_keikutsertaan:members.length,
      jumlah_terdaftar:members.filter(k=>txt(k.data.status_keikutsertaan).toLowerCase()==='terdaftar').length,
      masalah:blocks,masalah_global:globalBlock,
      sesi:sessions.map(s=>({id:txt(s.data.id_sesi),nama:txt(s.data.nama_sesi),baris:s.baris,jenjang:txt(s.data.id_jenjang)})),
      peserta:members.map(k=>{const person=lookup('Peserta',k.data.id_peserta);return {id:txt(k.data.id_keikutsertaan),id_peserta:txt(k.data.id_peserta),nama:person?txt(person.data.nama_pegawai):'(identitas tidak ditemukan/duplikat)',status:txt(k.data.status_keikutsertaan),baris:k.baris,jenjang:txt(k.data.id_jenjang)};})};
  });
  const used = new Set(records('Keikutsertaan').map(k=>txt(k.data.id_peserta)));
  return {sukses:true,hanya_baca:true,program,
    ringkasan:{program:program.length,sesi:records('Sesi').length,keikutsertaan:records('Keikutsertaan').length,
      peserta_tanpa_program:records('Peserta').filter(p=>!used.has(txt(p.data.id_peserta))).length,
      masalah:findings.filter(f=>f.tingkat==='masalah').length,masalah_global:globalBlock,
      riwayat_status_kosong:legacy,struktur_baru:existing},
    jumlah_temuan:findings.length,temuan:findings.slice(0,1000),batas_temuan:1000,
    catatan:'Pratinjau adalah usulan baca saja, bukan persetujuan atau rencana migrasi yang dapat diterapkan. Semua status peserta/program dipertahankan; tidak ada ID Jenjang diterbitkan. Hasil belum memeriksa kebenaran jadwal, NIP, JP atau rumus penilaian. Edit manual Google Sheets tidak dikoordinasikan oleh ScriptLock; hindari perubahan selama pembacaan.'};
}
