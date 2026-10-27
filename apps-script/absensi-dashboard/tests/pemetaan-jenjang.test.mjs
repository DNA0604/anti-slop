import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';

const source = fs.readFileSync(new URL('../PemetaanJenjang.gs', import.meta.url), 'utf8');
const original = fs.readFileSync(new URL('../Code.gs', import.meta.url), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
function harness(options={}) {
  let reads=0, locks=0, released=0, html=0;
  const sheets = {}, failWrite = () => { throw Error('FORBIDDEN WRITE'); };
  const sheet = name => {
    if (!sheets[name]) return null;
    return {getLastRow:()=>options.rows || sheets[name].values.length,getLastColumn:()=>sheets[name].values[0].length,
      getDataRange:()=>({getValues:()=>{reads++;return sheets[name].values;},getFormulas:()=>sheets[name].formulas}),
      appendRow:failWrite,deleteRows:failWrite,getRange:failWrite,setName:failWrite};
  };
  const ss = {getId:()=>options.sheetId || 'test-copy',getName:()=> 'Salinan Database Uji',getSpreadsheetTimeZone:()=> 'Asia/Jakarta',
    getOwner:()=>({getEmail:()=> 'owner@example.test'}),getSheetByName:sheet,
    insertSheet:failWrite,deleteSheet:failWrite,
    getUi:failWrite};
  const c = vm.createContext({Date,
    SpreadsheetApp:{getActiveSpreadsheet:()=>ss,getUi:()=>({showModalDialog:()=>{html++;}}),flush:failWrite},
    Session:{getActiveUser:()=>({getEmail:()=>options.denied?'other@example.test':'owner@example.test'})},
    LockService:{getScriptLock:()=>({tryLock:()=>{locks++;return !options.locked;},releaseLock:()=>{released++;}})},
    PropertiesService:{getScriptProperties:failWrite},DriveApp:new Proxy({},{get:()=>failWrite}),
    HtmlService:{createHtmlOutputFromFile:()=>({setWidth(){return this;},setHeight(){return this;}})},
    Utilities:{DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},computeDigest:(alg,text)=>Array.from(crypto.createHash('sha256').update(text).digest()),formatDate:()=> '2026-10-27 14:00:00'}
  });
  vm.runInContext(original,c);vm.runInContext(source,c);
  const spec=plain(c.skemaPratinjauJenjang_());
  function set(name, records=[],extra=[]) {
    const header=[...spec[name],...extra], values=[header,...records.map(r=>Array.isArray(r)?r:header.map(k=>r[k]??''))];
    sheets[name]={values,formulas:values.map(r=>r.map(()=>''))};
  }
  Object.keys(spec).filter(n=>n!=='Jenjang').forEach(n=>set(n));
  function baseline() {
    set('Program',[{id_program:'PRG001',nama_program:'Pelatihan Lama',jenjang:'Jenjang 1',status_program:'selesai'},{id_program:'PRG002',nama_program:'Pelatihan Lain',jenjang:'Dasar',status_program:'draft'}]);
    set('Peserta',[{id_peserta:'PST001',nama_pegawai:'Ani'},{id_peserta:'PST002',nama_pegawai:'Budi'},{id_peserta:'PST003',nama_pegawai:'Tanpa Program'}]);
    set('Sesi',[{id_sesi:'SES001',id_program:'PRG001',nama_sesi:'Materi'},{id_sesi:'SES002',id_program:'PRG002',nama_sesi:'Materi Lain'}]);
    set('Keikutsertaan',[{id_keikutsertaan:'KST001',id_program:'PRG001',id_peserta:'PST001',status_keikutsertaan:'terdaftar'},{id_keikutsertaan:'KST002',id_program:'PRG001',id_peserta:'PST002',status_keikutsertaan:'batal'},{id_keikutsertaan:'KST003',id_program:'PRG002',id_peserta:'PST001',status_keikutsertaan:'terdaftar'}]);
    set('Kehadiran',[{id_kehadiran:'KHD001',id_sesi:'SES001',id_keikutsertaan:'KST001'}]);
    set('Catatan_Perilaku',[{id_catatan:'CTP001',id_sesi:'SES001',id_keikutsertaan:'KST001',id_kehadiran:'KHD001',cakupan_kejadian:'sesi'}]);
    set('Token_QR',[{id_token_qr:'TQR001',id_sesi:'SES001'}]);
    set('Jeda_Sesi',[{id_jeda:'JDA001',id_sesi:'SES001'}]);
    set('Log_Absensi',[{id_log:'LOG001',id_sesi:'SES001',id_keikutsertaan:'KST001',id_token_qr:'TQR001',status_scan:'diterima'}]);
  }
  return {c,sheets,set,baseline,run:()=>plain(c.muatPratinjauPemetaanJenjang()),stats:()=>({reads,locks,released,html})};
}
const setup=()=>{const h=harness();h.baseline();return h;};
const program=r=>r.program.find(p=>p.id==='PRG001');
let auditId = 0;
const audit=(id,status,action='edit_data')=>({id_riwayat:'RV-'+(++auditId),id_transaksi_perubahan:id,status_transaksi:status,jenis_tindakan:action});

