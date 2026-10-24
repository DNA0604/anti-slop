import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../Code.gs',import.meta.url),'utf8');
function context(result,records=[]) {
  const c=vm.createContext({console});vm.runInContext(source,c);
  const calls=[];
  c.validasiTokenQR=token=>{calls.push(['validate',token]);return result;};
  c.tabelIndex_=(sheet,columns)=>{calls.push(['read',sheet,...columns]);return {records};};
  return {c,calls};
}
const valid={valid:true,id_token_qr:'T1',id_sesi:'SES004',jenis_scan:'datang',berlaku_sampai:'2026-10-24T04:00:00.000Z'};
test('valid token resolves its exact session name and preserves validator metadata',()=>{
  const {c,calls}=context(valid,[{id_sesi:'SES003',nama_sesi:'Sesi lain'},{id_sesi:'SES004',nama_sesi:'  Kolaborasi Tim  '}]);
  const r=JSON.parse(JSON.stringify(c.muatTampilanAbsensiQR('token-contoh')));
  assert.deepEqual(r,{...valid,nama_sesi:'Kolaborasi Tim'});
  assert.deepEqual(calls,[['validate','token-contoh'],['read','Sesi','id_sesi','nama_sesi']]);
  assert.equal(valid.nama_sesi,undefined);
});
test('invalid, expired, revoked and duplicate token results do not read session metadata',()=>{
  for(const alasan of ['TOKEN_KOSONG','TOKEN_TIDAK_DITEMUKAN','TOKEN_TIDAK_AKTIF','TOKEN_DUPLIKAT','KEDALUWARSA']){
    const invalid={valid:false,alasan};const {c,calls}=context(invalid,[{id_sesi:'SES004',nama_sesi:'private'}]);
    assert.equal(c.muatTampilanAbsensiQR('contoh'),invalid);assert.deepEqual(calls,[['validate','contoh']]);
  }
});
test('no match and duplicate session IDs fail without returning an unrelated session name',()=>{
  for(const rows of [[],[{id_sesi:'SES003',nama_sesi:'Sesi lain'}],[{id_sesi:'SES004',nama_sesi:'A'},{id_sesi:'SES004',nama_sesi:'B'}]]){
    const {c}=context(valid,rows);assert.throws(()=>c.muatTampilanAbsensiQR('contoh'),/tidak ditemukan atau duplikat/);
  }
});
test('a blank name stays blank for the UI fallback, while arrival/departure metadata stays unchanged',()=>{
  const {c}=context({...valid,jenis_scan:'pulang'},[{id_sesi:'SES004',nama_sesi:'   '}]);
  const r=c.muatTampilanAbsensiQR('contoh');assert.equal(r.valid,true);assert.equal(r.nama_sesi,'');assert.equal(r.jenis_scan,'pulang');assert.equal(r.id_sesi,'SES004');
});
test('session lookup failure propagates instead of fabricating display information',()=>{
  const {c}=context(valid);c.tabelIndex_=()=>{throw Error('Sheet Sesi tidak tersedia');};assert.throws(()=>c.muatTampilanAbsensiQR('contoh'),/Sheet Sesi/);
});
