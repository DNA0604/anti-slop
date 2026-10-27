"""Real Chromium, Google bridge mocked. No access to Google or real spreadsheet data."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = Path(os.environ.get('PEMETAAN_SCREENSHOT_DIR', '/tmp/pemetaan-jenjang-preview'))
OUTPUT.mkdir(parents=True, exist_ok=True)
states = ['usulan_tunggal', 'perlu_jenjang', 'perlu_pemetaan', 'periksa_migrasi', 'terhalang']
programs = []
for i in range(24):
    programs.append(dict(id=f'PRG{i+1:03}', nama='Pelatihan Contoh ' + str(i+1), baris=i+2,
        status_program='selesai' if i == 0 else 'aktif', jenjang_lama='Jenjang 1' if i % 5 == 0 else '',
        usulan='Jenjang 1' if i % 5 == 0 else '', status=states[i % 5],
        pesan='Usulan masih memerlukan pemeriksaan pengelola.', jumlah_sesi=24, jumlah_keikutsertaan=24,
        jumlah_terdaftar=23, masalah=1 if i % 5 == 4 else 0, masalah_global=0,
        sesi=[dict(id=f'SES{j+1:03}', nama=f'Sesi Contoh {j+1}', baris=j+2, jenjang='') for j in range(24)],
        peserta=[dict(id=f'KST{j+1:03}', id_peserta=f'PST{j+1:03}', nama=f'Peserta Contoh {j+1}', status='terdaftar' if j < 23 else 'batal', baris=j+2, jenjang='') for j in range(24)]))
result = dict(sukses=True, hanya_baca=True, program=programs,
    ringkasan=dict(program=24, sesi=576, keikutsertaan=576, peserta_tanpa_program=2, masalah=4, masalah_global=0, riwayat_status_kosong=3, struktur_baru=False),
    temuan=[dict(tingkat='masalah', sheet='Keikutsertaan', baris=j+42, id=f'KST{j+1:03}', program=['PRG005'], pesan='Contoh masalah relasi untuk pengujian tampilan.', saran='Periksa data pada salinan database.') for j in range(24)],
    jumlah_temuan=24, batas_temuan=1000, sumber='Salinan Database Uji · Data simulasi', waktu='2026-10-27 14:00:00', zona='Asia/Jakarta', versi='a'*64, catatan='Pratinjau baca saja. Data contoh untuk pengujian lokal.')

MOCK = r'''
window.__data=RESULT;
window.__calls=[];window.__closed=false;window.__failure='';window.__delay=20;
function bridge(ok,bad){return new Proxy({}, {get(t,name){
 if(name==='withSuccessHandler')return f=>bridge(f,bad);
 if(name==='withFailureHandler')return f=>bridge(ok,f);
 return (...args)=>{window.__calls.push({name,args});setTimeout(()=>{
   if(name!=='muatPratinjauPemetaanJenjang'){bad?.(Error('Unexpected RPC '+name));return;}
   if(window.__failure){const message=window.__failure;window.__failure='';bad?.(Error(message));return;}
   ok?.(JSON.parse(JSON.stringify(window.__data)));
 },window.__delay);};
}});}
window.google={script:{run:bridge(),host:{close(){window.__closed=true;}}}};
'''.replace('RESULT', json.dumps(result))

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])

    def open_page(width=1440, init=''):
        page = browser.new_page(viewport={'width': width, 'height': 1000})
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.add_init_script(MOCK + init)
        page.route('**/*', lambda route: route.fulfill(status=200, content_type='text/html', body=(ROOT/'PratinjauJenjang.html').read_text()) if route.request.resource_type == 'document' else route.abort())
        page.goto('https://script.google.com/pemetaan-test')
        return page, errors

    desktop, errors = open_page()
    expect(desktop.locator('#result')).to_be_visible()
    expect(desktop.locator('#programRows tr')).to_have_count(20)
    expect(desktop.locator('#programCount')).to_have_text('24')
    desktop.locator('#next').click()
    expect(desktop.locator('#programRows tr')).to_have_count(4)
    desktop.locator('#prev').click()
    desktop.locator('#search').fill('PRG005')
    expect(desktop.locator('#programRows tr')).to_have_count(1)
    expect(desktop.locator('#programRows')).to_contain_text('Terhalang masalah data')
    desktop.locator('#search').fill('')
    desktop.locator('#filter').select_option('perlu_jenjang')
    expect(desktop.locator('#programRows tr')).to_have_count(5)
    desktop.locator('#filter').select_option('')
    desktop.locator('#nextFinding').click()
    expect(desktop.locator('#findings .finding')).to_have_count(4)
    desktop.locator('#prevFinding').click()
    button = desktop.locator('#programRows button').first
    button.focus()
    desktop.keyboard.press('Enter')
    expect(desktop.locator('#detailDialog')).to_be_visible()
    expect(desktop.locator('#closeDetail')).to_be_focused()
    expect(desktop.locator('#detailSessions tr')).to_have_count(20)
    desktop.locator('#nextSession').click()
    expect(desktop.locator('#detailSessions tr')).to_have_count(4)
    desktop.locator('#nextMember').click()
    expect(desktop.locator('#detailMembers')).to_contain_text('batal')
    desktop.keyboard.press('Escape')
    expect(desktop.locator('#detailDialog')).not_to_be_visible()
    expect(button).to_be_focused()
    desktop.screenshot(path=str(OUTPUT/'Pratinjau-Jenjang-Desktop.png'), full_page=False)

    # Refresh invalidates stale results; repeated click during request sends only one read.
    desktop.evaluate("window.__delay=400;window.__failure='Akses pemilik ditolak <img onerror=window.bad=true>'")
    desktop.locator('#reload').click()
    expect(desktop.locator('#result')).not_to_be_visible()
    desktop.evaluate("document.getElementById('reload').click()")
    expect(desktop.locator('#error')).to_contain_text('Akses pemilik ditolak <img')
    assert desktop.evaluate('window.bad') is None
    assert desktop.evaluate('window.__calls.length') == 2
    desktop.locator('#reload').click()
    expect(desktop.locator('#result')).to_be_visible()
    expect(desktop.locator('#error')).not_to_be_visible()

    # All dynamic labels and diagnostics are text, never interpreted HTML.
    mobile, mobile_errors = open_page(390, "window.__data.program[0].nama='<img src=x onerror=window.bad=true>';window.__data.temuan[0].pesan='<svg onload=window.bad=true>';window.__data.temuan[0].saran='<script>window.bad=true</script>';")
    expect(mobile.locator('#result')).to_be_visible()
    expect(mobile.locator('#programRows')).to_contain_text('<img')
    expect(mobile.locator('#findings')).to_contain_text('<svg')
    mobile.locator('#programRows button').first.click()
    expect(mobile.locator('#detailDialog')).to_be_visible()
    expect(mobile.locator('#detailTitle')).to_contain_text('<img')
    assert mobile.locator('#detailDialog').evaluate('(e)=>e.getBoundingClientRect().width<=innerWidth')
    assert mobile.evaluate('document.documentElement.scrollWidth<=innerWidth')
    assert mobile.evaluate('window.bad') is None
    mobile.keyboard.press('Escape')
    # Separate clean screenshot so the saved mobile preview starts on the program column.
    clean_mobile, ce = open_page(390)
    expect(clean_mobile.locator('#result')).to_be_visible()
    clean_mobile.screenshot(path=str(OUTPUT/'Pratinjau-Jenjang-Mobile.png'), full_page=False)
    assert not ce, ce
    clean_mobile.close()
    mobile.locator('#close').click()
    assert mobile.evaluate('window.__closed')

    for width in [320, 768]:
        small, se = open_page(width)
        expect(small.locator('#result')).to_be_visible()
        assert small.evaluate('document.documentElement.scrollWidth<=innerWidth')
        small.locator('#programRows button').first.click()
        expect(small.locator('#detailDialog')).to_be_visible()
        assert small.locator('#detailDialog').evaluate('(e)=>e.scrollWidth<=e.clientWidth')
        assert not se, se
        small.close()

    empty, ee = open_page(390, "window.__data.program=[];window.__data.temuan=[];window.__data.jumlah_temuan=0;window.__data.ringkasan.program=0;")
    expect(empty.locator('#programRows')).to_contain_text('Belum ada program')
    expect(empty.locator('#findings')).to_contain_text('Usulan tetap perlu ditinjau')
    expect(empty.locator('#next')).to_be_disabled()
    bad, be = open_page(390, "window.__failure='Header Sesi tidak sesuai. Tidak ada data diubah.';")
    expect(bad.locator('#error')).to_be_visible()
    expect(bad.locator('#result')).not_to_be_visible()
    malformed, me = open_page(390, 'window.__data.hanya_baca=false;')
    expect(malformed.locator('#error')).to_contain_text('tidak lengkap')
    expect(malformed.locator('#result')).not_to_be_visible()
    for page in [desktop, mobile, empty, bad, malformed]:
        assert page.evaluate('window.__calls.every(c=>c.name==="muatPratinjauPemetaanJenjang")')
    assert not (errors + mobile_errors + ee + be + me), errors + mobile_errors + ee + be + me
    browser.close()
print('PASS: desktop/mobile rendering, paging, filtering, details, focus, escaping, failed reload/empty/error states and read-only RPC contract')
