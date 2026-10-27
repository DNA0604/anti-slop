import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
const code=fs.readFileSync(new URL('../Code.gs',import.meta.url),'utf8');
const source=fs.readFileSync(new URL('../Hapus.gs',import.meta.url),'utf8');
const auditHeader=['id_riwayat','jenis_data','id_referensi','jenis_tindakan','kolom_diubah','nilai_sebelum','nilai_sesudah','alasan_perubahan','diubah_oleh','waktu_perubahan','id_transaksi_perubahan','status_transaksi'];
function harness(){
 let count=0,denied=false,locked=false,reads=0,deleteCalls=0,fault=null,auditFault=null;
 const props=new Map(),sheets=new Map();
 function sheet(name,header,records=[]){
  const o={name,header,rows:records.map(r=>header.map(h=>r[h]??'')),formulas:records.map(()=>header.map(()=>'')),getName:()=>name,
   getDataRange(){reads++;return {getValues:()=>[header,...o.rows].map(r=>[...r]),getFormulas:()=>[header.map(()=>''),...o.formulas].map(r=>[...r])};},
   appendRow(row){if(name==='Riwayat_Validasi'&&auditFault?.(Object.fromEntries(header.map((h,i)=>[h,row[i]]))))throw Error('AUDIT_WRITE_FAILED');o.rows.push([...row]);o.formulas.push(header.map(()=>''));},
   deleteRows(start,n){deleteCalls++;if(fault?.({name,start,n,before:true}))throw Error('DELETE_FAILED');o.rows.splice(start-2,n);o.formulas.splice(start-2,n);if(fault?.({name,start,n,before:false}))throw Error('DELETE_FAILED_AFTER');},
   objects(){return o.rows.map(r=>Object.fromEntries(header.map((h,i)=>[h,r[i]])));}
  };sheets.set(name,o);return o;
 }
 const ss={getSheetByName:n=>sheets.get(n),getSheets:()=>[...sheets.values()],getId:()=> 'sheet',getOwner:()=>({getEmail:()=> 'owner@example.test'}),getSpreadsheetTimeZone:()=> 'UTC'};
 const c=vm.createContext({Date,Map,Set,console,SpreadsheetApp:{getActiveSpreadsheet:()=>ss,flush:()=>{}},Session:{getActiveUser:()=>({getEmail:()=>denied?'other@example.test':'owner@example.test'})},PropertiesService:{getScriptProperties:()=>({getProperty:k=>props.get(k)||null,setProperty:(k,v)=>props.set(k,v)})},LockService:{getScriptLock:()=>({waitLock:()=>{assert.equal(locked,false);locked=true;},releaseLock:()=>{assert.equal(locked,true);locked=false;}})},Utilities:{getUuid:()=> 'uuid-'+(++count),DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},computeDigest:(_,s)=>[...createHash('sha256').update(s).digest()]}});
 vm.runInContext(code,c);vm.runInContext(source,c);
 const spec=c.skemaHapus_();
 const tables={
 Program:[{id_program:'PRG001',nama_program:'Program Satu',status_program:'selesai'},{id_program:'PRG002',nama_program:'Program Dua',status_program:'aktif'}],
 Peserta:[{id_peserta:'PST001',nama_pegawai:'Peserta bersama',nip:'199001012020011001',unit_kerja:'Unit A'},{id_peserta:'PST002',nama_pegawai:'Belum terdaftar',nip:'199001012020011002',unit_kerja:'Unit B'}],
 Keikutsertaan:[{id_keikutsertaan:'KST001',id_program:'PRG001',id_peserta:'PST001'},{id_keikutsertaan:'KST002',id_program:'PRG002',id_peserta:'PST001'}],
 Sesi:[{id_sesi:'SES001',id_program:'PRG001',nama_sesi:'Sesi satu',tanggal_sesi:new Date('2026-10-01T00:00:00Z')},{id_sesi:'SES002',id_program:'PRG001',nama_sesi:'Sesi dua'},{id_sesi:'SES003',id_program:'PRG002',nama_sesi:'Sesi tiga'}],
 Jeda_Sesi:[{id_jeda:'JDA001',id_sesi:'SES001'},{id_jeda:'JDA002',id_sesi:'SES003'}],
 Kehadiran:[{id_kehadiran:'H1',id_sesi:'SES001',id_keikutsertaan:'KST001'},{id_kehadiran:'H2',id_sesi:'SES002',id_keikutsertaan:'KST001'},{id_kehadiran:'H3',id_sesi:'SES003',id_keikutsertaan:'KST002'}],
 Catatan_Perilaku:[{id_catatan:'C1',id_sesi:'SES001',id_keikutsertaan:'KST001',id_kehadiran:'H1',keterangan:'Izin 😀'},{id_catatan:'C2',id_sesi:'',id_keikutsertaan:'KST001',keterangan:'Catatan program'},{id_catatan:'C3',id_sesi:'SES003',id_keikutsertaan:'KST002'}],
 Token_QR:[{id_token_qr:'T1',id_sesi:'SES001'},{id_token_qr:'T3',id_sesi:'SES003'}],
 Log_Absensi:[{id_log:'L1',id_sesi:'SES001',id_keikutsertaan:'KST001',id_token_qr:'T1'},{id_log:'L3',id_sesi:'SES003',id_keikutsertaan:'KST002',id_token_qr:'T3'}]
 };
 for(const [n,required] of Object.entries(spec)){const records=tables[n];sheet(n,[...new Set([...required,...records.flatMap(Object.keys)])],records);}
 sheet('Riwayat_Validasi',auditHeader);
 sheet('Indikator_Perilaku',['id_indikator'],[{id_indikator:'I1'}]);sheet('Aturan_Penilaian',['id_aturan_penilaian'],[{id_aturan_penilaian:'RULE1'}]);
 function preview(kind='Program',id='PRG001'){return c.pratinjauHapusDataIndex(kind,id);}
 function payload(p){return {jenis:p.jenis,id:p.id,versi:p.versi,alasan:'Data uji dibatalkan',konfirmasi:p.id,setuju:true,id_permintaan:'request_1234567890_'+(++count)};}
 return {c,sheets,props,sheet,preview,payload,deny:()=>denied=true,reads:()=>reads,deleted:()=>deleteCalls,locked:()=>locked,fault:f=>fault=f,auditFault:f=>auditFault=f,objects:n=>sheets.get(n).objects(),pending:()=>c.muatPenghapusanTertundaIndex().transaksi,apply:(kind,id)=>c.hapusDataIndex(payload(preview(kind,id)))};
}
const plain=v=>JSON.parse(JSON.stringify(v));
test('all deletion/master endpoints and legacy mutations reject non-owner before reading or writing',()=>{
 const h=harness();h.deny();for(const f of [()=>h.preview(),()=>h.c.hapusDataIndex({}),()=>h.c.lanjutkanPenghapusanIndex({}),()=>h.c.muatPenghapusanTertundaIndex(),()=>h.c.muatMasterPesertaHapusIndex('',0),()=>h.c.tambahPeserta({}),()=>h.c.tambahKeikutsertaan({}),()=>h.c.tambahSesi({}),()=>h.c.tambahJedaSesi({}),()=>h.c.konfirmasiJPSesi({})])assert.throws(f,/pemilik/);assert.equal(h.reads(),0);assert.equal(h.deleted(),0);
});
test('preview is read-only; completed-program deletion cascades relations but preserves shared identities, rules and audits',()=>{
 const h=harness(),before=plain(h.objects('Program')),p=h.preview();assert.equal(p.total,11);assert.equal(h.deleted(),0);assert.equal(h.objects('Riwayat_Validasi').length,0);assert.deepEqual(plain(h.objects('Program')),before);
 const d=h.payload(p),r=h.c.hapusDataIndex(d);assert.equal(r.sukses,true);
 for(const [n,ids] of Object.entries({Program:['PRG002'],Sesi:['SES003'],Keikutsertaan:['KST002'],Kehadiran:['H3'],Catatan_Perilaku:['C3'],Token_QR:['T3'],Log_Absensi:['L3'],Jeda_Sesi:['JDA002']}))assert.deepEqual(h.objects(n).map(r=>r[h.c.skemaHapus_()[n][0]]),ids,n);
 assert.equal(h.objects('Peserta').length,2);assert.equal(h.objects('Aturan_Penilaian').length,1);assert.equal(h.pending().length,0);
 const rows=h.objects('Riwayat_Validasi');assert.ok(rows.some(r=>r.jenis_tindakan==='cadangan_hapus'));const meta=JSON.parse(rows.at(-1).nilai_sesudah),backup=h.c.bacaCadanganHapus_('HAPUS|'+d.id_permintaan,meta);assert.ok(JSON.stringify(backup).includes('$date'));assert.ok(JSON.stringify(backup).includes('Izin 😀'));
 const calls=h.deleted();assert.ok(h.c.hapusDataIndex(d).sukses);assert.equal(h.deleted(),calls);
});
test('session deletion keeps program, memberships, other sessions and their attendance intact',()=>{
 const h=harness();h.apply('Sesi','SES001');assert.equal(h.objects('Program').length,2);assert.equal(h.objects('Keikutsertaan').length,2);assert.deepEqual(h.objects('Sesi').map(r=>r.id_sesi),['SES002','SES003']);assert.deepEqual(h.objects('Kehadiran').map(r=>r.id_kehadiran),['H2','H3']);assert.deepEqual(h.objects('Catatan_Perilaku').map(r=>r.id_catatan),['C2','C3']);
});
test('removing one membership protects the same person and all records in another program',()=>{
 const h=harness();h.apply('Keikutsertaan','KST001');assert.deepEqual(h.objects('Keikutsertaan').map(r=>r.id_keikutsertaan),['KST002']);assert.equal(h.objects('Sesi').length,3);assert.equal(h.objects('Token_QR').length,2);assert.equal(h.objects('Peserta').length,2);assert.deepEqual(h.objects('Kehadiran').map(r=>r.id_kehadiran),['H3']);assert.deepEqual(h.objects('Catatan_Perilaku').map(r=>r.id_catatan),['C3']);assert.throws(()=>h.preview('Peserta','PST001'),/masih dipakai/);
});
test('master identity deletion requires zero memberships and remains reachable after all memberships are removed',()=>{
 const h=harness();assert.throws(()=>h.preview('Peserta','PST001'),/masih dipakai/);const search=h.c.muatMasterPesertaHapusIndex('belum',0);assert.equal(search.total,1);assert.equal(search.peserta[0].program,0);
 h.apply('Peserta','PST002');assert.equal(h.objects('Peserta').length,1);h.apply('Keikutsertaan','KST001');h.apply('Keikutsertaan','KST002');assert.equal(h.c.muatMasterPesertaHapusIndex('',0).peserta[0].program,0);h.apply('Peserta','PST001');assert.equal(h.objects('Peserta').length,0);
});
test('confirmation, request signature and stale related data cannot bypass preview',()=>{
 const h=harness(),d=h.payload(h.preview());for(const patch of [{setuju:false},{konfirmasi:'PRG002'},{alasan:''},{id_permintaan:'short'},{versi:'bogus'}])assert.throws(()=>h.c.hapusDataIndex({...d,...patch}),/tidak valid/);
 h.sheets.get('Sesi').rows[0][h.sheets.get('Sesi').header.indexOf('nama_sesi')]='Diubah';assert.throws(()=>h.c.hapusDataIndex(d),/Data berubah/);assert.equal(h.deleted(),0);assert.equal(h.objects('Riwayat_Validasi').length,0);
 const fresh=h.payload(h.preview());h.c.hapusDataIndex(fresh);assert.throws(()=>h.c.hapusDataIndex({...fresh,alasan:'Isi berbeda'}),/isi berbeda/);
});
test('missing sheets, duplicate IDs, custom-sheet references and cross-program links block deletion',()=>{
 for(const damage of [h=>h.sheets.delete('Token_QR'),h=>h.sheets.get('Sesi').appendRow(h.sheets.get('Sesi').rows[0]),h=>h.sheet('RekapTambahan',['id_sesi'],[{id_sesi:'SES001'}]),h=>{const t=h.sheets.get('Kehadiran');t.rows[0][t.header.indexOf('id_keikutsertaan')]='KST002';}]){const h=harness();damage(h);assert.throws(()=>h.preview(),/Sheet|duplikat|tambahan|lintas program/);assert.equal(h.deleted(),0);}
});
test('conflicting note-attendance or log-token links never broaden the cascade silently',()=>{
 const h=harness(),t=h.sheets.get('Log_Absensi');t.rows[1][t.header.indexOf('id_token_qr')]='T1';assert.throws(()=>h.preview('Sesi','SES001'),/log\/token/);assert.equal(h.deleted(),0);
 const g=harness(),c=g.sheets.get('Catatan_Perilaku');c.rows[2][c.header.indexOf('id_kehadiran')]='H1';assert.throws(()=>g.preview('Sesi','SES001'),/catatan\/kehadiran/);assert.equal(g.deleted(),0);
});
test('partial deletion is resumable and locks new writes until completion, even after an ambiguous delete response',()=>{
 const h=harness(),d=h.payload(h.preview());let once=true;h.fault(x=>{if(x.name==='Catatan_Perilaku'&&!x.before&&once){once=false;return true;}});assert.throws(()=>h.c.hapusDataIndex(d),/DELETE_FAILED_AFTER/);assert.equal(h.locked(),false);const p=h.pending()[0];assert.equal(p.status,'PENDING');assert.throws(()=>h.c.tambahPeserta({nama_pegawai:'A',nip:'199001012020011003',unit_kerja:'X'}),/penghapusan belum selesai/);assert.equal(h.locked(),false);assert.throws(()=>h.preview('Sesi','SES003'),/transaksi belum selesai/);
 h.fault(null);assert.throws(()=>h.c.lanjutkanPenghapusanIndex({id_transaksi:p.id_transaksi,konfirmasi:'wrong',setuju:true}),/Ketik ID/);
 const r=h.c.lanjutkanPenghapusanIndex({id_transaksi:p.id_transaksi,konfirmasi:p.id,setuju:true});assert.ok(r.sukses);assert.equal(h.pending().length,0);assert.deepEqual(h.objects('Program').map(r=>r.id_program),['PRG002']);
});
test('failed backup preparation deletes nothing and is safely closed before a new preview',()=>{
 const h=harness();h.auditFault(r=>r.jenis_tindakan==='cadangan_hapus');assert.throws(()=>h.apply('Program','PRG001'),/AUDIT_WRITE_FAILED/);assert.equal(h.deleted(),0);assert.equal(h.pending()[0].status,'MENYIAPKAN');const p=h.pending()[0];h.auditFault(null);const r=h.c.lanjutkanPenghapusanIndex({id_transaksi:p.id_transaksi,konfirmasi:p.id,setuju:true});assert.match(r.pesan,/Belum ada data/);assert.equal(h.pending().length,0);assert.equal(h.objects('Program').length,2);assert.ok(h.preview().versi);
});
test('recovery refuses modified backups or newly added dependent records before deleting more rows',()=>{
 for(const mode of ['backup','child','value']){
  const h=harness();h.fault(x=>x.before);assert.throws(()=>h.apply('Program','PRG001'),/DELETE_FAILED/);h.fault(null);const p=h.pending()[0],calls=h.deleted();
  if(mode==='backup'){const t=h.sheets.get('Riwayat_Validasi'),i=t.header.indexOf('jenis_tindakan'),row=t.rows.find(r=>r[i]==='cadangan_hapus');row[t.header.indexOf('nilai_sebelum')]=String(row[t.header.indexOf('nilai_sebelum')]).replace('Program Satu','Program Diubah');}
  if(mode==='child')h.sheets.get('Token_QR').appendRow(['NEW','SES001']);
  if(mode==='value'){const t=h.sheets.get('Sesi');t.rows[0][t.header.indexOf('nama_sesi')]='Changed after backup';}
  assert.throws(()=>h.c.lanjutkanPenghapusanIndex({id_transaksi:p.id_transaksi,konfirmasi:p.id,setuju:true}),/Verifikasi|Data berubah/);assert.equal(h.deleted(),calls);assert.equal(h.pending().length,1);
 }
});
test('retired sequential IDs cannot be reused by current or legacy allocators',()=>{
 const h=harness();h.apply('Program','PRG001');assert.equal(h.c.nomorIdKelola_([],'id_program','PRG'),'PRG002');assert.equal(h.c.nomorIdKelola_([],'id_sesi','SES'),'SES003');assert.equal(h.c.nomorIdKelola_([],'id_keikutsertaan','KST'),'KST002');assert.equal(h.c.nomorIdKelola_([],'id_jeda','JDA'),'JDA002');h.apply('Peserta','PST002');assert.equal(h.c.generateIdPeserta([]),'PST003');
});
test('an unfinished edit/import transaction blocks preparation; unrelated rows do not change a preview hash',()=>{
 const h=harness(),t=h.sheets.get('Riwayat_Validasi');t.appendRow(auditHeader.map(k=>({id_transaksi_perubahan:'OLD',jenis_tindakan:'edit_data',status_transaksi:'PENDING'}[k]||'')));assert.throws(()=>h.preview(),/transaksi belum selesai/);assert.equal(h.deleted(),0);
 const g=harness(),p=g.preview();g.sheets.get('Peserta').appendRow(['PST999','Other','199001012020011999','Unit']);assert.equal(g.preview().versi,p.versi);g.c.hapusDataIndex(g.payload(p));assert.ok(g.objects('Peserta').some(r=>r.id_peserta==='PST999'));
});
test('formula edits invalidate preview; chunked backup preserves long Unicode and formulas',()=>{
 const h=harness(),t=h.sheets.get('Sesi'),p=h.preview();t.formulas[0][0]='="SES001"';assert.throws(()=>h.c.hapusDataIndex(h.payload(p)),/Data berubah/);
 const c=h.sheets.get('Catatan_Perilaku'),at=c.header.indexOf('keterangan');c.rows[0][at]='😀'.repeat(18000);const fresh=h.preview(),d=h.payload(fresh);h.c.hapusDataIndex(d);const rows=h.objects('Riwayat_Validasi');assert.ok(rows.filter(r=>r.jenis_tindakan==='cadangan_hapus').length>1);const backup=h.c.bacaCadanganHapus_('HAPUS|'+d.id_permintaan,JSON.parse(rows.at(-1).nilai_sesudah));assert.ok(backup.tables.find(t=>t.name==='Sesi').rows[0].formulas[0]);assert.equal(backup.tables.find(t=>t.name==='Catatan_Perilaku').rows[0].values[at],'😀'.repeat(18000));
});

