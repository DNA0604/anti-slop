"""UI checks with real Chromium and mocked bridge; fixture computed by actual backend VM."""
import ast,json,subprocess,os
from urllib.parse import urlparse,parse_qs
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[2]
REPO=ROOT.parents[1]
# Generate service fixture from the same actual backend used in the integration tests.
script="""import fs from 'node:fs';import {harness,plain} from './apps-script/absensi-dashboard/tests/support/jenjang-harness.mjs';const h=harness(),pre=h.prepare();h.migrate();const j=h.c.tambahJenjangProgramIndex({id_program:'PRG001',nama:'Lanjutan',id_permintaan:'browser_add_jenjang_001'});const s=h.c.tambahSesiIndex({id_program:'PRG001',id_jenjang:j.id_jenjang,nama:'Materi Lanjutan',tanggal:'2026-10-20',mulai:'10:00',selesai:'12:15',status_jp:'dihitung',jeda:[],id_permintaan:'browser_add_session_001'});h.c.tambahKeikutsertaan({id_program:'PRG001',id_jenjang:j.id_jenjang,id_peserta:'PST003'});process.stdout.write(JSON.stringify(plain({pre,migrationHtml:h.c.halamanMigrasiJenjang_(),awal:h.c.muatAwalIndex(),manage:h.c.muatKelolaProgramIndex('PRG001'),peserta:h.c.muatPesertaProgramIndex('PRG001','',0),attendance:{SES001:h.c.muatKehadiranIndex('SES001'),[s.id_sesi]:h.c.muatKehadiranIndex(s.id_sesi)},recap:h.c.muatRekapJPProgramIndex('PRG001')})));"""
fixture=json.loads(subprocess.check_output(['node','--input-type=module','-e',script],cwd=REPO,text=True))
tree=ast.parse((ROOT/'tests/browser/hapus_browser.py').read_text())
BASE=next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='MOCK' for t in n.targets))
EXTRA=r'''
window.__fixture=FIXTURE;window.__migrationState=JSON.parse(JSON.stringify(window.__fixture.pre));
const previousResponse=response;
response=function(name,args){
 const f=window.__fixture;
 if(name==='muatAwalIndex')return f.awal;
 if(name==='muatKelolaProgramIndex')return {...f.manage,sesi:args[0]==='PRG001'?f.manage.sesi:[],jenjang:f.awal.data.jenjang.filter(j=>j.id_program===args[0])};
 if(name==='muatPesertaProgramIndex'){const list=f.peserta.peserta.filter(p=>!args[3]||p.id_jenjang===args[3]);return {...f.peserta,peserta:list,total:list.length,jumlah_cocok:list.length};}
 if(name==='muatKehadiranIndex')return f.attendance[args[0]];
 if(name==='muatRekapJPProgramIndex')return f.recap;
 if(name==='muatNilaiPerilakuProgramIndex')return {sukses:true,aturan:null,peserta:[],katalog:[]};
 if(name==='muatCatatanPerilakuIndex')return {sukses:true,catatan:[],indikator:[]};
 if(name==='tambahSesiIndex')return {sukses:true,id_program:args[0].id_program,id_sesi:'SES003',usulan_jp:3,pesan:'Sesi disimpan pada Jenjang terpilih.'};
 if(name==='tambahJenjangProgramIndex'){const j={id:'JEN004',nama:args[0].nama,id_program:args[0].id_program};f.awal.data.jenjang.push(j);f.manage.jenjang.push(j);return {sukses:true,id_jenjang:j.id,pesan:'Jenjang ditambahkan.'};}
 if(name==='muatPersiapanStrukturJenjang')return window.__migrationState;
 if(name==='mulaiMigrasiJenjang'||name==='lanjutkanMigrasiJenjang'){if(window.__migrationFail){window.__migrationState={sukses:true,status:'PENDING',transaksi:'MIGRASI-UJI',sumber:'Salinan Uji'};window.__migrationFail=false;throw Error('Koneksi terputus setelah rencana tersimpan.');}window.__migrationState={sukses:true,status:'SELESAI',pesan:'Struktur Jenjang sudah selesai disiapkan.'};return {sukses:true,pesan:'Struktur selesai.'};}
 if(name==='batalkanPersiapanMigrasiJenjang'){window.__migrationState=f.pre;return {sukses:true,pesan:'Persiapan dibatalkan.'};}
 return previousResponse(name,args);
};
'''.replace('FIXTURE',json.dumps(fixture))
out=Path(os.environ.get('JENJANG_SCREENSHOT_DIR','/tmp/jenjang-ui-preview'));out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 def open_page(file,width=1440,query='',init=''):
  page=browser.new_page(viewport={'width':width,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.add_init_script(BASE+EXTRA+init)
  def route(r):
   if r.request.resource_type!='document':r.abort();return
   url=urlparse(r.request.url)
   if url.path!='/macros/s/TEST/exec':
    r.fulfill(status=404,content_type='text/html',body='<h1>Page not found</h1>');return
   page_name=parse_qs(url.query).get('page',[''])[0]
   target=file if file=='__migration__' else {'pengelolaan':'Pengelolaan.html','peserta':'Peserta.html','monitoring':'Index.html'}.get(page_name,file)
   r.fulfill(status=200,content_type='text/html',body=fixture['migrationHtml'] if target=='__migration__' else (ROOT/target).read_text())
  page.route('**/*',route)
  page.goto('https://script.google.com/macros/s/TEST/exec?'+query);return page,errors
 # Management: explicit Jenjang field and a separate creation dialog; program context is preserved.
 page,errors=open_page('Pengelolaan.html',query='page=pengelolaan&program=PRG001')
 expect(page.locator('#jenjangPanel')).to_be_visible();expect(page.locator('#jenjangList')).to_contain_text('Lanjutan');expect(page.locator('#manageSessions')).to_contain_text('Lanjutan')
 page.locator('#openNewSession').click();expect(page.locator('#sessionJenjang')).to_be_visible();expect(page.locator('#sessionJenjang option')).to_have_count(3)
 page.locator('#sessionJenjang').select_option('JEN003');page.locator('#sessionName').fill('Sesi Uji UI');page.locator('#sessionDate').fill('2026-10-20');page.locator('#sessionStart').fill('10:00');page.locator('#sessionEnd').fill('12:15')
 page.screenshot(path=str(out/'Sesi-Jenjang-Desktop.png'))
 page.locator('#sessionForm button[type=submit]').click();expect(page.locator('#newSessionDetails')).not_to_be_visible();assert page.evaluate("window.__calls.find(c=>c.name==='tambahSesiIndex').args[0].id_jenjang")=='JEN003'
 page.locator('#openNewJenjang').click();expect(page.locator('#newJenjangDialog')).to_be_visible();page.locator('#jenjangName').fill('Jenjang Tambahan');page.locator('#saveJenjang').click();expect(page.locator('#newJenjangDialog')).not_to_be_visible();expect(page.locator('#jenjangList')).to_contain_text('Jenjang Tambahan');assert not errors,errors
 # Participant filter renders only the chosen level and retains IDs for existing delete/profile flows.
 participants,pe=open_page('Peserta.html',390,query='page=peserta&program=PRG001');expect(participants.locator('#participantJenjangField')).to_be_visible();participants.locator('#participantJenjang').select_option('JEN003');expect(participants.locator('#participantsBody')).to_contain_text('Peserta C');expect(participants.locator('#participantsBody')).not_to_contain_text('Peserta A');assert participants.evaluate('document.documentElement.scrollWidth<=innerWidth');participants.screenshot(path=str(out/'Peserta-Jenjang-Mobile.png'));assert not pe,pe
 # Monitoring changes from category/program to an exact Jenjang and its sessions. Query session resolves it too.
 monitoring,me=open_page('Index.html',query='page=monitoring&program=PRG001');expect(monitoring.locator('#app')).to_be_visible();expect(monitoring.locator('#program')).to_have_value('PRG001');expect(monitoring.locator('#jenjang')).to_have_value('');monitoring.locator('#jenjang').select_option('JEN003');expect(monitoring.locator('#sesi option')).to_have_count(2);monitoring.locator('#sesi').select_option('SES003');expect(monitoring.locator('#sessionInfo')).to_contain_text('Materi Lanjutan');expect(monitoring.locator('#total')).to_have_text('1');assert not me,me
 direct,de=open_page('Index.html',390,query='page=monitoring&program=PRG001&sesi=SES003');expect(direct.locator('#jenjang')).to_have_value('JEN003');expect(direct.locator('#sesi')).to_have_value('SES003');expect(direct.locator('#total')).to_have_text('1');assert direct.evaluate('document.documentElement.scrollWidth<=innerWidth');assert not de,de
 # Real sidebar navigation carries the selected Jenjang in both directions, preserving program/dev context.
 expect(monitoring.locator('[data-dash-page="peserta"]')).to_have_attribute('href',__import__('re').compile('jenjang=JEN003'))
 monitoring.locator('[data-dash-page="peserta"]').click();expect(monitoring.locator('#participantJenjang')).to_have_value('JEN003');expect(monitoring.locator('#program')).to_have_value('PRG001')
 monitoring.locator('[data-dash-page="pengelolaan"]').click();expect(monitoring.locator('#sessionJenjang')).to_have_value('JEN003')
 monitoring.locator('[data-dash-page="monitoring"]').click();expect(monitoring.locator('#jenjang')).to_have_value('JEN003');expect(monitoring.locator('#sesi option')).to_have_count(2)
 # Sidebar collapse while hovered remains stable, then pointer re-entry expands with a content push.
 monitoring.locator('#dashMenu').click();monitoring.mouse.move(800,900);monitoring.wait_for_timeout(300)
 narrow=monitoring.locator('#dashSidebar').bounding_box()['width'];left=monitoring.locator('#dashContent').bounding_box()['x']
 monitoring.locator('#dashSidebar').hover();monitoring.wait_for_timeout(350);assert monitoring.locator('#dashSidebar').bounding_box()['width']>narrow;assert monitoring.locator('#dashContent').bounding_box()['x']>left
 monitoring.locator('#dashMenu').click();monitoring.locator('#dashMenu').click();monitoring.wait_for_timeout(350);assert monitoring.locator('#dashSidebar').bounding_box()['width']<=narrow+1
 # Migration: confirmation can be cancelled without mutation, failure exposes resumable stored state.
 migration,xe=open_page('__migration__',query='page=migration-test');expect(migration.locator('#mapping')).to_be_visible();expect(migration.locator('#start')).to_be_disabled();expect(migration.locator('#rows input').nth(1)).to_have_value('Umum');migration.locator('#copy').check();migration.locator('#reviewed').check();migration.locator('#start').click();expect(migration.locator('#confirm')).to_be_visible();migration.locator('#cancel').click();assert migration.evaluate("window.__calls.filter(c=>c.name==='mulaiMigrasiJenjang').length")==0
 migration.screenshot(path=str(out/'Migrasi-Jenjang-Desktop.png'));migration.evaluate('window.__migrationFail=true');migration.locator('#start').click();migration.locator('#approve').click();expect(migration.locator('#error')).to_contain_text('Klik Muat Ulang');migration.locator('#reload').click();expect(migration.locator('#recovery')).to_be_visible();migration.locator('#resume').click();migration.locator('#approve').click();expect(migration.locator('#status')).to_contain_text('selesai');assert not xe,xe
 for file in ['Pengelolaan.html','Peserta.html','__migration__']:
  small,se=open_page(file,390,query='page=pengelolaan&program=PRG001');small.wait_for_timeout(100);assert small.evaluate('document.documentElement.scrollWidth<=innerWidth'),file;assert not se,se;small.close()
 browser.close()
print('PASS: management, destination/filter, monitoring scope and direct session navigation, migration confirmation/failure/recovery, desktop/mobile; Google services mocked')
