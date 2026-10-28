"""Actual server-injected application HTML in Chromium; service bridge uses synthetic backend fixtures."""
import json,subprocess,os,re
from pathlib import Path
from urllib.parse import urlparse,parse_qs
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[2];REPO=ROOT.parents[1]
script="""import {sessionHarness,plain} from './apps-script/absensi-dashboard/tests/support/sesi-harness.mjs';const {t,staff,admin,call,correction}=sessionHarness();call(staff,'simpanKoreksiIndex',correction());const html=Object.fromEntries(['Beranda','Index','Peserta','Profil','Pengelolaan','ManajemenAkses'].map(n=>[n,t.c.keluaranAplikasiPanitia_(n,n).content]));const fixture={html,login:t.c.halamanUjiLoginAkses_(null,true),storageKey:staff.storage_key,sessions:{staff,admin},roles:{},responses:{}};for(const [role,s] of Object.entries({staff,admin})){fixture.roles[role]=t.c.muatSesiAplikasiPanitia(s.token);fixture.responses[role]={muatAwalIndex:call(s,'muatAwalIndex'),muatBerandaIndex:call(s,'muatBerandaIndex'),muatKehadiranIndex:call(s,'muatKehadiranIndex','SES001'),muatRekapJPProgramIndex:call(s,'muatRekapJPProgramIndex','PRG001'),muatNilaiPerilakuProgramIndex:call(s,'muatNilaiPerilakuProgramIndex','PRG001'),muatCatatanPerilakuIndex:call(s,'muatCatatanPerilakuIndex','SES001'),muatDaftarIzinIndex:call(s,'muatDaftarIzinIndex','SES001'),muatPesertaProgramIndex:call(s,'muatPesertaProgramIndex','PRG001','',0),muatProfilPesertaIndex:call(s,'muatProfilPesertaIndex',{id_peserta:'PST001'}),muatPengajuanKoreksiPanitia:call(s,'muatPengajuanKoreksiPanitia')};}fixture.responses.admin.muatKelolaProgramIndex=call(admin,'muatKelolaProgramIndex','PRG001');fixture.responses.admin.muatManajemenAksesPanitia=call(admin,'muatManajemenAksesPanitia');const flow=t.startApp();fixture.flow=flow;fixture.callback=t.c.halamanUjiLoginAkses_({state:flow.state,code:'browser_app_code'},true);fixture.callbackResult=t.finishApp(flow);process.stdout.write(JSON.stringify(plain(fixture)));"""
fixture=json.loads(subprocess.check_output(['node','--input-type=module','-e',script],cwd=REPO,text=True))
MOCK=r'''
window.__f=FIXTURE;window.__role='staff';window.__calls=[];window.__expired=false;window.__logout=false;window.__fail='';window.__holdAuth=false;window.__pendingAuth=[];window.__authError='';window.__expireAfterAuth=false;
function value(name,arg){const f=window.__f,role=window.__role;
 if(window.__fail===name)throw Error('Simulasi koneksi terputus');
 if(name==='muatSesiAplikasiPanitia'){if(window.__authError)throw Error(window.__authError);if(window.__expired||arg!==f.sessions[role].token)throw Error('SESI_BERAKHIR: Silakan masuk kembali.');if(window.__expireAfterAuth)window.__expired=true;return f.roles[role];}
 if(name==='keluarAplikasiPanitia'){window.__logout=true;return {sukses:true};}
 if(name==='mulaiLoginAplikasiPanitia')return f.flow;
 if(name==='selesaikanCallbackLoginPanitia')return f.callbackResult;
 if(name!=='panggilAplikasiPanitia')throw Error('Unexpected native RPC '+name);
 if(window.__expired||arg.token!==f.sessions[role].token)throw Error('SESI_BERAKHIR: Silakan masuk kembali.');
 const rpc=arg.nama,args=arg.args,r=f.responses[role][rpc];
 if(r)return JSON.parse(JSON.stringify(r));
 if(role==='staff'&&['muatPenghapusanTertundaIndex','muatMasterPesertaHapusIndex'].includes(rpc))throw Error('AKSES_DITOLAK: Hanya Admin.');
 if(rpc==='muatPenghapusanTertundaIndex')return {sukses:true,transaksi:[],transaksi_lain:[]};
 if(rpc==='simpanKoreksiIndex')return {sukses:true,id:'KOR-UI',pesan:'Pengajuan koreksi terkirim kepada Admin. Waktu kehadiran belum diubah.'};
 if(rpc==='putuskanPengajuanKoreksiPanitia'){f.responses.admin.muatPengajuanKoreksiPanitia.pengajuan[0].status=args[0].keputusan==='tolak'?'ditolak':'disetujui';return {sukses:true,pesan:'Keputusan tersimpan.'};}
 throw Error('No fixture for '+role+' '+rpc);
}
function bridge(ok,bad){return new Proxy({}, {get(t,name){if(name==='withSuccessHandler')return f=>bridge(f,bad);if(name==='withFailureHandler')return f=>bridge(ok,f);return arg=>{window.__calls.push({name,arg:JSON.parse(JSON.stringify(arg??null))});const work=()=>{try{ok?.(value(name,arg));}catch(e){bad?.(e);}};if(name==='muatSesiAplikasiPanitia'&&window.__holdAuth)window.__pendingAuth.push(work);else setTimeout(work,20);};}});}
window.google={script:{run:bridge(),host:{close(){}},url:{getLocation(fn){fn({parameter:Object.fromEntries(new URL(location.href).searchParams)});}}}};
'''.replace('FIXTURE',json.dumps(fixture))
out=Path(os.environ.get('SESI_SCREENSHOT_DIR','/tmp/sesi-ui-preview'));out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 def page_for(file='Beranda',role='staff',width=1440,query='',init='',logged=True,reduced=False,endpoint='exec'):
  page=browser.new_page(viewport={'width':width,'height':1050},reduced_motion='reduce' if reduced else 'no-preference');errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  preset="window.__role="+json.dumps(role)+";"+("sessionStorage.setItem(window.__f.storageKey,window.__f.sessions[window.__role].token);" if logged else '')
  page.add_init_script(MOCK+preset+init)
  def route(r):
   if r.request.resource_type!='document':r.abort();return
   url=urlparse(r.request.url)
   if url.path not in ['/macros/s/COPY/exec','/macros/s/COPY/dev']:
    r.fulfill(status=404,content_type='text/html',body='<h1>Page not found</h1>');return
   key=parse_qs(url.query).get('page',[''])[0]
   name={'monitoring':'Index','peserta':'Peserta','profil':'Profil','pengelolaan':'Pengelolaan','akses':'ManajemenAkses','masuk':'__login__'}.get(key,file)
   body=fixture['login'] if name=='__login__' else fixture['callback'] if name=='__callback__' else fixture['html'][name]
   r.fulfill(status=200,content_type='text/html',body=body)
  page.route('**/*',route);page.goto('https://script.google.com/macros/s/COPY/'+endpoint+('?' + query if query else ''));return page,errors
 # No authenticated operational RPC runs until a valid server session has been checked.
 guest,ge=page_for(logged=False);expect(guest.locator('#panitiaAuth')).to_be_visible();expect(guest.locator('#panitiaLogin')).to_have_attribute('href',re.compile(r'page=masuk$'));assert guest.evaluate("window.__calls.filter(c=>c.name==='panggilAplikasiPanitia').length")==0;assert not ge,ge
 # Pending verification uses a neutral loader with no login/action/data, on desktop and mobile.
 for width,role in [(1440,'admin'),(390,'staff')]:
  waiting,we=page_for('Index',role=role,width=width,query='page=monitoring&program=PRG001&jenjang=JEN001&sesi=SES001',init='window.__holdAuth=true;',reduced=width==390)
  expect(waiting.locator('#panitiaAuth')).to_be_visible();expect(waiting.locator('#panitiaAuthPanel')).to_have_attribute('aria-busy','true');expect(waiting.locator('#panitiaAuthTitle')).to_have_text('Menyiapkan Monitoring');expect(waiting.locator('#panitiaLoading')).to_be_visible();expect(waiting.locator('#panitiaLogin')).not_to_be_visible();expect(waiting.locator('#panitiaRetry')).not_to_be_visible();assert waiting.evaluate("window.__calls.filter(c=>c.name==='panggilAplikasiPanitia').length")==0;assert waiting.evaluate('document.documentElement.scrollWidth<=innerWidth')
  if width==390:assert waiting.locator('#panitiaLoading').evaluate("e=>getComputedStyle(e).animationName")=='none'
  waiting.screenshot(path=str(out/('Transisi-Desktop.png' if width==1440 else 'Transisi-Mobile.png')))
  waiting.evaluate('window.__pendingAuth.splice(0).forEach(fn=>fn())');expect(waiting.locator('#panitiaAuth')).not_to_be_visible();expect(waiting.locator('#app')).to_be_visible();assert not we,we;waiting.close()
 # Connection/pending-access errors offer retry, not a new login, and retain page context without tokens.
 error,ere=page_for('Index',query='page=monitoring&program=PRG001&jenjang=JEN001&sesi=SES001&token=DO_NOT_COPY&code=DO_NOT_COPY',init="window.__fail='muatSesiAplikasiPanitia';")
 expect(error.locator('#panitiaAuth')).to_be_visible();expect(error.locator('#panitiaRetry')).to_be_visible();expect(error.locator('#panitiaLogin')).not_to_be_visible();expect(error.locator('#panitiaLoading')).not_to_be_visible();assert error.locator('#panitiaRetry').get_attribute('href')=='https://script.google.com/macros/s/COPY/exec?page=monitoring&program=PRG001&jenjang=JEN001&sesi=SES001';assert error.evaluate('sessionStorage.getItem(window.__f.storageKey)') is not None;assert error.evaluate("window.__calls.filter(c=>c.name==='panggilAplikasiPanitia').length")==0;assert not ere,ere
 held,hre=page_for(init="window.__authError='AKSES_DITAHAN: Ada transaksi akses belum selesai. Hubungi Admin.';");expect(held.locator('#panitiaAuthTitle')).to_have_text('Akses sementara ditahan');expect(held.locator('#panitiaLogin')).not_to_be_visible();expect(held.locator('#panitiaRetry')).to_be_visible();assert not hre,hre
 # Expiry during fade-out must cancel the dismiss timer and keep protected content covered.
 fading,fe=page_for(init='window.__expireAfterAuth=true;');expect(fading.locator('#panitiaLogin')).to_be_visible();fading.wait_for_timeout(250);expect(fading.locator('#panitiaAuth')).to_be_visible();expect(fading.locator('html')).to_have_attribute('data-panitia-locked','');assert not fe,fe
 # Staff sees scoped statistics and actual identity; global management is hidden.
 home,he=page_for();expect(home.locator('#panitiaAuth')).not_to_be_visible();expect(home.locator('.sidebar-account-text strong')).to_have_text('Petugas Uji');expect(home.locator('.sidebar-account-text small')).to_have_text('Petugas Kelas');expect(home.locator('[data-dash-page="pengelolaan"]')).not_to_be_visible();expect(home.locator('#panitiaRequests')).to_contain_text('Peserta A');assert not home.locator('body').inner_text().find('SECRET')>=0;home.screenshot(path=str(out/'Beranda-Petugas-Desktop.png'));assert not he,he
 # The authenticated bridge and session persist through normal program/Jenjang navigation.
 home.locator('[data-dash-page="monitoring"]').click();expect(home.locator('#app')).to_be_visible();home.locator('#kategori').select_option('Teknis');home.locator('#program').select_option('PRG001');home.locator('#jenjang').select_option('JEN001');home.locator('#sesi').select_option('SES001');expect(home.locator('#total')).to_have_text('1');expect(home.locator('#calculate')).not_to_be_visible();expect(home.locator('#openQR')).to_be_visible();expect(home.locator('#tableBody')).to_contain_text('Ajukan koreksi');assert not he,he
 home.locator('#tableBody button.action').first.click();expect(home.locator('#editDialog')).to_be_visible();expect(home.locator('#dialogTitle')).to_contain_text('Ajukan');home.locator('#startTime').fill('2026-10-20T08:05');home.locator('#reason').fill('Waktu datang perlu diperiksa');home.locator('#evidence').fill('Catatan panitia');home.locator('#saveEdit').click();expect(home.locator('#editDialog')).not_to_be_visible();assert home.evaluate("window.__calls.some(c=>c.name==='panggilAplikasiPanitia'&&c.arg.nama==='simpanKoreksiIndex')");home.screenshot(path=str(out/'Monitoring-Petugas-Desktop.png'))
 # A real deployment rejects parameters inside the path; verify selected-Jenjang round trips.
 for target,control in [('peserta','#participantJenjang'),('monitoring','#jenjang')]:
  home.locator('[data-dash-page="'+target+'"]').click();expect(home.locator(control)).to_have_value('JEN001');assert urlparse(home.url).path=='/macros/s/COPY/exec';assert parse_qs(urlparse(home.url).query)['program']==['PRG001'];assert parse_qs(urlparse(home.url).query)['jenjang']==['JEN001'];expect(home.locator('#panitiaAuth')).not_to_be_visible()
 # CSS sidebar hover/collapse behavior is preserved by the injected identity/logout controls.
 home.locator('#dashMenu').click();home.mouse.move(850,980);home.wait_for_timeout(300);narrow=home.locator('#dashSidebar').bounding_box()['width'];left=home.locator('#dashContent').bounding_box()['x'];home.locator('#dashSidebar').hover();home.wait_for_timeout(350);assert home.locator('#dashSidebar').bounding_box()['width']>narrow;assert home.locator('#dashContent').bounding_box()['x']>left
 # Participant read screen removes import/master/edit/delete affordances while keeping scoped profiles.
 people,pe=page_for('Peserta',width=390,query='page=peserta&program=PRG001&jenjang=JEN001');expect(people.locator('#participantsBody')).to_contain_text('Peserta A');expect(people.locator('#openSingleParticipant')).not_to_be_visible();expect(people.locator('#masterParticipantsCard')).not_to_be_visible();assert people.locator('#participantsBody button:visible').count()==0;assert people.evaluate('document.documentElement.scrollWidth<=innerWidth');people.screenshot(path=str(out/'Peserta-Petugas-Mobile.png'));assert not pe,pe
 profile,pre=page_for('Profil',width=390,query='page=profil&peserta=PST001&program=PRG001');expect(profile.locator('#panitiaAuth')).not_to_be_visible();assert not pre,pre
 # Mobile staff: participant name -> profile -> content back link, then sidebar return.
 people.locator('#participantsBody a').first.click();expect(people.locator('#content')).to_be_visible()
 for selector in ['#backParticipants','#backMonitoring','[data-dash-page="peserta"]','[data-dash-page="monitoring"]']:
  href=people.locator(selector).get_attribute('href');u=urlparse(href);q=parse_qs(u.query);assert u.path=='/macros/s/COPY/exec',href;assert q['program']==['PRG001'],href;assert q['jenjang']==['JEN001'],href
 people.locator('#backParticipants').click();expect(people.locator('#participantJenjang')).to_have_value('JEN001');assert not pe,pe
 # Editor /dev context remains /dev through an authenticated round trip.
 dev,dve=page_for('Index',query='page=monitoring&program=PRG001&jenjang=JEN001',endpoint='dev');expect(dev.locator('#jenjang')).to_have_value('JEN001');dev.locator('[data-dash-page="peserta"]').click();expect(dev.locator('#participantJenjang')).to_have_value('JEN001');assert urlparse(dev.url).path=='/macros/s/COPY/dev';dev.locator('[data-dash-page="monitoring"]').click();expect(dev.locator('#jenjang')).to_have_value('JEN001');assert urlparse(dev.url).path=='/macros/s/COPY/dev';assert not dve,dve;dev.close()
 # A direct admin-only page URL stays covered, and no operational method is dispatched.
 denied,de=page_for('Pengelolaan',query='page=pengelolaan');expect(denied.locator('#panitiaAuth')).to_be_visible();expect(denied.locator('#panitiaAuthMessage')).to_contain_text('Admin Pelatihan');expect(denied.locator('#panitiaHome')).to_be_visible();expect(denied.locator('#panitiaLogin')).not_to_be_visible();assert denied.evaluate("window.__calls.filter(c=>c.name==='panggilAplikasiPanitia').length")==0;assert not de,de
 # Admin retains management navigation and can review an actual-shaped pending staff request.
 admin,ae=page_for(role='admin');expect(admin.locator('.sidebar-account-text small')).to_have_text('Admin Pelatihan');expect(admin.locator('[data-dash-page="pengelolaan"]')).to_be_visible();expect(admin.locator('.sidebar-tools a')).to_have_attribute('href',re.compile(r'page=akses$'));admin.locator('#panitiaRequests button').filter(has_text='Tinjau').click();expect(admin.locator('#panitiaReview')).to_be_visible();admin.locator('#panitiaDecisionReason').fill('Bukti belum lengkap');admin.locator('#panitiaReview').get_by_role('button',name='Tolak',exact=True).click();expect(admin.locator('#panitiaReview')).not_to_be_visible();expect(admin.locator('#panitiaRequests')).to_contain_text('ditolak');assert not ae,ae
 # Admin: management -> participants -> monitoring -> management with one selected Jenjang.
 admin.goto('https://script.google.com/macros/s/COPY/exec?page=pengelolaan&program=PRG001&jenjang=JEN001');expect(admin.locator('#sessionJenjang')).to_have_value('JEN001')
 for target,control in [('peserta','#participantJenjang'),('monitoring','#jenjang'),('pengelolaan','#sessionJenjang')]:
  admin.locator('[data-dash-page="'+target+'"]').click();expect(admin.locator(control)).to_have_value('JEN001');u=urlparse(admin.url);q=parse_qs(u.query);assert u.path=='/macros/s/COPY/exec';assert q['program']==['PRG001'];assert q['jenjang']==['JEN001'];expect(admin.locator('#panitiaAuth')).not_to_be_visible()
 assert not ae,ae
 # Web account management uses the same session gateway, while deployment/activation remain native-owner settings.
 access,ace=page_for('ManajemenAkses',role='admin',query='page=akses');expect(access.locator('#directory')).to_be_visible();expect(access.locator('#googleConfigCard')).not_to_be_visible();expect(access.locator('#appModeCard')).not_to_be_visible();assert access.evaluate("window.__calls.some(c=>c.name==='panggilAplikasiPanitia'&&c.arg.nama==='muatManajemenAksesPanitia')");assert not ace,ace
 # Logout covers old content immediately and clears both browser and server session; expiry does the same.
 home.locator('.sidebar-tool').filter(has_text='Log Out').click();expect(home.locator('#panitiaAuth')).to_be_visible();assert home.evaluate('sessionStorage.getItem(window.__f.storageKey)') is None;home.wait_for_function('window.__logout===true');assert not he,he
 expired,ee=page_for(init='window.__expired=true;');expect(expired.locator('#panitiaAuth')).to_be_visible();expect(expired.locator('#panitiaLogin')).to_be_visible();assert expired.evaluate('sessionStorage.getItem(window.__f.storageKey)') is None;assert expired.evaluate("window.__calls.filter(c=>c.name==='panggilAplikasiPanitia').length")==0;assert not ee,ee
 # Application callback stores the session in browser storage and a user click opens the application; no token in href.
 callback,ce=page_for('__callback__',logged=False,init="sessionStorage.setItem('AKSES-GOOGLE|'+window.__f.flow.state,window.__f.flow.browser_key);");expect(callback.locator('#appLink')).to_be_visible();assert callback.evaluate('sessionStorage.getItem(window.__f.storageKey)')==fixture['callbackResult']['token'];assert fixture['callbackResult']['token'] not in callback.locator('#appLink').get_attribute('href');assert not ce,ce
 login,le=page_for('__login__',logged=False,width=390,query='page=masuk');expect(login.locator('#title')).to_have_text('Masuk Monitoring Pelatihan');login.locator('#prepare').click();expect(login.locator('#googleLink')).to_be_visible();assert login.evaluate("window.__calls.some(c=>c.name==='mulaiLoginAplikasiPanitia')");login.screenshot(path=str(out/'Login-Panitia-Mobile.png'));assert not le,le
 browser.close()
print('PASS: actual server-injected app, guest gate, staff/admin scope UI, correction request/review, protected direct route, navigation/sidebar, mobile, session logout/expiry, app callback; Google services mocked')
