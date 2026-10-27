from pathlib import Path
from playwright.sync_api import sync_playwright, expect
import json
ROOT=Path(__file__).resolve().parents[2]
MOCK=r'''
window.__calls=[];window.__fail='';window.__delay=10;
window.__state={programs:[{id:'PRG001',nama:'Pelatihan Teknis Pengelolaan Data',kategori:'Teknis',jenjang:'Dasar',mulai:'2026-10-01',selesai:'2026-10-02',status:'selesai'},{id:'PRG002',nama:'Program Lain',kategori:'Manajerial',jenjang:'Dasar',mulai:'2026-10-01',selesai:'2026-10-02',status:'aktif'}],sessions:[{id:'SES001',nama:'Sesi Pertama',tanggal:'2026-10-01',mulai:'08:00',selesai:'10:00',jeda:'09:00–09:15',durasi_efektif:105,usulan_jp:2.33,status_jp:'dihitung',program:'PRG001'},{id:'SES002',nama:'Sesi Kedua',tanggal:'2026-10-02',mulai:'08:00',selesai:'10:00',jeda:'',durasi_efektif:120,usulan_jp:2.66,status_jp:'dihitung',program:'PRG001'}],members:[{id_peserta:'PST001',id_keikutsertaan:'KST001',nama:'Peserta Bersama',nip:'199001012020011001',unit:'Unit A',status:'terdaftar'}],masters:[{id:'PST001',nama:'Peserta Bersama',nip:'199001012020011001',unit:'Unit A',program:2},{id:'PST002',nama:'Peserta Uji',nip:'199001012020011002',unit:'Unit B',program:0}],pending:[],otherTx:[]};
function response(name,args){
 const s=window.__state;
 if(name==='muatAwalIndex')return {sukses:true,navigasi:{url:'https://script.google.com/macros/s/TEST/exec'},data:{program:s.programs.map(p=>({id_program:p.id,nama_program:p.nama,kategori_pelatihan:p.kategori,jenjang:p.jenjang})),sesi:[]}};
 if(name==='muatKelolaProgramIndex')return {sukses:true,program:s.programs,sesi:s.sessions.filter(x=>x.program===args[0]),zona_waktu:'Asia/Jakarta'};
 if(name==='muatRingkasanPesertaIndex')return {sukses:true,total:args[0]?s.members.length:0,peserta:s.members};
 if(name==='muatPesertaProgramIndex')return {sukses:true,total:s.members.length,jumlah_cocok:s.members.length,peserta:s.members};
 if(name==='muatMasterPesertaHapusIndex')return {sukses:true,total:s.masters.length,peserta:s.masters};
 if(name==='muatPenghapusanTertundaIndex')return {sukses:true,transaksi:s.pending,transaksi_lain:s.otherTx};
 if(name==='pratinjauHapusDataIndex'){
   if(window.__fail==='preview'){window.__fail='';throw Error('Akses pratinjau ditolak.');}
   if(window.__fail==='transaction'){window.__fail='';throw Error('Ada transaksi belum selesai: TX-CONTOH, Sesi SES001, Riwayat_Validasi baris 42.');}
   return {sukses:true,jenis:args[0],id:args[1],nama:window.__xss?'Target <img onerror="window.bad=true">':'Pelatihan Teknis Pengelolaan Data',versi:'a'.repeat(64),jumlah:[{sheet:args[0],jumlah:1},{sheet:'Kehadiran',jumlah:4},{sheet:'Log_Absensi',jumlah:8}],total:13,catatan:'Identitas peserta dan riwayat program lain tetap disimpan. File bukti tidak dihapus.'};
 }
 if(name==='hapusDataIndex'||name==='lanjutkanPenghapusanIndex'){
   const d=args[0],target=name==='hapusDataIndex'?d:s.pending[0];
   if(window.__fail==='network'){window.__fail='';throw Error('Koneksi terputus sebelum hasil diterima.');}
   if(window.__fail==='partial'){
     window.__fail='';s.pending=[{id_transaksi:'HAPUS|'+d.id_permintaan,jenis:d.jenis,id:d.id,nama:'Program Evaluasi',alasan:d.alasan,total:13,jumlah:[{sheet:'Program',jumlah:1},{sheet:'Log_Absensi',jumlah:8}],catatan:'Cadangan tersimpan; melanjutkan data yang tersisa.',status:'PENDING'}];throw Error('Penghapusan belum selesai.');
   }
   if(target.jenis==='Program'){s.programs=s.programs.filter(p=>p.id!==target.id);s.sessions=s.sessions.filter(x=>x.program!==target.id);s.members=[];}
   if(target.jenis==='Sesi')s.sessions=s.sessions.filter(x=>x.id!==target.id);
   if(target.jenis==='Keikutsertaan'){s.members=s.members.filter(x=>x.id_keikutsertaan!==target.id);s.masters[0].program=1;}
   if(target.jenis==='Peserta')s.masters=s.masters.filter(x=>x.id!==target.id);
   s.pending=[];return {sukses:true,jenis:target.jenis,id:target.id,pesan:'Penghapusan terkonfirmasi.'};
 }
 throw Error('Unmocked RPC '+name);
}
function bridge(ok,bad){return new Proxy({}, {get(t,name){if(name==='withSuccessHandler')return f=>bridge(f,bad);if(name==='withFailureHandler')return f=>bridge(ok,f);return (...args)=>{window.__calls.push({name,args:JSON.parse(JSON.stringify(args))});setTimeout(()=>{try{ok?.(response(name,args));}catch(e){bad?.(e);}},name==='hapusDataIndex'||name==='lanjutkanPenghapusanIndex'?window.__delay:10);};}});}
window.google={script:{run:bridge(),url:{getLocation:f=>f({parameter:Object.fromEntries(new URLSearchParams(location.search))})},host:{close(){},setHeight(){},setWidth(){}}}};
'''
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 def page_for(name,width=1440):
  page=browser.new_page(viewport={'width':width,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.add_init_script(MOCK)
  page.route('**/*',lambda route:route.fulfill(status=200,content_type='text/html',body=(ROOT/name).read_text()) if route.request.resource_type=='document' else route.abort())
  page.goto('https://script.google.com/macros/s/TEST/exec?page='+('peserta' if name=='Peserta.html' else 'pengelolaan')+'&program=PRG001')
  expect(page.locator('#app')).to_be_visible();expect(page.locator('#program')).to_have_value('PRG001')
  page.wait_for_timeout(100);return page,errors
 def confirm(page,id):
  assert page.locator('#deleteDataConfirm').count()==0;page.locator('#deleteDataReason').fill('Program dibatalkan; data uji.');page.locator('#deleteDataAgree').check();expect(page.locator('#confirmDeleteData')).to_be_enabled()
 # Desktop program workflow, escaping and partial recovery.
 page,errors=page_for('Pengelolaan.html');expect(page.locator('#managePrograms [data-delete-target="PRG001"]')).to_be_visible()
 page.evaluate('window.__xss=true');page.locator('#managePrograms [data-delete-target="PRG001"]').click();expect(page.locator('#deleteDataCounts li')).to_have_count(3)
 expect(page.locator('#confirmDeleteData')).to_be_disabled();expect(page.locator('#deleteDataTarget')).to_contain_text('<img');assert page.evaluate('window.bad') is None
 page.locator('#deleteDataAgree').check();expect(page.locator('#confirmDeleteData')).to_be_disabled();page.locator('#deleteDataAgree').uncheck();page.locator('#deleteDataReason').fill('Batal');expect(page.locator('#confirmDeleteData')).to_be_disabled()
 assert page.locator('#managePrograms [data-delete-target="PRG001"]').inner_text()==''
 assert page.locator('#managePrograms [data-delete-target="PRG001"] svg').count()==1
 assert 'Hapus program' in page.locator('#managePrograms [data-delete-target="PRG001"]').get_attribute('title')
 confirm(page,'PRG001');page.locator('#confirmDeleteData').click();expect(page.locator('#deleteFinalDialog')).to_be_visible();expect(page.locator('#cancelFinalDelete')).to_be_focused();expect(page.locator('#deleteFinalDescription')).to_contain_text('<img');assert page.evaluate('window.bad') is None
 page.locator('#cancelFinalDelete').click();expect(page.locator('#deleteFinalDialog')).not_to_be_visible();expect(page.locator('#confirmDeleteData')).to_be_focused();expect(page.locator('#deleteDataReason')).to_have_value('Program dibatalkan; data uji.');assert page.evaluate('window.__calls.filter(x=>x.name==="hapusDataIndex").length')==0
 page.locator('#confirmDeleteData').click();expect(page.locator('#deleteFinalDialog')).to_be_visible();page.keyboard.press('Escape');expect(page.locator('#deleteFinalDialog')).not_to_be_visible();assert page.evaluate('window.__calls.filter(x=>x.name==="hapusDataIndex").length')==0

 confirm(page,'PRG001');page.evaluate('window.__fail="partial";window.__delay=600');page.locator('#confirmDeleteData').click();expect(page.locator('#deleteFinalDialog')).to_be_visible();page.locator('#approveFinalDelete').click();page.keyboard.press('Escape');assert page.locator('#deleteDataDialog').evaluate('(e)=>e.open')
 expect(page.locator('#checkDeletePending')).to_be_visible();expect(page.locator('#deleteDataReason')).to_be_disabled();page.locator('#checkDeletePending').click()
 expect(page.locator('#deleteRecovery')).to_be_visible();page.locator('#deleteRecoveryItems button').click();expect(page.locator('#deleteDataReason')).to_be_disabled();page.locator('#deleteDataAgree').check();page.locator('#confirmDeleteData').click();expect(page.locator('#deleteFinalTitle')).to_contain_text('Lanjutkan');page.locator('#approveFinalDelete').click();expect(page.locator('#deleteDataDialog')).not_to_be_visible();expect(page.locator('#program')).to_have_value('');expect(page.locator('#managePrograms tr')).to_have_count(1);expect(page.locator('#deleteRecovery')).not_to_be_visible();assert not errors,errors
 # Session success keeps selection, handles a failed preview and identical-ID retry.
 page2,errors2=page_for('Pengelolaan.html');page2.evaluate('window.__fail="preview"');page2.locator('#manageSessions [data-delete-target="SES001"]').focus();page2.keyboard.press('Enter');expect(page2.locator('#deleteDataMessage')).to_contain_text('ditolak');expect(page2.locator('#confirmDeleteData')).to_be_disabled();page2.locator('#closeDeleteData').click()
 page2.locator('#manageSessions [data-delete-target="SES001"]').click();expect(page2.locator('#deleteDataCounts li')).to_have_count(3);confirm(page2,'SES001');page2.evaluate('window.__fail="network"');page2.locator('#confirmDeleteData').click();expect(page2.locator('#deleteFinalDialog')).to_be_visible();page2.locator('#approveFinalDelete').click();expect(page2.locator('#checkDeletePending')).to_be_visible();page2.locator('#confirmDeleteData').click();expect(page2.locator('#deleteFinalDialog')).to_be_visible();page2.locator('#approveFinalDelete').click();expect(page2.locator('#deleteDataDialog')).not_to_be_visible();expect(page2.locator('#manageSessions tr')).to_have_count(1);expect(page2.locator('#program')).to_have_value('PRG001');calls=page2.evaluate('window.__calls.filter(x=>x.name==="hapusDataIndex")');assert calls[0]['args']==calls[1]['args'];assert not errors2,errors2
 # Membership removal and orphan master cleanup, on mobile.
 mobile,me=page_for('Peserta.html',390);expect(mobile.locator('#participantsBody [data-delete-target="KST001"]')).to_be_visible();mobile.locator('#participantsBody [data-delete-target="KST001"]').click();expect(mobile.locator('#deleteDataCounts li')).to_have_count(3);confirm(mobile,'KST001')
 assert mobile.locator('#deleteDataDialog').evaluate('(e)=>e.getBoundingClientRect().width<=innerWidth')
 out=Path(__import__('os').environ.get('HAPUS_SCREENSHOT_DIR','/tmp/hapus-browser-preview'));out.mkdir(parents=True,exist_ok=True);mobile.screenshot(path=str(out/'Hapus-Peserta-Mobile.png'),full_page=False)
 mobile.locator('#confirmDeleteData').click();expect(mobile.locator('#deleteFinalDialog')).to_be_visible();assert mobile.locator('#deleteFinalDialog').evaluate('(e)=>e.getBoundingClientRect().width<=innerWidth');mobile.locator('#approveFinalDelete').click();expect(mobile.locator('#deleteDataDialog')).not_to_be_visible();expect(mobile.locator('#participantsBody tr')).to_have_count(0)
 mobile.locator('#searchMasterParticipants').click();expect(mobile.locator('#masterParticipantsBody tr')).to_have_count(2);assert mobile.locator('#masterParticipantsBody [data-delete-target="PST001"]').count()==0
 mobile.locator('#masterParticipantsBody [data-delete-target="PST002"]').click();expect(mobile.locator('#deleteDataCounts li')).to_have_count(3);confirm(mobile,'PST002');mobile.locator('#confirmDeleteData').click();expect(mobile.locator('#deleteFinalDialog')).to_be_visible();assert mobile.locator('#deleteFinalDialog').evaluate('(e)=>e.getBoundingClientRect().width<=innerWidth');mobile.locator('#approveFinalDelete').click();expect(mobile.locator('#deleteDataDialog')).not_to_be_visible();expect(mobile.locator('#masterParticipantsBody tr')).to_have_count(1);assert mobile.evaluate('document.documentElement.scrollWidth<=innerWidth');assert not me,me
 # Desktop screenshot and mobile management layout.
 shot,se=page_for('Pengelolaan.html');shot.locator('#managePrograms [data-delete-target="PRG001"]').click();expect(shot.locator('#deleteDataCounts li')).to_have_count(3);shot.screenshot(path=str(out/'Hapus-Program-Desktop.png'),full_page=False);confirm(shot,'PRG001');shot.locator('#confirmDeleteData').click();expect(shot.locator('#deleteFinalDialog')).to_be_visible();shot.screenshot(path=str(out/'Konfirmasi-Hapus-Desktop.png'),full_page=False);assert not se,se
 small,sm=page_for('Pengelolaan.html',390);small.locator('#managePrograms [data-delete-target="PRG001"]').click();expect(small.locator('#deleteDataCounts li')).to_have_count(3);assert small.evaluate('document.documentElement.scrollWidth<=innerWidth');confirm(small,'PRG001');small.locator('#confirmDeleteData').click();expect(small.locator('#deleteFinalDialog')).to_be_visible();assert small.locator('#deleteFinalDialog').evaluate('(e)=>e.getBoundingClientRect().width<=innerWidth');small.screenshot(path=str(out/'Konfirmasi-Hapus-Mobile.png'),full_page=False);assert not sm,sm
 # Show actionable non-deletion audit diagnostics and keep failed preview non-destructive.
 diagnostic,de=page_for('Pengelolaan.html',390)
 diagnostic.evaluate("window.__state.otherTx=[{id_transaksi:'TX-CONTOH',jenis:'Sesi',referensi:'SES001',status:'PENDING',baris:42,program:'PRG001',programs:['PRG001'],page:'pengelolaan',saran:'Periksa / Pulihkan Sesi <img onerror=window.bad=true>'}];window.__fail='transaction'")
 diagnostic.locator('#manageSessions [data-delete-target="SES001"]').click();expect(diagnostic.locator('#deleteDataMessage')).to_contain_text('TX-CONTOH');expect(diagnostic.locator('#deleteDataReason')).to_be_disabled();expect(diagnostic.locator('#confirmDeleteData')).to_be_disabled();diagnostic.locator('#checkDeletePending').click();expect(diagnostic.locator('#deleteRecovery')).to_be_visible();expect(diagnostic.locator('#deleteRecoveryTitle')).to_have_text('Transaksi yang Perlu Diperiksa');expect(diagnostic.locator('#deleteRecoveryItems')).to_contain_text('baris 42');expect(diagnostic.locator('#deleteRecoveryItems')).to_contain_text('<img');assert diagnostic.evaluate('window.bad') is None;assert diagnostic.evaluate('window.__calls.filter(x=>x.name==="hapusDataIndex").length')==0;assert diagnostic.evaluate('document.documentElement.scrollWidth<=innerWidth');diagnostic.screenshot(path=str(out/'Diagnostik-Transaksi-Mobile.png'),full_page=False);assert not de,de
 print('PASS: desktop/mobile deletion preview, escaping, icon keyboard activation, no ID entry, cancel/Escape without RPC, explicit final confirmation, busy Escape, failed preview, identical retry, partial recovery, list refresh, membership isolation UI, orphan master deletion, layout, transaction diagnostics with safe text and no deletion RPC, no page errors.')
 browser.close()