test('report preview refuses a pending deletion and releases its snapshot lock',()=>{
 const h=harness();vm.runInContext(fs.readFileSync(new URL('../Laporan.gs',import.meta.url),'utf8'),h.c);h.fault(x=>x.before);assert.throws(()=>h.apply('Program','PRG001'),/DELETE_FAILED/);assert.throws(()=>h.c.muatPratinjauLaporanProgram('PRG001'),/penghapusan belum selesai/);assert.equal(h.locked(),false);
});

test('final-audit failure after all data is removed can finish without restoring or deleting unrelated rows',()=>{
 const h=harness();h.auditFault(r=>r.jenis_tindakan==='hapus_data'&&r.status_transaksi==='SELESAI');assert.throws(()=>h.apply('Program','PRG001'),/AUDIT_WRITE_FAILED/);assert.deepEqual(h.objects('Program').map(r=>r.id_program),['PRG002']);const p=h.pending()[0];h.auditFault(null);const calls=h.deleted();assert.ok(h.c.lanjutkanPenghapusanIndex({id_transaksi:p.id_transaksi,konfirmasi:p.id,setuju:true}).sukses);assert.equal(h.pending().length,0);assert.equal(h.deleted(),calls);
});
test('complete backup with an interrupted PENDING marker can be verified and continued',()=>{
 const h=harness();h.auditFault(r=>r.jenis_tindakan==='hapus_data'&&r.status_transaksi==='PENDING');assert.throws(()=>h.apply('Sesi','SES001'),/AUDIT_WRITE_FAILED/);assert.equal(h.deleted(),0);const p=h.pending()[0];assert.equal(p.status,'MENYIAPKAN');h.auditFault(null);assert.ok(h.c.lanjutkanPenghapusanIndex({id_transaksi:p.id_transaksi,konfirmasi:p.id,setuju:true}).sukses);assert.equal(h.objects('Sesi').length,2);
});
test('oversized cascade is rejected before audit or source mutations',()=>{
 const h=harness(),t=h.sheets.get('Log_Absensi');for(let i=0;i<3000;i++)t.appendRow(t.header.map(k=>({id_log:'EXTRA'+i,id_sesi:'SES001',id_keikutsertaan:'KST001',id_token_qr:'T1'}[k]||'')));assert.throws(()=>h.preview(),/3.000/);assert.equal(h.deleted(),0);assert.equal(h.objects('Riwayat_Validasi').length,0);
});
