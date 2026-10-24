import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync(new URL('../Code.gs', import.meta.url), 'utf8');
const now = Date.parse('2026-10-24T03:30:00Z');
function formatDate(date, zone, pattern) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date).map(p=>[p.type,p.value]));
  return pattern.replace(/yyyy|MM|dd|HH|mm|ss/g, p=>parts[{yyyy:'year',MM:'month',dd:'day',HH:'hour',mm:'minute',ss:'second'}[p]]);
}
function harness(data = empty(), authorized = true) {
  const reads = [];
  const tables = {Program:['program',['id_program','nama_program','kategori_pelatihan','jenjang','tanggal_mulai','tanggal_selesai','status_program']],Peserta:['peserta',['id_peserta']],Keikutsertaan:['ikut',['id_keikutsertaan','id_program','id_peserta','status_keikutsertaan']],Sesi:['sesi',['id_sesi','id_program','nama_sesi','tanggal_sesi','jam_mulai','jam_selesai']],Kehadiran:['hadir',['id_kehadiran','id_sesi','id_keikutsertaan','waktu_datang','waktu_pulang','waktu_datang_terverifikasi','waktu_pulang_terverifikasi']],Catatan_Perilaku:['catatan',['id_catatan','id_keikutsertaan','id_sesi','status_validasi']]};
  const spreadsheet = {getSpreadsheetTimeZone:()=> 'Asia/Jakarta',getOwner:()=>({getEmail:()=> 'owner@example.test'}),getSheetByName:name=>{
    reads.push(name);const [key,headers] = tables[name];
    return {getDataRange:()=>({getValues:()=>[headers,...data[key].map(row=>headers.map(k=>row[k]??''))]})};
  }};
  const context = vm.createContext({Date, console,
    Utilities:{formatDate,parseDate:(s,z)=>new Date(s.replace(' ','T')+(z==='UTC'?'Z':'+07:00'))},
    Session:{getActiveUser:()=>({getEmail:()=>authorized?'owner@example.test':'other@example.test'})},
    SpreadsheetApp:{getActiveSpreadsheet:()=>spreadsheet},
    ScriptApp:{getService:()=>({getUrl:()=> 'https://script.google.com/macros/s/demo/exec'})},
    HtmlService:{createHtmlOutputFromFile:name=>({name,setTitle(title){this.title=title;return this;},addMetaTag(){return this;}})}
  });
  vm.runInContext(source,context);
  return {context,reads,summary:(d=data,time=now,zone='Asia/Jakarta')=>JSON.parse(JSON.stringify(context.ringkasBeranda_(d,time,zone)))};
}
function empty() {return {program:[],peserta:[],ikut:[],sesi:[],hadir:[],catatan:[]};}
function fixture() {
  const d = empty();
  d.program = [['P1','aktif','Manajerial'],['P2','aktif','Teknis'],['P3','draft','Sosial Kultural'],['P4','selesai','Teknis']].map(([id,status,kategori])=>({id_program:id,nama_program:'Program '+id,kategori_pelatihan:kategori,jenjang:'I',tanggal_mulai:'2026-10-20',tanggal_selesai:'2026-10-30',status_program:status}));
  d.peserta = ['A','B','C'].map(id=>({id_peserta:id,nama_pegawai:'Pegawai Rahasia '+id}));
  d.ikut = [['K1','P1','A','terdaftar'],['K2','P1','B','terdaftar'],['K3','P3','A','terdaftar'],['K4','P2','C','batal']].map(([id,program,person,status])=>({id_keikutsertaan:id,id_program:program,id_peserta:person,status_keikutsertaan:status}));
  d.sesi = [['S1','P1','2026-10-24','08:00','09:00'],['S2','P1','2026-10-24','10:00','11:00'],['S3','P1','2026-10-25','09:00','10:00'],['S4','P3','2026-10-23','08:00','09:00'],['S5','P1','2026-10-24','15:00','16:00'],['S6','P1','2026-10-25','invalid','10:00']].map(([id,program,date,start,end])=>({id_sesi:id,id_program:program,nama_sesi:'Sesi '+id,tanggal_sesi:date,jam_mulai:start,jam_selesai:end}));
  d.catatan = [['C1','K1','S1','belum_divalidasi'],['C2','K2','S1','ditolak'],['C3','K3','','belum_divalidasi'],['C4','missing','','belum_divalidasi']].map(([id,member,session,status])=>({id_catatan:id,id_keikutsertaan:member,id_sesi:session,status_validasi:status}));
  d.hadir = [['H1','K1','S1','2026-10-24T01:00:00Z',''],['H2','K2','S2','2026-10-24T03:00:00Z',''],['H3','K1','S3','',''],['H4','K3','S4','2026-10-23T01:00:00Z','2026-10-23T02:00:00Z']].map(([id,member,session,start,end])=>({id_kehadiran:id,id_keikutsertaan:member,id_sesi:session,waktu_datang:start?new Date(start):'',waktu_pulang:end?new Date(end):'',waktu_datang_terverifikasi:'',waktu_pulang_terverifikasi:''}));
  return d;
}
test('empty initialized database returns real zeroes and empty lists',()=>{
  const r=harness().summary();assert.equal(r.ringkasan.program,0);assert.equal(r.ringkasan.peserta,0);assert.equal(r.ringkasan.sesi,0);assert.deepEqual(r.agenda,[]);assert.deepEqual(r.kategori,[]);assert.deepEqual(r.peringatan,[]);
});
test('global totals keep unique people separate from registrations; pending excludes rejected',()=>{
  const r=harness(fixture()).summary();assert.deepEqual(r.ringkasan,{program:4,aktif:2,peserta:3,pendaftaran:3,sesi:6,hari_ini:3,mendatang:2});assert.equal(r.tindak_lanjut.catatan,2);assert.equal(r.tindak_lanjut.absensi,1);assert.equal(r.tindak_lanjut.tanpa_sesi,2);assert.equal(r.tindak_lanjut.tanpa_peserta,1);assert.equal(r.program.find(p=>p.id==='P2').peserta,0);assert.equal(JSON.stringify(r).includes('Pegawai Rahasia'),false);
});
test('agenda prioritizes ongoing sessions and excludes old/invalid schedules with warnings',()=>{
  const r=harness(fixture()).summary();assert.deepEqual(r.agenda.map(s=>s.id),['S2','S5','S1','S3']);assert.equal(r.agenda[0].status,'berlangsung');assert.ok(r.peringatan.some(s=>s.includes('1 sesi')));assert.ok(r.peringatan.some(s=>s.includes('relasi')));
});
test('agenda is limited to six sessions without reducing the global session count',()=>{
  const d=fixture();for(let n=7;n<=16;n++)d.sesi.push({id_sesi:'S'+n,id_program:'P1',nama_sesi:'Sesi '+n,tanggal_sesi:'2026-10-26',jam_mulai:'09:00',jam_selesai:'10:00'});const r=harness(d).summary();assert.equal(r.agenda.length,6);assert.equal(r.ringkasan.sesi,16);assert.equal(r.ringkasan.mendatang,12);
});
test('unrecognized or empty program statuses remain visible in the other bucket',()=>{
  const d=fixture();d.program[0].status_program='arsip';d.program[1].status_program='';d.program[0].kategori_pelatihan='';const r=harness(d).summary();assert.equal(r.status_program.lainnya,2);assert.equal(r.ringkasan.aktif,0);assert.ok(r.kategori.some(k=>k.nama==='Belum diisi'&&k.jumlah===1));
});
test('effective corrected times clear attendance review; future attendance stays excluded',()=>{
  const d=fixture();d.hadir[0].waktu_pulang_terverifikasi=new Date('2026-10-24T02:00:00Z');assert.equal(harness(d).summary().tindak_lanjut.absensi,0);
});
test('spreadsheet timezone determines today near the UTC day boundary',()=>{
  const d=fixture();d.sesi=[{id_sesi:'S1',id_program:'P1',nama_sesi:'Pagi',tanggal_sesi:'2026-10-24',jam_mulai:'08:00',jam_selesai:'09:00'}];d.hadir=[];d.catatan=[];const h=harness(d);assert.equal(h.summary(d,Date.parse('2026-10-23T18:00:00Z')).ringkasan.hari_ini,1);assert.equal(h.summary(d,Date.parse('2026-10-23T18:00:00Z'),'UTC').ringkasan.hari_ini,0);
});
test('duplicate IDs or duplicate memberships fail instead of inflating numbers',()=>{
  const d=fixture();d.peserta.push({...d.peserta[0]});assert.throws(()=>harness(d).summary(),/duplikat/);d.peserta.pop();d.ikut.push({...d.ikut[0],id_keikutsertaan:'K5'});assert.throws(()=>harness(d).summary(),/duplikat/);
});
test('foreign-program notes and attendance are not counted',()=>{
  const d=fixture();d.catatan.push({id_catatan:'C5',id_keikutsertaan:'K3',id_sesi:'S1',status_validasi:'belum_divalidasi'});d.hadir.push({id_kehadiran:'H5',id_keikutsertaan:'K3',id_sesi:'S1'});const r=harness(d).summary();assert.equal(r.tindak_lanjut.catatan,2);assert.equal(r.tindak_lanjut.absensi,1);
});
test('endpoint checks owner before reading; successful call reads each table once',()=>{
  const denied=harness(fixture(),false);assert.throws(()=>denied.context.muatBerandaIndex(),/Akses/);assert.deepEqual(denied.reads,[]);const allowed=harness();assert.equal(allowed.context.muatBerandaIndex().sukses,true);assert.deepEqual(allowed.reads,['Program','Peserta','Keikutsertaan','Sesi','Kehadiran','Catatan_Perilaku']);
});
test('a missing core sheet raises an error rather than returning a zero dashboard',()=>{
  const {context:c}=harness();c.SpreadsheetApp.getActiveSpreadsheet().getSheetByName=()=>null;assert.throws(()=>c.muatBerandaIndex(),/Sheet tidak ditemukan/);
});
test('default route is Beranda; existing monitoring, profile and QR routes are preserved',()=>{
  const {context:c}=harness();assert.equal(c.doGet().name,'Beranda');assert.equal(c.doGet({parameter:{page:'beranda'}}).name,'Beranda');assert.equal(c.doGet({parameter:{page:'monitoring'}}).name,'Index');assert.equal(c.doGet({parameter:{page:'pengelolaan'}}).name,'Pengelolaan');assert.equal(c.doGet({parameter:{page:'peserta'}}).name,'Peserta');assert.equal(c.doGet({parameter:{page:'profil',peserta:'A'}}).name,'Profil');assert.equal(c.doGet({parameter:{page:'pengelolaan',tab:'peserta'}}).name,'Peserta');assert.equal(c.doGet({parameter:{page:'beranda',absen:'token'}}).name,'Absensi');assert.equal(c.doGet({parameter:{page:'monitoring',absen:'token'}}).name,'Absensi');
});
