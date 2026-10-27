import fs from 'node:fs';
import {harness,plain} from './akses-harness.mjs';
export {plain};
export function sessionHarness(){
 const t=harness();t.c.HtmlService.createHtmlOutputFromFile=name=>({getContent:()=>fs.readFileSync(new URL('../../'+name+'.html',import.meta.url),'utf8')});t.setup();t.google();
 function append(name,record){const cols=t.h.store[name].values[0];t.h.ss.getSheetByName(name).appendRow(cols.map(k=>record[k]??''));}
 function columns(name,cols){const values=t.h.store[name].values,head=values[0];for(const col of cols)if(!head.includes(col)){head.push(col);for(let i=1;i<values.length;i++)values[i].push('');}t.h.store[name].formulas=values.map(r=>r.map(()=>''));}
 columns('Kehadiran',['alasan_koreksi','dasar_verifikasi','diverifikasi_oleh','diverifikasi_pada']);
 columns('Catatan_Perilaku',['cakupan_kejadian','kunci_kejadian']);columns('Riwayat_Validasi',['bukti_pendukung']);
 columns('Token_QR',['jenis_scan','berlaku_mulai','berlaku_sampai','status_manual','alasan_penerbitan','created_at','updated_at']);
 t.h.patch('Program','PRG002','id_program',{nama_program:'SECRET-PROGRAM'});t.h.patch('Sesi','SES002','id_sesi',{nama_sesi:'SECRET-SESSION'});t.h.patch('Peserta','PST002','id_peserta',{nama_pegawai:'SECRET-PERSON'});
 append('Jenjang',{id_jenjang:'JEN003',id_program:'PRG001',nama_jenjang:'SECRET-JENJANG'});
 append('Sesi',{...t.h.records('Sesi')[0],id_sesi:'SES003',id_jenjang:'JEN003',nama_sesi:'SECRET-SAME-PROGRAM-SESSION'});
 append('Keikutsertaan',{...t.h.records('Keikutsertaan')[0],id_keikutsertaan:'KST003',id_peserta:'PST002',id_jenjang:'JEN003'});
 append('Kehadiran',{...t.h.records('Kehadiran')[0],id_kehadiran:'KHD003',id_sesi:'SES003',id_keikutsertaan:'KST003'});
 const u=t.addUser(),other=t.addUser({email:'other.staff@gmail.com',id_permintaan:'create_other_staff_request_01'});
 t.c.simpanPenugasanPanitia({pengguna:u.id,program:'PRG001',jenjang:'JEN001',status:'aktif',versi:'',id_permintaan:'staff_scope_request_000001'});
 t.c.simpanPenugasanPanitia({pengguna:other.id,program:'PRG002',jenjang:'JEN002',status:'aktif',versi:'',id_permintaan:'other_scope_request_000001'});
 t.finish(t.start());t.c.aturLoginAplikasiPanitia({aktif:true,konfirmasi:true});const admin=t.finishApp(t.startApp());
 t.provider({profile:{email:'petugas@gmail.com',sub:'998877665544332211001',name:'Petugas Uji'}});const staff=t.finishApp(t.startApp());
 t.provider({profile:{email:'other.staff@gmail.com',sub:'998877665544332211002',name:'Petugas Lain'}});const otherLogin=t.finishApp(t.startApp());
 t.h.c.Session={getActiveUser:()=>({getEmail:()=>''})};
 const call=(who,name,...args)=>plain(t.c.panggilAplikasiPanitia({token:who.token,nama:name,args}));
 const asOwner=()=>{t.h.c.Session={getActiveUser:()=>({getEmail:()=> 'owner@test.invalid'})};};
 const correction=(who=staff,id='SES001')=>{const r=call(who,'muatKehadiranIndex',id).peserta[0];return {id_kehadiran:r.id_kehadiran,versi:r.versi,datang:'2026-10-20T08:05',pulang:'',alasan:'Perbaikan waktu datang',dasar:'Pemeriksaan petugas'};};
 
 return {t,admin,staff,other:otherLogin,call,asOwner,append,columns,correction,u};
}