test('empty complete schema has real empty results and no writes',()=>{
  const h=harness(),before=plain(h.sheets),r=h.run();assert.equal(r.hanya_baca,true);assert.equal(r.program.length,0);assert.equal(r.ringkasan.masalah,0);assert.deepEqual(plain(h.sheets),before);assert.deepEqual(h.stats(),{reads:10,locks:1,released:1,html:0});
});
test('legacy mapping preserves finished/empty programs, all membership statuses and shared identities',()=>{
  const h=setup();const r=h.run();assert.equal(r.ringkasan.masalah,0);assert.equal(program(r).status,'usulan_tunggal');assert.equal(program(r).usulan,'Jenjang 1');assert.equal(program(r).status_program,'selesai');assert.equal(program(r).jumlah_keikutsertaan,2);assert.equal(program(r).jumlah_terdaftar,1);assert.equal(program(r).peserta[1].status,'batal');assert.equal(r.ringkasan.peserta_tanpa_program,1);assert.equal(r.program[1].peserta[0].id_peserta,'PST001');assert.match(r.versi,/^[a-f0-9]{64}$/);
});
test('same program name does not merge records and new Jenjang IDs are never issued',()=>{
  const h=setup();h.sheets.Program.values[2][1]='Pelatihan Lama';const r=h.run();assert.equal(r.program.length,2);assert.equal(program(r).sesi[0].id,'SES001');assert.equal(program(r).peserta[0].id,'KST001');assert.ok(!JSON.stringify(r).includes('JEN001'));
});
test('blank and potentially mixed legacy names require review rather than inferred placement',()=>{
  const h=setup();for(const text of ['', 'Dasar / Lanjutan','Jenjang 1 dan 2','1–3','I–III','Dasar - Lanjutan','1 hingga 3','I, II','Dasar; Lanjut','1 | 2','I\nII']){h.sheets.Program.values[1][2]=text;const p=program(h.run());assert.equal(p.status,text?'perlu_pemetaan':'perlu_jenjang');assert.equal(p.usulan,'');}
});
test('owner authorization protects both entry points before any data reads or locks',()=>{
  const h=harness({denied:true});assert.throws(()=>h.run(),/pemilik/);assert.throws(()=>h.c.bukaPratinjauPemetaanJenjang(),/pemilik/);assert.deepEqual(h.stats(),{reads:0,locks:0,released:0,html:0});
});
test('dialog entry opens the additive panel without reading or writing data',()=>{
  const h=harness();h.c.bukaPratinjauPemetaanJenjang();assert.deepEqual(h.stats(),{reads:0,locks:0,released:0,html:1});
});
test('lock contention returns an error without reading a partial snapshot',()=>{
  const h=harness({locked:true});assert.throws(()=>h.run(),/sedang digunakan/);assert.equal(h.stats().reads,0);assert.equal(h.stats().released,0);
});
test('missing sheet, malformed and duplicate headers fail explicitly and release the lock',()=>{
  for(const kind of ['missing','column','duplicate']){const h=setup();if(kind==='missing')delete h.sheets.Sesi;else if(kind==='column')h.sheets.Sesi.values[0][0]='wrong';else h.sheets.Sesi.values[0][2]='id_sesi';assert.throws(()=>h.run(),/sheet Sesi|Header Sesi/);assert.equal(h.stats().released,1);}
});
test('oversized source fails before returning fabricated or partial counts',()=>{
  const h=harness({rows:50002});assert.throws(()=>h.run(),/50.000/);assert.equal(h.stats().released,1);assert.equal(h.stats().reads,0);
});
test('physical row numbers remain correct after entirely blank rows',()=>{
  const h=setup();h.sheets.Sesi.values.splice(1,0,['','','']);h.sheets.Sesi.formulas.splice(1,0,['','','']);h.sheets.Sesi.values[2][1]='MISSING';const r=h.run();assert.ok(r.temuan.some(f=>f.sheet==='Sesi'&&f.baris===3&&f.pesan.includes('MISSING')));assert.ok(r.ringkasan.masalah_global>0);assert.ok(r.program.every(p=>p.status==='terhalang'));
});
test('duplicate IDs protect all involved programs rather than choosing the first',()=>{
  const h=setup();h.sheets.Sesi.values[2][0]='SES001';const r=h.run();assert.ok(r.program.every(p=>p.status==='terhalang'));assert.ok(r.temuan.some(f=>f.sheet==='Sesi'&&f.pesan.includes('duplikat')));
});
test('blank primary IDs and orphan links produce blockers with useful physical locations',()=>{
  const h=setup();h.sheets.Keikutsertaan.values[1][0]='';h.sheets.Keikutsertaan.values[1][2]='MISSING';const r=h.run();assert.equal(program(r).status,'terhalang');assert.ok(r.temuan.some(f=>f.sheet==='Keikutsertaan'&&f.baris===2&&f.pesan.includes('ID utama kosong')));assert.ok(r.temuan.some(f=>f.pesan.includes('MISSING')));
});
test('duplicate memberships within one program block mapping despite different status',()=>{
  const h=setup();h.sheets.Keikutsertaan.values[2][2]='PST001';const r=h.run();assert.equal(program(r).status,'terhalang');assert.ok(r.temuan.some(f=>f.pesan.includes('id_program + id_peserta')));
});
test('duplicate attendance pairs and mismatched activity references are detected',()=>{
  const h=setup();h.set('Kehadiran',[{id_kehadiran:'KHD001',id_sesi:'SES001',id_keikutsertaan:'KST001'},{id_kehadiran:'KHD002',id_sesi:'SES001',id_keikutsertaan:'KST001'}]);h.sheets.Catatan_Perilaku.values[1][1]='SES002';const r=h.run();assert.ok(r.temuan.some(f=>f.pesan.includes('id_sesi + id_keikutsertaan')));assert.ok(r.temuan.some(f=>f.pesan.includes('program berbeda')));assert.ok(r.temuan.some(f=>f.pesan.includes('Catatan dan kehadiran')));
});
test('bad break, token and log relationships are checked, not only attendance',()=>{
  const h=setup();h.sheets.Jeda_Sesi.values[1][1]='ORPHAN';h.sheets.Token_QR.values[1][1]='SES002';const r=h.run();assert.ok(r.temuan.some(f=>f.sheet==='Jeda_Sesi'&&f.pesan.includes('ORPHAN')));assert.ok(r.temuan.some(f=>f.pesan.includes('Log dan token')));
});
test('program-scoped notes and rejected unidentified logs remain valid',()=>{
  const h=setup();h.set('Catatan_Perilaku',[{id_catatan:'C1',id_keikutsertaan:'KST001',cakupan_kejadian:'program'}]);h.set('Log_Absensi',[{id_log:'L1',status_scan:'ditolak'}]);assert.equal(h.run().ringkasan.masalah,0);h.sheets.Log_Absensi.values[1][4]='diterima';assert.ok(h.run().ringkasan.masalah>0);
});
test('existing Jenjang even empty is a migration-review state, never remapped',()=>{
  const h=setup();h.set('Jenjang');const r=h.run();assert.ok(r.ringkasan.struktur_baru);assert.equal(program(r).status,'periksa_migrasi');assert.equal(program(r).usulan,'');assert.equal(r.ringkasan.masalah,0);
});
test('partial id_jenjang column and missing Jenjang record block a blind overwrite',()=>{
  const h=setup();h.set('Sesi',[{id_sesi:'SES001',id_program:'PRG001',nama_sesi:'Materi',id_jenjang:'J1'}],['id_jenjang']);const r=h.run();assert.equal(program(r).status,'terhalang');assert.ok(r.temuan.some(f=>f.pesan.includes('id_jenjang J1')));assert.equal(program(r).sesi[0].jenjang,'J1');
});
test('cross-Jenjang attendance/history and wrong-program Jenjang are blockers',()=>{
  const h=setup();h.set('Jenjang',[{id_jenjang:'J1',id_program:'PRG001',nama_jenjang:'Satu'},{id_jenjang:'J2',id_program:'PRG001',nama_jenjang:'Dua'},{id_jenjang:'J3',id_program:'PRG002',nama_jenjang:'Lain'}]);h.set('Sesi',[{id_sesi:'SES001',id_program:'PRG001',nama_sesi:'Materi',id_jenjang:'J1'},{id_sesi:'SES002',id_program:'PRG002',nama_sesi:'Lain',id_jenjang:'J1'}],['id_jenjang']);h.set('Keikutsertaan',[{id_keikutsertaan:'KST001',id_program:'PRG001',id_peserta:'PST001',status_keikutsertaan:'terdaftar',id_jenjang:'J2'}],['id_jenjang']);const r=h.run();assert.ok(r.temuan.some(f=>f.pesan.includes('Jenjang berbeda')));assert.ok(r.temuan.some(f=>f.pesan.includes('Jenjang dan record')));
});
test('latest explicit normalized audit states retain real pending and ignore blank legacy rows/backups',()=>{
  const h=setup();h.set('Riwayat_Validasi',[audit('A',' pending '),audit('A',' selesai '),audit('B',''),audit('C','CADANGAN','cadangan_hapus')]);assert.equal(h.run().ringkasan.masalah,0);h.set('Riwayat_Validasi',[audit('A','PENDING'),audit('A',''),audit('B',' dibatalkan ')]);const r=h.run();assert.equal(r.ringkasan.masalah_global,1);assert.ok(r.program.every(p=>p.status==='terhalang'));assert.ok(r.temuan.some(f=>f.pesan.includes('Transaksi A berstatus PENDING')));
});
test('unknown explicit audit statuses and pending without transaction IDs stay blocking',()=>{
  const h=setup();h.set('Riwayat_Validasi',[audit('','PENDING'),audit('B','UNKNOWN')]);const r=h.run();assert.equal(r.ringkasan.masalah_global,2);assert.ok(r.temuan.some(f=>f.pesan.includes('TANPA-ID-BARIS-2')));
});
test('fingerprint covers formulas, date types, extra columns and spreadsheet identity, with no source writes',()=>{
  const h=setup(),base=h.run().versi;assert.equal(h.run().versi,base);h.sheets.Program.formulas[1][1]='="Pelatihan Lama"';assert.notEqual(h.run().versi,base);h.sheets.Program.formulas[1][1]='';h.set('Program',[{id_program:'PRG001',nama_program:'Pelatihan Lama',jenjang:'I',status_program:'selesai',extra:new Date('2026-10-27T00:00:00Z')}],['extra']);const dated=h.run().versi;h.sheets.Program.values[1][4]='2026-10-27T00:00:00.000Z';assert.notEqual(h.run().versi,dated);const other=harness({sheetId:'other-copy'});other.baseline();assert.notEqual(other.run().versi,base);
});
test('response omits NIP, evidence, tokens and raw audit snapshots while retaining mapping identifiers',()=>{
  const h=setup();h.set('Peserta',[{id_peserta:'PST001',nama_pegawai:'Ani',nip:'SECRET-NIP'}],['nip']);h.set('Token_QR',[{id_token_qr:'TQR001',id_sesi:'SES001',token_hash:'SECRET-TOKEN'}],['token_hash']);h.set('Riwayat_Validasi',[{...audit('A','SELESAI'),nilai_sebelum:'SECRET-AUDIT'}],['nilai_sebelum']);h.sheets.Catatan_Perilaku.values[0].push('bukti_pendukung');h.sheets.Catatan_Perilaku.values[1].push('SECRET-EVIDENCE');h.sheets.Catatan_Perilaku.formulas.forEach(r=>r.push(''));const out=JSON.stringify(h.run());for(const secret of ['SECRET-NIP','SECRET-TOKEN','SECRET-AUDIT','SECRET-EVIDENCE'])assert.ok(!out.includes(secret));assert.ok(out.includes('KST001'));
});
test('findings are capped only for display; all programs/counts still use full findings',()=>{
  const h=setup();h.set('Jeda_Sesi',Array.from({length:1005},(_,i)=>({id_jeda:'J'+i,id_sesi:'ORPHAN'})));const r=h.run();assert.equal(r.temuan.length,1000);assert.equal(r.jumlah_temuan,1005);assert.equal(r.ringkasan.masalah_global,1005);assert.ok(r.program.every(p=>p.status==='terhalang'));
});
test('nonempty source and formulas are left byte-for-byte untouched on successful and failed reads',()=>{
  const h=setup();h.sheets.Program.formulas[1][1]='="Pelatihan Lama"';let before=plain(h.sheets);h.run();assert.deepEqual(plain(h.sheets),before);h.sheets.Sesi.values[0][0]='missing-header';before=plain(h.sheets);assert.throws(()=>h.run(),/Header Sesi/);assert.deepEqual(plain(h.sheets),before);
});
test('too many programs or oversized content fail explicitly without returning partial mappings',()=>{
  const h=setup();h.set('Program',Array.from({length:1001},(_,i)=>({id_program:'P'+i,nama_program:'Program',jenjang:'I',status_program:'aktif'})));assert.throws(()=>h.run(),/1.000 program/);h.set('Program',[{id_program:'P',nama_program:'X'.repeat(8000001),jenjang:'I',status_program:'aktif'}]);assert.throws(()=>h.run(),/8 juta/);assert.equal(h.stats().released,2);
});
