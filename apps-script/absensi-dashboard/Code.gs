/** Sumber server tetap; ID database tidak diterima dari browser. */
function databasePelatihan_(){const active=SpreadsheetApp.getActiveSpreadsheet();if(active)return active;if(typeof databaseAkses_==='function')return databaseAkses_();throw Error('Database pelatihan tidak tersedia pada konteks ini.');}
function doGet(e) {
  const parameter =
    e && e.parameter ? e.parameter : {};

  const token = parameter.absen
    ? String(parameter.absen).trim()
    : "";

  if (!token && typeof keluaranHalamanAkses_ === 'function') {
    const halamanAkses = keluaranHalamanAkses_(parameter);
    if (halamanAkses) return halamanAkses;
  }

  if (!token && String(parameter.page || '').trim()==='akses' && typeof keluaranAplikasiPanitia_==='function') {
    const halaman = keluaranAplikasiPanitia_('ManajemenAkses','Manajemen Akses Panitia');
    if (halaman) return halaman;
  }

  let namaFile = "Beranda";
  let judul = "Beranda Pelatihan";

  if (!token && String(parameter.page || "").trim() === "monitoring") {
    namaFile = "Index";
    judul = "Monitoring Pelatihan";
  }

  if (!token && String(parameter.page || "").trim() === "pengelolaan") {
    namaFile = "Pengelolaan";
    judul = "Pengelolaan Pelatihan";
  }

  if (!token && (String(parameter.page || "").trim() === "peserta" || (String(parameter.page || "").trim() === "pengelolaan" && String(parameter.tab || "").trim() === "peserta"))) {
    namaFile = "Peserta";
    judul = "Peserta Program";
  }

  if (!token && String(parameter.page || "").trim() === "profil") {
    namaFile = "Profil";
    judul = "Profil Peserta";
  }

  if (token) {
    namaFile = "Absensi";
    judul = "Absensi Pelatihan";
  }

  if (!token && typeof keluaranAplikasiPanitia_ === 'function') {
    const aplikasi = keluaranAplikasiPanitia_(namaFile, judul);
    if (aplikasi) return aplikasi;
  }
  return HtmlService
    .createHtmlOutputFromFile(namaFile)
    .setTitle(judul)
    .addMetaTag(
      "viewport",
      "width=device-width, initial-scale=1"
    );
}

function ujiRelasiDatabase() {
  if(typeof wajibEndpointAkses_==='function')wajibEndpointAkses_('ujiRelasiDatabase');
  const ss = databasePelatihan_();

  function bacaSheet(namaSheet) {
    const sheet = ss.getSheetByName(namaSheet);

    if (!sheet) {
      throw new Error(`Sheet "${namaSheet}" tidak ditemukan.`);
    }

    const data = sheet.getDataRange().getDisplayValues();
    const header = data.shift().map(h => h.trim());

    return data
      .filter(baris => baris.some(nilai => nilai !== ""))
      .map(baris => {
        const objek = {};

        header.forEach((kolom, index) => {
          objek[kolom] = baris[index];
        });

        return objek;
      });
  }

  const program = bacaSheet("Program");
  const peserta = bacaSheet("Peserta");
  const keikutsertaan = bacaSheet("Keikutsertaan");

  const petaProgram = new Map(
    program.map(p => [p.id_program, p])
  );

  const petaPeserta = new Map(
    peserta.map(p => [p.id_peserta, p])
  );

  const hasil = keikutsertaan.map(k => {
    const dataProgram = petaProgram.get(k.id_program);
    const dataPeserta = petaPeserta.get(k.id_peserta);

    if (!dataProgram || !dataPeserta) {
      throw new Error(
        `Relasi tidak valid pada ${k.id_keikutsertaan}: ` +
        `program atau peserta tidak ditemukan.`
      );
    }

    return {
      id_keikutsertaan: k.id_keikutsertaan,
      nama_peserta: dataPeserta.nama_pegawai,
      nama_program: dataProgram.nama_program,
      unit_kerja: k.unit_kerja_saat_pelatihan,
      status: k.status_keikutsertaan
    };
  });

  Logger.log(JSON.stringify(hasil, null, 2));

  return hasil;
}


function generateIdPeserta(dataPeserta) {
  if(typeof wajibEndpointAkses_==='function')wajibEndpointAkses_('generateIdPeserta');
  let nomorTerbesar = batasNomorIdHapus_("PST");

  dataPeserta.forEach(id => {
    const cocok = String(id).trim().match(/^PST(\d+)$/);

    if (cocok) {
      nomorTerbesar = Math.max(
        nomorTerbesar,
        Number(cocok[1])
      );
    }
  });

  return "PST" + String(nomorTerbesar + 1).padStart(3, "0");
}

function tambahPeserta(data) {
  if(typeof wajibEndpointAkses_==='function')wajibEndpointAkses_('tambahPeserta');
  wajibPemilikIndex_();
  if (!data || typeof data !== "object") {
    throw new Error("Data peserta tidak valid.");
  }

  const nama = String(data.nama_pegawai || "").trim();
  const nip = String(data.nip || "").trim();
  const unit = String(data.unit_kerja || "").trim();

  if (!nama || !nip || !unit) {
    throw new Error("Nama, NIP, dan unit kerja wajib diisi.");
  }

  if (!/^\d{18}$/.test(nip)) {
    throw new Error("NIP harus terdiri dari 18 digit angka.");
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    pastikanTidakAdaHapusTertunda_();
    const ss = databasePelatihan_();
    const sheet = ss.getSheetByName("Peserta");

    if (!sheet) {
      throw new Error('Sheet "Peserta" tidak ditemukan.');
    }

    const semuaData = sheet.getDataRange().getDisplayValues();
    const header = semuaData[0].map(h => h.trim());

    const kolomWajib = [
      "id_peserta",
      "nip",
      "nama_pegawai",
      "unit_kerja",
      "created_at",
      "updated_at"
    ];

    kolomWajib.forEach(kolom => {
      if (!header.includes(kolom)) {
        throw new Error("Kolom tidak ditemukan: " + kolom);
      }
    });

    const indexId = header.indexOf("id_peserta");
    const indexNip = header.indexOf("nip");

    const barisData = semuaData.slice(1).filter(
      baris => baris.some(nilai => nilai !== "")
    );

    const nipSudahAda = barisData.some(
      baris => String(baris[indexNip]).trim() === nip
    );

    if (nipSudahAda) {
      throw new Error("NIP sudah terdaftar dalam database.");
    }

    const daftarId = barisData.map(baris => baris[indexId]);
    const idBaru = generateIdPeserta(daftarId);

    const waktu = new Date();

    const pesertaBaru = {
      id_peserta: idBaru,
      nip: nip,
      nama_pegawai: nama,
      unit_kerja: unit,
      created_at: waktu,
      updated_at: waktu
    };

    const barisBaru = header.map(kolom =>
      Object.prototype.hasOwnProperty.call(pesertaBaru, kolom)
        ? pesertaBaru[kolom]
        : ""
    );

    const nomorBaris = sheet.getLastRow() + 1;

    // Simpan NIP sebagai teks untuk menjaga 18 digit.
    sheet.getRange(nomorBaris, indexNip + 1)
      .setNumberFormat("@");

    sheet.getRange(nomorBaris, 1, 1, header.length)
      .setValues([barisBaru]);

    SpreadsheetApp.flush();

    Logger.log("Peserta berhasil ditambahkan: " + idBaru);

    return {
      sukses: true,
      id_peserta: idBaru,
      nama_pegawai: nama
    };

  } finally {
    lock.releaseLock();
  }
}

function tambahKeikutsertaan(data) {
  if(typeof wajibEndpointAkses_==='function')wajibEndpointAkses_('tambahKeikutsertaan');
  wajibPemilikIndex_();
  if (!data || typeof data !== "object") {
    throw new Error("Data keikutsertaan tidak valid.");
  }

  const idPeserta = String(data.id_peserta || "").trim();
  const idProgram = String(data.id_program || "").trim();

  if (!idPeserta || !idProgram) {
    throw new Error("ID peserta dan ID program wajib diisi.");
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    pastikanTidakAdaHapusTertunda_();
    const ss = databasePelatihan_();

    function bacaTabel(namaSheet, kolomWajib) {
      const sheet = ss.getSheetByName(namaSheet);
      if (!sheet) {
        throw new Error("Sheet tidak ditemukan: " + namaSheet);
      }

      const values = sheet.getDataRange().getDisplayValues();
      const header = values[0].map(h => h.trim());

      kolomWajib.forEach(kolom => {
        if (!header.includes(kolom)) {
          throw new Error(
            `Kolom "${kolom}" tidak ditemukan di ${namaSheet}.`
          );
        }
      });

      const records = values.slice(1)
        .filter(row => row.some(v => v !== ""))
        .map(row => {
          const obj = {};
          header.forEach((h, i) => obj[h] = row[i]);
          return obj;
        });

      return { sheet, header, records };
    }

    const peserta = bacaTabel("Peserta", [
      "id_peserta", "unit_kerja"
    ]);

    const program = bacaTabel("Program", [
      "id_program"
    ]);

    const keikutsertaan = bacaTabel("Keikutsertaan", [
      "id_keikutsertaan",
      "id_peserta",
      "id_program",
      "unit_kerja_saat_pelatihan",
      "status_keikutsertaan",
      "created_at",
      "updated_at"
    ]);

    const dataPeserta = peserta.records.find(
      p => p.id_peserta === idPeserta
    );

    if (!dataPeserta) {
      throw new Error("Peserta tidak ditemukan: " + idPeserta);
    }

    const dataProgram = program.records.find(
      p => p.id_program === idProgram
    );

    if (!dataProgram) {
      throw new Error("Program tidak ditemukan: " + idProgram);
    }

    const sudahTerdaftar = keikutsertaan.records.some(
      k => k.id_peserta === idPeserta &&
           k.id_program === idProgram
    );

    if (sudahTerdaftar) {
      throw new Error(
        "Peserta sudah terdaftar pada program tersebut."
      );
    }

    let nomorTerbesar = batasNomorIdHapus_("KST");

    keikutsertaan.records.forEach(k => {
      const cocok = String(k.id_keikutsertaan)
        .match(/^KST(\d+)$/);

      if (cocok) {
        nomorTerbesar = Math.max(
          nomorTerbesar,
          Number(cocok[1])
        );
      }
    });

    const idBaru = "KST" +
      String(nomorTerbesar + 1).padStart(3, "0");

    const waktu = new Date();

    const recordBaru = {
      id_keikutsertaan: idBaru,
      id_program: idProgram,
      id_peserta: idPeserta,
      unit_kerja_saat_pelatihan: dataPeserta.unit_kerja,
      status_keikutsertaan: "terdaftar",
      created_at: waktu,
      updated_at: waktu
    };

    Object.assign(recordBaru,kolomJenjangData_(idProgram,data.id_jenjang));
    const barisBaru = keikutsertaan.header.map(kolom =>
      Object.prototype.hasOwnProperty.call(recordBaru, kolom)
        ? recordBaru[kolom]
        : ""
    );

    keikutsertaan.sheet.appendRow(barisBaru);
    SpreadsheetApp.flush();

    const hasil = {
      sukses: true,
      id_keikutsertaan: idBaru,
      id_peserta: idPeserta,
      id_program: idProgram,
      unit_kerja_saat_pelatihan: dataPeserta.unit_kerja
    };

    Logger.log(JSON.stringify(hasil, null, 2));
    return hasil;

  } finally {
    lock.releaseLock();
  }
}

function tambahSesi(data) {
  if(typeof wajibEndpointAkses_==='function')wajibEndpointAkses_('tambahSesi');
  wajibPemilikIndex_();
  if (!data || typeof data !== "object") {
    throw new Error("Data sesi tidak valid.");
  }

  const idProgram = String(data.id_program || "").trim();
  const namaSesi = String(data.nama_sesi || "").trim();
  const tanggal = String(data.tanggal_sesi || "").trim();
  const mulai = String(data.jam_mulai || "").trim();
  const selesai = String(data.jam_selesai || "").trim();

  if (!idProgram || !namaSesi || !tanggal || !mulai || !selesai) {
    throw new Error("Program, nama sesi, tanggal, dan jam wajib diisi.");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
    throw new Error("Tanggal harus menggunakan format YYYY-MM-DD.");
  }

  const bagianTanggal = tanggal.split("-").map(Number);
  const tanggalValid = new Date(Date.UTC(
    bagianTanggal[0], bagianTanggal[1] - 1, bagianTanggal[2]
  ));

  if (tanggalValid.toISOString().slice(0, 10) !== tanggal) {
    throw new Error("Tanggal sesi tidak valid.");
  }

  function menitDariJam(jam) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(jam)) {
      throw new Error("Format jam harus HH:mm, contoh 08:00.");
    }

    const [h, m] = jam.split(":").map(Number);
    return h * 60 + m;
  }

  const menitMulai = menitDariJam(mulai);
  const menitSelesai = menitDariJam(selesai);

  if (menitSelesai <= menitMulai) {
    throw new Error("Jam selesai harus setelah jam mulai.");
  }

  const durasiRencana = menitSelesai - menitMulai;

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    pastikanTidakAdaHapusTertunda_();
    const ss = databasePelatihan_();
    const sheetProgram = ss.getSheetByName("Program");
    const sheetSesi = ss.getSheetByName("Sesi");

    if (!sheetProgram || !sheetSesi) {
      throw new Error("Sheet Program atau Sesi tidak ditemukan.");
    }

    function bacaTabel(sheet, wajib) {
      const values = sheet.getDataRange().getDisplayValues();
      const header = values[0].map(h => h.trim());

      wajib.forEach(k => {
        if (!header.includes(k)) {
          throw new Error(
            `Kolom "${k}" tidak ditemukan di ${sheet.getName()}.`
          );
        }
      });

      const records = values.slice(1)
        .filter(row => row.some(v => v !== ""))
        .map(row => {
          const obj = {};
          header.forEach((h, i) => obj[h] = row[i]);
          return obj;
        });

      return { header, records };
    }

    const program = bacaTabel(sheetProgram, ["id_program"]);

    const sesi = bacaTabel(sheetSesi, [
      "id_sesi",
      "id_program",
      "nama_sesi",
      "tanggal_sesi",
      "jam_mulai",
      "jam_selesai",
      "durasi_rencana_menit",
      "durasi_efektif_menit",
      "jp_rencana",
      "status_jp",
      "created_at",
      "updated_at"
    ]);

    const programAda = program.records.some(
      p => p.id_program === idProgram
    );

    if (!programAda) {
      throw new Error("Program tidak ditemukan: " + idProgram);
    }

    let terbesar = batasNomorIdHapus_("SES");

    sesi.records.forEach(s => {
      const cocok = String(s.id_sesi).match(/^SES(\d+)$/);
      if (cocok) {
        terbesar = Math.max(terbesar, Number(cocok[1]));
      }
    });

    const idBaru = "SES" +
      String(terbesar + 1).padStart(3, "0");

    const waktu = new Date();

    // JP belum disahkan karena jeda belum dicatat.
    const recordBaru = {
      id_sesi: idBaru,
      id_program: idProgram,
      nama_sesi: namaSesi,
      tanggal_sesi: tanggal,
      jam_mulai: mulai,
      jam_selesai: selesai,
      durasi_rencana_menit: durasiRencana,
      durasi_jeda_menit: 0,
      durasi_efektif_menit: "",
      jp_rencana: "",
      status_jp: "dihitung",
      status_pemeriksaan: "belum_diperiksa",
      status_validasi_realisasi: "belum_divalidasi",
      created_at: waktu,
      updated_at: waktu
    };

    Object.assign(recordBaru,kolomJenjangData_(idProgram,data.id_jenjang));
    const barisBaru = sesi.header.map(kolom =>
      Object.prototype.hasOwnProperty.call(recordBaru, kolom)
        ? recordBaru[kolom]
        : ""
    );

    sheetSesi.appendRow(barisBaru);
    SpreadsheetApp.flush();

    const hasil = {
      sukses: true,
      id_sesi: idBaru,
      nama_sesi: namaSesi,
      durasi_rencana_menit: durasiRencana,
      jp_rencana: null,
      keterangan: "Menunggu pencatatan jeda dan konfirmasi JP."
    };

    Logger.log(JSON.stringify(hasil, null, 2));
    return hasil;

  } finally {
    lock.releaseLock();
  }
}

function tambahJedaSesi(data) {
  if(typeof wajibEndpointAkses_==='function')wajibEndpointAkses_('tambahJedaSesi');
  wajibPemilikIndex_();
  const idSesi = String(data?.id_sesi || "").trim();
  const mulai = String(data?.jam_mulai_jeda || "").trim();
  const selesai = String(data?.jam_selesai_jeda || "").trim();

  function keMenit(jam) {
    let nilai = String(jam).trim().toUpperCase();

    // Mendukung format 08.00 dan 08:00
    nilai = nilai.replace(".", ":");

    // Mendukung 8:00, 08:00, 08:00:00,
    // 8:00 AM, dan 12:00 PM
    const cocok = nilai.match(
      /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/
    );

    if (!cocok) {
      throw new Error(
        "Format jam tidak dikenali: " + JSON.stringify(jam)
      );
    }

    let jamAngka = Number(cocok[1]);
    const menit = Number(cocok[2]);
    const detik = cocok[3] === undefined
      ? 0
      : Number(cocok[3]);
    const periode = cocok[4];

    if (menit > 59 || detik > 59) {
      throw new Error("Nilai menit atau detik tidak valid.");
    }

    if (detik !== 0) {
      throw new Error(
        "Waktu harus memiliki ketelitian sampai menit."
      );
    }

    if (periode) {
      if (jamAngka < 1 || jamAngka > 12) {
        throw new Error("Format jam AM/PM tidak valid.");
      }

      jamAngka = jamAngka % 12;

      if (periode === "PM") {
        jamAngka += 12;
      }
    } else if (jamAngka > 23) {
      throw new Error("Jam harus berada antara 00 dan 23.");
    }

    return jamAngka * 60 + menit;
  }


  if (!idSesi || !mulai || !selesai) {
    throw new Error("ID sesi dan waktu jeda wajib diisi.");
  }

  const awalJeda = keMenit(mulai);
  const akhirJeda = keMenit(selesai);

  if (akhirJeda <= awalJeda) {
    throw new Error("Jam selesai jeda harus setelah jam mulai.");
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    pastikanTidakAdaHapusTertunda_();
    const ss = databasePelatihan_();
    const sheetSesi = ss.getSheetByName("Sesi");
    const sheetJeda = ss.getSheetByName("Jeda_Sesi");

    if (!sheetSesi || !sheetJeda) {
      throw new Error("Sheet Sesi atau Jeda_Sesi tidak ditemukan.");
    }

    function baca(sheet) {
      const values = sheet.getDataRange().getDisplayValues();
      const header = values[0].map(h => h.trim());
      const rows = values.slice(1).filter(r => r.some(v => v !== ""));

      const records = rows.map(r => {
        const obj = {};
        header.forEach((h, i) => obj[h] = r[i]);
        return obj;
      });

      return { header, records };
    }

    const sesi = baca(sheetSesi);
    const jeda = baca(sheetJeda);

    const dataSesi = sesi.records.find(s => s.id_sesi === idSesi);

    if (!dataSesi) {
      throw new Error("Sesi tidak ditemukan: " + idSesi);
    }

    const awalSesi = keMenit(dataSesi.jam_mulai);
    const akhirSesi = keMenit(dataSesi.jam_selesai);

    if (awalJeda < awalSesi || akhirJeda > akhirSesi) {
      throw new Error("Jeda harus berada dalam rentang waktu sesi.");
    }

    const bentrok = jeda.records.some(j =>
      j.id_sesi === idSesi &&
      awalJeda < keMenit(j.jam_selesai_jeda) &&
      akhirJeda > keMenit(j.jam_mulai_jeda)
    );

    if (bentrok) {
      throw new Error("Waktu jeda bertabrakan dengan jeda yang sudah ada.");
    }

    let nomorTerbesar = batasNomorIdHapus_("JDA");

    jeda.records.forEach(j => {
      const cocok = String(j.id_jeda).match(/^JDA(\d+)$/);
      if (cocok) {
        nomorTerbesar = Math.max(nomorTerbesar, Number(cocok[1]));
      }
    });

    const idBaru = "JDA" +
      String(nomorTerbesar + 1).padStart(3, "0");

    const waktu = new Date();

    const recordBaru = {
      id_jeda: idBaru,
      id_sesi: idSesi,
      jam_mulai_jeda: mulai,
      jam_selesai_jeda: selesai,
      durasi_jeda_menit: akhirJeda - awalJeda,
      status_validasi_jeda: "belum_divalidasi",
      keterangan: String(data.keterangan || ""),
      created_at: waktu,
      updated_at: waktu
    };

    const row = jeda.header.map(h =>
      Object.prototype.hasOwnProperty.call(recordBaru, h)
        ? recordBaru[h]
        : ""
    );

    sheetJeda.appendRow(row);
    SpreadsheetApp.flush();

    Logger.log("Jeda berhasil dibuat: " + idBaru);
    return { sukses: true, id_jeda: idBaru };

  } finally {
    lock.releaseLock();
  }
}

function hitungUsulanJPSesi(idSesi) {
  if(typeof wajibEndpointAkses_==='function')wajibEndpointAkses_('hitungUsulanJPSesi');
  const ss = databasePelatihan_();

  function bacaTabel(namaSheet, kolomWajib) {
    const sheet = ss.getSheetByName(namaSheet);

    if (!sheet) {
      throw new Error("Sheet tidak ditemukan: " + namaSheet);
    }

    const values = sheet.getDataRange().getDisplayValues();
    const header = values[0].map(h => h.trim());

    kolomWajib.forEach(kolom => {
      if (!header.includes(kolom)) {
        throw new Error(
          `Kolom "${kolom}" tidak ditemukan di ${namaSheet}.`
        );
      }
    });

    const records = values.slice(1)
      .filter(row => row.some(v => v !== ""))
      .map(row => {
        const obj = {};
        header.forEach((h, i) => obj[h] = row[i]);
        return obj;
      });

    return records;
  }

  const sesi = bacaTabel("Sesi", [
    "id_sesi",
    "durasi_rencana_menit"
  ]);

  const jeda = bacaTabel("Jeda_Sesi", [
    "id_sesi",
    "durasi_jeda_menit"
  ]);

  const dataSesi = sesi.find(
    s => s.id_sesi === idSesi
  );

  if (!dataSesi) {
    throw new Error("Sesi tidak ditemukan: " + idSesi);
  }

  function bacaMenit(nilai, namaKolom) {
    const teks = String(nilai).trim();

    if (!/^\d+$/.test(teks)) {
      throw new Error(
        `Nilai ${namaKolom} tidak valid: ${teks}`
      );
    }

    return Number(teks);
  }

  const durasiRencana = bacaMenit(
    dataSesi.durasi_rencana_menit,
    "durasi_rencana_menit"
  );

  const daftarJeda = jeda.filter(
    j => j.id_sesi === idSesi
  );

  const totalJeda = daftarJeda.reduce(
    (total, j) => total + bacaMenit(
      j.durasi_jeda_menit,
      "durasi_jeda_menit"
    ),
    0
  );

  const durasiEfektif = durasiRencana - totalJeda;

  if (durasiEfektif < 0) {
    throw new Error(
      "Total jeda melebihi durasi sesi."
    );
  }

  const jpPresisi = durasiEfektif / 45;
  const jpTampilan = Number(jpPresisi.toFixed(2));

  const hasil = {
    id_sesi: idSesi,
    durasi_rencana_menit: durasiRencana,
    total_jeda_menit: totalJeda,
    durasi_efektif_menit: durasiEfektif,
    usulan_jp: jpTampilan,
    status: "menunggu_konfirmasi_admin"
  };

  Logger.log(JSON.stringify(hasil, null, 2));

  return hasil;
}

function konfirmasiJPSesi(data) {
  if(typeof wajibEndpointAkses_==='function')wajibEndpointAkses_('konfirmasiJPSesi');
  wajibPemilikIndex_();
  if (!data || typeof data !== "object") {
    throw new Error("Data konfirmasi JP tidak valid.");
  }

  const idSesi = String(data.id_sesi || "").trim();
  const admin = String(data.admin || "").trim();
  const alasan = String(data.alasan || "").trim();
  const nilaiInput = data.jp_resmi;
  const jpResmi = Number(nilaiInput);

  if (!idSesi || !admin ||
      nilaiInput === "" ||
      nilaiInput === null ||
      nilaiInput === undefined ||
      !Number.isFinite(jpResmi) ||
      jpResmi < 0) {
    throw new Error("Data konfirmasi JP tidak lengkap atau tidak valid.");
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    pastikanTidakAdaHapusTertunda_();
    const ss = databasePelatihan_();
    const sheetSesi = ss.getSheetByName("Sesi");
    const sheetAudit = ss.getSheetByName("Riwayat_Validasi");

    if (!sheetSesi || !sheetAudit) {
      throw new Error("Sheet Sesi atau Riwayat_Validasi tidak ditemukan.");
    }

    function bacaHeader(sheet, wajib) {
      const header = sheet.getRange(
        1, 1, 1, sheet.getLastColumn()
      ).getDisplayValues()[0].map(h => h.trim());

      wajib.forEach(k => {
        if (!header.includes(k)) {
          throw new Error(
            `Kolom "${k}" tidak ditemukan di ${sheet.getName()}.`
          );
        }
      });

      return header;
    }

    const hs = bacaHeader(sheetSesi, [
      "id_sesi",
      "durasi_jeda_menit",
      "durasi_efektif_menit",
      "jp_rencana",
      "jp_dikonfirmasi_oleh",
      "jp_dikonfirmasi_pada",
      "alasan_penyesuaian_jp",
      "updated_at"
    ]);

    const ha = bacaHeader(sheetAudit, [
      "id_riwayat",
      "jenis_data",
      "id_referensi",
      "jenis_tindakan",
      "kolom_diubah",
      "nilai_sebelum",
      "nilai_sesudah",
      "alasan_perubahan",
      "diubah_oleh",
      "waktu_perubahan",
      "id_transaksi_perubahan",
      "status_transaksi"
    ]);

    const semuaSesi = sheetSesi.getDataRange().getDisplayValues();
    const indexId = hs.indexOf("id_sesi");

    const indexBaris = semuaSesi.findIndex(
      (r, i) => i > 0 && r[indexId] === idSesi
    );

    if (indexBaris < 0) {
      throw new Error("Sesi tidak ditemukan: " + idSesi);
    }

    const nomorBaris = indexBaris + 1;
    const barisLama = semuaSesi[indexBaris];

    function nilaiKolom(k) {
      return barisLama[hs.indexOf(k)];
    }

    const jpLamaTeks = String(nilaiKolom("jp_rencana")).trim();
    const jpLama = jpLamaTeks === "" ? null : Number(jpLamaTeks);

    if (jpLama !== null && !Number.isFinite(jpLama)) {
      throw new Error("JP lama tidak valid.");
    }

    // Periksa status terakhir setiap transaksi terkait sesi ini.
    const auditValues = sheetAudit.getDataRange().getDisplayValues();
    const auditRecords = auditValues.slice(1)
      .filter(r => r.some(v => v !== ""));

    const posisi = k => ha.indexOf(k);
    const statusTerakhir = new Map();

    auditRecords.forEach(r => {
      if (
        r[posisi("jenis_data")] === "Sesi" &&
        r[posisi("id_referensi")] === idSesi
      ) {
        const tx = r[posisi("id_transaksi_perubahan")];
        const status = r[posisi("status_transaksi")];

        // Riwayat lama tanpa status tidak dianggap
        // sebagai transaksi tertunda.
        if (tx && status) {
          statusTerakhir.set(tx, status);
        }
      }
    });

    const hasilPemeriksaan = evaluasiStatusTransaksiJP(
      Array.from(statusTerakhir.entries()).map(([id, status]) => ({
        id_transaksi: id,
        status_transaksi: status
      }))
    );

    if (!hasilPemeriksaan.aman_untuk_konfirmasi_baru) {
      throw new Error(
        "Ada transaksi JP yang belum selesai. " +
        JSON.stringify(hasilPemeriksaan.transaksi_bermasalah)
      );
    }

    // Hitung usulan dari data sesi dan jeda.
    const usulan = hitungUsulanJPSesi(idSesi);

    if (
      Math.abs(jpResmi - usulan.usulan_jp) > 0.005 &&
      !alasan
    ) {
      throw new Error(
        "Alasan wajib diisi jika JP berbeda dari usulan."
      );
    }

    const waktu = new Date();
    const idTransaksi = Utilities.getUuid();

    const perubahan = {
      durasi_jeda_menit: usulan.total_jeda_menit,
      durasi_efektif_menit: usulan.durasi_efektif_menit,
      jp_rencana: jpResmi,
      alasan_penyesuaian_jp: alasan,
      jp_dikonfirmasi_oleh: admin,
      jp_dikonfirmasi_pada: waktu,
      updated_at: waktu
    };

    function samaAngka(a, b) {
      return String(a).trim() !== "" &&
        Math.abs(Number(a) - Number(b)) < 0.000001;
    }

    // Periksa perubahan substantif, bukan timestamp.
    const tidakBerubah =
      samaAngka(nilaiKolom("jp_rencana"), jpResmi) &&
      samaAngka(
        nilaiKolom("durasi_jeda_menit"),
        usulan.total_jeda_menit
      ) &&
      samaAngka(
        nilaiKolom("durasi_efektif_menit"),
        usulan.durasi_efektif_menit
      ) &&
      String(nilaiKolom("alasan_penyesuaian_jp")).trim() === alasan;

    if (tidakBerubah) {
      const hasil = {
        sukses: true,
        tidak_ada_perubahan: true,
        id_sesi: idSesi,
        jp_resmi: jpResmi
      };

      Logger.log(JSON.stringify(hasil, null, 2));
      return hasil;
    }

    const kolomAudit = Object.keys(perubahan);

    const nilaiSebelum = {};
    const nilaiSesudah = {};

    kolomAudit.forEach(k => {
      nilaiSebelum[k] = nilaiKolom(k);
      nilaiSesudah[k] = perubahan[k] instanceof Date
        ? perubahan[k].toISOString()
        : perubahan[k];
    });

    function tambahAudit(status, tindakan, sebelum, sesudah) {
      const record = {
        id_riwayat: "RV-" + Utilities.getUuid(),
        jenis_data: "Sesi",
        id_referensi: idSesi,
        jenis_tindakan: tindakan,
        kolom_diubah: JSON.stringify(kolomAudit),
        nilai_sebelum: JSON.stringify(sebelum),
        nilai_sesudah: JSON.stringify(sesudah),
        alasan_perubahan: alasan || "Konfirmasi JP",
        diubah_oleh: admin,
        waktu_perubahan: new Date(),
        id_transaksi_perubahan: idTransaksi,
        status_transaksi: status
      };

      sheetAudit.appendRow(ha.map(k =>
        Object.prototype.hasOwnProperty.call(record, k)
          ? record[k]
          : ""
      ));

      SpreadsheetApp.flush();
    }


    // Tahap 1: catat niat perubahan.
    tambahAudit(
      "PENDING",
      jpLama === null ? "konfirmasi_jp" : "perubahan_jp",
      nilaiSebelum,
      perubahan
    );

    try {
      // Tahap 2: terapkan perubahan.
      const pembaruan = perubahan;

      Object.keys(pembaruan).forEach(k => {
        sheetSesi.getRange(nomorBaris, hs.indexOf(k) + 1)
          .setValue(pembaruan[k]);
      });

      SpreadsheetApp.flush();

      // Tahap 3: verifikasi nilai yang tersimpan.
      const hasilBaca = sheetSesi.getRange(
        nomorBaris, 1, 1, hs.length
      ).getValues()[0];

      function hasilKolom(k) {
        return hasilBaca[hs.indexOf(k)];
      }

      const sesuai =
        Math.abs(Number(hasilKolom("jp_rencana")) - jpResmi) < 0.000001 &&
        Number(hasilKolom("durasi_jeda_menit")) ===
          usulan.total_jeda_menit &&
        Number(hasilKolom("durasi_efektif_menit")) ===
          usulan.durasi_efektif_menit &&
        String(hasilKolom("alasan_penyesuaian_jp")).trim() === alasan;

      if (!sesuai) {
        throw new Error("Verifikasi penyimpanan JP gagal.");
      }

      // Tahap 4: catat penyelesaian transaksi.
      tambahAudit(
        "SELESAI",
        "penyelesaian_konfirmasi_jp",
        nilaiSebelum,
        perubahan
      );

    } catch (error) {
      try {
        tambahAudit(
          "PERLU_PEMULIHAN",
          "kegagalan_konfirmasi_jp",
          nilaiSebelum,
          perubahan
        );
      } catch (auditError) {
        Logger.log(
          "Gagal mencatat status pemulihan: " +
          auditError.message
        );
      }

      throw new Error(
        "Transaksi JP belum selesai: " + error.message
      );
    }

    const hasil = {
      sukses: true,
      tidak_ada_perubahan: false,
      id_sesi: idSesi,
      jp_sebelumnya: jpLama,
      jp_resmi: jpResmi,
      id_transaksi: idTransaksi
    };

    Logger.log(JSON.stringify(hasil, null, 2));
    return hasil;

  } finally {
    lock.releaseLock();
  }
}

function periksaTransaksiJPSesi(idSesi) {
  if(typeof wajibEndpointAkses_==='function')wajibEndpointAkses_('periksaTransaksiJPSesi');
  const ss = databasePelatihan_();
  const sheet = ss.getSheetByName("Riwayat_Validasi");

  if (!sheet) {
    throw new Error("Sheet Riwayat_Validasi tidak ditemukan.");
  }

  const data = sheet.getDataRange().getDisplayValues();
  const header = data[0].map(h => h.trim());

  const wajib = [
    "jenis_data",
    "id_referensi",
    "id_transaksi_perubahan",
    "status_transaksi"
  ];

  wajib.forEach(k => {
    if (!header.includes(k)) {
      throw new Error("Kolom tidak ditemukan: " + k);
    }
  });

  const index = k => header.indexOf(k);
  const transaksi = new Map();

  data.slice(1).forEach(baris => {
    if (
      baris[index("jenis_data")] !== "Sesi" ||
      baris[index("id_referensi")] !== idSesi
    ) {
      return;
    }

    const id = baris[index("id_transaksi_perubahan")];
    const status = baris[index("status_transaksi")];

    if (id && status) {
      transaksi.set(id, status);
    }
  });

  const belumSelesai = [];

  transaksi.forEach((status, id) => {
    if (status !== "SELESAI") {
      belumSelesai.push({
        id_transaksi: id,
        status: status
      });
    }
  });

  const hasil = {
    id_sesi: idSesi,
    jumlah_transaksi_tercatat: transaksi.size,
    jumlah_transaksi_bermasalah: belumSelesai.length,
    aman_untuk_konfirmasi_baru: belumSelesai.length === 0,
    transaksi_bermasalah: belumSelesai
  };

  Logger.log(JSON.stringify(hasil, null, 2));
  return hasil;
}

function cekStatusTransaksiSimulasi(daftarStatus) {
  const statusTerakhir = new Map();

  daftarStatus.forEach(item => {
    statusTerakhir.set(
      item.id_transaksi,
      item.status_transaksi
    );
  });

  const transaksiBermasalah = [];

  statusTerakhir.forEach((status, id) => {
    if (status !== "SELESAI") {
      transaksiBermasalah.push({
        id_transaksi: id,
        status: status
      });
    }
  });

  return {
    aman_untuk_konfirmasi_baru:
      transaksiBermasalah.length === 0,
    transaksi_bermasalah: transaksiBermasalah
  };
}

function evaluasiStatusTransaksiJP(daftarStatus) {
  const statusTerakhir = new Map();

  daftarStatus.forEach(item => {
    const id = String(item.id_transaksi || "").trim();
    const status = String(item.status_transaksi || "").trim();

    if (!id || !status) {
      throw new Error("ID atau status transaksi tidak valid.");
    }

    if (!["PENDING", "SELESAI", "PERLU_PEMULIHAN"].includes(status)) {
      throw new Error("Status transaksi tidak dikenal: " + status);
    }

    statusTerakhir.set(id, status);
  });

  const transaksiBermasalah = [];

  statusTerakhir.forEach((status, id) => {
    if (status !== "SELESAI") {
      transaksiBermasalah.push({
        id_transaksi: id,
        status: status
      });
    }
  });

  return {
    aman_untuk_konfirmasi_baru:
      transaksiBermasalah.length === 0,
    jumlah_transaksi_bermasalah:
      transaksiBermasalah.length,
    transaksi_bermasalah: transaksiBermasalah
  };
}

function evaluasiKonsistensiJP(nilaiAktual, nilaiLama, nilaiBaru) {
  const kolom = [
    "jp_rencana",
    "durasi_jeda_menit",
    "durasi_efektif_menit",
    "alasan_penyesuaian_jp"
  ];

  function normalisasi(kolom, nilai) {
    if (nilai === null || nilai === undefined || nilai === "") {
      return "";
    }

    if ([
      "jp_rencana",
      "durasi_jeda_menit",
      "durasi_efektif_menit"
    ].includes(kolom)) {
      const angka = Number(nilai);

      if (!Number.isFinite(angka)) {
        return "INVALID:" + String(nilai);
      }

      return angka;
    }

    return String(nilai).trim();
  }

  function sama(a, b, namaKolom) {
    const x = normalisasi(namaKolom, a);
    const y = normalisasi(namaKolom, b);

    if (typeof x === "number" && typeof y === "number") {
      return Math.abs(x - y) < 0.000001;
    }

    return x === y;
  }

  const detail = kolom.map(k => ({
    kolom: k,
    sesuai_lama: sama(nilaiAktual[k], nilaiLama[k], k),
    sesuai_baru: sama(nilaiAktual[k], nilaiBaru[k], k)
  }));

  const semuaLama = detail.every(d => d.sesuai_lama);
  const semuaBaru = detail.every(d => d.sesuai_baru);

  let status;

  if (semuaBaru) {
    status = "SUDAH_DITERAPKAN";
  } else if (semuaLama) {
    status = "BELUM_DITERAPKAN";
  } else {
    status = "PERLU_PEMERIKSAAN";
  }

  return {
    status_konsistensi: status,
    detail_pemeriksaan: detail
  };
}

function periksaKonsistensiJPSesi(idSesi) {
  if(typeof wajibEndpointAkses_==='function')wajibEndpointAkses_('periksaKonsistensiJPSesi');
  const ss = databasePelatihan_();
  const sheetSesi = ss.getSheetByName("Sesi");
  const sheetAudit = ss.getSheetByName("Riwayat_Validasi");

  if (!sheetSesi || !sheetAudit) {
    throw new Error("Sheet Sesi atau Riwayat_Validasi tidak ditemukan.");
  }

  const kolomPeriksa = [
    "durasi_jeda_menit",
    "durasi_efektif_menit",
    "jp_rencana",
    "alasan_penyesuaian_jp",
    "jp_dikonfirmasi_oleh",
    "jp_dikonfirmasi_pada",
    "updated_at"
  ];

  const dataSesi = sheetSesi.getDataRange().getValues();
  const headerSesi = dataSesi[0].map(h => String(h).trim());

  const dataAudit = sheetAudit.getDataRange().getValues();
  const headerAudit = dataAudit[0].map(h => String(h).trim());

  function indexWajib(header, nama, sheet) {
    const index = header.indexOf(nama);
    if (index < 0) {
      throw new Error(
        `Kolom ${nama} tidak ditemukan di ${sheet}.`
      );
    }
    return index;
  }

  const indexIdSesi = indexWajib(
    headerSesi, "id_sesi", "Sesi"
  );

  kolomPeriksa.forEach(k =>
    indexWajib(headerSesi, k, "Sesi")
  );

  const barisSesi = dataSesi.slice(1).find(
    r => String(r[indexIdSesi]).trim() === idSesi
  );

  if (!barisSesi) {
    throw new Error("Sesi tidak ditemukan: " + idSesi);
  }

  const ia = {};
  [
    "jenis_data",
    "id_referensi",
    "id_transaksi_perubahan",
    "status_transaksi",
    "nilai_sesudah"
  ].forEach(k => {
    ia[k] = indexWajib(headerAudit, k, "Riwayat_Validasi");
  });

  // Kelompokkan audit menurut ID transaksi.
  const transaksi = new Map();

  dataAudit.slice(1).forEach((r, i) => {
    if (
      String(r[ia.jenis_data]).trim() !== "Sesi" ||
      String(r[ia.id_referensi]).trim() !== idSesi
    ) {
      return;
    }

    const id = String(
      r[ia.id_transaksi_perubahan] || ""
    ).trim();

    const status = String(
      r[ia.status_transaksi] || ""
    ).trim();

    if (!id || !status) return;

    if (!transaksi.has(id)) {
      transaksi.set(id, {
        id_transaksi: id,
        status_terakhir: status,
        nilai_sesudah: null,
        urutan: i
      });
    }

    const item = transaksi.get(id);
    item.status_terakhir = status;
    item.urutan = i;

    if (status === "PENDING") {
      try {
        item.nilai_sesudah = JSON.parse(
          String(r[ia.nilai_sesudah])
        );
      } catch (e) {
        throw new Error(
          "JSON nilai_sesudah tidak valid untuk transaksi " + id
        );
      }
    }
  });

  const daftar = Array.from(transaksi.values());

  const bermasalah = daftar.filter(
    t => t.status_terakhir !== "SELESAI"
  );

  if (bermasalah.length > 0) {
    const hasil = {
      id_sesi: idSesi,
      status: "ADA_TRANSAKSI_TERTUNDA",
      transaksi_bermasalah: bermasalah.map(t => ({
        id_transaksi: t.id_transaksi,
        status: t.status_terakhir
      }))
    };

    Logger.log(JSON.stringify(hasil, null, 2));
    return hasil;
  }

  // Ambil transaksi terbaru berdasarkan posisi baris audit.
  const selesai = daftar
    .filter(t => t.status_terakhir === "SELESAI")
    .sort((a, b) => b.urutan - a.urutan);

  if (selesai.length === 0) {
    const hasil = {
      id_sesi: idSesi,
      status: "TIDAK_ADA_AUDIT_LENGKAP"
    };

    Logger.log(JSON.stringify(hasil, null, 2));
    return hasil;
  }

  const terakhir = selesai[0];

  if (!terakhir.nilai_sesudah) {
    throw new Error(
      "Nilai sesudah tidak ditemukan pada transaksi terakhir."
    );
  }

  // Audit lama mungkin belum memuat tujuh kolom.
  const kolomKurang = kolomPeriksa.filter(
    k => !Object.prototype.hasOwnProperty.call(
      terakhir.nilai_sesudah, k
    )
  );

  if (kolomKurang.length > 0) {
    const hasil = {
      id_sesi: idSesi,
      status: "AUDIT_BELUM_LENGKAP",
      kolom_kurang: kolomKurang
    };

    Logger.log(JSON.stringify(hasil, null, 2));
    return hasil;
  }

  const zonaWaktu = ss.getSpreadsheetTimeZone();

  function normalisasiTanggal(nilai) {
    if (nilai instanceof Date && !isNaN(nilai.getTime())) {
      return Utilities.formatDate(
        nilai, zonaWaktu, "yyyy-MM-dd HH:mm:ss"
      );
    }

    const teks = String(nilai ?? "").trim();
    if (!teks) return "";

    // ISO 8601 dari nilai_sesudah.
    if (/^\d{4}-\d{2}-\d{2}T/.test(teks)) {
      const tanggal = new Date(teks);

      if (!isNaN(tanggal.getTime())) {
        return Utilities.formatDate(
          tanggal, zonaWaktu, "yyyy-MM-dd HH:mm:ss"
        );
      }
    }

    return teks;
  }

  function normalisasi(kolom, nilai) {
    if (nilai === null || nilai === undefined || nilai === "") {
      return "";
    }

    if ([
      "jp_rencana",
      "durasi_jeda_menit",
      "durasi_efektif_menit"
    ].includes(kolom)) {
      const angka = Number(nilai);
      return Number.isFinite(angka) ? angka : String(nilai);
    }

    if ([
      "jp_dikonfirmasi_pada",
      "updated_at"
    ].includes(kolom)) {
      return normalisasiTanggal(nilai);
    }

    return String(nilai).trim();
  }

  const detail = kolomPeriksa.map(k => {
    const aktual = normalisasi(
      k, barisSesi[headerSesi.indexOf(k)]
    );

    const audit = normalisasi(
      k, terakhir.nilai_sesudah[k]
    );

    const sesuai =
      typeof aktual === "number" &&
      typeof audit === "number"
        ? Math.abs(aktual - audit) < 0.000001
        : aktual === audit;

    return {
      kolom: k,
      sesuai: sesuai,
      nilai_aktual: aktual,
      nilai_audit: audit
    };
  });

  const hasil = {
    id_sesi: idSesi,
    id_transaksi_terakhir: terakhir.id_transaksi,
    status: detail.every(d => d.sesuai)
      ? "KONSISTEN"
      : "TIDAK_KONSISTEN",
    jumlah_kolom_diperiksa: detail.length,
    jumlah_kolom_sesuai:
      detail.filter(d => d.sesuai).length,
    detail: detail
  };

  Logger.log(JSON.stringify(hasil, null, 2));
  return hasil;
}

function diagnosaPemulihanJP(statusTransaksi, nilaiAktual, nilaiSebelum, nilaiSesudah) {
  const kolomWajib = [
    "durasi_jeda_menit",
    "durasi_efektif_menit",
    "jp_rencana",
    "alasan_penyesuaian_jp",
    "jp_dikonfirmasi_oleh",
    "jp_dikonfirmasi_pada",
    "updated_at"
  ];

  const objek = [nilaiAktual, nilaiSebelum, nilaiSesudah];

  if (objek.some(o => !o || typeof o !== "object")) {
    throw new Error("Data diagnostik tidak valid.");
  }

  const kolomKurang = kolomWajib.filter(k =>
    objek.some(o => !Object.prototype.hasOwnProperty.call(o, k))
  );

  if (kolomKurang.length > 0) {
    return {
      status: "AUDIT_TIDAK_LENGKAP",
      kolom_kurang: kolomKurang,
      rekomendasi: "Lengkapi pemeriksaan audit sebelum pemulihan."
    };
  }

  function normalisasi(k, nilai) {
    if (nilai === null || nilai === undefined || nilai === "") {
      return "";
    }

    if ([
      "durasi_jeda_menit",
      "durasi_efektif_menit",
      "jp_rencana"
    ].includes(k)) {
      const angka = Number(nilai);
      return Number.isFinite(angka) ? angka : String(nilai);
    }

    if ([
      "jp_dikonfirmasi_pada",
      "updated_at"
    ].includes(k)) {
      if (nilai instanceof Date) {
        return nilai.getTime();
      }

      const teks = String(nilai).trim();

      if (/^\d{4}-\d{2}-\d{2}T/.test(teks)) {
        const tanggal = new Date(teks);
        if (!isNaN(tanggal.getTime())) {
          return tanggal.getTime();
        }
      }

      return teks;
    }

    return String(nilai).trim();
  }

  function bandingkan(target) {
    return kolomWajib.map(k => {
      const aktual = normalisasi(k, nilaiAktual[k]);
      const pembanding = normalisasi(k, target[k]);

      const sesuai =
        typeof aktual === "number" &&
        typeof pembanding === "number"
          ? Math.abs(aktual - pembanding) < 0.000001
          : aktual === pembanding;

      return { kolom: k, sesuai: sesuai };
    });
  }

  const hasilLama = bandingkan(nilaiSebelum);
  const hasilBaru = bandingkan(nilaiSesudah);

  const sesuaiLama = hasilLama.every(x => x.sesuai);
  const sesuaiBaru = hasilBaru.every(x => x.sesuai);

  let kondisi;
  let rekomendasi;

  if (sesuaiBaru) {
    kondisi = "SUDAH_DITERAPKAN";
    rekomendasi =
      "Verifikasi transaksi dan pertimbangkan pencatatan penyelesaian.";
  } else if (sesuaiLama) {
    kondisi = "BELUM_DITERAPKAN";
    rekomendasi =
      "Periksa penyebab transaksi terhenti sebelum menentukan pembatalan.";
  } else {
    kondisi = "PERUBAHAN_SEBAGIAN_ATAU_TIDAK_SESUAI";
    rekomendasi =
      "Perlu pemeriksaan Admin. Jangan mengulangi perubahan otomatis.";
  }

  return {
    status_transaksi: statusTransaksi,
    kondisi_data: kondisi,
    jumlah_kolom: kolomWajib.length,
    kolom_sesuai_lama: hasilLama.filter(x => x.sesuai).length,
    kolom_sesuai_baru: hasilBaru.filter(x => x.sesuai).length,
    rekomendasi: rekomendasi
  };
}

function ujiDiagnostikPemulihanJP() {
  const lama = {
    durasi_jeda_menit: 30,
    durasi_efektif_menit: 210,
    jp_rencana: 5,
    alasan_penyesuaian_jp: "Konfirmasi awal",
    jp_dikonfirmasi_oleh: "Admin A",
    jp_dikonfirmasi_pada: "2026-10-17T08:00:00.000Z",
    updated_at: "2026-10-17T08:00:00.000Z"
  };

  const baru = {
    durasi_jeda_menit: 30,
    durasi_efektif_menit: 210,
    jp_rencana: 6,
    alasan_penyesuaian_jp: "Penyesuaian JP",
    jp_dikonfirmasi_oleh: "Admin B",
    jp_dikonfirmasi_pada: "2026-10-17T09:00:00.000Z",
    updated_at: "2026-10-17T09:00:00.000Z"
  };

  const skenario = [
    {
      nama: "Semua perubahan tersimpan",
      aktual: { ...baru },
      diharapkan: "SUDAH_DITERAPKAN"
    },
    {
      nama: "Belum ada perubahan tersimpan",
      aktual: { ...lama },
      diharapkan: "BELUM_DITERAPKAN"
    },
    {
      nama: "Hanya JP yang berubah",
      aktual: { ...lama, jp_rencana: 6 },
      diharapkan: "PERUBAHAN_SEBAGIAN_ATAU_TIDAK_SESUAI"
    }
  ];

  skenario.forEach(item => {
    const hasil = diagnosaPemulihanJP(
      "PENDING",
      item.aktual,
      lama,
      baru
    );

    const lulus =
      hasil.kondisi_data === item.diharapkan;

    Logger.log(JSON.stringify({
      skenario: item.nama,
      kondisi_data: hasil.kondisi_data,
      pengujian: lulus ? "LULUS" : "GAGAL",
      rekomendasi: hasil.rekomendasi
    }, null, 2));

    if (!lulus) {
      throw new Error("Pengujian gagal: " + item.nama);
    }
  });
}


function periksaPemulihanJPSesi(idSesi) {
  if(typeof wajibEndpointAkses_==='function')wajibEndpointAkses_('periksaPemulihanJPSesi');
  const ss = databasePelatihan_();
  const sesi = ss.getSheetByName("Sesi");
  const audit = ss.getSheetByName("Riwayat_Validasi");

  if (!sesi || !audit) {
    throw new Error("Sheet Sesi atau Riwayat_Validasi tidak ditemukan.");
  }

  const kolomJP = [
    "durasi_jeda_menit",
    "durasi_efektif_menit",
    "jp_rencana",
    "alasan_penyesuaian_jp",
    "jp_dikonfirmasi_oleh",
    "jp_dikonfirmasi_pada",
    "updated_at"
  ];

  const dataSesi = sesi.getDataRange().getValues();
  const headerSesi = dataSesi[0].map(h => String(h).trim());

  const dataAudit = audit.getDataRange().getValues();
  const headerAudit = dataAudit[0].map(h => String(h).trim());

  function indeks(header, nama) {
    const i = header.indexOf(nama);
    if (i < 0) throw new Error("Kolom tidak ditemukan: " + nama);
    return i;
  }

  const barisSesi = dataSesi.slice(1).find(
    r => String(r[indeks(headerSesi, "id_sesi")]).trim() === idSesi
  );

  if (!barisSesi) {
    throw new Error("Sesi tidak ditemukan: " + idSesi);
  }

  const ia = {};
  [
    "jenis_data",
    "id_referensi",
    "id_transaksi_perubahan",
    "status_transaksi",
    "nilai_sebelum",
    "nilai_sesudah"
  ].forEach(k => ia[k] = indeks(headerAudit, k));

  // Simpan status terakhir setiap transaksi.
  const transaksi = new Map();

  dataAudit.slice(1).forEach((r, i) => {
    if (
      String(r[ia.jenis_data]).trim() !== "Sesi" ||
      String(r[ia.id_referensi]).trim() !== idSesi
    ) return;

    const id = String(r[ia.id_transaksi_perubahan] || "").trim();
    const status = String(r[ia.status_transaksi] || "").trim();

    if (!id || !status) return;

    if (!transaksi.has(id)) {
      transaksi.set(id, {
        id_transaksi: id,
        status: status,
        urutan: i,
        sebelum: null,
        sesudah: null
      });
    }

    const t = transaksi.get(id);
    t.status = status;
    t.urutan = i;

    if (status === "PENDING") {
      try {
        t.sebelum = JSON.parse(String(r[ia.nilai_sebelum]));
        t.sesudah = JSON.parse(String(r[ia.nilai_sesudah]));
      } catch (e) {
        throw new Error("JSON audit tidak valid: " + id);
      }
    }
  });

  const daftar = Array.from(transaksi.values());

  const tertunda = daftar
    .filter(t => t.status !== "SELESAI")
    .sort((a, b) => b.urutan - a.urutan);

  if (tertunda.length === 0) {
    const hasilKonsistensi = periksaKonsistensiJPSesi(idSesi);

    return {
      id_sesi: idSesi,
      status: "TIDAK_ADA_TRANSAKSI_TERTUNDA",
      pemeriksaan_konsistensi: hasilKonsistensi.status,
      jumlah_kolom_sesuai:
        hasilKonsistensi.jumlah_kolom_sesuai ?? null,
      rekomendasi:
        hasilKonsistensi.status === "KONSISTEN"
          ? "Tidak diperlukan pemulihan."
          : "Periksa ketidaksesuaian data dan audit."
    };
  }

  const t = tertunda[0];

  if (!t.sebelum || !t.sesudah) {
    return {
      id_sesi: idSesi,
      status: "AUDIT_TIDAK_LENGKAP",
      id_transaksi: t.id_transaksi,
      rekomendasi: "Perlu pemeriksaan manual oleh Admin."
    };
  }

  const aktual = {};
  kolomJP.forEach(k => {
    aktual[k] = barisSesi[indeks(headerSesi, k)];
  });

  // Untuk tanggal lama berbentuk teks lokal, jangan
  // menebak zona waktu atau menganggapnya otomatis sama.
  const tanggalAuditLama = [
    "jp_dikonfirmasi_pada",
    "updated_at"
  ].some(k => {
    const nilai = t.sebelum[k];
    return typeof nilai === "string" &&
      nilai !== "" &&
      !/^\d{4}-\d{2}-\d{2}T/.test(nilai);
  });

  if (tanggalAuditLama) {
    return {
      id_sesi: idSesi,
      status: "FORMAT_TANGGAL_PERLU_VERIFIKASI",
      id_transaksi: t.id_transaksi,
      rekomendasi:
        "Periksa format tanggal audit lama sebelum menentukan pemulihan."
    };
  }

  const hasil = diagnosaPemulihanJP(
    t.status,
    aktual,
    t.sebelum,
    t.sesudah
  );

  return {
    id_sesi: idSesi,
    id_transaksi: t.id_transaksi,
    status: "TRANSAKSI_PERLU_DITINJAU",
    diagnostik: hasil
  };
}

function ujiPeriksaPemulihanJP() {
  if(typeof wajibEndpointAkses_==='function')wajibEndpointAkses_('ujiPeriksaPemulihanJP');
  const hasil = periksaPemulihanJPSesi("SES001");
  Logger.log(JSON.stringify(hasil, null, 2));
}


function buatTokenQR_(idSesi, jenisScan, berlakuMenit) {
  const id = String(idSesi || "").trim();
  const jenis = String(jenisScan || "").trim().toLowerCase();
  const menit = Number(berlakuMenit);

  if (!id) {
    throw new Error("ID sesi wajib diisi.");
  }

  if (!["datang", "pulang"].includes(jenis)) {
    throw new Error("Jenis scan harus datang atau pulang.");
  }

  if (!Number.isInteger(menit) || menit < 1 || menit > 1440) {
    throw new Error("Masa berlaku harus 1–1440 menit.");
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    pastikanTidakAdaHapusTertunda_();
    const ss = databasePelatihan_();
    const sheetSesi = ss.getSheetByName("Sesi");
    const sheetToken = ss.getSheetByName("Token_QR");

    if (!sheetSesi || !sheetToken) {
      throw new Error("Sheet Sesi atau Token_QR tidak ditemukan.");
    }

    function bacaHeader(sheet, wajib) {
      const header = sheet.getRange(
        1, 1, 1, sheet.getLastColumn()
      ).getDisplayValues()[0].map(h => h.trim());

      wajib.forEach(k => {
        if (!header.includes(k)) {
          throw new Error(
            `Kolom "${k}" tidak ditemukan di ${sheet.getName()}.`
          );
        }
      });

      return header;
    }

    const hs = bacaHeader(sheetSesi, ["id_sesi"]);

    const ht = bacaHeader(sheetToken, [
      "id_token_qr",
      "id_sesi",
      "jenis_scan",
      "token_hash",
      "berlaku_mulai",
      "berlaku_sampai",
      "status_manual",
      "alasan_penerbitan",
      "created_at",
      "updated_at"
    ]);

    // Pastikan sesi tersedia.
    const dataSesi = sheetSesi.getDataRange().getDisplayValues();
    const sesiAda = dataSesi.slice(1).some(
      r => String(r[hs.indexOf("id_sesi")]).trim() === id
    );

    if (!sesiAda) {
      throw new Error("Sesi tidak ditemukan: " + id);
    }

    // Cegah penerbitan token aktif yang waktunya bertumpang tindih.
    const dataToken = sheetToken.getDataRange().getValues();
    const posisi = k => ht.indexOf(k);

    const sekarang = new Date();
    const kedaluwarsa = new Date(
      sekarang.getTime() + menit * 60000
    );

    const tokenBertabrakan = dataToken.slice(1).some(r => {
      const idLama = String(r[posisi("id_sesi")] || "").trim();
      const jenisLama = String(r[posisi("jenis_scan")] || "")
        .trim().toLowerCase();
      const statusLama = String(r[posisi("status_manual")] || "")
        .trim().toLowerCase();

      if (
        idLama !== id ||
        jenisLama !== jenis ||
        statusLama !== "aktif"
      ) {
        return false;
      }

      const mulai = r[posisi("berlaku_mulai")];
      const sampai = r[posisi("berlaku_sampai")];

      // Jika tanggal token aktif tidak valid, blokir penerbitan.
      if (
        !(mulai instanceof Date) ||
        !(sampai instanceof Date) ||
        isNaN(mulai.getTime()) ||
        isNaN(sampai.getTime())
      ) {
        return true;
      }

      return (
        sekarang < sampai &&
        kedaluwarsa > mulai
      );
    });

    if (tokenBertabrakan) {
      throw new Error(
        "Masih ada token aktif dengan waktu berlaku " +
        "bertumpang tindih untuk sesi dan jenis scan ini."
      );
    }

    // Token acak; hanya hash yang disimpan.
    const tokenMentah =
      Utilities.getUuid().replace(/-/g, "") +
      Utilities.getUuid().replace(/-/g, "");

    const bytes = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      tokenMentah,
      Utilities.Charset.UTF_8
    );

    const tokenHash = bytes.map(b =>
      ("0" + (b & 255).toString(16)).slice(-2)
    ).join("");

    const idToken = "TQR-" + Utilities.getUuid();

    const record = {
      id_token_qr: idToken,
      id_sesi: id,
      jenis_scan: jenis,
      token_hash: tokenHash,
      berlaku_mulai: sekarang,
      berlaku_sampai: kedaluwarsa,
      status_manual: "aktif",
      alasan_penerbitan: "Penerbitan awal token QR (pengujian)",
      created_at: sekarang,
      updated_at: sekarang
    };

    sheetToken.appendRow(ht.map(k =>
      Object.prototype.hasOwnProperty.call(record, k)
        ? record[k]
        : ""
    ));

    SpreadsheetApp.flush();

    return {
      sukses: true,
      id_token_qr: idToken,
      id_sesi: id,
      jenis_scan: jenis,
      berlaku_mulai: sekarang.toISOString(),
      berlaku_sampai: kedaluwarsa.toISOString(),
      token: tokenMentah
    };

  } finally {
    lock.releaseLock();
  }
}

function ujiBuatTokenQR_() {
  const hasil = buatTokenQR_(
    "SES001",
    "datang",
    10
  );

  // Jangan tampilkan token mentah pada Execution log.
  Logger.log(JSON.stringify({
    sukses: hasil.sukses,
    id_token_qr: hasil.id_token_qr,
    id_sesi: hasil.id_sesi,
    jenis_scan: hasil.jenis_scan,
    berlaku_mulai: hasil.berlaku_mulai,
    berlaku_sampai: hasil.berlaku_sampai
  }, null, 2));
}

function validasiTokenQR(tokenMentah) {
  if(typeof pastikanMigrasiJenjangSiap_==='function')pastikanMigrasiJenjangSiap_();
  const token = String(tokenMentah || "").trim();

  if (!token) {
    return {
      valid: false,
      alasan: "TOKEN_KOSONG"
    };
  }

  const ss = databasePelatihan_();
  const sheet = ss.getSheetByName("Token_QR");

  if (!sheet) {
    throw new Error("Sheet Token_QR tidak ditemukan.");
  }

  const data = sheet.getDataRange().getValues();
  const header = data[0].map(h => String(h).trim());

  const wajib = [
    "id_token_qr",
    "id_sesi",
    "jenis_scan",
    "token_hash",
    "berlaku_mulai",
    "berlaku_sampai",
    "status_manual"
  ];

  wajib.forEach(k => {
    if (!header.includes(k)) {
      throw new Error("Kolom tidak ditemukan: " + k);
    }
  });

  const idx = k => header.indexOf(k);

  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    token,
    Utilities.Charset.UTF_8
  );

  const hash = bytes.map(b =>
    ("0" + (b & 255).toString(16)).slice(-2)
  ).join("");

  const cocok = data.slice(1).filter(r =>
    String(r[idx("token_hash")]).trim() === hash
  );

  if (cocok.length === 0) {
    return {
      valid: false,
      alasan: "TOKEN_TIDAK_DITEMUKAN"
    };
  }

  if (cocok.length > 1) {
    return {
      valid: false,
      alasan: "TOKEN_DUPLIKAT"
    };
  }

  const r = cocok[0];

  const idToken = String(r[idx("id_token_qr")]).trim();
  const idSesi = String(r[idx("id_sesi")]).trim();
  const jenis = String(r[idx("jenis_scan")]).trim();
  const status = String(r[idx("status_manual")])
    .trim().toLowerCase();

  if (status !== "aktif") {
    return {
      valid: false,
      alasan: "TOKEN_TIDAK_AKTIF"
    };
  }

  const mulai = r[idx("berlaku_mulai")];
  const sampai = r[idx("berlaku_sampai")];

  const hasilStatus = evaluasiStatusTokenQR(
    status,
    mulai,
    sampai,
    new Date()
  );

  if (!hasilStatus.valid) {
    return {
      valid: false,
      alasan: hasilStatus.alasan
    };
  }

  return {
    valid: true,
    id_token_qr: idToken,
    id_sesi: idSesi,
    jenis_scan: jenis,
    berlaku_sampai: sampai.toISOString()
  };
}

function ujiValidasiTokenQR_() {
  const skenario = [
    {
      nama: "Token kosong",
      token: "",
      alasan: "TOKEN_KOSONG"
    },
    {
      nama: "Token tidak dikenal",
      token: "TOKEN-PALSU-UNTUK-PENGUJIAN",
      alasan: "TOKEN_TIDAK_DITEMUKAN"
    }
  ];

  skenario.forEach(s => {
    const hasil = validasiTokenQR(s.token);

    const lulus =
      hasil.valid === false &&
      hasil.alasan === s.alasan;

    Logger.log(JSON.stringify({
      skenario: s.nama,
      hasil: hasil,
      pengujian: lulus ? "LULUS" : "GAGAL"
    }, null, 2));

    if (!lulus) {
      throw new Error("Pengujian gagal: " + s.nama);
    }
  });
}

function ujiTokenQRAsli_() {
  // Gunakan jenis pulang agar tidak berbenturan
  // dengan token datang dari pengujian sebelumnya.
  const hasilPembuatan = buatTokenQR_(
    "SES001",
    "pulang",
    10
  );

  // Token mentah hanya digunakan di dalam fungsi ini.
  const hasilValidasi = validasiTokenQR(
    hasilPembuatan.token
  );

  const lulus =
    hasilValidasi.valid === true &&
    hasilValidasi.id_token_qr ===
      hasilPembuatan.id_token_qr &&
    hasilValidasi.id_sesi === "SES001" &&
    hasilValidasi.jenis_scan === "pulang";

  Logger.log(JSON.stringify({
    pengujian: lulus ? "LULUS" : "GAGAL",
    id_token_qr: hasilPembuatan.id_token_qr,
    id_sesi: hasilValidasi.id_sesi,
    jenis_scan: hasilValidasi.jenis_scan,
    valid: hasilValidasi.valid,
    alasan: hasilValidasi.alasan || null
  }, null, 2));

  if (!lulus) {
    throw new Error(
      "Token berhasil dibuat tetapi validasi gagal: " +
      JSON.stringify(hasilValidasi)
    );
  }
}

function evaluasiStatusTokenQR(
  statusManual,
  berlakuMulai,
  berlakuSampai,
  waktuPemeriksaan
) {
  const status = String(statusManual || "")
    .trim().toLowerCase();

  if (status !== "aktif") {
    return {
      valid: false,
      alasan: "TOKEN_TIDAK_AKTIF"
    };
  }

  const mulai = new Date(berlakuMulai);
  const sampai = new Date(berlakuSampai);
  const sekarang = new Date(waktuPemeriksaan);

  if (
    isNaN(mulai.getTime()) ||
    isNaN(sampai.getTime()) ||
    isNaN(sekarang.getTime()) ||
    mulai >= sampai
  ) {
    return {
      valid: false,
      alasan: "WAKTU_TOKEN_TIDAK_VALID"
    };
  }

  if (sekarang < mulai) {
    return {
      valid: false,
      alasan: "TOKEN_BELUM_BERLAKU"
    };
  }

  if (sekarang >= sampai) {
    return {
      valid: false,
      alasan: "TOKEN_KEDALUWARSA"
    };
  }

  return {
    valid: true,
    alasan: null
  };
}

function ujiStatusTokenQR_() {
  const mulai = new Date("2026-11-02T08:00:00+07:00");
  const sampai = new Date("2026-11-02T08:10:00+07:00");

  const skenario = [
    {
      nama: "Token aktif",
      status: "aktif",
      waktu: new Date("2026-11-02T08:05:00+07:00"),
      hasil: null,
      valid: true
    },
    {
      nama: "Token kedaluwarsa",
      status: "aktif",
      waktu: new Date("2026-11-02T08:15:00+07:00"),
      hasil: "TOKEN_KEDALUWARSA",
      valid: false
    },
    {
      nama: "Token nonaktif",
      status: "nonaktif",
      waktu: new Date("2026-11-02T08:05:00+07:00"),
      hasil: "TOKEN_TIDAK_AKTIF",
      valid: false
    }
  ];

  skenario.forEach(s => {
    const hasil = evaluasiStatusTokenQR(
      s.status,
      mulai,
      sampai,
      s.waktu
    );

    const lulus =
      hasil.valid === s.valid &&
      hasil.alasan === s.hasil;

    Logger.log(JSON.stringify({
      skenario: s.nama,
      hasil: hasil,
      pengujian: lulus ? "LULUS" : "GAGAL"
    }, null, 2));

    if (!lulus) {
      throw new Error(
        "Pengujian gagal: " + s.nama
      );
    }
  });
}

function ujiIntegrasiTokenQR_() {
  const hasilBuat = buatTokenQR_(
    "SES001",
    "datang",
    10
  );

  const hasilValidasi = validasiTokenQR(
    hasilBuat.token
  );

  const lulus =
    hasilBuat.sukses === true &&
    hasilValidasi.valid === true &&
    hasilBuat.id_token_qr ===
      hasilValidasi.id_token_qr &&
    hasilValidasi.id_sesi === "SES001" &&
    hasilValidasi.jenis_scan === "datang";

  Logger.log(JSON.stringify({
    pengujian: lulus ? "LULUS" : "GAGAL",
    id_token_qr: hasilBuat.id_token_qr,
    id_sesi: hasilValidasi.id_sesi,
    jenis_scan: hasilValidasi.jenis_scan,
    valid: hasilValidasi.valid,
    alasan: hasilValidasi.alasan || null
  }, null, 2));

  if (!lulus) {
    throw new Error(
      "Pengujian integrasi token QR gagal."
    );
  }
}

function buatURLAbsensiQR_(idSesi, jenisScan, berlakuMenit) {
  // Ambil alamat Web App dari deployment.
  const urlWebApp = typeof aplikasiPanitiaAktif_==='function'&&aplikasiPanitiaAktif_()?callbackGoogleAkses_():"https://script.google.com/macros/s/AKfycbyyhgxNmQ8OQmo5vpzwV5-iQyo5XkKa_rPtc5MiZaJ9qGjp9bQtzoI5nTi-_UCfMwBdiA/exec";

  if (!urlWebApp) {
    throw new Error(
      "Web App belum memiliki URL deployment. " +
      "Lakukan deployment sebagai Web App terlebih dahulu."
    );
  }

  // Terbitkan token baru menggunakan fungsi yang sudah diuji.
  const hasilToken = buatTokenQR_(
    idSesi,
    jenisScan,
    berlakuMenit
  );

  // Bentuk URL dengan parameter token.
  const urlAbsensi =
    urlWebApp +
    "?absen=" +
    encodeURIComponent(hasilToken.token);

  return {
    sukses: true,
    id_token_qr: hasilToken.id_token_qr,
    id_sesi: hasilToken.id_sesi,
    jenis_scan: hasilToken.jenis_scan,
    berlaku_mulai: hasilToken.berlaku_mulai,
    berlaku_sampai: hasilToken.berlaku_sampai,
    url_absensi: urlAbsensi
  };
}

function ujiURLWebAppQR_() {
  const url = ScriptApp.getService().getUrl();

  if (!url) {
    throw new Error("URL Web App tidak ditemukan.");
  }

  const formatGoogle =
    url.startsWith("https://script.google.com/");

  const tipeURL = url.includes("/exec")
    ? "DEPLOYMENT_EXEC"
    : url.includes("/dev")
      ? "URL_PENGUJIAN_DEV"
      : "FORMAT_TIDAK_DIKENAL";

  const lulus =
    formatGoogle &&
    tipeURL !== "FORMAT_TIDAK_DIKENAL";

  Logger.log(JSON.stringify({
    url_tersedia: true,
    tipe_url: tipeURL,
    format_valid: lulus,
    pengujian: lulus ? "LULUS" : "GAGAL"
  }, null, 2));

  if (!lulus) {
    throw new Error("Format URL Web App tidak dikenali.");
  }
}

function ujiURLAbsensiQRAsli_() {
  const hasil = buatURLAbsensiQR_(
    "SES001",
    "datang",
    10
  );

  const url = hasil.url_absensi;

  // Tampilkan URL dalam dialog untuk pengujian Admin.
  // Jangan mencetak URL bertoken ke Logger.
  const html = HtmlService.createHtmlOutput(
    '<div style="font-family:Arial;padding:15px">' +
      '<h3>Pengujian URL Absensi</h3>' +
      '<p>Token berhasil diterbitkan.</p>' +
      '<p>Jenis: datang | Sesi: SES001</p>' +
      '<a href="' + url + '" target="_blank" ' +
      'rel="noopener noreferrer">' +
      'Buka Halaman Absensi</a>' +
      '</div>'
  ).setWidth(380).setHeight(200);

  SpreadsheetApp.getUi().showModalDialog(
    html,
    "Pengujian QR Absensi"
  );

  Logger.log(JSON.stringify({
    pengujian: "URL_BERHASIL_DIBUAT",
    id_token_qr: hasil.id_token_qr,
    id_sesi: hasil.id_sesi,
    jenis_scan: hasil.jenis_scan
  }, null, 2));
}

function periksaIdentitasGoogle() {
  if(typeof wajibEndpointAkses_==='function')wajibEndpointAkses_('periksaIdentitasGoogle');
  const emailAktif =
    Session.getActiveUser().getEmail();

  const emailEksekusi =
    Session.getEffectiveUser().getEmail();

  return {
    email_aktif_tersedia: Boolean(emailAktif),
    email_eksekusi_tersedia: Boolean(emailEksekusi),
    identitas_sama:
      Boolean(emailAktif) &&
      emailAktif === emailEksekusi
  };
}

function ambilDataProgramSesiQR() {
  if(typeof wajibEndpointAkses_==='function')wajibEndpointAkses_('ambilDataProgramSesiQR');
  const ss = databasePelatihan_();

  const sheetProgram = ss.getSheetByName("Program");
  const sheetSesi = ss.getSheetByName("Sesi");

  if (!sheetProgram || !sheetSesi) {
    throw new Error(
      "Sheet Program atau Sesi tidak ditemukan."
    );
  }

  function bacaData(sheet, kolomWajib) {
    const data = sheet.getDataRange().getDisplayValues();

    if (data.length < 1) {
      throw new Error(
        "Sheet " + sheet.getName() + " tidak memiliki header."
      );
    }

    const header = data[0].map(h => String(h).trim());
    const index = nama => header.indexOf(nama);

    kolomWajib.forEach(nama => {
      if (index(nama) === -1) {
        throw new Error(
          "Kolom " + nama +
          " tidak ditemukan di sheet " +
          sheet.getName()
        );
      }
    });

    return data.slice(1)
      .filter(r => r.some(v => String(v).trim() !== ""))
      .map(r => {
        const hasil = {};

        kolomWajib.forEach(nama => {
          hasil[nama] = String(r[index(nama)]).trim();
        });

        if(index('id_jenjang')>=0)hasil.id_jenjang=String(r[index('id_jenjang')]).trim();
        return hasil;
      });
  }

  const program = bacaData(sheetProgram, [
    "id_program",
    "nama_program"
  ]);

  const sesi = bacaData(sheetSesi, [
    "id_sesi",
    "id_program",
    "nama_sesi"
  ]);

  return {
    sukses: true,
    program: program,
    sesi: sesi
  };
}

function ujiAmbilDataProgramSesiQR() {
  if(typeof wajibEndpointAkses_==='function')wajibEndpointAkses_('ujiAmbilDataProgramSesiQR');
  const hasil = ambilDataProgramSesiQR();

  const programDitemukan = hasil.program.some(
    p => p.id_program === "PRG001"
  );

  const sesiDitemukan = hasil.sesi.some(
    s =>
      s.id_sesi === "SES001" &&
      s.id_program === "PRG001"
  );

  const lulus =
    hasil.sukses === true &&
    programDitemukan &&
    sesiDitemukan;

  Logger.log(JSON.stringify({
    jumlah_program: hasil.program.length,
    jumlah_sesi: hasil.sesi.length,
    program_PRG001_ditemukan: programDitemukan,
    sesi_SES001_ditemukan: sesiDitemukan,
    pengujian: lulus ? "LULUS" : "GAGAL"
  }, null, 2));

  if (!lulus) {
    throw new Error(
      "Pengujian pengambilan data program dan sesi gagal."
    );
  }
}

function onOpen() {
  const menu = SpreadsheetApp.getUi()
    .createMenu("Manajemen Pelatihan")
    .addItem(
      "Generator QR Absensi",
      "bukaAdminQR"
    )
    .addSeparator()
    .addItem("Lengkapi / Koreksi Absensi", "lengkapiAbsensiManual_")
    .addItem("Catat Izin Sesi", "catatIzinSesi_")
    .addItem("Buka Panel Pengelolaan", "bukaPanelPengelolaan_")
    .addItem("Buka Peserta Program", "bukaPanelPeserta_")
    .addItem("Buka Beranda", "bukaPanelBeranda_")
    .addItem("Buka Monitoring", "bukaPanelMonitoring_")
    .addSeparator()
    .addItem(
      "Uji Penerbitan QR",
      "ujiPenerbitanQRDariSpreadsheet_"
    )
    .addItem(
      "Terbitkan QR Asli (Uji)",
      "terbitkanDanTampilkanQR_"
    );
  if (typeof bukaPratinjauPemetaanJenjang === 'function') {
    menu.addSeparator().addItem('Pratinjau Pemetaan Jenjang', 'bukaPratinjauPemetaanJenjang');
  }
  if(typeof bukaPersiapanStrukturJenjang==='function')menu.addItem('Persiapan Struktur Jenjang','bukaPersiapanStrukturJenjang');
  if(typeof bukaManajemenAksesPanitia==='function')menu.addItem('Manajemen Akses Panitia','bukaManajemenAksesPanitia');
  menu.addToUi();
}

function bukaAdminQR() {
  wajibPemilikIndex_();
  if(typeof aplikasiPanitiaAktif_==='function'&&aplikasiPanitiaAktif_()){databasePelatihan_();SpreadsheetApp.getUi().showModalDialog(keluaranPanelAplikasi_('Index').setWidth(1100).setHeight(780),'Monitoring dan QR');return;}
  const template =
    HtmlService.createTemplateFromFile("AdminQR");

  // Generator dibuka tanpa QR hasil penerbitan sebelumnya.
  template.dataQR = "null";

  const html = template.evaluate()
    .setWidth(600)
    .setHeight(700);

  SpreadsheetApp.getUi()
    .showModalDialog(
      html,
      "Generator QR Absensi"
    );
}

function ujiPenerbitanQRDariSpreadsheet_() {
  const hasil = buatURLAbsensiQR_(
    "SES001",
    "datang",
    10
  );

  if (!hasil || hasil.sukses !== true) {
    throw new Error("Penerbitan QR gagal.");
  }

  const url = String(hasil.url_absensi || "");

  if (!url.includes("?absen=")) {
    throw new Error("URL absensi tidak valid.");
  }

  Logger.log(JSON.stringify({
    pengujian: "LULUS",
    id_token_qr: hasil.id_token_qr,
    id_sesi: hasil.id_sesi,
    jenis_scan: hasil.jenis_scan,
    url_tersedia: true,
    tipe_url: url.includes("/exec")
      ? "EXEC"
      : url.includes("/dev")
        ? "DEV"
        : "LAINNYA"
  }, null, 2));
}

function periksaAksesAdmin_() {
  const emailAdmin =
    Session.getEffectiveUser().getEmail();

  const emailPengguna =
    Session.getActiveUser().getEmail();

  if (!emailAdmin || !emailPengguna) {
    return {
      diizinkan: false,
      alasan: "Identitas pengguna tidak tersedia."
    };
  }

  return {
    diizinkan:
      emailPengguna.toLowerCase() ===
      emailAdmin.toLowerCase(),
    alasan:
      emailPengguna.toLowerCase() ===
      emailAdmin.toLowerCase()
        ? "Akses Admin diizinkan."
        : "Akses Admin ditolak."
  };
}

function ujiAksesAdmin_() {
  const hasil = periksaAksesAdmin_();

  Logger.log(JSON.stringify(hasil, null, 2));
}

function terbitkanDanTampilkanQR_() {
  const hasil = buatURLAbsensiQR_(
    "SES001",
    "datang",
    10
  );

  if (!hasil || hasil.sukses !== true) {
    throw new Error("Gagal menerbitkan QR absensi.");
  }

  const template =
    HtmlService.createTemplateFromFile("AdminQR");

  template.dataQR = JSON.stringify(hasil)
    .replace(/</g, "\\u003c");

  const html = template.evaluate()
    .setWidth(600)
    .setHeight(700);

  SpreadsheetApp.getUi().showModalDialog(
    html,
    "QR Absensi - SES001"
  );
}

function cariPesertaAbsensi(token, kataKunci) {
  const pencarian = String(kataKunci || "")
    .trim()
    .toLowerCase();

  if (pencarian.length < 2) {
    return {
      sukses: true,
      peserta: []
    };
  }

  // Validasi token QR terlebih dahulu.
  const validasi = validasiTokenQR(token);

  if (!validasi || !validasi.valid) {
    throw new Error(
      "Token QR tidak valid atau sudah kedaluwarsa."
    );
  }

  const ss = databasePelatihan_();

  function bacaSheet(nama) {
    const sheet = ss.getSheetByName(nama);

    if (!sheet) {
      throw new Error("Sheet tidak ditemukan: " + nama);
    }

    const data = sheet.getDataRange().getValues();
    const header = data.shift().map(String);

    return data.map(baris => {
      const objek = {};

      header.forEach((kolom, i) => {
        objek[kolom.trim()] = baris[i];
      });

      return objek;
    });
  }

  const sesi = bacaSheet("Sesi");
  const keikutsertaan = bacaSheet("Keikutsertaan");
  if(typeof validasiTabelJenjang_==='function'){for(const [n,records] of [['Sesi',sesi],['Keikutsertaan',keikutsertaan]])validasiTabelJenjang_(n,{header:bacaMentahJenjang_(n).header,records});}
  const peserta = bacaSheet("Peserta");

  // Cari program berdasarkan sesi dari token QR.
  const sesiAktif = sesi.find(
    s => String(s.id_sesi).trim() ===
      String(validasi.id_sesi).trim()
  );

  if (!sesiAktif) {
    throw new Error("Sesi pelatihan tidak ditemukan.");
  }

  const idProgram = String(sesiAktif.id_program).trim();

  // Ambil ID peserta yang terdaftar pada program.
  const pesertaTerdaftar = new Set(
    keikutsertaan
      .filter(k =>
        String(k.id_program).trim() === idProgram && sesuaiJenjang_(sesiAktif,k) && String(k.status_keikutsertaan).trim().toLowerCase() === "terdaftar"
      )
      .map(k => String(k.id_peserta).trim())
  );

  // Cari peserta berdasarkan nama.
  const hasil = peserta
    .filter(p =>
      pesertaTerdaftar.has(
        String(p.id_peserta).trim()
      ) &&
      String(p.nama_pegawai)
        .toLowerCase()
        .includes(pencarian)
    )
    .slice(0, 10)
    .map(p => ({
      id_peserta: String(p.id_peserta).trim(),
      nama_pegawai: String(p.nama_pegawai).trim(),
      unit_kerja: String(p.unit_kerja || "").trim()
    }));

  return {
    sukses: true,
    peserta: hasil
  };
}

function terbitkanQRAbsensiDariGenerator(idSesi, jenisScan, berlakuMenit) {
  if(typeof wajibEndpointAkses_==='function')wajibEndpointAkses_('terbitkanQRAbsensiDariGenerator');
  wajibPemilikIndex_();
  idSesi = String(idSesi || "").trim();
  jenisScan = String(jenisScan || "").trim();
  berlakuMenit = Number(berlakuMenit);

  if (!idSesi) {
    throw new Error("Silakan pilih sesi pelatihan.");
  }

  if (!["datang", "pulang"].includes(jenisScan)) {
    throw new Error("Jenis absensi harus Datang atau Pulang.");
  }

  if (![5, 10, 15, 30].includes(berlakuMenit)) {
    throw new Error("Masa berlaku token tidak valid.");
  }

  return buatURLAbsensiQR_(
    idSesi,
    jenisScan,
    berlakuMenit
  );
}

/** Tahap 1: log sebagai sumber scan; Kehadiran sebagai ringkasan yang dapat dipulihkan. */
function simpanAbsensiPeserta(data) {
  const token = String(data && data.token || '').trim();
  const peserta = String(data && data.id_peserta || '').trim();
  const permintaan = String(data && data.id_permintaan || '').trim();
  if (!token || !peserta || !/^[a-zA-Z0-9_-]{16,100}$/.test(permintaan)) {
    throw new Error('Data permintaan absensi tidak lengkap.');
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    pastikanTidakAdaHapusTertunda_();
    const ss = databasePelatihan_();
    function tabel(nama, wajib) {
      const sheet = ss.getSheetByName(nama);
      if (!sheet) throw new Error('Sheet tidak ditemukan: ' + nama);
      const values = sheet.getDataRange().getValues();
      const header = values[0].map(h => String(h).trim());
      wajib.forEach(h => {
        if (!header.includes(h)) throw new Error('Kolom ' + h + ' tidak ditemukan di ' + nama);
      });
      const records = values.slice(1).map((r, i) => {
        const o = {nomorBaris: i + 2};
        header.forEach((h, j) => o[h] = r[j]);
        return o;
      });
      return {sheet: sheet, header: header, records: records};
    }
    const log = tabel('Log_Absensi', ['id_log','id_token_qr','id_sesi','id_keikutsertaan','jenis_peristiwa','jenis_scan','waktu_scan','status_scan','kode_alasan','alasan_penolakan','metode_identifikasi','id_permintaan','created_at']);
    const hadir = tabel('Kehadiran', ['id_kehadiran','id_sesi','id_keikutsertaan','waktu_datang','waktu_pulang','status_kehadiran','status_scan_pulang','status_validasi','metode_input','status_perhitungan_ulang','alasan_perhitungan_ulang','updated_at']);
    const sesi = tabel('Sesi', ['id_sesi','id_program']);
    const ikut = tabel('Keikutsertaan', ['id_keikutsertaan','id_program','id_peserta','status_keikutsertaan']);
    if(typeof validasiTabelJenjang_==='function'){validasiTabelJenjang_('Sesi',sesi);validasiTabelJenjang_('Keikutsertaan',ikut);}
    const txt = v => String(v == null ? '' : v).trim();
    const hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token, Utilities.Charset.UTF_8)
      .map(b => ('0' + (b & 255).toString(16)).slice(-2)).join('');
    const tokens = tabel('Token_QR', ['id_token_qr','token_hash']);
    const tokenRows = tokens.records.filter(r => txt(r.token_hash) === hash);
    if (tokenRows.length !== 1) return {sukses:false, pesan:'Token QR tidak valid.'};
    const idToken = txt(tokenRows[0].id_token_qr);
    const lama = log.records.filter(r => txt(r.id_permintaan) === permintaan);
    if (lama.length > 1) throw new Error('ID permintaan duplikat; hubungi petugas.');
    let peristiwa = lama[0];
    if (peristiwa) {
      const relasi = ikut.records.find(k => txt(k.id_keikutsertaan) === txt(peristiwa.id_keikutsertaan));
      const sses=sesi.records.find(s=>txt(s.id_sesi)===txt(peristiwa.id_sesi));
      if(!sses||!relasi||!sesuaiJenjang_(sses,relasi))throw Error('Relasi retry absensi tidak sesuai Jenjang sesi.');
      if (txt(peristiwa.id_token_qr) !== idToken || !relasi || txt(relasi.id_peserta) !== peserta) {
        throw new Error('ID permintaan sudah digunakan untuk data lain.');
      }
      if (txt(peristiwa.status_scan) !== 'diterima') return {sukses:false, pesan:txt(peristiwa.alasan_penolakan)};
      // Retry permintaan yang sudah diterima tetap bisa memulihkan ringkasan setelah token kedaluwarsa.
    } else {
      const valid = validasiTokenQR(token);
      if (!valid.valid) return {sukses:false, pesan:'QR tidak aktif atau sudah kedaluwarsa. Silakan hubungi petugas.'};
      const s = sesi.records.filter(r => txt(r.id_sesi) === valid.id_sesi);
      if (s.length !== 1) throw new Error('Data sesi tidak ditemukan atau duplikat.');
      const k = ikut.records.filter(r => txt(r.id_program) === txt(s[0].id_program) && txt(r.id_peserta) === peserta && sesuaiJenjang_(s[0],r));
      if (k.length !== 1) throw new Error('Keikutsertaan tidak ditemukan atau duplikat.');
      const keikutsertaan = k[0];
      if (txt(keikutsertaan.status_keikutsertaan).toLowerCase() !== 'terdaftar') {
        return {sukses:false, pesan:'Status keikutsertaan tidak mengizinkan absensi. Hubungi petugas.'};
      }
      const sebelumnya = log.records.some(r => txt(r.id_sesi) === valid.id_sesi && txt(r.id_keikutsertaan) === txt(keikutsertaan.id_keikutsertaan) && txt(r.jenis_scan) === valid.jenis_scan && txt(r.status_scan) === 'diterima');
      const ringkasan = hadir.records.filter(r => txt(r.id_sesi) === valid.id_sesi && txt(r.id_keikutsertaan) === txt(keikutsertaan.id_keikutsertaan));
      if (ringkasan.length > 1) throw new Error('Ringkasan kehadiran duplikat. Hubungi petugas.');
      const kolom = valid.jenis_scan === 'datang' ? 'waktu_datang' : 'waktu_pulang';
      const sudahAda = sebelumnya || (ringkasan[0] && (txt(ringkasan[0][kolom]) || txt(ringkasan[0][kolom + '_terverifikasi'])));
      const sekarang = new Date();
      peristiwa = {
        id_log:'LOG-' + Utilities.getUuid(), id_token_qr:valid.id_token_qr,
        id_sesi:valid.id_sesi, id_keikutsertaan:txt(keikutsertaan.id_keikutsertaan),
        jenis_peristiwa:'scan_qr', jenis_scan:valid.jenis_scan, waktu_scan:sekarang,
        status_scan:sudahAda ? 'ditolak' : 'diterima', kode_alasan:sudahAda ? 'SCAN_SUDAH_TERCATAT' : '',
        alasan_penolakan:sudahAda ? 'Absensi ' + valid.jenis_scan + ' sudah tercatat. Hubungi petugas jika perlu koreksi.' : '',
        metode_identifikasi:'pilih_nama', id_permintaan:permintaan, created_at:sekarang
      };
      // Simpan log dahulu. Jika penulisan ringkasan gagal, retry ID yang sama memulihkannya.
      log.sheet.appendRow(log.header.map(h => peristiwa[h] === undefined ? '' : peristiwa[h]));
      SpreadsheetApp.flush();
      if (sudahAda) return {sukses:false, pesan:peristiwa.alasan_penolakan};
    }
    const baris = hadir.records.filter(r => txt(r.id_sesi) === txt(peristiwa.id_sesi) && txt(r.id_keikutsertaan) === txt(peristiwa.id_keikutsertaan));
    if (baris.length > 1) throw new Error('Ringkasan kehadiran duplikat. Hubungi petugas.');
    const record = baris[0] || {
      id_kehadiran:'HDR-' + Utilities.getUuid(), id_sesi:peristiwa.id_sesi,
      id_keikutsertaan:peristiwa.id_keikutsertaan, metode_input:'qr', status_validasi:'belum_divalidasi'
    };
    const kolom = txt(peristiwa.jenis_scan) === 'datang' ? 'waktu_datang' : 'waktu_pulang';
    if (!record[kolom]) record[kolom] = peristiwa.waktu_scan;
    const datang = record.waktu_datang_terverifikasi || record.waktu_datang;
    const pulang = record.waktu_pulang_terverifikasi || record.waktu_pulang;
    record.status_kehadiran = datang && pulang ? 'lengkap' : 'perlu_dilengkapi';
    if (datang && pulang && new Date(pulang) <= new Date(datang)) record.status_kehadiran = 'perlu_verifikasi';
    record.status_scan_pulang = record.waktu_pulang ? 'sudah_scan' : 'belum_scan';
    record.status_perhitungan_ulang = 'menunggu_perhitungan';
    record.alasan_perhitungan_ulang = 'Pencatatan absensi QR; perhitungan JP belum dijalankan.';
    record.updated_at = new Date();
    const row = hadir.header.map(h => record[h] === undefined ? '' : record[h]);
    if (baris[0]) hadir.sheet.getRange(record.nomorBaris, 1, 1, row.length).setValues([row]);
    else hadir.sheet.appendRow(row);
    SpreadsheetApp.flush();
    return {sukses:true, jenis_scan:txt(peristiwa.jenis_scan), waktu_scan:new Date(peristiwa.waktu_scan).toISOString(), status_kehadiran:record.status_kehadiran, pesan:'Absensi ' + txt(peristiwa.jenis_scan) + ' berhasil dicatat.'};
  } finally {
    lock.releaseLock();
  }
}

/** Pelengkapan absensi dari menu spreadsheet; fungsi privat tidak dipanggil halaman peserta. */
function lengkapiAbsensiManual_() {
  const ss = databasePelatihan_();
  const ui = SpreadsheetApp.getUi();
  const sheet = ss.getActiveSheet();
  if (sheet.getName() !== 'Kehadiran' || !sheet.getActiveRange() || sheet.getActiveRange().getRow() < 2 || sheet.getActiveRange().getNumRows() !== 1) {
    ui.alert('Buka sheet Kehadiran, lalu pilih satu baris peserta yang akan dilengkapi.');
    return;
  }
  try {
    const nomorBaris = sheet.getActiveRange().getRow();
    const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).trim());
    const awal = sheet.getRange(nomorBaris, 1, 1, header.length).getValues()[0];
    const index = h => {
      const i = header.indexOf(h);
      if (i < 0) throw new Error('Kolom Kehadiran tidak ditemukan: ' + h);
      return i;
    };
    const id = String(awal[index('id_kehadiran')] || '').trim();
    if (!id) throw new Error('Baris belum memiliki id_kehadiran. Gunakan baris hasil absensi QR terlebih dahulu.');
    const zona = ss.getSpreadsheetTimeZone();
    function tampil(v) {
      return v instanceof Date ? Utilities.formatDate(v, zona, 'yyyy-MM-dd HH:mm:ss') : String(v || '(kosong)');
    }
    const identitas = 'ID: ' + id + '\nSesi: ' + awal[index('id_sesi')] + '\nKeikutsertaan: ' + awal[index('id_keikutsertaan')];
    function tanya(judul, isi) {
      const r = ui.prompt(judul, isi, ui.ButtonSet.OK_CANCEL);
      return r.getSelectedButton() === ui.Button.OK ? r.getResponseText().trim() : null;
    }
    const datang = tanya('1/5 — Waktu datang terverifikasi', identitas + '\nZona waktu: ' + zona + '\nScan asli: ' + tampil(awal[index('waktu_datang')]) + '\nTerverifikasi: ' + tampil(awal[index('waktu_datang_terverifikasi')]) + '\n\nIsi YYYY-MM-DD HH:mm:ss atau YYYY-MM-DD HH:mm. Kosong = pertahankan nilai yang ada.');
    if (datang === null) return;
    const pulang = tanya('2/5 — Waktu pulang terverifikasi', identitas + '\nZona waktu: ' + zona + '\nScan asli: ' + tampil(awal[index('waktu_pulang')]) + '\nTerverifikasi: ' + tampil(awal[index('waktu_pulang_terverifikasi')]) + '\n\nIsi YYYY-MM-DD HH:mm:ss atau YYYY-MM-DD HH:mm. Kosong = pertahankan nilai yang ada.');
    if (pulang === null) return;
    if (!datang && !pulang) throw new Error('Isi minimal satu waktu yang akan dilengkapi atau dikoreksi.');
    const alasan = tanya('3/5 — Alasan koreksi', 'Wajib diisi, misalnya: peserta lupa scan pulang.');
    if (alasan === null) return;
    const dasar = tanya('4/5 — Dasar verifikasi', 'Wajib diisi, misalnya: catatan petugas kelas atau laporan Zoom. Bisa berupa uraian atau tautan bukti.');
    if (dasar === null) return;
    const petugas = tanya('5/5 — Nama petugas', 'Wajib diisi. Nama ini dicatat sebagai keterangan petugas, bukan bukti autentikasi akun.');
    if (petugas === null) return;
    if (!alasan || !dasar || !petugas) throw new Error('Alasan, dasar verifikasi, dan nama petugas wajib diisi.');
    const perubahan = {};
    if (datang) perubahan.waktu_datang_terverifikasi = parseWaktuAbsensiManual_(datang, zona);
    if (pulang) perubahan.waktu_pulang_terverifikasi = parseWaktuAbsensiManual_(pulang, zona);
    const efektifDatang = perubahan.waktu_datang_terverifikasi || awal[index('waktu_datang_terverifikasi')] || awal[index('waktu_datang')];
    const efektifPulang = perubahan.waktu_pulang_terverifikasi || awal[index('waktu_pulang_terverifikasi')] || awal[index('waktu_pulang')];
    [efektifDatang, efektifPulang].filter(Boolean).forEach(v => {
      if (!(v instanceof Date) || isNaN(v.getTime())) throw new Error('Waktu tersimpan bukan tanggal Google Sheets yang valid. Periksa format sel.');
    });
    if (efektifDatang && efektifPulang && efektifPulang <= efektifDatang) throw new Error('Waktu pulang harus setelah waktu datang.');
    if (ui.alert('Konfirmasi perubahan', identitas + '\n\nDatang efektif: ' + tampil(efektifDatang) + '\nPulang efektif: ' + tampil(efektifPulang) + '\nAlasan: ' + alasan + '\nDasar: ' + dasar + '\nPetugas: ' + petugas + '\n\nSimpan perubahan? JP belum dihitung pada tahap ini.', ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
    const hasil = simpanKoreksiAbsensiManual_({id:id, snapshot:JSON.stringify(awal), perubahan:perubahan, alasan:alasan, dasar:dasar, petugas:petugas});
    ui.alert(hasil);
  } catch (e) {
    ui.alert('Koreksi belum selesai: ' + e.message);
  }
}

function parseWaktuAbsensiManual_(teks, zona) {
  if (!/^\d{4}-\d{2}-\d{2} (?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(teks)) throw new Error('Format waktu harus YYYY-MM-DD HH:mm atau YYYY-MM-DD HH:mm:ss.');
  const lengkap = teks.length === 16 ? teks + ':00' : teks;
  const tanggal = Utilities.parseDate(lengkap, zona, 'yyyy-MM-dd HH:mm:ss');
  if (Utilities.formatDate(tanggal, zona, 'yyyy-MM-dd HH:mm:ss') !== lengkap) throw new Error('Tanggal atau waktu tidak valid: ' + teks);
  return tanggal;
}

function simpanKoreksiAbsensiManual_(data) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    pastikanTidakAdaHapusTertunda_();
    const ss = databasePelatihan_();
    function baca(nama, wajib) {
      const sheet = ss.getSheetByName(nama);
      if (!sheet) throw new Error('Sheet tidak ditemukan: ' + nama);
      const values = sheet.getDataRange().getValues();
      const header = values[0].map(h => String(h).trim());
      wajib.forEach(h => {if (!header.includes(h)) throw new Error('Kolom ' + h + ' tidak ditemukan di ' + nama);});
      return {sheet:sheet, header:header, rows:values.slice(1)};
    }
    const k = baca('Kehadiran', ['id_kehadiran','waktu_datang','waktu_pulang','waktu_datang_terverifikasi','waktu_pulang_terverifikasi','status_kehadiran','status_validasi','metode_input','alasan_koreksi','dasar_verifikasi','diverifikasi_oleh','diverifikasi_pada','status_perhitungan_ulang','alasan_perhitungan_ulang','updated_at']);
    const a = baca('Riwayat_Validasi', ['id_riwayat','jenis_data','id_referensi','jenis_tindakan','kolom_diubah','nilai_sebelum','nilai_sesudah','alasan_perubahan','bukti_pendukung','diubah_oleh','waktu_perubahan','id_transaksi_perubahan','status_transaksi']);
    const ix = h => k.header.indexOf(h), ia = h => a.header.indexOf(h);
    const cocok = k.rows.map((r,i)=>({row:r,n:i+2})).filter(x=>String(x.row[ix('id_kehadiran')]).trim()===data.id);
    if (cocok.length !== 1) throw new Error('ID kehadiran tidak ditemukan atau duplikat.');
    const item = cocok[0];
    if (JSON.stringify(item.row) !== data.snapshot) throw new Error('Data berubah saat formulir dibuka. Ulangi dari baris terbaru.');
    const terakhir = new Map();
    a.rows.forEach(r=>{
      if (r[ia('jenis_data')]==='Kehadiran' && String(r[ia('id_referensi')])===data.id && r[ia('id_transaksi_perubahan')]) terakhir.set(r[ia('id_transaksi_perubahan')],r[ia('status_transaksi')]);
    });
    if (Array.from(terakhir.values()).some(s=>s!=='SELESAI')) throw new Error('Ada transaksi koreksi tertunda. Periksa Riwayat_Validasi sebelum mengulang koreksi.');
    const now = new Date();
    const row = item.row.slice();
    Object.keys(data.perubahan).forEach(h=>row[ix(h)] = data.perubahan[h]);
    const datang = row[ix('waktu_datang_terverifikasi')] || row[ix('waktu_datang')];
    const pulang = row[ix('waktu_pulang_terverifikasi')] || row[ix('waktu_pulang')];
    const perubahan = Object.assign({}, data.perubahan, {
      status_kehadiran:datang && pulang ? 'lengkap' : 'perlu_dilengkapi',
      status_validasi:typeof petugasDalamKonteksAkses_==='function'&&petugasDalamKonteksAkses_()?'belum_divalidasi':datang && pulang ? 'terverifikasi' : 'belum_lengkap',
      metode_input:row[ix('waktu_datang')] || row[ix('waktu_pulang')] ? 'qr_dan_manual' : 'manual',
      alasan_koreksi:data.alasan, dasar_verifikasi:data.dasar, diverifikasi_oleh:data.petugas,
      diverifikasi_pada:now, status_perhitungan_ulang:'menunggu_perhitungan',
      alasan_perhitungan_ulang:'Waktu kehadiran diperbarui melalui verifikasi manual.', updated_at:now
    });
    // Nilai perhitungan lama dikosongkan agar tidak dianggap sebagai hasil terbaru.
    ['durasi_aktual_menit','durasi_diakui_menit','menit_terlambat','menit_pengurang_jp','jp_diakui_presisi','usulan_durasi_diakui_menit','usulan_jp_diakui_presisi'].forEach(h=>{if(k.header.includes(h)) perubahan[h]='';});
    const sebelum={},sesudah={};
    Object.keys(perubahan).forEach(h=>{sebelum[h]=item.row[ix(h)];sesudah[h]=perubahan[h];row[ix(h)]=perubahan[h];});
    const transaksi = data.id_transaksi || Utilities.getUuid();
    const email = wajibPemilikIndex_();
    function audit(status) {
      const r={id_riwayat:'RV-'+Utilities.getUuid(),jenis_data:'Kehadiran',id_referensi:data.id,
        jenis_tindakan:'koreksi_absensi_manual',kolom_diubah:JSON.stringify(Object.keys(perubahan)),
        nilai_sebelum:JSON.stringify(sebelum),nilai_sesudah:JSON.stringify(sesudah),
        alasan_perubahan:data.alasan,bukti_pendukung:data.dasar,
        diubah_oleh:data.petugas + (email ? ' ('+email+')' : ''),waktu_perubahan:new Date(),
        id_transaksi_perubahan:transaksi,status_transaksi:status};
      a.sheet.appendRow(a.header.map(h=>r[h]===undefined?'':r[h]));SpreadsheetApp.flush();
    }
    audit('PENDING');
    try {
      k.sheet.getRange(item.n,1,1,row.length).setValues([row]);SpreadsheetApp.flush();
      const tersimpan=k.sheet.getRange(item.n,1,1,row.length).getValues()[0];
      if(JSON.stringify(tersimpan)!==JSON.stringify(row)) throw new Error('Verifikasi penyimpanan tidak sesuai.');
      audit('SELESAI');
    } catch(e) {
      try {audit('PERLU_PEMULIHAN');} catch(ignored) {}
      throw new Error('Transaksi '+transaksi+' perlu diperiksa: '+e.message);
    }
    return 'Koreksi berhasil disimpan. Scan asli tetap tersimpan. Status: '+perubahan.status_kehadiran+'. Perhitungan JP menunggu tahap berikutnya.';
  } finally {lock.releaseLock();}
}

/** Catat rentang izin dari Kehadiran, tanpa menetapkan poin perilaku. */
function catatIzinSesi_() {
  const ss=databasePelatihan_(), ui=SpreadsheetApp.getUi();
  const sheet=ss.getActiveSheet(), pilihan=sheet.getActiveRange();
  if(sheet.getName()!=='Kehadiran'||!pilihan||pilihan.getRow()<2||pilihan.getNumRows()!==1){
    ui.alert('Buka Kehadiran lalu pilih satu baris peserta.');return;
  }
  try {
    const h=sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0].map(String);
    const row=sheet.getRange(pilihan.getRow(),1,1,h.length).getValues()[0];
    const id=String(row[h.indexOf('id_kehadiran')]||'').trim();
    if(!id)throw new Error('Pilih baris kehadiran yang sudah memiliki ID.');
    const zona=ss.getSpreadsheetTimeZone();
    const identitas='Kehadiran: '+id+'\nSesi: '+row[h.indexOf('id_sesi')]+'\nKeikutsertaan: '+row[h.indexOf('id_keikutsertaan')];
    function tanya(judul,pesan){const r=ui.prompt(judul,pesan,ui.ButtonSet.OK_CANCEL);return r.getSelectedButton()===ui.Button.OK?r.getResponseText().trim():null;}
    const awal=tanya('1/5 — Mulai izin',identitas+'\nZona waktu: '+zona+'\nIsi tanggal dan jam: YYYY-MM-DD HH:mm');if(awal===null)return;
    const akhir=tanya('2/5 — Kembali dari izin','Isi tanggal dan jam kembali: YYYY-MM-DD HH:mm\nCatat setelah waktu kembali diketahui.');if(akhir===null)return;
    const alasan=tanya('3/5 — Alasan izin','Wajib diisi.');if(alasan===null)return;
    const bukti=tanya('4/5 — Bukti pendukung','Opsional; boleh dikosongkan.');if(bukti===null)return;
    const petugas=tanya('5/5 — Nama petugas','Wajib diisi; merupakan keterangan pencatat, bukan autentikasi akun.');if(petugas===null)return;
    if(!alasan||!petugas)throw new Error('Alasan dan nama petugas wajib diisi.');
    const mulai=parseWaktuAbsensiManual_(awal,zona), selesai=parseWaktuAbsensiManual_(akhir,zona);
    if(selesai<=mulai)throw new Error('Waktu kembali harus setelah waktu mulai izin.');
    if(ui.alert('Simpan catatan izin?',identitas+'\nMulai: '+awal+'\nKembali: '+akhir+'\nAlasan: '+alasan+'\n\nRentang ini akan diperhitungkan saat perhitungan JP dibuat. Poin perilaku tetap kosong.',ui.ButtonSet.YES_NO)!==ui.Button.YES)return;
    ui.alert(simpanIzinSesi_({id:id,snapshot:JSON.stringify(row),mulai:mulai,selesai:selesai,alasan:alasan,bukti:bukti,petugas:petugas}));
  }catch(e){ui.alert('Pencatatan izin belum selesai: '+e.message);}
}

function simpanIzinSesi_(d){
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    pastikanTidakAdaHapusTertunda_();
    const ss=databasePelatihan_(),text=v=>String(v==null?'':v).trim();
    function baca(nama,wajib){
      const sheet=ss.getSheetByName(nama);if(!sheet)throw new Error('Sheet tidak ditemukan: '+nama);
      const v=sheet.getDataRange().getValues(),h=v[0].map(x=>text(x));
      wajib.forEach(x=>{if(!h.includes(x))throw new Error('Kolom '+x+' tidak ditemukan di '+nama);});
      return {sheet:sheet,h:h,rows:v.slice(1)};
    }
    const k=baca('Kehadiran',['id_kehadiran','id_sesi','id_keikutsertaan','status_perhitungan_ulang','alasan_perhitungan_ulang','updated_at']);
    const c=baca('Catatan_Perilaku',['id_catatan','id_keikutsertaan','id_sesi','cakupan_kejadian','id_indikator','id_kehadiran','kunci_kejadian','waktu_kejadian','keterangan','bukti_pendukung','sumber_catatan','status_validasi','created_at','updated_at','waktu_mulai_izin','waktu_selesai_izin','status_pengurangan_jp']);
    const i=baca('Indikator_Perilaku',['id_indikator','kode_indikator','status_indikator']);
    const a=baca('Riwayat_Validasi',['id_riwayat','jenis_data','id_referensi','jenis_tindakan','kolom_diubah','nilai_sebelum','nilai_sesudah','alasan_perubahan','bukti_pendukung','diubah_oleh','waktu_perubahan','id_transaksi_perubahan','status_transaksi']);
    const ik=x=>k.h.indexOf(x),ic=x=>c.h.indexOf(x),ii=x=>i.h.indexOf(x),ia=x=>a.h.indexOf(x);
    const matches=k.rows.map((r,n)=>({r:r,n:n+2})).filter(o=>text(o.r[ik('id_kehadiran')])===d.id);
    if(matches.length!==1)throw new Error('Kehadiran tidak ditemukan atau duplikat.');
    const old=matches[0].r;if(JSON.stringify(old)!==d.snapshot)throw new Error('Kehadiran berubah. Buka ulang formulir.');
    if(!(d.mulai instanceof Date)||!(d.selesai instanceof Date)||!Number.isFinite(d.mulai.getTime())||!Number.isFinite(d.selesai.getTime())||d.selesai<=d.mulai)throw new Error('Rentang izin tidak valid.');
    if(!text(d.alasan)||!text(d.petugas))throw new Error('Alasan dan petugas pencatatan wajib lengkap.');
    const indicators=i.rows.filter(r=>text(r[ii('kode_indikator')])==='IZIN_SESI'&&text(r[ii('status_indikator')]).toLowerCase()==='aktif');
    if(indicators.length!==1||!text(indicators[0][ii('id_indikator')]))throw new Error('Harus ada tepat satu indikator IZIN_SESI yang aktif dan memiliki ID.');
    const sesi=text(old[ik('id_sesi')]),ikut=text(old[ik('id_keikutsertaan')]);
    // Pastikan rentang izin ada di dalam jadwal sesi, bukan pada tanggal sesi lain.
    const s=baca('Sesi',['id_sesi','tanggal_sesi','jam_mulai','jam_selesai']);
    const sesiRows=s.rows.filter(r=>text(r[s.h.indexOf('id_sesi')])===sesi);
    if(sesiRows.length!==1)throw new Error('Sesi tidak ditemukan atau duplikat.');
    const sr=sesiRows[0],zona=ss.getSpreadsheetTimeZone();
    const tanggal=sr[s.h.indexOf('tanggal_sesi')];
    const tanggalTeks=tanggal instanceof Date?Utilities.formatDate(tanggal,zona,'yyyy-MM-dd'):text(tanggal);
    function jam(v){
      if(v instanceof Date)return Utilities.formatDate(v,zona,'HH:mm:ss');
      const m=text(v).replace('.',':').match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
      if(!m)throw new Error('Format jam sesi harus HH:mm atau HH:mm:ss.');
      return m[1].padStart(2,'0')+':'+m[2]+':'+(m[3]||'00');
    }
    const awalSesi=parseWaktuAbsensiManual_(tanggalTeks+' '+jam(sr[s.h.indexOf('jam_mulai')]),zona);
    const akhirSesi=parseWaktuAbsensiManual_(tanggalTeks+' '+jam(sr[s.h.indexOf('jam_selesai')]),zona);
    if(d.mulai<awalSesi||d.selesai>akhirSesi)throw new Error('Rentang izin harus berada di dalam jadwal sesi.');
    const key=['IZIN',d.id,d.mulai.toISOString(),d.selesai.toISOString()].join('|');
    if(c.rows.some(r=>text(r[ic('kunci_kejadian')])===key))throw new Error('Rentang izin yang sama sudah dicatat. Periksa Catatan_Perilaku.');
    const status=new Map();a.rows.forEach(r=>{
      if(r[ia('jenis_data')]==='Kehadiran'&&text(r[ia('id_referensi')])===d.id&&r[ia('id_transaksi_perubahan')])status.set(r[ia('id_transaksi_perubahan')],r[ia('status_transaksi')]);
    });
    if(Array.from(status.values()).some(x=>x!=='SELESAI'))throw new Error('Ada transaksi tertunda untuk kehadiran ini. Periksa Riwayat_Validasi.');
    const now=new Date(),tx=Utilities.getUuid();
    const catatan={id_catatan:'CTP-'+Utilities.getUuid(),id_keikutsertaan:ikut,id_sesi:sesi,cakupan_kejadian:'sesi',id_indikator:text(indicators[0][ii('id_indikator')]),id_kehadiran:d.id,kunci_kejadian:key,waktu_kejadian:d.mulai,keterangan:d.alasan,bukti_pendukung:d.bukti,sumber_catatan:'petugas_kelas: '+d.petugas,status_validasi:'belum_divalidasi',created_at:now,updated_at:now,waktu_mulai_izin:d.mulai,waktu_selesai_izin:d.selesai,status_pengurangan_jp:'diperhitungkan'};
    const perubahan={status_perhitungan_ulang:'menunggu_perhitungan',alasan_perhitungan_ulang:'Penambahan rentang izin '+catatan.id_catatan,updated_at:now};
    ['durasi_aktual_menit','durasi_diakui_menit','menit_terlambat','menit_pengurang_jp','jp_diakui_presisi','usulan_durasi_diakui_menit','usulan_jp_diakui_presisi'].forEach(x=>{if(k.h.includes(x))perubahan[x]='';});
    const before={},next=old.slice();Object.keys(perubahan).forEach(x=>{before[x]=old[ik(x)];next[ik(x)]=perubahan[x];});
    const email=wajibPemilikIndex_();
    function audit(st){
      const r={id_riwayat:'RV-'+Utilities.getUuid(),jenis_data:'Kehadiran',id_referensi:d.id,jenis_tindakan:'tambah_izin_sesi',kolom_diubah:JSON.stringify(Object.keys(perubahan).concat(['Catatan_Perilaku'])),nilai_sebelum:JSON.stringify({kehadiran:before,catatan:null}),nilai_sesudah:JSON.stringify({kehadiran:perubahan,catatan:catatan}),alasan_perubahan:d.alasan,bukti_pendukung:d.bukti,diubah_oleh:d.petugas+(email?' ('+email+')':''),waktu_perubahan:new Date(),id_transaksi_perubahan:tx,status_transaksi:st};
      a.sheet.appendRow(a.h.map(x=>r[x]===undefined?'':r[x]));SpreadsheetApp.flush();
    }
    audit('PENDING');
    try{
      const catRow=c.h.map(x=>catatan[x]===undefined?'':catatan[x]);
      c.sheet.appendRow(catRow);SpreadsheetApp.flush();
      const saved=c.sheet.getDataRange().getValues().slice(1).filter(r=>text(r[ic('id_catatan')])===catatan.id_catatan);
      if(saved.length!==1||JSON.stringify(saved[0])!==JSON.stringify(catRow))throw new Error('Verifikasi catatan izin gagal.');
      k.sheet.getRange(matches[0].n,1,1,next.length).setValues([next]);SpreadsheetApp.flush();
      if(JSON.stringify(k.sheet.getRange(matches[0].n,1,1,next.length).getValues()[0])!==JSON.stringify(next))throw new Error('Verifikasi pembaruan Kehadiran gagal.');
      audit('SELESAI');
    }catch(e){try{audit('PERLU_PEMULIHAN');}catch(ignored){}throw new Error('Transaksi '+tx+' perlu diperiksa. Jangan menambah ulang sebelum pemeriksaan. '+e.message);}
    return 'Izin berhasil dicatat: '+catatan.id_catatan+'.\nStatus pengurangan JP: diperhitungkan.\nPoin perilaku belum ditetapkan. JP menunggu perhitungan.';
  }finally{lock.releaseLock();}
}

/** Endpoint Index: pemeriksaan pemilik dilakukan pada setiap permintaan. */
function wajibPemilikIndex_() {
  if(typeof konteksSesiPanitia_!=='undefined'&&konteksSesiPanitia_)return konteksSesiPanitia_.email;
  const ss=databasePelatihan_();
  const email=String(Session.getActiveUser().getEmail()||'').trim().toLowerCase();
  const owner=ss.getOwner();
  const pemilik=owner?String(owner.getEmail()||'').trim().toLowerCase():'';
  if(!email||!pemilik||email!==pemilik)throw new Error('Akses pengelolaan belum tersedia. Buka dengan akun pemilik spreadsheet. Jika identitas Google tidak tersedia pada deployment ini, gunakan panel dari menu spreadsheet.');
  return email;
}
function bukaPanelPengelolaan_(){
  wajibPemilikIndex_();
  SpreadsheetApp.getUi().showModalDialog(keluaranPanelAplikasi_('Pengelolaan').setWidth(1100).setHeight(780),'Pengelolaan Pelatihan');
}
function sesuaiJenjang_(s,k){
  const txt=v=>String(v==null?'':v).trim();
  if(txt(s.id_program)!==txt(k.id_program))return false;
  if(!Object.prototype.hasOwnProperty.call(s,'id_jenjang')&&!Object.prototype.hasOwnProperty.call(k,'id_jenjang'))return true;
  if(!txt(s.id_jenjang)||!txt(k.id_jenjang))throw Error('Relasi Jenjang belum lengkap. Periksa migrasi.');
  return txt(s.id_jenjang)===txt(k.id_jenjang);
}
function kolomJenjangData_(p,j){return typeof kolomJenjang_==='function'?kolomJenjang_(p,j):{};}
function tabelIndex_(nama,wajib){
  if(typeof pastikanMigrasiJenjangSiap_==='function')pastikanMigrasiJenjangSiap_();
  const sheet=databasePelatihan_().getSheetByName(nama);
  if(!sheet)throw new Error('Sheet tidak ditemukan: '+nama);
  const v=sheet.getDataRange().getValues(),h=v[0].map(x=>String(x).trim());
  wajib.forEach(x=>{if(!h.includes(x))throw new Error('Kolom '+x+' tidak ditemukan di '+nama);});
  const result={header:h,rows:v.slice(1).filter(r=>r.some(x=>x!=='')),records:v.slice(1).filter(r=>r.some(x=>x!=='')).map(r=>{const o={};h.forEach((x,n)=>{if(x)o[x]=r[n];});return o;})};
  if(typeof validasiTabelJenjang_==='function')validasiTabelJenjang_(nama,result);
  return result;
}
function versiBarisIndex_(row){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,JSON.stringify(row),Utilities.Charset.UTF_8).map(b=>('0'+(b&255).toString(16)).slice(-2)).join('');}
function muatAwalIndex(){
  if(typeof wajibEndpointAkses_==='function')wajibEndpointAkses_('muatAwalIndex');
  wajibPemilikIndex_();
  const data=ambilDataProgramSesiQR();
  if(typeof bacaMentahJenjang_==='function'){const j=bacaMentahJenjang_('Jenjang',true),names=new Map((j?j.records:[]).map(j=>[String(j.id_jenjang).trim(),String(j.nama_jenjang)]));data.sesi=data.sesi.map(s=>Object.assign({},s,{nama_sesi:String(s.nama_sesi)+(names.has(s.id_jenjang)?' · '+names.get(s.id_jenjang):'')}));}
  data.program=tabelIndex_('Program',['id_program','nama_program','kategori_pelatihan','jenjang']).records
    .map(p=>({id_program:String(p.id_program||'').trim(),nama_program:String(p.nama_program||'').trim(),kategori_pelatihan:String(p.kategori_pelatihan||'').trim(),jenjang:typeof namaJenjangProgram_==='function'?namaJenjangProgram_(p.id_program,p.jenjang):String(p.jenjang||'').trim()}))
    .filter(p=>p.id_program);
  if(typeof bacaMentahJenjang_==='function'){const j=bacaMentahJenjang_('Jenjang',true);data.struktur_jenjang=Boolean(j);data.jenjang=j?j.records.map(r=>({id:String(r.id_jenjang),id_program:String(r.id_program),nama:String(r.nama_jenjang)})):[];}
  return (typeof saringAwalPanitia_==='function'?saringAwalPanitia_:v=>v)({sukses:true,zona_waktu:databasePelatihan_().getSpreadsheetTimeZone(),data:data,navigasi:navigasiPelatihan_()});
}
function muatKehadiranIndex(idSesi){
  if(typeof wajibEndpointAkses_==='function')wajibEndpointAkses_('muatKehadiranIndex');
  wajibPemilikIndex_();
  idSesi=String(idSesi||'').trim();
  const ss=databasePelatihan_(),zona=ss.getSpreadsheetTimeZone();
  const sesi=tabelIndex_('Sesi',['id_sesi','id_program','nama_sesi','tanggal_sesi','jam_mulai','jam_selesai']).records.filter(s=>String(s.id_sesi).trim()===idSesi);
  if(sesi.length!==1)throw new Error('Sesi tidak ditemukan atau duplikat.');
  const s=sesi[0];
  const awalSesiIndex=waktuJadwalJP_(s.tanggal_sesi,s.jam_mulai,zona);
  const ikut=tabelIndex_('Keikutsertaan',['id_keikutsertaan','id_program','id_peserta','unit_kerja_saat_pelatihan','status_keikutsertaan']).records.filter(k=>String(k.id_program).trim()===String(s.id_program).trim()&&sesuaiJenjang_(s,k));
  const peserta=tabelIndex_('Peserta',['id_peserta','nama_pegawai']).records;
  const kehadiran=tabelIndex_('Kehadiran',['id_kehadiran','id_sesi','id_keikutsertaan','waktu_datang','waktu_pulang','waktu_datang_terverifikasi','waktu_pulang_terverifikasi','status_kehadiran']);
  const map=new Map();kehadiran.records.forEach((k,n)=>{
    if(String(k.id_sesi).trim()!==idSesi)return;
    const key=String(k.id_keikutsertaan).trim();
    if(map.has(key))throw new Error('Kehadiran duplikat untuk '+key+'. Periksa spreadsheet.');
    map.set(key,{k:k,row:kehadiran.rows[n]});
  });
  const nama=new Map(peserta.map(p=>[String(p.id_peserta).trim(),String(p.nama_pegawai)]));
  function waktu(v){return v instanceof Date&&!isNaN(v.getTime())?Utilities.formatDate(v,zona,'yyyy-MM-dd HH:mm:ss'):String(v||'');}
  function jam(v){return v instanceof Date?Utilities.formatDate(v,zona,'HH:mm'):String(v||'');}
  const rows=ikut.map(t=>{
    const item=map.get(String(t.id_keikutsertaan).trim()),k=item?item.k:{};
    const datang=k.waktu_datang_terverifikasi||k.waktu_datang,pulang=k.waktu_pulang_terverifikasi||k.waktu_pulang;
    const peringatan=peringatanWaktuKehadiran_(datang,pulang,s.tanggal_sesi,zona);
    return {id_keikutsertaan:String(t.id_keikutsertaan),nama:nama.get(String(t.id_peserta).trim())||'(peserta tidak ditemukan)',unit:String(t.unit_kerja_saat_pelatihan||''),status_peserta:String(t.status_keikutsertaan||''),id_kehadiran:String(k.id_kehadiran||''),versi:item?versiBarisIndex_(item.row):'',datang:waktu(k.waktu_datang),pulang:waktu(k.waktu_pulang),datang_verifikasi:waktu(k.waktu_datang_terverifikasi),pulang_verifikasi:waktu(k.waktu_pulang_terverifikasi),terlambat_menit:(k.waktu_datang_terverifikasi||k.waktu_datang) instanceof Date ? Math.max(0,((k.waktu_datang_terverifikasi||k.waktu_datang).getTime()-awalSesiIndex)/60000) : null,sudah_datang:datang instanceof Date&&Number.isFinite(datang.getTime()),peringatan_waktu:peringatan,toleransi_datang_menit:10,status:peringatan?'perlu_verifikasi':String(k.status_kehadiran||'belum_absen'),durasi_diakui:k.durasi_diakui_menit === '' || k.durasi_diakui_menit == null ? null : Number(k.durasi_diakui_menit),jp:k.jp_diakui_presisi === '' || k.jp_diakui_presisi == null ? null : Number(k.jp_diakui_presisi),status_jp:peringatan?'perlu_verifikasi':String(k.status_perhitungan_ulang||''),alasan_jp:peringatan||String(k.alasan_perhitungan_ulang||'')};
  }).sort((a,b)=>a.nama.localeCompare(b.nama,'id'));
  const kodeIzin=new Set(tabelIndex_('Indikator_Perilaku',['id_indikator','kode_indikator']).records.filter(i=>String(i.kode_indikator).trim()==='IZIN_SESI').map(i=>String(i.id_indikator).trim()));
  const pesertaSesi=new Set(rows.map(r=>r.id_keikutsertaan.trim()));
  const izinSesi=tabelIndex_('Catatan_Perilaku',['id_sesi','id_keikutsertaan','id_indikator','status_validasi']).records.filter(c=>String(c.id_sesi).trim()===idSesi&&pesertaSesi.has(String(c.id_keikutsertaan).trim())&&kodeIzin.has(String(c.id_indikator).trim())&&String(c.status_validasi).trim().toLowerCase()!=='ditolak');
  const ringkasan={terlambat:rows.filter(r=>!r.peringatan_waktu&&Number.isFinite(r.terlambat_menit)&&r.terlambat_menit>10).length,izin:new Set(izinSesi.map(c=>String(c.id_keikutsertaan).trim())).size};
  return {sukses:true,zona_waktu:zona,ringkasan:ringkasan,sesi:{id_sesi:idSesi,nama:String(s.nama_sesi),tanggal:s.tanggal_sesi instanceof Date?Utilities.formatDate(s.tanggal_sesi,zona,'yyyy-MM-dd'):String(s.tanggal_sesi||''),mulai:jam(s.jam_mulai),selesai:jam(s.jam_selesai)},peserta:rows};
}
function dataKoreksiIndex_(d){
  if(!d||!String(d.id_kehadiran||'').trim()||!String(d.versi||'').trim())throw new Error('Pilih kehadiran yang sudah tercatat.');
  const t=tabelIndex_('Kehadiran',['id_kehadiran']);
  const matches=t.rows.filter(r=>String(r[t.header.indexOf('id_kehadiran')]).trim()===String(d.id_kehadiran).trim());
  if(matches.length!==1)throw new Error('Kehadiran tidak ditemukan atau duplikat.');
  if(versiBarisIndex_(matches[0])!==d.versi)throw new Error('Data sudah berubah. Muat ulang tabel lalu ulangi tindakan.');
  return {id:String(d.id_kehadiran).trim(),snapshot:JSON.stringify(matches[0]),row:matches[0],header:t.header};
}
function simpanKoreksiIndex(d){
  if(typeof wajibEndpointAkses_==='function')wajibEndpointAkses_('simpanKoreksiIndex');
  const email=wajibPemilikIndex_(),base=dataKoreksiIndex_(d),zona=databasePelatihan_().getSpreadsheetTimeZone();
  const alasan=String(d.alasan||'').trim(),dasar=String(d.dasar||'').trim();
  if(!alasan||!dasar)throw new Error('Alasan dan dasar verifikasi wajib diisi.');
  const perubahan={};
  if(d.datang)perubahan.waktu_datang_terverifikasi=parseWaktuAbsensiManual_(String(d.datang).replace('T',' '),zona);
  if(d.pulang)perubahan.waktu_pulang_terverifikasi=parseWaktuAbsensiManual_(String(d.pulang).replace('T',' '),zona);
  if(!Object.keys(perubahan).length)throw new Error('Isi minimal satu waktu koreksi.');
  const val=h=>base.row[base.header.indexOf(h)];
  const datang=perubahan.waktu_datang_terverifikasi||val('waktu_datang_terverifikasi')||val('waktu_datang');
  const pulang=perubahan.waktu_pulang_terverifikasi||val('waktu_pulang_terverifikasi')||val('waktu_pulang');
  [datang,pulang].filter(Boolean).forEach(x=>{if(!(x instanceof Date)||isNaN(x.getTime()))throw new Error('Waktu kehadiran tersimpan tidak valid. Periksa format sel.');});
  if(datang&&pulang&&pulang<=datang)throw new Error('Waktu pulang harus setelah waktu datang.');
  return {sukses:true,pesan:simpanKoreksiAbsensiManual_({id:base.id,snapshot:base.snapshot,perubahan:perubahan,alasan:alasan,dasar:dasar,petugas:email,id_transaksi:typeof konteksSesiPanitia_!=='undefined'&&konteksSesiPanitia_&&konteksSesiPanitia_.koreksi_tx||''})};
}
function simpanIzinIndex(d){
  if(typeof wajibEndpointAkses_==='function')wajibEndpointAkses_('simpanIzinIndex');
  const email=wajibPemilikIndex_(),base=dataKoreksiIndex_(d),zona=databasePelatihan_().getSpreadsheetTimeZone();
  const mulai=parseWaktuAbsensiManual_(String(d.mulai||'').replace('T',' '),zona),selesai=parseWaktuAbsensiManual_(String(d.selesai||'').replace('T',' '),zona);
  return {sukses:true,pesan:simpanIzinSesi_({id:base.id,snapshot:base.snapshot,mulai:mulai,selesai:selesai,alasan:String(d.alasan||'').trim(),bukti:buktiDenganLampiran_(d.dasar,d.id_bukti,'IZIN|'+base.id),petugas:email})};
}

/** Aturan prototipe JP v1: toleransi datang <= 10 menit; pulang lebih awal tanpa toleransi. */
function gabungRentangJP_(rentang) {
  const sorted=rentang.filter(r=>r[1]>r[0]).map(r=>r.slice()).sort((a,b)=>a[0]-b[0]);
  const out=[];sorted.forEach(r=>{const last=out[out.length-1];if(last&&r[0]<=last[1])last[1]=Math.max(last[1],r[1]);else out.push(r);});return out;
}
function hitungDurasiJP_(p) {
  const a=p.mulai,b=p.selesai,d=p.datang,k=p.pulang;
  if(![a,b,d,k].every(Number.isFinite)||b<=a||k<=d)throw new Error('Rentang waktu kehadiran atau sesi tidak valid.');
  const potong=(ranges,x,y)=>gabungRentangJP_(ranges.map(r=>[Math.max(x,r[0]),Math.min(y,r[1])]));
  const total=ranges=>ranges.reduce((n,r)=>n+r[1]-r[0],0);
  const jeda=potong(p.jeda,a,b),izin=potong(p.izin,a,b);
  const pengurang=gabungRentangJP_(jeda.concat(izin));
  const terlambat=Math.max(0,d-a);
  const awalAktual=Math.max(a,Math.min(b,d)),akhir=Math.min(b,Math.max(a,k));
  const awalDiakui=terlambat<=600000?a:awalAktual;
  function efektif(x,y){if(y<=x)return 0;return Math.max(0,y-x-total(potong(pengurang,x,y)));}
  const rencana=(b-a-total(jeda))/60000;
  const aktual=efektif(awalAktual,akhir)/60000;
  const diakui=Math.min(rencana,efektif(awalDiakui,akhir)/60000);
  return {durasi_aktual_menit:aktual,durasi_diakui_menit:diakui,menit_terlambat:terlambat/60000,menit_pengurang_jp:Math.max(0,rencana-diakui),jp_diakui_presisi:diakui/45};
}
function waktuJadwalJP_(tanggal,jam,zona) {
  const t=tanggal instanceof Date?Utilities.formatDate(tanggal,zona,'yyyy-MM-dd'):String(tanggal||'').trim();
  let j;if(jam instanceof Date)j=Utilities.formatDate(jam,zona,'HH:mm:ss');else{
    const m=String(jam||'').trim().replace('.',':').match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if(!m)throw new Error('Format jam jadwal tidak valid: '+jam);
    j=m[1].padStart(2,'0')+':'+m[2]+':'+(m[3]||'00');
  }
  return parseWaktuAbsensiManual_(t+' '+j,zona).getTime();
}
function hitungJPSesiIndex(idSesi) {
  if(typeof wajibEndpointAkses_==='function')wajibEndpointAkses_('hitungJPSesiIndex');
  wajibPemilikIndex_();blokirEditTertunda_();
  const petugas=wajibPemilikIndex_();
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try {
    pastikanTidakAdaHapusTertunda_();
    idSesi=String(idSesi||'').trim();
    const ss=databasePelatihan_(),zona=ss.getSpreadsheetTimeZone(),txt=v=>String(v==null?'':v).trim();
    const s=tabelIndex_('Sesi',['id_sesi','tanggal_sesi','jam_mulai','jam_selesai']);
    const found=s.records.filter(r=>txt(r.id_sesi)===idSesi);if(found.length!==1)throw new Error('Sesi tidak ditemukan atau duplikat.');
    const sesi=found[0],mulai=waktuJadwalJP_(sesi.tanggal_sesi,sesi.jam_mulai,zona),selesai=waktuJadwalJP_(sesi.tanggal_sesi,sesi.jam_selesai,zona);
    if(selesai<=mulai)throw new Error('Jam selesai sesi harus setelah jam mulai.');
    const jeda=tabelIndex_('Jeda_Sesi',['id_sesi','jam_mulai_jeda','jam_selesai_jeda']).records.filter(r=>txt(r.id_sesi)===idSesi).map(r=>{
      const a=waktuJadwalJP_(sesi.tanggal_sesi,r.jam_mulai_jeda,zona),b=waktuJadwalJP_(sesi.tanggal_sesi,r.jam_selesai_jeda,zona);
      if(b<=a||a<mulai||b>selesai)throw new Error('Rentang jeda tidak valid atau di luar sesi. Periksa Jeda_Sesi.');return [a,b];
    });
    const c=tabelIndex_('Catatan_Perilaku',['id_catatan','id_kehadiran','id_keikutsertaan','id_sesi','waktu_mulai_izin','waktu_selesai_izin','status_pengurangan_jp']).records.filter(r=>txt(r.id_sesi)===idSesi);
    const kolom=['durasi_aktual_menit','durasi_diakui_menit','menit_terlambat','menit_pengurang_jp','jp_diakui_presisi','usulan_durasi_diakui_menit','usulan_jp_diakui_presisi','status_perhitungan_ulang','alasan_perhitungan_ulang','updated_at'];
    const k=tabelIndex_('Kehadiran',['id_kehadiran','id_sesi','id_keikutsertaan','waktu_datang','waktu_pulang','waktu_datang_terverifikasi','waktu_pulang_terverifikasi'].concat(kolom));
    const sheet=ss.getSheetByName('Kehadiran'),auditSheet=ss.getSheetByName('Riwayat_Validasi');
    const a=tabelIndex_('Riwayat_Validasi',['id_riwayat','jenis_data','id_referensi','jenis_tindakan','kolom_diubah','nilai_sebelum','nilai_sesudah','alasan_perubahan','diubah_oleh','waktu_perubahan','id_transaksi_perubahan','status_transaksi']);
    const raw=sheet.getDataRange().getValues();
    const ix=x=>k.header.indexOf(x);
    const daftar=raw.slice(1).map((row,n)=>({row:row,n:n+2})).filter(o=>txt(o.row[ix('id_sesi')])===idSesi);
    if(typeof validasiTabelJenjang_==='function')validasiTabelJenjang_('Kehadiran',k);
    const seen=new Set(),pairs=new Set();daftar.forEach(o=>{
      const id=txt(o.row[ix('id_kehadiran')]),pair=txt(o.row[ix('id_keikutsertaan')]);
      if(!id||!pair||seen.has(id)||pairs.has(pair))throw new Error('ID kehadiran/keikutsertaan kosong atau duplikat pada sesi.');seen.add(id);pairs.add(pair);
    });
    const txs=new Map();a.records.filter(r=>r.jenis_data==='Kehadiran').forEach(r=>{if(r.id_transaksi_perubahan)txs.set(r.id_transaksi_perubahan,{id:txt(r.id_referensi),status:r.status_transaksi});});
    const tertunda=new Set(Array.from(txs.values()).filter(t=>t.status!=='SELESAI').map(t=>t.id));
    const hasil={sukses:true,dihitung:0,belum_lengkap:0,perlu_verifikasi:0,bermasalah:[],pesan:''};
    for(const item of daftar){
      const row=item.row,id=txt(row[ix('id_kehadiran')]),ikut=txt(row[ix('id_keikutsertaan')]);
      if(tertunda.has(id)){hasil.bermasalah.push(id+': transaksi tertunda; periksa Riwayat_Validasi.');continue;}
      const old={};kolom.forEach(h=>old[h]=row[ix(h)]);
      let perubahan={},dasar={},kategori='dihitung';
      try {
        const datang=row[ix('waktu_datang_terverifikasi')]||row[ix('waktu_datang')],pulang=row[ix('waktu_pulang_terverifikasi')]||row[ix('waktu_pulang')];
        const peringatan=peringatanWaktuKehadiran_(datang,pulang,sesi.tanggal_sesi,zona);if(peringatan)throw new Error(peringatan);
        if(!datang||!pulang){kategori='belum_lengkap';throw new Error('Menunggu waktu datang dan pulang yang lengkap.');}
        if(!(datang instanceof Date)||!(pulang instanceof Date))throw new Error('Waktu kehadiran bukan nilai tanggal Google Sheets.');
        const izin=[];
        for(const r of c.filter(r=>txt(r.id_kehadiran)===id||(!txt(r.id_kehadiran)&&txt(r.id_keikutsertaan)===ikut))){
          if(txt(r.id_keikutsertaan)!==ikut)throw new Error('Relasi izin tidak sesuai peserta: '+r.id_catatan);
          const status=txt(r.status_pengurangan_jp);
          if(!status&&!r.waktu_mulai_izin&&!r.waktu_selesai_izin)continue;
          if(status==='tidak_diperhitungkan')continue;
          if(status!=='diperhitungkan')throw new Error('Izin '+r.id_catatan+' menunggu verifikasi pengurangan JP.');
          const x=r.waktu_mulai_izin,y=r.waktu_selesai_izin;
          if(!(x instanceof Date)||!(y instanceof Date)||!Number.isFinite(x.getTime())||!Number.isFinite(y.getTime())||y<=x||x.getTime()<mulai||y.getTime()>selesai)throw new Error('Waktu izin tidak valid: '+r.id_catatan);
          izin.push([x.getTime(),y.getTime()]);
        }
        perubahan=hitungDurasiJP_({mulai:mulai,selesai:selesai,datang:datang.getTime(),pulang:pulang.getTime(),jeda:jeda,izin:izin});
        if(txt(sesi.status_jp)==='tidak_dihitung')perubahan={durasi_aktual_menit:perubahan.durasi_aktual_menit,durasi_diakui_menit:0,menit_terlambat:perubahan.menit_terlambat,menit_pengurang_jp:0,jp_diakui_presisi:0};
        dasar={aturan:'JP_PROTO_V1',toleransi_datang_menit:10,pulang_awal:'dikurangi_tanpa_toleransi',mulai:mulai,selesai:selesai,datang:datang.getTime(),pulang:pulang.getTime(),jeda:jeda,izin:izin,status_jp:txt(sesi.status_jp)};
        perubahan.usulan_durasi_diakui_menit=perubahan.durasi_diakui_menit;perubahan.usulan_jp_diakui_presisi=perubahan.jp_diakui_presisi;
        perubahan.status_perhitungan_ulang='dihitung_otomatis';
        perubahan.alasan_perhitungan_ulang='JP_PROTO_V1: 45 menit/JP; toleransi datang <=10 menit; pulang awal tanpa toleransi; jeda dan izin digabung tanpa pengurangan ganda.';
      }catch(e){
        if(kategori!=='belum_lengkap')kategori='perlu_verifikasi';
        kolom.filter(h=>!['status_perhitungan_ulang','alasan_perhitungan_ulang','updated_at'].includes(h)).forEach(h=>perubahan[h]='');
        perubahan.status_perhitungan_ulang=kategori==='belum_lengkap'?'menunggu_kelengkapan':'perlu_verifikasi';perubahan.alasan_perhitungan_ulang=e.message;
      }
      // Abaikan klik hitung ulang bila hasil substantif dan dasar perhitungan belum berubah.
      const keys=Object.keys(perubahan);if(keys.every(h=>JSON.stringify(old[h])===JSON.stringify(perubahan[h]))){hasil[kategori]++;continue;}
      perubahan.updated_at=new Date();const tx=Utilities.getUuid();
      function audit(status){const r={id_riwayat:'RV-'+Utilities.getUuid(),jenis_data:'Kehadiran',id_referensi:id,jenis_tindakan:'hitung_jp_otomatis',kolom_diubah:JSON.stringify(Object.keys(perubahan)),nilai_sebelum:JSON.stringify(old),nilai_sesudah:JSON.stringify(Object.assign({},perubahan,{dasar_perhitungan:dasar})),alasan_perubahan:perubahan.alasan_perhitungan_ulang,diubah_oleh:petugas,waktu_perubahan:new Date(),id_transaksi_perubahan:tx,status_transaksi:status};auditSheet.appendRow(a.header.map(h=>r[h]===undefined?'':r[h]));SpreadsheetApp.flush();}
      try{
        audit('PENDING');const next=row.slice();Object.keys(perubahan).forEach(h=>next[ix(h)]=perubahan[h]);sheet.getRange(item.n,1,1,next.length).setValues([next]);SpreadsheetApp.flush();
        if(JSON.stringify(sheet.getRange(item.n,1,1,next.length).getValues()[0])!==JSON.stringify(next))throw new Error('Verifikasi hasil penyimpanan gagal.');
        audit('SELESAI');hasil[kategori]++;
      }catch(e){try{audit('PERLU_PEMULIHAN');}catch(ignored){}hasil.bermasalah.push(id+': '+e.message+' (transaksi '+tx+')');}
    }
    hasil.pesan='Perhitungan selesai. '+hasil.dihitung+' kehadiran dihitung; '+hasil.belum_lengkap+' belum lengkap; '+hasil.perlu_verifikasi+' perlu verifikasi; '+hasil.bermasalah.length+' transaksi bermasalah.'+(hasil.bermasalah.length?'\n'+hasil.bermasalah.join('\n'):'');
    return hasil;
  }finally{lock.releaseLock();}
}

/** Rekap dibaca langsung dari sumber; tidak membuat sheet baru. */
function muatRekapJPProgramIndex(idProgram){
  if(typeof wajibEndpointAkses_==='function')wajibEndpointAkses_('muatRekapJPProgramIndex');
  wajibPemilikIndex_();blokirEditTertunda_();
  wajibPemilikIndex_();
  idProgram=String(idProgram||'').trim();
  const txt=v=>String(v==null?'':v).trim();
  const program=tabelIndex_('Program',['id_program','nama_program']).records.filter(p=>txt(p.id_program)===idProgram);
  if(program.length!==1)throw new Error('Program tidak ditemukan atau duplikat.');
  const zona=databasePelatihan_().getSpreadsheetTimeZone();
  const sesi=tabelIndex_('Sesi',['id_sesi','id_program','tanggal_sesi','jam_mulai','jam_selesai','status_jp']).records.filter(s=>txt(s.id_program)===idProgram&&(typeof dalamJenjangAkses_!=='function'||dalamJenjangAkses_(s)));
  const jeda=tabelIndex_('Jeda_Sesi',['id_sesi','jam_mulai_jeda','jam_selesai_jeda']).records;
  const k=tabelIndex_('Kehadiran',['id_kehadiran','id_sesi','id_keikutsertaan','waktu_datang','waktu_pulang','waktu_datang_terverifikasi','waktu_pulang_terverifikasi','durasi_diakui_menit','jp_diakui_presisi','status_perhitungan_ulang']).records;
  const catatan=tabelIndex_('Catatan_Perilaku',['id_catatan','id_sesi','id_kehadiran','id_keikutsertaan','waktu_mulai_izin','waktu_selesai_izin','status_pengurangan_jp']).records;
  const peserta=tabelIndex_('Peserta',['id_peserta','nama_pegawai']).records;
  const ikut=tabelIndex_('Keikutsertaan',['id_program','id_peserta','id_keikutsertaan','unit_kerja_saat_pelatihan','status_keikutsertaan']).records.filter(t=>txt(t.id_program)===idProgram&&(typeof dalamJenjangAkses_!=='function'||dalamJenjangAkses_(t)));
  const levelNames=new Map((typeof konteksJenjang_==='function'?konteksJenjang_(idProgram,'',false).daftar:[]).map(j=>[j.id,j.nama]));
  const audit=tabelIndex_('Riwayat_Validasi',['jenis_data','id_referensi','id_transaksi_perubahan','status_transaksi']).records;
  const transactions=new Map();audit.filter(a=>a.jenis_data==='Kehadiran'&&a.id_transaksi_perubahan).forEach(a=>transactions.set(a.id_transaksi_perubahan,{id:txt(a.id_referensi),status:a.status_transaksi}));
  const pending=new Set(Array.from(transactions.values()).filter(t=>t.status!=='SELESAI').map(t=>t.id));
  const nama=new Map(peserta.map(p=>[txt(p.id_peserta),txt(p.nama_pegawai)]));
  const meta=[],tambahan=[],ids=new Set();
  const tampilWaktu=v=>v instanceof Date&&!isNaN(v.getTime())?Utilities.formatDate(v,zona,'yyyy-MM-dd HH:mm:ss'):txt(v);
  const tanggalSesi=v=>v instanceof Date?Utilities.formatDate(v,zona,'yyyy-MM-dd'):txt(v);
  let totalMenit=0,diabaikan=0;const masalah=[];
  sesi.forEach(s=>{
    const id=txt(s.id_sesi);if(!id||ids.has(id))throw new Error('ID sesi kosong atau duplikat pada program.');ids.add(id);
    if(txt(s.status_jp)==='tidak_dihitung'){diabaikan++;tambahan.push({id_jenjang:txt(s.id_jenjang),id_sesi:id,nama_sesi:txt(s.nama_sesi)||id,tanggal:tanggalSesi(s.tanggal_sesi),status:'tidak_diperhitungkan',keterangan:'Sesi ditandai tidak dihitung sebagai JP.',jp:null,durasi_diakui:null,terlambat:null});return;}
    try{
      if(txt(s.status_jp)!=='dihitung')throw new Error('Status JP sesi belum ditetapkan menjadi dihitung atau tidak_dihitung.');
      const a=waktuJadwalJP_(s.tanggal_sesi,s.jam_mulai,zona),b=waktuJadwalJP_(s.tanggal_sesi,s.jam_selesai,zona);
      if(b<=a)throw new Error('Waktu sesi tidak valid.');
      const intervals=jeda.filter(j=>txt(j.id_sesi)===id).map(j=>{
        const x=waktuJadwalJP_(s.tanggal_sesi,j.jam_mulai_jeda,zona),y=waktuJadwalJP_(s.tanggal_sesi,j.jam_selesai_jeda,zona);
        if(y<=x||x<a||y>b)throw new Error('Rentang jeda tidak valid.');return [x,y];
      });
      const menit=(b-a-gabungRentangJP_(intervals).reduce((n,r)=>n+r[1]-r[0],0))/60000;
      totalMenit+=menit;meta.push({id_jenjang:txt(s.id_jenjang),id:id,nama:txt(s.nama_sesi)||id,tanggal:tanggalSesi(s.tanggal_sesi),mulai:a,selesai:b,jeda:intervals,menit:menit});
    }catch(e){masalah.push(id+': '+e.message);tambahan.push({id_jenjang:txt(s.id_jenjang),id_sesi:id,nama_sesi:txt(s.nama_sesi)||id,tanggal:tanggalSesi(s.tanggal_sesi),status:'perlu_verifikasi',keterangan:e.message,jp:null,durasi_diakui:null,terlambat:null});}
  });
  const seen=new Set();
  const hasil=ikut.map(t=>{
    const metaPeserta=meta.filter(s=>!t.id_jenjang||s.id_jenjang===txt(t.id_jenjang)),acuan=metaPeserta.reduce((n,s)=>n+s.menit,0),ownMasalah=tambahan.filter(r=>(!t.id_jenjang||r.id_jenjang===txt(t.id_jenjang))&&r.status==='perlu_verifikasi');
    const id=txt(t.id_keikutsertaan);if(!id||seen.has(id))throw new Error('ID keikutsertaan kosong atau duplikat.');seen.add(id);
    let menit=0,selesai=0,belumAbsen=0,belumLengkap=0,belumHitung=0;const detail=[],rincian=tambahan.filter(r=>!t.id_jenjang||r.id_jenjang===txt(t.id_jenjang)).map(r=>Object.assign({},r));
    metaPeserta.forEach(s=>{
      const info={id_sesi:s.id,nama_sesi:s.nama,tanggal:s.tanggal,jp_acuan:s.menit/45,datang:'',pulang:'',datang_asli:'',pulang_asli:'',sumber_datang:'',sumber_pulang:'',durasi_diakui:null,jp:null,terlambat:null,status:'belum_absen',keterangan:''};rincian.push(info);
      const records=k.filter(r=>txt(r.id_sesi)===s.id&&txt(r.id_keikutsertaan)===id);
      if(!records.length){info.keterangan='Belum ada absensi pada sesi ini.';belumAbsen++;detail.push(s.id+': belum ada absensi');return;}
      if(records.length!==1){info.status='perlu_verifikasi';info.keterangan='Kehadiran duplikat; periksa spreadsheet.';belumHitung++;detail.push(s.id+': kehadiran duplikat');return;}
      const r=records[0];
      const d=r.waktu_datang_terverifikasi||r.waktu_datang,p=r.waktu_pulang_terverifikasi||r.waktu_pulang;
      info.datang=tampilWaktu(d);info.pulang=tampilWaktu(p);info.datang_asli=tampilWaktu(r.waktu_datang);info.pulang_asli=tampilWaktu(r.waktu_pulang);info.sumber_datang=r.waktu_datang_terverifikasi?'terverifikasi':r.waktu_datang?'scan':'';info.sumber_pulang=r.waktu_pulang_terverifikasi?'terverifikasi':r.waktu_pulang?'scan':'';
      if(d instanceof Date&&Number.isFinite(d.getTime()))info.terlambat=Math.max(0,(d.getTime()-s.mulai)/60000);
      info.peringatan_waktu=peringatanWaktuKehadiran_(d,p,s.tanggal,zona);if(info.peringatan_waktu){info.status='perlu_verifikasi';info.keterangan=info.peringatan_waktu;belumHitung++;detail.push(s.id+': '+info.keterangan);return;}
      if(!d||!p){info.status='belum_lengkap';info.keterangan='Waktu datang atau pulang belum lengkap.';belumLengkap++;detail.push(s.id+': waktu datang/pulang belum lengkap');return;}
      try{
        if(pending.has(txt(r.id_kehadiran)))throw new Error('transaksi kehadiran tertunda');
        if(!(d instanceof Date)||!(p instanceof Date))throw new Error('format waktu kehadiran tidak valid');
        const izin=[];
        catatan.filter(c=>txt(c.id_sesi)===s.id&&(txt(c.id_kehadiran)===txt(r.id_kehadiran)||(!txt(c.id_kehadiran)&&txt(c.id_keikutsertaan)===id))).forEach(c=>{
          if(txt(c.id_keikutsertaan)!==id)throw new Error('relasi catatan izin tidak sesuai');
          const st=txt(c.status_pengurangan_jp);
          if(!st&&!c.waktu_mulai_izin&&!c.waktu_selesai_izin)return;
          if(st==='tidak_diperhitungkan')return;
          if(st!=='diperhitungkan')throw new Error('izin menunggu verifikasi');
          const a=c.waktu_mulai_izin,b=c.waktu_selesai_izin;
          if(!(a instanceof Date)||!(b instanceof Date)||!Number.isFinite(a.getTime())||!Number.isFinite(b.getTime())||b<=a||a.getTime()<s.mulai||b.getTime()>s.selesai)throw new Error('rentang izin tidak valid');
          izin.push([a.getTime(),b.getTime()]);
        });
        const aktual=hitungDurasiJP_({mulai:s.mulai,selesai:s.selesai,datang:d.getTime(),pulang:p.getTime(),jeda:s.jeda,izin:izin});
        const tersimpan=r.durasi_diakui_menit;
        if(r.status_perhitungan_ulang!=='dihitung_otomatis'||tersimpan===''||tersimpan==null||!Number.isFinite(Number(tersimpan))||Math.abs(Number(tersimpan)-aktual.durasi_diakui_menit)>0.000001||r.jp_diakui_presisi===''||r.jp_diakui_presisi==null||!Number.isFinite(Number(r.jp_diakui_presisi))||Math.abs(Number(r.jp_diakui_presisi)-aktual.jp_diakui_presisi)>0.000001)throw new Error('JP belum dihitung atau perlu dihitung ulang');
        info.status='dihitung';info.keterangan='Hasil ini termasuk dalam total JP program.';info.durasi_diakui=Number(tersimpan);info.jp=Number(tersimpan)/45;
        menit+=Number(tersimpan);selesai++;
      }catch(e){info.status='perlu_dihitung_atau_diperiksa';info.keterangan=e.message;belumHitung++;detail.push(s.id+': '+e.message);}
    });
    const lengkap=metaPeserta.length>0&&!ownMasalah.length&&!belumAbsen&&!belumLengkap&&!belumHitung;
    return {id_jenjang:txt(t.id_jenjang),nama_jenjang:levelNames.get(txt(t.id_jenjang))||'',id_keikutsertaan:id,nama:nama.get(txt(t.id_peserta))||'(peserta tidak ditemukan)',unit:txt(t.unit_kerja_saat_pelatihan),status_peserta:txt(t.status_keikutsertaan),jp_diperoleh:menit/45,jp_acuan:ownMasalah.length?null:acuan/45,kekurangan_jp:ownMasalah.length?null:Math.max(0,acuan-menit)/45,persentase:!ownMasalah.length&&acuan>0?Math.min(100,menit/acuan*100):null,sesi_dihitung:selesai,belum_absen:belumAbsen,belum_lengkap:belumLengkap,belum_dihitung:belumHitung,status:lengkap?'lengkap':'sementara',detail:detail,rincian:rincian.sort((a,b)=>String(a.tanggal).localeCompare(String(b.tanggal))||a.id_sesi.localeCompare(b.id_sesi))};
  }).sort((a,b)=>a.nama.localeCompare(b.nama,'id'));
  return {sukses:true,id_program:idProgram,nama_program:txt(program[0].nama_program),jp_acuan:masalah.length||new Set(sesi.map(t=>txt(t.id_jenjang))).size>1?null:totalMenit/45,jumlah_sesi:meta.length,sesi_diabaikan:diabaikan,masalah:masalah,peserta:hasil};
}

function muatCatatanPerilakuIndex(idSesi){
  if(typeof wajibEndpointAkses_==='function')wajibEndpointAkses_('muatCatatanPerilakuIndex');
  wajibPemilikIndex_();idSesi=String(idSesi||'').trim();
  const txt=v=>String(v==null?'':v).trim(),zona=databasePelatihan_().getSpreadsheetTimeZone();
  const s=tabelIndex_('Sesi',['id_sesi','id_program']).records.filter(r=>txt(r.id_sesi)===idSesi);
  if(s.length!==1)throw new Error('Pilih sesi yang valid.');
  const indikator=tabelIndex_('Indikator_Perilaku',['id_indikator','kode_indikator','definisi_indikator','jenis_indikator','status_indikator']).records;
  const ikut=tabelIndex_('Keikutsertaan',['id_keikutsertaan','id_program','id_peserta']).records.filter(k=>txt(k.id_program)===txt(s[0].id_program)&&sesuaiJenjang_(s[0],k));
  const peserta=tabelIndex_('Peserta',['id_peserta','nama_pegawai']).records;
  const names=new Map(peserta.map(p=>[txt(p.id_peserta),txt(p.nama_pegawai)])),links=new Map(ikut.map(k=>[txt(k.id_keikutsertaan),names.get(txt(k.id_peserta))||'(peserta tidak ditemukan)']));
  const imap=new Map(indikator.map(i=>[txt(i.id_indikator),i]));
  const hadir=tabelIndex_('Kehadiran',['id_sesi','id_keikutsertaan','waktu_datang','waktu_datang_terverifikasi']).records.filter(k=>txt(k.id_sesi)===idSesi);
  const data=tabelIndex_('Catatan_Perilaku',['id_catatan','id_sesi','id_keikutsertaan','id_indikator','waktu_kejadian','keterangan','bukti_pendukung','sumber_catatan','status_validasi','poin_diusulkan','poin_disahkan']).records.filter(c=>txt(c.id_sesi)===idSesi);
  const waktu=v=>v instanceof Date&&!isNaN(v.getTime())?Utilities.formatDate(v,zona,'yyyy-MM-dd HH:mm:ss'):txt(v);
  return {sukses:true,zona_waktu:zona,waktu_sekarang:Utilities.formatDate(new Date(),zona,'yyyy-MM-dd HH:mm:ss'),indikator:indikator.filter(i=>txt(i.status_indikator).toLowerCase()==='aktif'&&txt(i.kode_indikator)!=='IZIN_SESI').map(i=>({id:txt(i.id_indikator),kode:txt(i.kode_indikator),definisi:txt(i.definisi_indikator),jenis:txt(i.jenis_indikator)})),catatan:data.map(c=>{const i=imap.get(txt(c.id_indikator))||{};const refs=hadir.filter(k=>txt(k.id_keikutsertaan)===txt(c.id_keikutsertaan));const datang=refs.length===1?(refs[0].waktu_datang_terverifikasi||refs[0].waktu_datang):null;return {id:txt(c.id_catatan),id_tugas:txt(c.id_tugas),durasi_kejadian:c.durasi_kejadian_menit===''||c.durasi_kejadian_menit==null?null:Number(c.durasi_kejadian_menit),waktu_datang_pembanding:waktu(datang),versi:versiBarisIndex_(c),alasan_validasi:txt(c.alasan_validasi),divalidasi_oleh:txt(c.divalidasi_oleh),divalidasi_pada:waktu(c.divalidasi_pada),id_keikutsertaan:txt(c.id_keikutsertaan),nama:links.get(txt(c.id_keikutsertaan))||'(relasi peserta tidak sesuai program)',indikator:txt(i.definisi_indikator)||txt(c.id_indikator),kode:txt(i.kode_indikator),jenis:txt(i.jenis_indikator),waktu:waktu(c.waktu_kejadian),keterangan:txt(c.keterangan),bukti:txt(c.bukti_pendukung),sumber:txt(c.sumber_catatan),status:txt(c.status_validasi)||'belum_divalidasi',poin:c.poin_disahkan===''||c.poin_disahkan==null?null:Number(c.poin_disahkan),mulai_izin:waktu(c.waktu_mulai_izin),selesai_izin:waktu(c.waktu_selesai_izin),durasi_izin_menit:c.waktu_mulai_izin instanceof Date&&c.waktu_selesai_izin instanceof Date&&c.waktu_selesai_izin>c.waktu_mulai_izin?(c.waktu_selesai_izin-c.waktu_mulai_izin)/60000:null,status_pengurangan_jp:txt(c.status_pengurangan_jp)};}).sort((a,b)=>b.waktu.localeCompare(a.waktu))};
}
function simpanCatatanPerilakuIndex(d){
  if(typeof wajibEndpointAkses_==='function')wajibEndpointAkses_('simpanCatatanPerilakuIndex');
  const petugas=wajibPemilikIndex_(),txt=v=>String(v==null?'':v).trim();
  if(!d)throw new Error('Data catatan tidak tersedia.');
  const idSesi=txt(d.id_sesi),idIkut=txt(d.id_keikutsertaan),idInd=txt(d.id_indikator),alasan=txt(d.keterangan),bukti=buktiDenganLampiran_(d.bukti,d.id_bukti,'PERILAKU|'+txt(d.id_sesi)+'|'+txt(d.id_keikutsertaan)),request=txt(d.id_permintaan);
  if(!idSesi||!idIkut||!idInd||!alasan||!/^[a-zA-Z0-9_-]{16,100}$/.test(request))throw new Error('Sesi, peserta, indikator, keterangan, dan ID permintaan wajib lengkap.');
  if(alasan.length>2000||bukti.length>3000)throw new Error('Keterangan maksimal 2.000 karakter.');
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    pastikanTidakAdaHapusTertunda_();
    const ss=databasePelatihan_(),zona=ss.getSpreadsheetTimeZone();
    const sesi=tabelIndex_('Sesi',['id_sesi','id_program','tanggal_sesi','jam_mulai']).records.filter(s=>txt(s.id_sesi)===idSesi);
    if(sesi.length!==1)throw new Error('Sesi tidak ditemukan atau duplikat.');
    const ikut=tabelIndex_('Keikutsertaan',['id_keikutsertaan','id_program','status_keikutsertaan']).records.filter(k=>txt(k.id_keikutsertaan)===idIkut&&txt(k.id_program)===txt(sesi[0].id_program)&&sesuaiJenjang_(sesi[0],k));
    if(ikut.length!==1||txt(ikut[0].status_keikutsertaan).toLowerCase()!=='terdaftar')throw new Error('Peserta tidak terdaftar aktif pada program sesi ini.');
    const indikator=tabelIndex_('Indikator_Perilaku',['id_indikator','kode_indikator','status_indikator']).records.filter(i=>txt(i.id_indikator)===idInd);
    if(indikator.length!==1||txt(indikator[0].status_indikator).toLowerCase()!=='aktif')throw new Error('Indikator tidak aktif atau duplikat.');
    const kode=txt(indikator[0].kode_indikator);
    const taskCodes=['TUGAS_TEPAT_WAKTU','TERLAMBAT_TUGAS'];const task=taskCodes.includes(kode)?txt(d.id_tugas).toUpperCase():'';
    const durasi=kode==='OFF_CAM'?(d.durasi===''||d.durasi==null?NaN:Number(d.durasi)):null;
    if(taskCodes.includes(kode)&&(!task||!/^[A-Z0-9][A-Z0-9_.\/-]{0,79}$/.test(task)))throw new Error('Isi ID tugas, maksimal 80 karakter huruf/angka, titik, garis, atau garis miring.');
    if(kode==='OFF_CAM'&&(!Number.isFinite(durasi)||durasi<0||durasi>1440))throw new Error('Durasi off cam wajib berupa angka 0–1440 menit.');if(kode==='IZIN_SESI')throw new Error('Gunakan Catat izin agar waktu mulai dan kembali tercatat.');
    const t=tabelIndex_('Catatan_Perilaku',['id_catatan','id_keikutsertaan','id_sesi','cakupan_kejadian','id_indikator','id_kehadiran','kunci_kejadian','waktu_kejadian','keterangan','bukti_pendukung','sumber_catatan','poin_diusulkan','poin_disahkan','status_validasi','created_at','updated_at','durasi_kejadian_menit','id_tugas']);
    const audit=tabelIndex_('Riwayat_Validasi',['id_riwayat','jenis_data','id_referensi','jenis_tindakan','kolom_diubah','nilai_sebelum','nilai_sesudah','alasan_perubahan','bukti_pendukung','diubah_oleh','waktu_perubahan','id_transaksi_perubahan','status_transaksi']);
    const hadir=tabelIndex_('Kehadiran',['id_kehadiran','id_sesi','id_keikutsertaan','waktu_datang','waktu_datang_terverifikasi']).records.filter(k=>txt(k.id_sesi)===idSesi&&txt(k.id_keikutsertaan)===idIkut);
    if(hadir.length>1)throw new Error('Kehadiran duplikat; periksa spreadsheet.');
    const datangEfektif=hadir.length&&(hadir[0].waktu_datang_terverifikasi||hadir[0].waktu_datang);
    if(!(datangEfektif instanceof Date)||!Number.isFinite(datangEfektif.getTime()))throw new Error('Peserta harus sudah absen datang atau memiliki waktu datang terverifikasi. Tidak perlu menunggu absen pulang.');
    if(kode==='TERLAMBAT_MASUK'){
      const peringatan=peringatanWaktuKehadiran_(datangEfektif,null,sesi[0].tanggal_sesi,zona);if(peringatan)throw new Error(peringatan);
      const toleransi=toleransiTerlambatPerilaku_(sesi[0].id_program);
      const datang=hadir[0]&&(hadir[0].waktu_datang_terverifikasi||hadir[0].waktu_datang);
      const mulai=waktuJadwalJP_(sesi[0].tanggal_sesi,sesi[0].jam_mulai,zona);
      if(!(datang instanceof Date)||!Number.isFinite(datang.getTime())||datang.getTime()-mulai<=toleransi*60000)throw new Error('Catatan terlambat hanya untuk waktu datang yang melewati toleransi '+toleransi+' menit. Periksa kehadiran terlebih dahulu.');
    }
    const waktu=kode==='TERLAMBAT_MASUK'?(hadir[0].waktu_datang_terverifikasi||hadir[0].waktu_datang):parseWaktuAbsensiManual_(txt(d.waktu).replace('T',' '),zona);
    const requestKey='PERILAKU-REQ|'+request;
    const kejadian='PERILAKU|'+Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,JSON.stringify([idSesi,idIkut,idInd,waktu.toISOString(),alasan,bukti,durasi,task]),Utilities.Charset.UTF_8).map(b=>('0'+(b&255).toString(16)).slice(-2)).join('');
    const lateKey='TERLAMBAT|'+idSesi+'|'+idIkut;
    const key=kode==='TERLAMBAT_MASUK'?lateKey:kejadian;
    // Audit menautkan ID permintaan untuk retry aman tanpa menambah kolom sheet.
    const audits=audit.records.filter(a=>a.jenis_data==='Catatan_Perilaku'&&a.id_transaksi_perubahan===requestKey);
    if(audits.length){
      const first=audits.find(a=>a.status_transaksi==='PENDING');let payload;
      try{payload=JSON.parse(first.nilai_sesudah);}catch(e){throw new Error('Audit permintaan tidak lengkap. Periksa Riwayat_Validasi.');}
      if(payload.kunci_kejadian!==key||payload.id_keikutsertaan!==idIkut||payload.id_sesi!==idSesi||payload.id_indikator!==idInd||payload.waktu_kejadian!==waktu.toISOString()||payload.keterangan!==alasan||payload.bukti_pendukung!==bukti)throw new Error('ID permintaan digunakan untuk data berbeda.');
      if(audits[audits.length-1].status_transaksi!=='SELESAI')throw new Error('Permintaan sebelumnya belum selesai. Periksa Catatan_Perilaku dan Riwayat_Validasi sebelum mengulang.');
      const saved=t.records.filter(c=>txt(c.id_catatan)===payload.id_catatan);
      if(saved.length!==1)throw new Error('Catatan hasil permintaan tidak ditemukan atau duplikat.');
      return {sukses:true,pesan:'Catatan sebelumnya sudah tersimpan. Poin belum dihitung.',id:payload.id_catatan};
    }
    if(t.records.some(c=>txt(c.kunci_kejadian)===key))throw new Error(kode==='TERLAMBAT_MASUK'?'Keterlambatan peserta pada sesi ini sudah dicatat.':'Catatan dengan data yang sama sudah ada. Periksa daftar catatan.');
    if(task){const sessions=tabelIndex_('Sesi',['id_sesi','id_program']).records.filter(s=>txt(s.id_program)===txt(sesi[0].id_program));const ids=new Set(sessions.map(s=>txt(s.id_sesi)));const inds=tabelIndex_('Indikator_Perilaku',['id_indikator','kode_indikator']).records;const taskIds=new Set(inds.filter(i=>taskCodes.includes(txt(i.kode_indikator))).map(i=>txt(i.id_indikator)));if(t.records.some(c=>txt(c.id_keikutsertaan)===idIkut&&ids.has(txt(c.id_sesi))&&taskIds.has(txt(c.id_indikator))&&txt(c.id_tugas).toUpperCase()===task&&txt(c.status_validasi)!=='ditolak'))throw new Error('Tugas ini sudah memiliki catatan yang belum ditolak pada program ini. Periksa duplikat atau konflik.');}
    const record={id_catatan:'CTP-'+Utilities.getUuid(),id_keikutsertaan:idIkut,id_sesi:idSesi,cakupan_kejadian:'sesi',id_indikator:idInd,id_kehadiran:hadir.length?txt(hadir[0].id_kehadiran):'',kunci_kejadian:key,waktu_kejadian:waktu,keterangan:alasan,bukti_pendukung:bukti,sumber_catatan:'web: '+petugas,status_validasi:'belum_divalidasi',durasi_kejadian_menit:durasi==null?'':durasi,id_tugas:task,created_at:new Date(),updated_at:new Date()};
    const aSheet=ss.getSheetByName('Riwayat_Validasi'),cSheet=ss.getSheetByName('Catatan_Perilaku');
    function tulisAudit(status){const a={id_riwayat:'RV-'+Utilities.getUuid(),jenis_data:'Catatan_Perilaku',id_referensi:record.id_catatan,jenis_tindakan:'tambah_catatan_perilaku',kolom_diubah:JSON.stringify(Object.keys(record)),nilai_sebelum:'null',nilai_sesudah:JSON.stringify(record),alasan_perubahan:'Pencatatan observasi; poin belum ditetapkan.',bukti_pendukung:bukti,diubah_oleh:petugas,waktu_perubahan:new Date(),id_transaksi_perubahan:requestKey,status_transaksi:status};aSheet.appendRow(audit.header.map(h=>a[h]===undefined?'':a[h]));SpreadsheetApp.flush();}
    tulisAudit('PENDING');
    try{
      const row=t.header.map(h=>record[h]===undefined?'':record[h]);cSheet.appendRow(row);SpreadsheetApp.flush();
      const hasil=cSheet.getDataRange().getValues().slice(1).filter(r=>txt(r[t.header.indexOf('id_catatan')])===record.id_catatan);
      if(hasil.length!==1||JSON.stringify(hasil[0])!==JSON.stringify(row))throw new Error('Verifikasi penyimpanan gagal.');
      tulisAudit('SELESAI');
    }catch(e){try{tulisAudit('PERLU_PEMULIHAN');}catch(ignored){}throw new Error('Transaksi perlu diperiksa. Jangan menambah ulang sebelum memeriksa riwayat: '+e.message);}
    return {sukses:true,id:record.id_catatan,pesan:'Catatan perilaku tersimpan. Status belum divalidasi; poin belum dihitung.'};
  }finally{lock.releaseLock();}
}

function simpanValidasiPerilakuIndex(d){
  if(typeof wajibEndpointAkses_==='function')wajibEndpointAkses_('simpanValidasiPerilakuIndex');
  const petugas=wajibPemilikIndex_(),txt=v=>String(v==null?'':v).trim();
  if(!d||!txt(d.id_catatan)||!txt(d.versi)||!['disetujui','ditolak'].includes(d.keputusan)||!txt(d.alasan)||!/^[a-zA-Z0-9_-]{16,100}$/.test(txt(d.id_permintaan)))throw new Error('Data validasi tidak lengkap. Keputusan dan alasan wajib diisi.');
  if(txt(d.alasan).length>2000)throw new Error('Alasan maksimal 2000 karakter.');
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    pastikanTidakAdaHapusTertunda_();
    const ss=databasePelatihan_();
    const t=tabelIndex_('Catatan_Perilaku',['id_catatan','id_keikutsertaan','id_sesi','status_validasi','alasan_validasi','divalidasi_oleh','divalidasi_pada','updated_at']);
    const records=t.records.filter(c=>txt(c.id_catatan)===txt(d.id_catatan));if(records.length!==1)throw new Error('Catatan tidak ditemukan atau duplikat.');
    const c=records[0];
    const a=tabelIndex_('Riwayat_Validasi',['id_riwayat','jenis_data','id_referensi','jenis_tindakan','kolom_diubah','nilai_sebelum','nilai_sesudah','alasan_perubahan','diubah_oleh','waktu_perubahan','id_transaksi_perubahan','status_transaksi']);
    const tx='VALIDASI-PERILAKU|'+txt(d.id_permintaan);
    const audits=a.records.filter(r=>r.jenis_data==='Catatan_Perilaku'&&txt(r.id_referensi)===txt(c.id_catatan));
    const retry=audits.filter(r=>r.id_transaksi_perubahan===tx);
    if(retry.length){
      let data;try{data=JSON.parse(retry.find(r=>r.status_transaksi==='PENDING').nilai_sesudah);}catch(e){throw new Error('Audit permintaan tidak lengkap; periksa riwayat.');}
      if(data.status_validasi!==d.keputusan||data.alasan_validasi!==txt(d.alasan)||data.versi_sumber!==d.versi)throw new Error('ID permintaan digunakan untuk validasi berbeda.');
      if(retry[retry.length-1].status_transaksi!=='SELESAI')throw new Error('Validasi sebelumnya belum selesai. Periksa Riwayat_Validasi sebelum mengulang.');
      return {sukses:true,pesan:'Permintaan validasi sebelumnya sudah tersimpan.'};
    }
    if(versiBarisIndex_(c)!==d.versi)throw new Error('Catatan berubah sejak dimuat. Tutup formulir, muat ulang catatan, lalu periksa kembali.');
    const statuses=new Map();audits.forEach(r=>{if(r.id_transaksi_perubahan)statuses.set(r.id_transaksi_perubahan,r.status_transaksi);});
    if(Array.from(statuses.values()).some(s=>s!=='SELESAI'))throw new Error('Ada transaksi catatan yang tertunda. Periksa Riwayat_Validasi terlebih dahulu.');
    if(txt(c.status_validasi)===d.keputusan&&txt(c.alasan_validasi)===txt(d.alasan))return {sukses:true,pesan:'Keputusan dan alasan sudah sama. Tidak ada perubahan.'};
    const perubahan={status_validasi:d.keputusan,alasan_validasi:txt(d.alasan),divalidasi_oleh:petugas,divalidasi_pada:new Date(),updated_at:new Date()};
    const sebelum={};Object.keys(perubahan).forEach(h=>sebelum[h]=c[h]);
    const sheet=ss.getSheetByName('Catatan_Perilaku'),asheet=ss.getSheetByName('Riwayat_Validasi');
    const raw=sheet.getDataRange().getValues(),idIndex=t.header.indexOf('id_catatan');
    const indexes=raw.map((r,i)=>({r:r,n:i+1})).filter(x=>x.n>1&&txt(x.r[idIndex])===txt(c.id_catatan));if(indexes.length!==1)throw new Error('Catatan tidak unik.');
    const item=indexes[0],next=item.r.slice();Object.keys(perubahan).forEach(h=>next[t.header.indexOf(h)]=perubahan[h]);
    function audit(status){const r={id_riwayat:'RV-'+Utilities.getUuid(),jenis_data:'Catatan_Perilaku',id_referensi:txt(c.id_catatan),jenis_tindakan:'validasi_catatan_perilaku',kolom_diubah:JSON.stringify(Object.keys(perubahan)),nilai_sebelum:JSON.stringify(sebelum),nilai_sesudah:JSON.stringify(Object.assign({},perubahan,{versi_sumber:d.versi})),alasan_perubahan:txt(d.alasan),diubah_oleh:petugas,waktu_perubahan:new Date(),id_transaksi_perubahan:tx,status_transaksi:status};asheet.appendRow(a.header.map(h=>r[h]===undefined?'':r[h]));SpreadsheetApp.flush();}
    audit('PENDING');
    try{
      sheet.getRange(item.n,1,1,next.length).setValues([next]);SpreadsheetApp.flush();
      if(JSON.stringify(sheet.getRange(item.n,1,1,next.length).getValues()[0])!==JSON.stringify(next))throw new Error('Verifikasi hasil penyimpanan gagal.');
      audit('SELESAI');
    }catch(e){try{audit('PERLU_PEMULIHAN');}catch(ignored){}throw new Error('Validasi perlu pemeriksaan transaksi '+tx+': '+e.message);}
    return {sukses:true,pesan:'Catatan '+d.keputusan+'. Keputusan dan alasan tersimpan dalam riwayat. Poin dan pengurangan JP tidak diubah.'};
  }finally{lock.releaseLock();}
}

function aturanPerilakuDefault_(){return {schema:1,nilai_dasar:90,bobot:0.2,indikator:{INISIATIF:2,AKTIF_BERTANYA:1,TUGAS_TEPAT_WAKTU:2,PAPARAN_PROGRES:2,TERLAMBAT_MASUK:-1,OFF_CAM:-1,IZIN_SESI:-2,TERLAMBAT_TUGAS:-2},perhitungan:{tambahan_positif_maks:10,nilai_min:0,nilai_maks:100,toleransi_terlambat_menit:10,toleransi_off_cam_menit:15,izin_bebas_poin:1}};}
function bacaAturanPerilaku_(program){
  const id=String(program.id_aturan_penilaian_aktif||'').trim();if(!id)return null;
  const rows=tabelIndex_('Aturan_Penilaian',['id_aturan_penilaian','nilai_dasar_perilaku','bobot_perilaku','konfigurasi_indikator','konfigurasi_perhitungan']).records.filter(a=>String(a.id_aturan_penilaian).trim()===id);
  if(rows.length!==1)throw new Error('Aturan aktif tidak ditemukan atau duplikat: '+id);
  const a=rows[0];let cfg;try{cfg={schema:1,nilai_dasar:Number(a.nilai_dasar_perilaku),bobot:Number(a.bobot_perilaku),indikator:JSON.parse(String(a.konfigurasi_indikator)),perhitungan:JSON.parse(String(a.konfigurasi_perhitungan))};}catch(e){throw new Error('Konfigurasi aturan aktif belum sesuai format prototipe.');}
  validasiKonfigurasiPerilaku_(cfg);return {id:id,nama:String(a.nama_aturan||''),versi:Number(a.nomor_versi)||1,cfg:cfg};
}
function validasiKonfigurasiPerilaku_(c){
  if(!c||c.schema!==1||!Number.isFinite(c.nilai_dasar)||c.nilai_dasar<0||c.nilai_dasar>100||!Number.isFinite(c.bobot)||c.bobot<0||c.bobot>1||!c.indikator||!c.perhitungan)throw new Error('Nilai dasar harus 0–100 dan bobot 0–100%.');
  Object.keys(c.indikator).forEach(k=>{if(!/^[A-Z][A-Z0-9_]{1,79}$/.test(k)||!Number.isFinite(c.indikator[k])||Math.abs(c.indikator[k])>1000)throw Error('Poin indikator tidak valid: '+k);});
  const base=aturanPerilakuDefault_();Object.keys(base.indikator).forEach(k=>{if(!Number.isFinite(c.indikator[k])||Math.abs(c.indikator[k])>1000||(base.indikator[k]>0&&c.indikator[k]<0)||(base.indikator[k]<0&&c.indikator[k]>0))throw new Error('Poin indikator tidak valid: '+k);});
  ['tambahan_positif_maks','toleransi_terlambat_menit','toleransi_off_cam_menit','izin_bebas_poin'].forEach(k=>{const n=c.perhitungan[k];if(!Number.isFinite(n)||n<0||n>1440)throw new Error('Parameter tidak valid: '+k);});
  if(!Number.isInteger(c.perhitungan.izin_bebas_poin)||c.perhitungan.nilai_min!==0||c.perhitungan.nilai_maks!==100)throw new Error('Batas nilai prototipe harus 0–100; jumlah izin bebas poin harus bulat.');
}
function toleransiTerlambatPerilaku_(idProgram){
  const rows=tabelIndex_('Program',['id_program','id_aturan_penilaian_aktif']).records.filter(p=>String(p.id_program).trim()===String(idProgram).trim());
  const a=rows.length===1?bacaAturanPerilaku_(rows[0]):null;return a?a.cfg.perhitungan.toleransi_terlambat_menit:10;
}
function simpanAturanPerilakuProgramIndex(d){
  if(typeof wajibEndpointAkses_==='function')wajibEndpointAkses_('simpanAturanPerilakuProgramIndex');
  const petugas=wajibPemilikIndex_();if(!d)throw new Error('Data aturan belum tersedia.');validasiKonfigurasiPerilaku_(d.cfg);
  const id=String(d.id_program||'').trim(),lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    pastikanTidakAdaHapusTertunda_();
    const ss=databasePelatihan_(),p=tabelIndex_('Program',['id_program','id_aturan_penilaian_aktif','updated_at']);
    const rows=p.records.filter(p=>String(p.id_program).trim()===id);if(rows.length!==1)throw new Error('Program tidak ditemukan atau duplikat.');
    const program=rows[0],old=String(program.id_aturan_penilaian_aktif||'').trim();
    if(old!==String(d.id_aturan_sebelumnya||'').trim())throw new Error('Aturan program sudah berubah. Muat ulang pengaturan.');
    const a=tabelIndex_('Aturan_Penilaian',['id_aturan_penilaian','kode_aturan','nama_aturan','nomor_versi','id_aturan_sebelumnya','nilai_dasar_perilaku','bobot_perilaku','konfigurasi_indikator','konfigurasi_perhitungan','status_aturan','berlaku_mulai','keterangan','created_at','updated_at']);
    const audit=tabelIndex_('Riwayat_Validasi',['id_riwayat','jenis_data','id_referensi','jenis_tindakan','kolom_diubah','nilai_sebelum','nilai_sesudah','alasan_perubahan','diubah_oleh','waktu_perubahan','id_transaksi_perubahan','status_transaksi']);
    const statuses=new Map();audit.records.filter(r=>r.jenis_data==='Program'&&String(r.id_referensi)===id).forEach(r=>{if(r.id_transaksi_perubahan)statuses.set(r.id_transaksi_perubahan,r.status_transaksi);});if(Array.from(statuses.values()).some(s=>s!=='SELESAI'))throw new Error('Ada transaksi aturan program yang tertunda. Periksa riwayat.');
    const alasan=String(d.alasan||'').trim();if(!alasan||alasan.length>2000)throw new Error('Alasan penetapan/perubahan wajib diisi, maksimal 2000 karakter.');
    const previous=old?bacaAturanPerilaku_(program):null;const katalog=katalogIndikator_();if(d.versi_indikator!==katalog.versi)throw Error('Daftar indikator berubah. Muat ulang nilai sebelum menyimpan aturan.');validasiPoinKatalog_(d.cfg,katalog,previous);
    if(previous&&JSON.stringify(previous.cfg)===JSON.stringify(d.cfg))return {sukses:true,pesan:'Konfigurasi sama dengan aturan aktif. Tidak ada versi baru.'};
    const now=new Date(),ruleId='ATP-'+Utilities.getUuid(),tx=Utilities.getUuid();
    const rule={id_aturan_penilaian:ruleId,kode_aturan:'PERILAKU_'+id,nama_aturan:'Aturan Perilaku '+String(program.nama_program||id),nomor_versi:previous?previous.versi+1:1,id_aturan_sebelumnya:old,nilai_dasar_perilaku:d.cfg.nilai_dasar,bobot_perilaku:d.cfg.bobot,konfigurasi_indikator:JSON.stringify(d.cfg.indikator),konfigurasi_perhitungan:JSON.stringify(d.cfg.perhitungan),status_aturan:'aktif',berlaku_mulai:now,keterangan:alasan,created_at:now,updated_at:now};
    const ps=ss.getSheetByName('Program'),as=ss.getSheetByName('Aturan_Penilaian'),rs=ss.getSheetByName('Riwayat_Validasi');
    const raw=ps.getDataRange().getValues(),pos=raw.findIndex((r,n)=>n>0&&String(r[p.header.indexOf('id_program')]).trim()===id);
    const next=raw[pos].slice();next[p.header.indexOf('id_aturan_penilaian_aktif')]=ruleId;next[p.header.indexOf('updated_at')]=now;
    function log(st){const r={id_riwayat:'RV-'+Utilities.getUuid(),jenis_data:'Program',id_referensi:id,jenis_tindakan:'tetapkan_aturan_perilaku',kolom_diubah:JSON.stringify(['id_aturan_penilaian_aktif']),nilai_sebelum:JSON.stringify({id_aturan_penilaian_aktif:old}),nilai_sesudah:JSON.stringify({id_aturan_penilaian_aktif:ruleId,aturan:rule}),alasan_perubahan:alasan,diubah_oleh:petugas,waktu_perubahan:new Date(),id_transaksi_perubahan:tx,status_transaksi:st};rs.appendRow(audit.header.map(h=>r[h]===undefined?'':r[h]));SpreadsheetApp.flush();}
    log('PENDING');try{const ruleRow=a.header.map(h=>rule[h]===undefined?'':rule[h]);as.appendRow(ruleRow);SpreadsheetApp.flush();const saved=as.getDataRange().getValues().slice(1).filter(r=>r[a.header.indexOf('id_aturan_penilaian')]===ruleId);if(saved.length!==1||JSON.stringify(saved[0])!==JSON.stringify(ruleRow))throw new Error('Verifikasi aturan gagal.');ps.getRange(pos+1,1,1,next.length).setValues([next]);SpreadsheetApp.flush();if(JSON.stringify(ps.getRange(pos+1,1,1,next.length).getValues()[0])!==JSON.stringify(next))throw new Error('Verifikasi penautan program gagal.');log('SELESAI');}catch(e){try{log('PERLU_PEMULIHAN');}catch(ignored){}throw new Error('Transaksi aturan perlu diperiksa: '+e.message);}
    return {sukses:true,pesan:'Aturan versi '+rule.nomor_versi+' ditautkan ke program. Versi sebelumnya tetap tersimpan.'};
  }finally{lock.releaseLock();}
}
function hitungNilaiPerilakuPeserta_(catatan,cfg){
  const rows=catatan.slice().sort((a,b)=>a.urutan-b.urutan||a.id.localeCompare(b.id));
  const tasks=new Map(),lates=new Map();let nomorIzin=0,pending=0,positif=0,negatif=0;const detail=[];
  rows.filter(r=>r.status==='disetujui').forEach(r=>{
    if(['TUGAS_TEPAT_WAKTU','TERLAMBAT_TUGAS'].includes(r.kode)&&r.id_tugas){const key=r.id_tugas.toUpperCase();tasks.set(key,(tasks.get(key)||0)+1);}
    if(r.kode==='TERLAMBAT_MASUK')lates.set(r.id_sesi,(lates.get(r.id_sesi)||0)+1);
  });
  for(const r of rows){
    let poin=null,keterangan='',status='tidak_dihitung';
    if(r.status==='ditolak'){poin=0;keterangan='Catatan ditolak.';}
    else if(r.status!=='disetujui'){pending++;status='menunggu_validasi';keterangan='Catatan belum disetujui.';}
    else try{
      if(r.transaksi_tertunda)throw new Error('Ada transaksi catatan atau kehadiran yang tertunda.');
      if(!Number.isFinite(r.urutan))throw new Error('Waktu kejadian belum valid.');
      if(!Object.prototype.hasOwnProperty.call(cfg.indikator,r.kode))throw new Error('Indikator belum memiliki aturan poin.');
      poin=cfg.indikator[r.kode];
      if(r.kode==='OFF_CAM'){
        if(r.durasi==null||!Number.isFinite(r.durasi)||r.durasi<0)throw new Error('Durasi off cam perlu dilengkapi.');
        if(r.durasi<=cfg.perhitungan.toleransi_off_cam_menit){poin=0;keterangan='Durasi masih dalam toleransi off cam.';}
      }
      if(['TUGAS_TEPAT_WAKTU','TERLAMBAT_TUGAS'].includes(r.kode)){
        if(!r.id_tugas)throw new Error('ID tugas perlu dilengkapi.');
        if(tasks.get(r.id_tugas.toUpperCase())>1)throw new Error('Lebih dari satu catatan disetujui untuk tugas '+r.id_tugas+'. Periksa duplikat/konflik.');
      }
      if(r.kode==='TERLAMBAT_MASUK'){
        if(lates.get(r.id_sesi)>1)throw new Error('Catatan keterlambatan pada sesi ini duplikat.');
        if(!Number.isFinite(r.terlambat))throw new Error('Waktu kehadiran perlu diperiksa.');
        if(r.terlambat<=cfg.perhitungan.toleransi_terlambat_menit){poin=0;keterangan='Waktu datang masih dalam toleransi.';}
      }
      if(r.kode==='IZIN_SESI'){
        nomorIzin++;if(nomorIzin<=cfg.perhitungan.izin_bebas_poin){poin=0;keterangan='Izin ke-'+nomorIzin+' masih bebas pengurangan poin.';}else keterangan='Izin ke-'+nomorIzin+' dalam program.';
      }
      status='dihitung';if(poin>0)positif+=poin;else negatif+=Math.abs(poin);if(!keterangan)keterangan='Sesuai aturan program.';
    }catch(e){poin=null;pending++;status='perlu_dilengkapi';keterangan=e.message;}
    detail.push({id:r.id,id_sesi:r.id_sesi,kode:r.kode,waktu:r.waktu,keterangan_catatan:r.keterangan,poin:poin,status:status,alasan:keterangan});
  }
  const tambahan=Math.min(cfg.perhitungan.tambahan_positif_maks,positif),nilai=Math.max(cfg.perhitungan.nilai_min,Math.min(cfg.perhitungan.nilai_maks,cfg.nilai_dasar+tambahan-negatif));
  return {nilai:nilai,kontribusi:nilai*cfg.bobot,positif:positif,tambahan_diakui:tambahan,pengurangan:negatif,menunggu:pending,status:pending?'sementara':'lengkap',detail:detail};
}
function muatNilaiPerilakuProgramIndex(idProgram){
  if(typeof wajibEndpointAkses_==='function')wajibEndpointAkses_('muatNilaiPerilakuProgramIndex');
  wajibPemilikIndex_();blokirEditTertunda_();
  wajibPemilikIndex_();const txt=v=>String(v==null?'':v).trim();idProgram=txt(idProgram);
  const program=tabelIndex_('Program',['id_program','id_aturan_penilaian_aktif']).records.filter(p=>txt(p.id_program)===idProgram);if(program.length!==1)throw new Error('Program tidak ditemukan atau duplikat.');
  const katalog=katalogIndikator_();const aturan=bacaAturanPerilaku_(program[0]);if(!aturan)return {sukses:true,katalog:katalog.indikator,versi_indikator:katalog.versi,aturan:null,default_cfg:aturanPerilakuDefault_(),peserta:[]};
  const sesi=tabelIndex_('Sesi',['id_sesi','id_program','tanggal_sesi','jam_mulai']).records.filter(s=>txt(s.id_program)===idProgram&&(typeof dalamJenjangAkses_!=='function'||dalamJenjangAkses_(s))),sm=new Map(sesi.map(s=>[txt(s.id_sesi),s]));
  const peserta=tabelIndex_('Peserta',['id_peserta','nama_pegawai']).records,names=new Map(peserta.map(p=>[txt(p.id_peserta),txt(p.nama_pegawai)]));
  const ikut=tabelIndex_('Keikutsertaan',['id_keikutsertaan','id_peserta','id_program','unit_kerja_saat_pelatihan']).records.filter(k=>txt(k.id_program)===idProgram&&(typeof dalamJenjangAkses_!=='function'||dalamJenjangAkses_(k)));
  const indikator=tabelIndex_('Indikator_Perilaku',['id_indikator','kode_indikator']).records,im=new Map(indikator.map(i=>[txt(i.id_indikator),txt(i.kode_indikator)]));
  const hadir=tabelIndex_('Kehadiran',['id_kehadiran','id_sesi','id_keikutsertaan','waktu_datang','waktu_datang_terverifikasi']).records;
  const c=tabelIndex_('Catatan_Perilaku',['id_catatan','id_keikutsertaan','id_sesi','id_indikator','waktu_kejadian','status_validasi','keterangan','durasi_kejadian_menit','id_tugas']).records;
  const audit=tabelIndex_('Riwayat_Validasi',['jenis_data','id_referensi','id_transaksi_perubahan','status_transaksi']).records,tx=new Map();audit.forEach(a=>{if(a.id_transaksi_perubahan)tx.set(a.id_transaksi_perubahan,{jenis:a.jenis_data,id:txt(a.id_referensi),status:a.status_transaksi});});
  const pending=new Set(Array.from(tx.values()).filter(a=>a.status!=='SELESAI').map(a=>a.jenis+'|'+a.id));
  if(pending.has('Program|'+idProgram))throw new Error('Transaksi aturan program belum selesai. Periksa riwayat.');
  const zona=databasePelatihan_().getSpreadsheetTimeZone();const hasil=ikut.map(k=>{
    const id=txt(k.id_keikutsertaan),notes=c.filter(r=>txt(r.id_keikutsertaan)===id&&sm.has(txt(r.id_sesi))&&sesuaiJenjang_(sm.get(txt(r.id_sesi)),k)).map(r=>{
      const s=sm.get(txt(r.id_sesi)),h=hadir.filter(h=>txt(h.id_sesi)===txt(r.id_sesi)&&txt(h.id_keikutsertaan)===id);let terlambat=null;
      try{const d=h.length===1&&(h[0].waktu_datang_terverifikasi||h[0].waktu_datang);if(d instanceof Date&&Number.isFinite(d.getTime())&&!peringatanWaktuKehadiran_(d,null,s.tanggal_sesi,zona))terlambat=Math.max(0,(d.getTime()-waktuJadwalJP_(s.tanggal_sesi,s.jam_mulai,zona))/60000);}catch(ignored){}
      return {id:txt(r.id_catatan),id_sesi:txt(r.id_sesi),kode:im.get(txt(r.id_indikator))||txt(r.id_indikator),status:txt(r.status_validasi),urutan:r.waktu_kejadian instanceof Date?r.waktu_kejadian.getTime():NaN,waktu:r.waktu_kejadian instanceof Date?Utilities.formatDate(r.waktu_kejadian,zona,'yyyy-MM-dd HH:mm:ss'):txt(r.waktu_kejadian),keterangan:txt(r.keterangan),durasi:r.durasi_kejadian_menit===''||r.durasi_kejadian_menit==null?null:Number(r.durasi_kejadian_menit),id_tugas:txt(r.id_tugas),terlambat:terlambat,transaksi_tertunda:pending.has('Catatan_Perilaku|'+txt(r.id_catatan))||h.some(h=>pending.has('Kehadiran|'+txt(h.id_kehadiran)))};
    });
    return Object.assign({id_keikutsertaan:id,nama:names.get(txt(k.id_peserta))||'(peserta tidak ditemukan)',unit:txt(k.unit_kerja_saat_pelatihan),jumlah_catatan:notes.length},hitungNilaiPerilakuPeserta_(notes,aturan.cfg));
  }).sort((a,b)=>a.nama.localeCompare(b.nama,'id'));
  return {sukses:true,katalog:katalog.indikator,versi_indikator:katalog.versi,aturan:aturan,default_cfg:aturanPerilakuDefault_(),peserta:hasil};
}

function tanggalKelola_(v,zona){
  if(v instanceof Date&&!isNaN(v.getTime()))return Utilities.formatDate(v,zona,'yyyy-MM-dd');
  const t=String(v||'').trim();parseWaktuAbsensiManual_(t+' 00:00',zona);return t;
}
function nomorIdKelola_(records,kolom,prefix){let max=batasNomorIdHapus_(prefix);const pattern=new RegExp('^'+prefix+'(\\d+)$');records.forEach(r=>{const m=String(r[kolom]||'').match(pattern);if(m)max=Math.max(max,Number(m[1]));});return prefix+String(max+1).padStart(3,'0');}
function muatKelolaProgramIndex(idProgram){
  if(typeof wajibEndpointAkses_==='function')wajibEndpointAkses_('muatKelolaProgramIndex');
  wajibPemilikIndex_();const ss=databasePelatihan_(),z=ss.getSpreadsheetTimeZone(),txt=v=>String(v==null?'':v).trim();
  const programs=tabelIndex_('Program',['id_program','nama_program','kategori_pelatihan','jenjang','tanggal_mulai','tanggal_selesai','status_program']).records;
  const sesi=tabelIndex_('Sesi',['id_sesi','id_program','nama_sesi','tanggal_sesi','jam_mulai','jam_selesai','status_jp']).records.filter(s=>txt(s.id_program)===txt(idProgram));
  const jeda=tabelIndex_('Jeda_Sesi',['id_jeda','id_sesi','jam_mulai_jeda','jam_selesai_jeda']).records;
  const fmtDate=v=>v instanceof Date?Utilities.formatDate(v,z,'yyyy-MM-dd'):txt(v),fmtTime=v=>v instanceof Date?Utilities.formatDate(v,z,'HH:mm'):txt(v);
  const scopeJenjang=typeof konteksJenjang_==='function'?konteksJenjang_(idProgram,'',false):{aktif:false,daftar:[]};
  return {sukses:true,struktur_jenjang:scopeJenjang.aktif,jenjang:scopeJenjang.daftar,program:programs.map(p=>({id:txt(p.id_program),nama:txt(p.nama_program),kategori:txt(p.kategori_pelatihan),jenjang:typeof namaJenjangProgram_==='function'?namaJenjangProgram_(p.id_program,p.jenjang):txt(p.jenjang),mulai:fmtDate(p.tanggal_mulai),selesai:fmtDate(p.tanggal_selesai),status:txt(p.status_program)})),sesi:sesi.map(s=>{
    const breaks=jeda.filter(j=>txt(j.id_sesi)===txt(s.id_sesi));let menit=null,error='';
    try{const a=waktuJadwalJP_(s.tanggal_sesi,s.jam_mulai,z),b=waktuJadwalJP_(s.tanggal_sesi,s.jam_selesai,z);if(b<=a)throw new Error('Waktu sesi tidak valid.');const ranges=breaks.map(j=>{const x=waktuJadwalJP_(s.tanggal_sesi,j.jam_mulai_jeda,z),y=waktuJadwalJP_(s.tanggal_sesi,j.jam_selesai_jeda,z);if(y<=x||x<a||y>b)throw new Error('Waktu jeda tidak valid.');return [x,y];});menit=(b-a-gabungRentangJP_(ranges).reduce((n,r)=>n+r[1]-r[0],0))/60000;}catch(e){error=e.message;}
    return {id:txt(s.id_sesi),id_jenjang:txt(s.id_jenjang),nama_jenjang:typeof konteksJenjang_==='function'?(scopeJenjang.daftar.find(j=>j.id===txt(s.id_jenjang))||{}).nama||'':'',nama:txt(s.nama_sesi),tanggal:fmtDate(s.tanggal_sesi),mulai:fmtTime(s.jam_mulai),selesai:fmtTime(s.jam_selesai),status_jp:txt(s.status_jp),durasi_efektif:menit,usulan_jp:menit==null?null:txt(s.status_jp)==='tidak_dihitung'?0:menit/45,jeda:breaks.map(j=>fmtTime(j.jam_mulai_jeda)+'–'+fmtTime(j.jam_selesai_jeda)).join(', '),masalah:error};}),zona_waktu:z};
}
/** Pemanggil memegang ScriptLock. Audit menjadi penanda retry dan transaksi tertunda. */
function pembuatanKelola_(jenis,input,request,builder){
  const ss=databasePelatihan_(),a=tabelIndex_('Riwayat_Validasi',['id_riwayat','jenis_data','id_referensi','jenis_tindakan','kolom_diubah','nilai_sebelum','nilai_sesudah','alasan_perubahan','diubah_oleh','waktu_perubahan','id_transaksi_perubahan','status_transaksi']);
  const tx='BUAT-'+jenis+'|'+request;
  const signature=versiBarisIndex_(input);
  const found=a.records.filter(r=>String(r.id_transaksi_perubahan)===tx);
  if(found.length){let payload;try{payload=JSON.parse(found.find(r=>r.status_transaksi==='PENDING').nilai_sesudah);}catch(e){throw new Error('Audit permintaan tidak lengkap. Periksa Riwayat_Validasi.');}
    if(payload.sidik_input!==signature)throw new Error('ID permintaan telah digunakan untuk data lain.');
    if(found[found.length-1].status_transaksi!=='SELESAI')throw new Error('Pembuatan sebelumnya belum selesai. Periksa data dan Riwayat_Validasi sebelum mengulang.');
    return payload.hasil;
  }
  const plan=builder();
  const previous=new Map();a.records.filter(r=>r.jenis_data===jenis&&String(r.id_referensi)===plan.id).forEach(r=>{if(r.id_transaksi_perubahan)previous.set(r.id_transaksi_perubahan,r.status_transaksi);});
  if(Array.from(previous.values()).some(v=>v!=='SELESAI'))throw new Error('Ada transaksi tertunda untuk ID ini. Periksa Riwayat_Validasi.');
  const hasil=Object.assign({sukses:true},plan.hasil),payload={sidik_input:signature,data:plan.writes,hasil:hasil};
  const as=ss.getSheetByName('Riwayat_Validasi');
  function audit(st){const r={id_riwayat:'RV-'+Utilities.getUuid(),jenis_data:jenis,id_referensi:plan.id,jenis_tindakan:'tambah_'+jenis.toLowerCase(),kolom_diubah:JSON.stringify(plan.writes.map(w=>w.sheet)),nilai_sebelum:'null',nilai_sesudah:JSON.stringify(payload),alasan_perubahan:plan.alasan||'Penambahan melalui panel Program & Sesi.',diubah_oleh:wajibPemilikIndex_(),waktu_perubahan:new Date(),id_transaksi_perubahan:tx,status_transaksi:st};as.appendRow(a.header.map(h=>r[h]===undefined?'':r[h]));SpreadsheetApp.flush();}
  // Semua header diperiksa sebelum ada penulisan data.
  plan.writes.forEach(w=>tabelIndex_(w.sheet,Object.keys(w.record)));
  audit('PENDING');
  try{for(const w of plan.writes){const table=tabelIndex_(w.sheet,[w.id_column]),sheet=ss.getSheetByName(w.sheet);const row=table.header.map(h=>w.record[h]===undefined?'':w.record[h]);sheet.appendRow(row);SpreadsheetApp.flush();
      verifikasiWriteKelola_(w);}
    audit('SELESAI');
  }catch(e){try{audit('PERLU_PEMULIHAN');}catch(ignored){}throw new Error('Transaksi belum selesai. Jangan menambah ulang sebelum memeriksa riwayat: '+e.message);}
  return hasil;
}
function tambahProgramIndex(d){
  if(typeof wajibEndpointAkses_==='function')wajibEndpointAkses_('tambahProgramIndex');
  wajibPemilikIndex_();if(!d)throw new Error('Data program tidak tersedia.');
  const txt=v=>String(v==null?'':v).trim(),z=databasePelatihan_().getSpreadsheetTimeZone();
  const input={nama:txt(d.nama),kategori:txt(d.kategori),jenjang:txt(d.jenjang),mulai:tanggalKelola_(d.mulai,z),selesai:tanggalKelola_(d.selesai,z),status:txt(d.status)};
  if(input.jenjang.startsWith('=')||!input.nama||input.nama.length>200||!input.kategori||input.kategori.length>100||input.jenjang.length>100||!['draft','aktif','selesai'].includes(input.status))throw new Error('Nama, kategori, dan status program wajib valid.');
  if(input.selesai<input.mulai)throw new Error('Tanggal selesai program tidak boleh sebelum tanggal mulai.');
  if(!/^[a-zA-Z0-9_-]{16,100}$/.test(txt(d.id_permintaan)))throw new Error('ID permintaan tidak valid.');
  const lock=LockService.getScriptLock();lock.waitLock(30000);try{
    pastikanTidakAdaHapusTertunda_();return pembuatanKelola_('Program',input,txt(d.id_permintaan),()=>{
    const p=tabelIndex_('Program',['id_program','nama_program','kategori_pelatihan','jenjang','tanggal_mulai','tanggal_selesai','status_program','id_aturan_penilaian_aktif','created_at','updated_at']);
    if(p.records.some(r=>txt(r.nama_program).toLowerCase()===input.nama.toLowerCase()&&txt(r.kategori_pelatihan).toLowerCase()===input.kategori.toLowerCase()&&txt(r.jenjang).toLowerCase()===input.jenjang.toLowerCase()&&tanggalKelola_(r.tanggal_mulai,z)===input.mulai&&tanggalKelola_(r.tanggal_selesai,z)===input.selesai))throw new Error('Program dengan nama, kategori, jenjang, dan rentang tanggal yang sama sudah ada.');
    const id=nomorIdKelola_(p.records,'id_program','PRG'),now=new Date();
    const r={id_program:id,nama_program:input.nama,kategori_pelatihan:input.kategori,jenjang:input.jenjang,tanggal_mulai:parseWaktuAbsensiManual_(input.mulai+' 00:00',z),tanggal_selesai:parseWaktuAbsensiManual_(input.selesai+' 00:00',z),status_program:input.status,id_aturan_penilaian_aktif:'',created_at:now,updated_at:now};
    const writes=[{sheet:'Program',id_column:'id_program',record:r}];
    if(typeof konteksJenjang_==='function'&&konteksJenjang_('','',false).aktif){const js=tabelIndex_('Jenjang',['id_jenjang','id_program','nama_jenjang','created_at','updated_at']);writes.push({sheet:'Jenjang',id_column:'id_jenjang',record:{id_jenjang:nomorIdKelola_(js.records,'id_jenjang','JEN'),id_program:id,nama_jenjang:input.jenjang||'Umum',created_at:now,updated_at:now}});}
    return {id:id,writes,hasil:{id_program:id,pesan:'Program '+id+' berhasil ditambahkan.'}};
  });}finally{lock.releaseLock();}
}
function tambahSesiIndex(d){
  if(typeof wajibEndpointAkses_==='function')wajibEndpointAkses_('tambahSesiIndex');
  wajibPemilikIndex_();if(!d)throw new Error('Data sesi tidak tersedia.');
  const txt=v=>String(v==null?'':v).trim(),z=databasePelatihan_().getSpreadsheetTimeZone();
  const input={...kolomJenjangData_(txt(d.id_program),d.id_jenjang),id_program:txt(d.id_program),nama:txt(d.nama),tanggal:tanggalKelola_(d.tanggal,z),mulai:txt(d.mulai),selesai:txt(d.selesai),status_jp:txt(d.status_jp),jeda:Array.isArray(d.jeda)?d.jeda.map(j=>({mulai:txt(j.mulai),selesai:txt(j.selesai),keterangan:txt(j.keterangan)})):[]};
  if(!input.id_program||!input.nama||input.nama.length>200||!['dihitung','tidak_dihitung'].includes(input.status_jp)||input.jeda.length>20)throw new Error('Data sesi tidak valid; maksimal 20 jeda.');
  const start=waktuJadwalJP_(input.tanggal,input.mulai,z),end=waktuJadwalJP_(input.tanggal,input.selesai,z);if(end<=start)throw new Error('Jam selesai harus setelah jam mulai.');
  const ranges=input.jeda.map(j=>{const a=waktuJadwalJP_(input.tanggal,j.mulai,z),b=waktuJadwalJP_(input.tanggal,j.selesai,z);if(b<=a||a<start||b>end)throw new Error('Jeda harus berada dalam sesi dan jam selesai jeda setelah jam mulai.');return[a,b];}).sort((a,b)=>a[0]-b[0]);
  for(let i=1;i<ranges.length;i++)if(ranges[i][0]<ranges[i-1][1])throw new Error('Waktu jeda saling bertumpang tindih.');
  if(!/^[a-zA-Z0-9_-]{16,100}$/.test(txt(d.id_permintaan)))throw new Error('ID permintaan tidak valid.');
  const lock=LockService.getScriptLock();lock.waitLock(30000);try{
    pastikanTidakAdaHapusTertunda_();return pembuatanKelola_('Sesi',input,txt(d.id_permintaan),()=>{
    const programs=tabelIndex_('Program',['id_program','tanggal_mulai','tanggal_selesai']).records.filter(p=>txt(p.id_program)===input.id_program);if(programs.length!==1)throw new Error('Program tidak ditemukan atau duplikat.');
    if(input.tanggal<tanggalKelola_(programs[0].tanggal_mulai,z)||input.tanggal>tanggalKelola_(programs[0].tanggal_selesai,z))throw new Error('Tanggal sesi harus berada dalam rentang tanggal program.');
    const s=tabelIndex_('Sesi',['id_sesi','id_program','nama_sesi','tanggal_sesi','jam_mulai','jam_selesai','durasi_rencana_menit','durasi_jeda_menit','durasi_efektif_menit','jp_rencana','status_jp','status_pemeriksaan','status_validasi_realisasi','created_at','updated_at']);
    if(s.records.some(r=>txt(r.id_program)===input.id_program&&(!input.id_jenjang||txt(r.id_jenjang)===input.id_jenjang)&&txt(r.nama_sesi).toLowerCase()===input.nama.toLowerCase()&&tanggalKelola_(r.tanggal_sesi,z)===input.tanggal&&waktuJadwalJP_(input.tanggal,r.jam_mulai,z)===start&&waktuJadwalJP_(input.tanggal,r.jam_selesai,z)===end))throw new Error('Sesi dengan nama, tanggal, dan jam yang sama sudah ada.');
    const j=tabelIndex_('Jeda_Sesi',['id_jeda','id_sesi','jam_mulai_jeda','jam_selesai_jeda','durasi_jeda_menit','status_validasi_jeda','keterangan','created_at','updated_at']);
    const id=nomorIdKelola_(s.records,'id_sesi','SES'),now=new Date(),durasi=(end-start)/60000,totalJeda=ranges.reduce((n,r)=>n+(r[1]-r[0])/60000,0),efektif=durasi-totalJeda;
    const record={...kolomJenjangData_(input.id_program,input.id_jenjang),id_sesi:id,id_program:input.id_program,nama_sesi:input.nama,tanggal_sesi:parseWaktuAbsensiManual_(input.tanggal+' 00:00',z),jam_mulai:input.mulai,jam_selesai:input.selesai,durasi_rencana_menit:durasi,durasi_jeda_menit:totalJeda,durasi_efektif_menit:efektif,jp_rencana:'',status_jp:input.status_jp,status_pemeriksaan:'belum_diperiksa',status_validasi_realisasi:'belum_divalidasi',created_at:now,updated_at:now};
    const writes=[{sheet:'Sesi',id_column:'id_sesi',record:record}],ids=j.records.slice();input.jeda.forEach(b=>{const jid=nomorIdKelola_(ids,'id_jeda','JDA');ids.push({id_jeda:jid});writes.push({sheet:'Jeda_Sesi',id_column:'id_jeda',record:{id_jeda:jid,id_sesi:id,jam_mulai_jeda:b.mulai,jam_selesai_jeda:b.selesai,durasi_jeda_menit:(waktuJadwalJP_(input.tanggal,b.selesai,z)-waktuJadwalJP_(input.tanggal,b.mulai,z))/60000,status_validasi_jeda:'belum_divalidasi',keterangan:b.keterangan,created_at:now,updated_at:now}});});
    return {id:id,writes:writes,hasil:{id_program:input.id_program,id_sesi:id,usulan_jp:input.status_jp==='dihitung'?efektif/45:0,pesan:'Sesi '+id+' dan '+input.jeda.length+' jeda berhasil ditambahkan. JP rencana belum dikonfirmasi.'}};
  });}finally{lock.releaseLock();}
}

/** Bandingkan nilai semantik: waktu, tanggal, angka, dan teks. Tidak mengubah data. */
function cocokRecordKelola_(row,header,record,zona){
  const isEmpty=v=>v===''||v==null;
  function date(v){if(v instanceof Date&&!isNaN(v.getTime()))return Utilities.formatDate(v,zona,'yyyy-MM-dd');const t=String(v||'').trim();if(/^\d{4}-\d{2}-\d{2}$/.test(t))return t;if(/^\d{4}-\d{2}-\d{2}T/.test(t)){const d=new Date(t);if(!isNaN(d.getTime()))return Utilities.formatDate(d,zona,'yyyy-MM-dd');}return null;}
  function time(v){
    if(v instanceof Date&&!isNaN(v.getTime()))v=Utilities.formatDate(v,zona,'HH:mm:ss');
    if(typeof v==='number'&&v>=0&&v<1)return Math.round(v*86400);
    const m=String(v||'').trim().replace('.',':').match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);if(!m)return null;
    let h=Number(m[1]);const min=Number(m[2]),sec=Number(m[3]||0);if(min>59||sec>59)return null;
    if(m[4]){if(h<1||h>12)return null;h=h%12+(m[4].toUpperCase()==='PM'?12:0);}else if(h>23)return null;
    return h*3600+min*60+sec;
  }
  const beda=[];Object.keys(record).forEach(k=>{
    const i=header.indexOf(k);if(i<0){beda.push(k);return;}
    const a=row[i],b=record[k];let sama=false;
    if(isEmpty(a)||isEmpty(b))sama=isEmpty(a)&&isEmpty(b);
    else if(/^tanggal_(sesi|mulai|selesai)$/.test(k)){const x=date(a),y=date(b);sama=x!==null&&x===y;}
    else if(/^jam_/.test(k)){const x=time(a),y=time(b);sama=x!==null&&x===y;}
    else if(['created_at','updated_at'].includes(k)){const x=a instanceof Date?a.getTime():new Date(a).getTime(),y=b instanceof Date?b.getTime():new Date(b).getTime();sama=Number.isFinite(x)&&Number.isFinite(y)&&Math.abs(x-y)<=1;}
    else if(typeof b==='number')sama=!isEmpty(a)&&Number.isFinite(Number(a))&&Math.abs(Number(a)-b)<1e-9;
    else sama=String(a)===String(b);
    if(!sama)beda.push(k);
  });return beda;
}
function verifikasiWriteKelola_(w){
  const table=tabelIndex_(w.sheet,Object.keys(w.record));const ss=databasePelatihan_();
  const rows=ss.getSheetByName(w.sheet).getDataRange().getValues().slice(1).filter(r=>String(r[table.header.indexOf(w.id_column)])===String(w.record[w.id_column]));
  if(rows.length!==1)throw new Error(w.sheet+': ID tidak ditemukan atau duplikat.');
  const beda=cocokRecordKelola_(rows[0],table.header,w.record,ss.getSpreadsheetTimeZone());if(beda.length)throw new Error(w.sheet+': nilai berbeda pada '+beda.join(', ')+'.');
}
function pulihkanPembuatanSesiIndex(idProgram){
  if(typeof wajibEndpointAkses_==='function')wajibEndpointAkses_('pulihkanPembuatanSesiIndex');
  const petugas=wajibPemilikIndex_();idProgram=String(idProgram||'').trim();if(!idProgram)throw new Error('Pilih program terlebih dahulu.');
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    pastikanTidakAdaHapusTertunda_();
    const ss=databasePelatihan_(),a=tabelIndex_('Riwayat_Validasi',['id_riwayat','jenis_data','id_referensi','jenis_tindakan','kolom_diubah','nilai_sebelum','nilai_sesudah','alasan_perubahan','diubah_oleh','waktu_perubahan','id_transaksi_perubahan','status_transaksi']);
    const groups=new Map();a.records.filter(r=>r.jenis_data==='Sesi'&&String(r.id_transaksi_perubahan||'').startsWith('BUAT-Sesi|')).forEach(r=>{const id=r.id_transaksi_perubahan;if(!groups.has(id))groups.set(id,[]);groups.get(id).push(r);});
    const hasil={sukses:true,dipulihkan:0,dilengkapi:0,masalah:[],pesan:''};
    for(const [tx,records] of groups){
      if(records[records.length-1].status_transaksi==='SELESAI')continue;
      let payload;const awal=records.find(r=>r.status_transaksi==='PENDING');
      try{payload=JSON.parse(awal.nilai_sesudah);}catch(e){hasil.masalah.push(tx+': format audit belum lengkap.');continue;}
      if(!payload.hasil||String(payload.hasil.id_program)!==idProgram)continue;
      try{
        const writes=payload.data;if(!Array.isArray(writes)||!writes.length||writes[0].sheet!=='Sesi'||writes[0].id_column!=='id_sesi')throw new Error('Rencana transaksi sesi tidak valid.');
        const root=writes[0],id=String(root.record.id_sesi);
        if(String(root.record.id_program)!==idProgram||id!==String(awal.id_referensi))throw new Error('Relasi program/sesi pada audit tidak cocok.');
        // Sesi utama harus sudah ada. Jangan membuat ulang sesi yang mungkin telah dihapus.
        verifikasiWriteKelola_(root);
        const plannedIds=new Set();writes.slice(1).forEach(w=>{const jid=String(w.record&&w.record.id_jeda||'');if(!jid||plannedIds.has(jid))throw new Error('ID jeda pada rencana kosong atau duplikat.');plannedIds.add(jid);});
        const actualBreaks=tabelIndex_('Jeda_Sesi',['id_jeda','id_sesi']).records.filter(j=>String(j.id_sesi)===id);
        if(actualBreaks.some(j=>!plannedIds.has(String(j.id_jeda))))throw new Error('Ada jeda tambahan di luar rencana awal. Periksa manual sebelum pemulihan.');
        const programs=tabelIndex_('Program',['id_program']).records.filter(p=>String(p.id_program)===idProgram);if(programs.length!==1)throw new Error('Program induk tidak ditemukan atau duplikat.');
        const missing=[];
        for(let n=1;n<writes.length;n++){
          const w=writes[n];if(w.sheet!=='Jeda_Sesi'||w.id_column!=='id_jeda'||String(w.record.id_sesi)!==id)throw new Error('Rencana jeda tidak sesuai sesi.');
          const t=tabelIndex_(w.sheet,Object.keys(w.record));const count=t.records.filter(r=>String(r[w.id_column])===String(w.record[w.id_column])).length;
          if(count===0)missing.push(w);else verifikasiWriteKelola_(w);
        }
        // Semua konflik diperiksa sebelum menambahkan jeda yang belum tersimpan.
        for(const w of missing){const t=tabelIndex_(w.sheet,Object.keys(w.record));const record=Object.assign({},w.record);['created_at','updated_at'].forEach(k=>{if(record[k])record[k]=new Date(record[k]);});ss.getSheetByName(w.sheet).appendRow(t.header.map(h=>record[h]===undefined?'':record[h]));SpreadsheetApp.flush();verifikasiWriteKelola_(w);}
        writes.forEach(verifikasiWriteKelola_);
        const r=Object.assign({},awal,{id_riwayat:'RV-'+Utilities.getUuid(),jenis_tindakan:'pemulihan_pembuatan_sesi',alasan_perubahan:'Seluruh nilai sesi dan jeda telah diverifikasi; jeda yang belum ada dilengkapi sesuai rencana awal.',diubah_oleh:petugas,waktu_perubahan:new Date(),status_transaksi:'SELESAI'});
        ss.getSheetByName('Riwayat_Validasi').appendRow(a.header.map(h=>r[h]===undefined?'':r[h]));SpreadsheetApp.flush();hasil.dipulihkan++;hasil.dilengkapi+=missing.length;
      }catch(e){hasil.masalah.push(String(awal.id_referensi)+': '+e.message);}
    }
    hasil.pesan=hasil.dipulihkan+' transaksi sesi dipulihkan; '+hasil.dilengkapi+' jeda yang belum tersimpan dilengkapi.'+(hasil.masalah.length?'\nPerlu diperiksa:\n'+hasil.masalah.join('\n'):'\nTidak ada konflik yang ditemukan.');return hasil;
  }finally{lock.releaseLock();}
}

function peringatanWaktuKehadiran_(datang,pulang,tanggalSesi,zona){
  const tanggal=tanggalSesi instanceof Date?Utilities.formatDate(tanggalSesi,zona,'yyyy-MM-dd'):String(tanggalSesi||'').trim();
  for(const [label,v] of [['datang',datang],['pulang',pulang]]){
    if(v===''||v==null)continue;
    if(!(v instanceof Date)||!Number.isFinite(v.getTime()))return 'Waktu '+label+' tidak valid; perlu verifikasi.';
    if(Utilities.formatDate(v,zona,'yyyy-MM-dd')!==tanggal)return 'Tanggal '+label+' berbeda dari tanggal sesi; perlu verifikasi.';
  }
  if(datang&&pulang&&pulang<=datang)return 'Waktu pulang tidak setelah waktu datang; perlu verifikasi.';
  return '';
}

function bukaPanelMonitoring_(){wajibPemilikIndex_();SpreadsheetApp.getUi().showModalDialog(keluaranPanelAplikasi_('Index').setWidth(1100).setHeight(780),"Monitoring Pelatihan");}
function navigasiPelatihan_(){return {url:typeof aplikasiPanitiaAktif_==='function'&&aplikasiPanitiaAktif_()?callbackGoogleAkses_():ScriptApp.getService().getUrl()||''};}
function pastikanProgramPeserta_(id){const found=tabelIndex_('Program',['id_program','nama_program']).records.filter(p=>String(p.id_program).trim()===String(id).trim());if(found.length!==1)throw new Error('Program tidak ditemukan atau duplikat.');return found[0];}
function bacaRegistriPeserta_(){
  const p=tabelIndex_('Peserta',['id_peserta','nip','nama_pegawai','unit_kerja','created_at','updated_at']);
  const k=tabelIndex_('Keikutsertaan',['id_keikutsertaan','id_program','id_peserta','unit_kerja_saat_pelatihan','status_keikutsertaan','created_at','updated_at']);
  const byNip=new Map(),byId=new Map(),byPair=new Map(),kid=new Set();const txt=v=>String(v==null?'':v).trim();
  p.records.forEach(r=>{const id=txt(r.id_peserta),nip=txt(r.nip);if(!id||byId.has(id))throw new Error('ID peserta kosong/duplikat pada database.');if(typeof r.nip==='number'&&!Number.isSafeInteger(r.nip))throw new Error('Ada NIP numerik yang tidak presisi pada sheet Peserta. Simpan ulang dari sumber aslinya sebagai teks.');if(!/^(?:\d{12}|\d{18})$/.test(nip)||byNip.has(nip))throw new Error('Ada NIP tidak valid/duplikat pada database Peserta. Perbaiki sebelum impor.');byNip.set(nip,r);byId.set(id,r);});
  k.records.forEach(r=>{const id=txt(r.id_keikutsertaan),pair=txt(r.id_program)+'|'+txt(r.id_peserta);if(!id||kid.has(id)||byPair.has(pair))throw new Error('Data keikutsertaan kosong/duplikat. Perbaiki sebelum impor.');if(!byId.has(txt(r.id_peserta)))throw new Error('Keikutsertaan merujuk peserta yang tidak ditemukan.');kid.add(id);byPair.set(pair,r);});
  return {p:p,k:k,byNip:byNip,byId:byId,byPair:byPair};
}
function normalNamaPeserta_(v){return String(v||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();}
function periksaBarisImporPeserta_(idProgram,rows,registry){
  const txt=v=>String(v==null?'':v).trim();const counts=new Map();rows.forEach(r=>{const nip=txt(r.nip);counts.set(nip,(counts.get(nip)||0)+1);});
  return rows.map((r,n)=>{
    const row={nomor:Number.isInteger(r.nomor)&&r.nomor>0?r.nomor:n+2,nip:txt(r.nip),nama:txt(r.nama),unit:txt(r.unit),nip_angka:Boolean(r.nip_angka),formula:Boolean(r.formula),status:'error',pesan:'',id_peserta:'',versi_peserta:'',versi_keikutsertaan:''};
    if(typeof r.nip!=='string'||row.nip_angka){row.pesan='NIP harus berupa teks 18 digit, bukan angka Excel. Ambil kembali NIP asli; mengubah format saja tidak memulihkan digit yang sudah berubah.';return row;}
    if(row.formula){row.pesan='Nama, NIP, dan unit harus berupa nilai, bukan formula.';return row;}
    if(!/^\d{18}$/.test(row.nip)){row.pesan='NIP harus berisi tepat 18 digit angka.';return row;}
    if(!row.nama||row.nama.length>200||!row.unit||row.unit.length>200||/^[=]/.test(row.nama)||/^[=]/.test(row.unit)){row.pesan='Nama dan unit wajib diisi, maksimal 200 karakter, dan tidak dimulai dengan tanda =.';return row;}
    if(counts.get(row.nip)>1){row.pesan='NIP muncul lebih dari sekali dalam file.';return row;}
    const old=registry.byNip.get(row.nip);
    if(!old){row.status='baru';row.pesan='Buat peserta baru dan daftarkan ke program.';return row;}
    row.id_peserta=txt(old.id_peserta);row.versi_peserta=versiBarisIndex_(old);
    if(normalNamaPeserta_(old.nama_pegawai)!==normalNamaPeserta_(row.nama)){row.pesan='NIP sudah ada dengan nama berbeda: '+txt(old.nama_pegawai)+'. Periksa identitas terlebih dahulu.';return row;}
    const link=registry.byPair.get(idProgram+'|'+row.id_peserta);
    if(link){row.status='lewati';row.versi_keikutsertaan=versiBarisIndex_(link);row.pesan='Sudah terdaftar pada program'+(link.id_jenjang?' di Jenjang '+txt(link.id_jenjang):'')+' (status: '+txt(link.status_keikutsertaan)+'). Tidak diubah atau dipindahkan.';}
    else{row.status='daftar';row.pesan=txt(old.unit_kerja)===row.unit?'Gunakan peserta lama dan tambahkan keikutsertaan.':'Gunakan peserta lama. Unit saat pelatihan mengikuti file; data master tidak diubah.';}
    return row;
  });
}
function pratinjauImporPesertaIndex(idProgram,rows,idJenjang){
  if(typeof wajibEndpointAkses_==='function')wajibEndpointAkses_('pratinjauImporPesertaIndex');
  wajibPemilikIndex_();idProgram=String(idProgram||'').trim();pastikanProgramPeserta_(idProgram);
  if(!Array.isArray(rows)||!rows.length||rows.length>1000)throw new Error('Unggah 1–1000 baris per impor.');
  const tujuan=kolomJenjangData_(idProgram,idJenjang);
  const checked=periksaBarisImporPeserta_(idProgram,rows,bacaRegistriPeserta_()),jumlah={baru:0,daftar:0,lewati:0,error:0};checked.forEach(r=>jumlah[r.status]++);
  return {sukses:true,id_program:idProgram,...tujuan,baris:checked,jumlah:jumlah};
}
function muatPesertaProgramIndex(idProgram,q,page,idJenjang){
  if(typeof wajibEndpointAkses_==='function')wajibEndpointAkses_('muatPesertaProgramIndex');
  wajibPemilikIndex_();idProgram=String(idProgram||'').trim();pastikanProgramPeserta_(idProgram);q=String(q||'').trim().toLowerCase();page=Math.max(0,Math.floor(Number(page)||0));
  const tujuan=typeof konteksJenjang_==='function'?konteksJenjang_(idProgram,idJenjang,false):{id:''};
  const r=bacaRegistriPeserta_(),all=r.k.records.filter(k=>String(k.id_program).trim()===idProgram&&(typeof dalamJenjangAkses_!=='function'||dalamJenjangAkses_(k))&&(!tujuan.id||String(k.id_jenjang).trim()===tujuan.id)).map(k=>{const p=r.byId.get(String(k.id_peserta).trim());return {id_jenjang:String(k.id_jenjang||''),jenjang:typeof konteksJenjang_==='function'?(tujuan.daftar.find(j=>j.id===String(k.id_jenjang).trim())||{}).nama||'':'',id_keikutsertaan:String(k.id_keikutsertaan),id_peserta:String(p.id_peserta),nama:String(p.nama_pegawai),nip:String(p.nip),unit:String(k.unit_kerja_saat_pelatihan||''),status:String(k.status_keikutsertaan||'')};});
  const filtered=all.filter(p=>(p.nama+' '+p.nip+' '+p.unit).toLowerCase().includes(q)).sort((a,b)=>a.nama.localeCompare(b.nama,'id'));
  return {sukses:true,total:all.length,jumlah_cocok:filtered.length,page:page,peserta:filtered.slice(page*50,page*50+50)};
}
function cariPesertaLamaIndex(q){
  if(typeof wajibEndpointAkses_==='function')wajibEndpointAkses_('cariPesertaLamaIndex');
  wajibPemilikIndex_();q=String(q||'').trim().toLowerCase();if(q.length<2)return {sukses:true,peserta:[]};
  const r=bacaRegistriPeserta_();return {sukses:true,peserta:r.p.records.filter(p=>(String(p.nama_pegawai)+' '+String(p.nip)).toLowerCase().includes(q)).slice(0,15).map(p=>({nama:String(p.nama_pegawai),nip:String(p.nip),unit:String(p.unit_kerja||'')}))};
}
function imporPesertaProgramIndex(d){
  if(typeof wajibEndpointAkses_==='function')wajibEndpointAkses_('imporPesertaProgramIndex');
  const petugas=wajibPemilikIndex_();if(!d||!Array.isArray(d.baris)||!d.baris.length||d.baris.length>20||!/^[a-zA-Z0-9_-]{16,100}$/.test(String(d.id_permintaan||''))||!Number.isInteger(d.batch)||d.batch<0||d.batch>49)throw new Error('Data batch impor tidak valid (maksimal 20 peserta per batch).');
  const idProgram=String(d.id_program||'').trim(),signature=versiBarisIndex_({id_program:idProgram,...kolomJenjangData_(idProgram,d.id_jenjang),baris:d.baris}),tx='IMPOR-PESERTA|'+d.id_permintaan+'|'+d.batch;
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    pastikanTidakAdaHapusTertunda_();
    pastikanProgramPeserta_(idProgram);const ss=databasePelatihan_();
    const a=tabelIndex_('Riwayat_Validasi',['id_riwayat','jenis_data','id_referensi','jenis_tindakan','kolom_diubah','nilai_sebelum','nilai_sesudah','alasan_perubahan','diubah_oleh','waktu_perubahan','id_transaksi_perubahan','status_transaksi']);
    const prior=a.records.filter(r=>r.id_transaksi_perubahan===tx);let plan;
    if(prior.length){try{plan=JSON.parse(prior.find(r=>r.status_transaksi==='PENDING').nilai_sesudah);}catch(e){throw new Error('Audit batch tidak lengkap; periksa Riwayat_Validasi.');}if(plan.sidik_input!==signature)throw new Error('ID batch digunakan untuk data berbeda.');if(prior[prior.length-1].status_transaksi==='SELESAI')return plan.hasil;}
    else{
      // Hindari batch baru menabrak impor program yang belum selesai.
      const statuses=new Map();a.records.filter(r=>r.jenis_data==='Impor_Peserta'&&String(r.id_referensi)===idProgram).forEach(r=>statuses.set(r.id_transaksi_perubahan,r.status_transaksi));if(Array.from(statuses.entries()).some(([id,status])=>id!==tx&&status!=='SELESAI'))throw new Error('Ada batch impor program ini yang belum selesai. Lanjutkan proses impor sebelumnya sebelum membuat impor baru.');
      const reg=bacaRegistriPeserta_(),checked=periksaBarisImporPeserta_(idProgram,d.baris,reg);
      const expected=d.baris;
      for(let i=0;i<checked.length;i++){
        const r=checked[i],old=expected[i];if(r.status==='error')throw new Error('Baris '+r.nomor+': '+r.pesan);
        if(r.status!==old.status||r.id_peserta!==String(old.id_peserta||'')||r.versi_peserta!==String(old.versi_peserta||'')||r.versi_keikutsertaan!==String(old.versi_keikutsertaan||''))throw new Error('Data berubah sejak pratinjau pada baris '+r.nomor+'. Buat pratinjau baru sebelum melanjutkan.');
      }
      const ps=reg.p.records.slice(),ks=reg.k.records.slice(),writes=[],checks=[],now=new Date(),counts={baru:0,daftar:0,lewati:0};
      for(const r of checked){
        counts[r.status]++;if(r.status==='lewati')continue;let id=r.id_peserta;
        if(r.status==='baru'){id=nomorIdKelola_(ps,'id_peserta','PST');const record={id_peserta:id,nip:r.nip,nama_pegawai:r.nama,unit_kerja:r.unit,created_at:now,updated_at:now};ps.push(record);writes.push({sheet:'Peserta',id_column:'id_peserta',record:record});}
        else checks.push({id_peserta:id,versi:r.versi_peserta});
        const idk=nomorIdKelola_(ks,'id_keikutsertaan','KST'),record={...kolomJenjangData_(idProgram,d.id_jenjang),id_keikutsertaan:idk,id_program:idProgram,id_peserta:id,unit_kerja_saat_pelatihan:r.unit,status_keikutsertaan:'terdaftar',created_at:now,updated_at:now};ks.push(record);writes.push({sheet:'Keikutsertaan',id_column:'id_keikutsertaan',record:record});
      }
      plan={sidik_input:signature,id_program:idProgram,...kolomJenjangData_(idProgram,d.id_jenjang),baris_asal:d.baris,writes:writes,checks:checks,hasil:{sukses:true,baru:counts.baru,daftar:counts.daftar,lewati:counts.lewati}};
      if(JSON.stringify(plan).length>45000)throw new Error('Isi batch terlalu panjang. Kurangi jumlah peserta atau panjang nama/unit.');
    }
    const as=ss.getSheetByName('Riwayat_Validasi');
    function audit(status){const r={id_riwayat:'RV-'+Utilities.getUuid(),jenis_data:'Impor_Peserta',id_referensi:idProgram,jenis_tindakan:'impor_peserta_program',kolom_diubah:JSON.stringify(['Peserta','Keikutsertaan']),nilai_sebelum:'null',nilai_sesudah:JSON.stringify(plan),alasan_perubahan:'Impor peserta program, batch '+(d.batch+1),diubah_oleh:petugas,waktu_perubahan:new Date(),id_transaksi_perubahan:tx,status_transaksi:status};as.appendRow(a.header.map(h=>r[h]===undefined?'':r[h]));SpreadsheetApp.flush();}
    // Preflight seluruh rencana termasuk retry setelah penulisan parsial.
    const registry=bacaRegistriPeserta_();for(const check of plan.checks){const p=registry.byId.get(check.id_peserta);if(!p||versiBarisIndex_(p)!==check.versi)throw new Error('Identitas peserta lama berubah saat proses impor. Periksa batch tertunda.');}
    const missing=[];for(const w of plan.writes){
      const t=tabelIndex_(w.sheet,Object.keys(w.record)),matches=t.records.filter(r=>String(r[w.id_column])===String(w.record[w.id_column]));
      if(matches.length){verifikasiWriteKelola_(w);continue;}
      if(w.sheet==='Peserta'&&registry.byNip.has(w.record.nip))throw new Error('NIP pada batch tertunda sudah digunakan peserta lain. Periksa manual.');
      if(w.sheet==='Keikutsertaan'&&registry.byPair.has(idProgram+'|'+w.record.id_peserta))throw new Error('Keikutsertaan batch tertunda sudah tercatat dengan ID lain. Periksa manual.');
      missing.push(w);
    }
    if(!prior.length)audit('PENDING');
    try{
      for(const name of ['Peserta','Keikutsertaan']){
        const items=missing.filter(w=>w.sheet===name);if(!items.length)continue;
        const sheet=ss.getSheetByName(name),t=tabelIndex_(name,[]),start=sheet.getLastRow()+1;
        if(name==='Peserta')sheet.getRange(start,t.header.indexOf('nip')+1,items.length,1).setNumberFormat('@');
        const rows=items.map(w=>t.header.map(h=>{const v=w.record[h];if(v===undefined)return '';if(['created_at','updated_at'].includes(h)&&typeof v==='string')return new Date(v);return v;}));
        sheet.getRange(start,1,rows.length,t.header.length).setValues(rows);SpreadsheetApp.flush();
      }
      plan.writes.forEach(verifikasiWriteKelola_);audit('SELESAI');
    }catch(e){try{audit('PERLU_PEMULIHAN');}catch(ignored){}throw new Error('Batch belum selesai. Klik Lanjutkan Impor dengan data yang sama agar tidak menggandakan peserta: '+e.message);}
    return plan.hasil;
  }finally{lock.releaseLock();}
}

function pulihkanImporPesertaIndex(idProgram){
  if(typeof wajibEndpointAkses_==='function')wajibEndpointAkses_('pulihkanImporPesertaIndex');
  wajibPemilikIndex_();idProgram=String(idProgram||'').trim();pastikanProgramPeserta_(idProgram);
  const a=tabelIndex_('Riwayat_Validasi',['jenis_data','id_referensi','id_transaksi_perubahan','status_transaksi','nilai_sesudah']).records;
  const tx=new Map();a.filter(r=>r.jenis_data==='Impor_Peserta'&&String(r.id_referensi)===idProgram).forEach(r=>tx.set(r.id_transaksi_perubahan,r));const errors=[];let total=0;
  for(const [id,r] of tx){if(r.status_transaksi==='SELESAI')continue;try{const m=String(id).match(/^IMPOR-PESERTA\|([a-zA-Z0-9_-]{16,100})\|(\d+)$/);if(!m)throw new Error('ID transaksi tidak dikenali.');const p=JSON.parse(r.nilai_sesudah);if(!Array.isArray(p.baris_asal))throw new Error('Rencana impor tidak lengkap.');imporPesertaProgramIndex({id_program:idProgram,id_jenjang:p.id_jenjang,id_permintaan:m[1],batch:Number(m[2]),baris:p.baris_asal});total++;}catch(e){errors.push(e.message);}}
  return {sukses:true,dipulihkan:total,masalah:errors,pesan:total+' batch dipulihkan.'+(errors.length?'\n'+errors.join('\n'):'')};
}

// Pemeriksaan hanya membaca; nomor baris merujuk posisi asli pada sheet.
function periksaDataIndex(opsi){
  if(typeof wajibEndpointAkses_==='function')wajibEndpointAkses_('periksaDataIndex');
  wajibPemilikIndex_();
  const ss=databasePelatihan_(),temuan=[],tables={},stats=[];
  const cakupan=opsi&&opsi.cakupan||'semua',programId=String(opsi&&opsi.id_program||'').trim();
  if(!['program','semua'].includes(cakupan))throw new Error('Cakupan pemeriksaan tidak valid.');
  if(cakupan==='program'&&!programId)throw new Error('Pilih program sebelum memeriksa.');
  const txt=v=>String(v==null?'':v).trim();
  const add=(tingkat,sheet,baris,id,masalah,saran)=>temuan.push({tingkat,sheet,baris,id,masalah,saran});
  const spec={Program:['id_program','nama_program','kategori_pelatihan','tanggal_mulai','tanggal_selesai'],Peserta:['id_peserta','nip','nama_pegawai','unit_kerja'],Keikutsertaan:['id_keikutsertaan','id_program','id_peserta','status_keikutsertaan'],Sesi:['id_sesi','id_program','nama_sesi','tanggal_sesi','jam_mulai','jam_selesai'],Kehadiran:['id_kehadiran','id_sesi','id_keikutsertaan','waktu_datang','waktu_pulang','waktu_datang_terverifikasi','waktu_pulang_terverifikasi'],Indikator_Perilaku:['id_indikator','kode_indikator'],Catatan_Perilaku:['id_catatan','id_keikutsertaan','id_sesi','id_indikator','cakupan_kejadian']};
  Object.keys(spec).forEach(name=>{
    const sheet=ss.getSheetByName(name),idKey=spec[name][0],rows=[],byId=new Map();
    tables[name]={rows,byId,ready:false};
    if(!sheet){add('masalah',name,'','','Sheet tidak ditemukan.','Pulihkan sheet beserta headernya.');return;}
    const values=sheet.getDataRange().getValues(),header=(values[0]||[]).map(txt);
    const missing=spec[name].filter(k=>!header.includes(k));
    const duplicate=header.filter((k,i)=>k&&header.indexOf(k)!==i);
    if(missing.length||duplicate.length){add('masalah',name,1,'','Header tidak sesuai: '+(missing.length?'kolom hilang '+missing.join(', '):'')+(duplicate.length?'; kolom duplikat '+Array.from(new Set(duplicate)).join(', '):''),'Perbaiki header sebelum memeriksa isi sheet.');return;}
    tables[name].ready=true;
    values.slice(1).forEach((r,i)=>{if(!r.some(v=>v!==''&&v!=null))return;const data={};header.forEach((h,j)=>{if(h)data[h]=r[j];});const item={data,baris:i+2};rows.push(item);const id=txt(data[idKey]);if(!id)add('masalah',name,i+2,'','ID utama kosong.','Periksa sumber data dan tentukan ID unik tanpa merusak referensi.');else if(byId.has(id)){add('masalah',name,i+2,id,'ID duplikat dengan baris '+byId.get(id).baris+'.','Periksa kedua record dan referensinya sebelum mengubah.');}else byId.set(id,item);});
    stats.push({sheet:name,jumlah:rows.length});
  });
  const required={Program:['nama_program','kategori_pelatihan','tanggal_mulai','tanggal_selesai'],Peserta:['nip','nama_pegawai','unit_kerja'],Keikutsertaan:['id_program','id_peserta','status_keikutsertaan'],Sesi:['id_program','nama_sesi','tanggal_sesi','jam_mulai','jam_selesai'],Kehadiran:['id_sesi','id_keikutsertaan'],Indikator_Perilaku:['kode_indikator'],Catatan_Perilaku:['id_keikutsertaan','id_indikator','cakupan_kejadian']};
  Object.keys(required).forEach(name=>tables[name].rows.forEach(r=>{const empty=required[name].filter(k=>!txt(r.data[k]));if(empty.length)add('masalah',name,r.baris,txt(r.data[spec[name][0]]),'Data wajib kosong: '+empty.join(', '),'Lengkapi berdasarkan sumber data.');}));
  const seenNip=new Map();tables.Peserta.rows.forEach(r=>{const d=r.data,nip=txt(d.nip),id=txt(d.id_peserta);if(!nip)return;if(typeof d.nip==='number'&&!Number.isSafeInteger(d.nip))add('masalah','Peserta',r.baris,id,'NIP numerik tidak presisi.','Masukkan ulang dari sumber asli sebagai teks; perubahan format saja tidak memulihkan digit.');else if(/^\d{12}$/.test(nip))add('informasi','Peserta',r.baris,id,'NIP dummy lama 12 digit.','Diizinkan sementara pada prototype; ganti dengan NIP asli sebelum penggunaan nyata.');else if(!/^\d{18}$/.test(nip))add('masalah','Peserta',r.baris,id,'NIP tidak terdiri dari 18 digit atau 12 digit dummy.','Periksa sumber NIP.');if(seenNip.has(nip))add('masalah','Peserta',r.baris,id,'NIP duplikat dengan '+seenNip.get(nip)+'.','Periksa identitas peserta; jangan hapus record yang sudah dirujuk.');else seenNip.set(nip,id);});
  function ref(name,r,key,target,optional){const value=txt(r.data[key]);if(!value&&optional)return;if(!tables[target].ready)return;if(value&&!tables[target].byId.has(value))add('masalah',name,r.baris,txt(r.data[spec[name][0]]),key+' merujuk ID yang tidak ditemukan: '+value,'Periksa relasi ke sheet '+target+'.');}
  tables.Keikutsertaan.rows.forEach(r=>{ref('Keikutsertaan',r,'id_program','Program');ref('Keikutsertaan',r,'id_peserta','Peserta');});
  tables.Sesi.rows.forEach(r=>ref('Sesi',r,'id_program','Program'));
  tables.Kehadiran.rows.forEach(r=>{ref('Kehadiran',r,'id_sesi','Sesi');ref('Kehadiran',r,'id_keikutsertaan','Keikutsertaan');const d=r.data,start=d.waktu_datang_terverifikasi||d.waktu_datang,end=d.waktu_pulang_terverifikasi||d.waktu_pulang;if(!start||!end)add('peringatan','Kehadiran',r.baris,txt(d.id_kehadiran),'Waktu datang/pulang belum lengkap.','Jika sesi masih berjalan, tunggu scan; jika selesai, lakukan verifikasi.');else if(start instanceof Date&&end instanceof Date&&end.getTime()<=start.getTime())add('masalah','Kehadiran',r.baris,txt(d.id_kehadiran),'Waktu pulang tidak setelah waktu datang.','Periksa tanggal dan jam melalui Koreksi.');});
  tables.Catatan_Perilaku.rows.forEach(r=>{ref('Catatan_Perilaku',r,'id_keikutsertaan','Keikutsertaan');ref('Catatan_Perilaku',r,'id_indikator','Indikator_Perilaku');ref('Catatan_Perilaku',r,'id_sesi','Sesi',true);});
  ['Kehadiran','Catatan_Perilaku'].forEach(name=>tables[name].rows.forEach(r=>{const d=r.data,s=tables.Sesi.byId.get(txt(d.id_sesi)),k=tables.Keikutsertaan.byId.get(txt(d.id_keikutsertaan));if(s&&k&&txt(s.data.id_program)!==txt(k.data.id_program))add('masalah',name,r.baris,txt(d[spec[name][0]]),'Sesi dan keikutsertaan berasal dari program berbeda.','Periksa ID sesi dan keikutsertaan.');}));
  function uniquePair(name,keys){const seen=new Map();tables[name].rows.forEach(r=>{if(keys.some(k=>!txt(r.data[k])))return;const key=JSON.stringify(keys.map(k=>txt(r.data[k])));if(seen.has(key))add('masalah',name,r.baris,txt(r.data[spec[name][0]]),'Kombinasi '+keys.join(' + ')+' duplikat dengan baris '+seen.get(key)+'.','Periksa kedua record beserta referensinya.');else seen.set(key,r.baris);});}
  uniquePair('Keikutsertaan',['id_program','id_peserta']);uniquePair('Kehadiran',['id_sesi','id_keikutsertaan']);
  if(cakupan==='program'){
    if(tables.Program.ready&&!tables.Program.byId.has(programId))throw new Error('Program tidak ditemukan. Muat ulang daftar program.');
    const relevant={},selected={};
    const select=(name,predicate)=>{selected[name]=tables[name].rows.filter(r=>predicate(r.data));relevant[name]=new Set(selected[name].map(r=>r.baris));return selected[name];};
    select('Program',d=>txt(d.id_program)===programId);
    const ikut=select('Keikutsertaan',d=>txt(d.id_program)===programId),sesi=select('Sesi',d=>txt(d.id_program)===programId);
    const kIds=new Set(ikut.map(r=>txt(r.data.id_keikutsertaan))),sIds=new Set(sesi.map(r=>txt(r.data.id_sesi))),pIds=new Set(ikut.map(r=>txt(r.data.id_peserta)));
    select('Peserta',d=>pIds.has(txt(d.id_peserta)));
    select('Kehadiran',d=>kIds.has(txt(d.id_keikutsertaan))||sIds.has(txt(d.id_sesi)));
    const notes=select('Catatan_Perilaku',d=>kIds.has(txt(d.id_keikutsertaan))||sIds.has(txt(d.id_sesi)));
    const iIds=new Set(notes.map(r=>txt(r.data.id_indikator)));
    select('Indikator_Perilaku',d=>iIds.has(txt(d.id_indikator)));
    const kept=temuan.filter(x=>!x.baris||x.baris===1||relevant[x.sheet]&&relevant[x.sheet].has(x.baris));
    temuan.length=0;kept.forEach(x=>temuan.push(x));
    stats.forEach(x=>x.jumlah=selected[x.sheet].length);
  }
  return {sukses:true,cakupan:cakupan,id_program:cakupan==='program'?programId:'',waktu:Utilities.formatDate(new Date(),ss.getSpreadsheetTimeZone(),'yyyy-MM-dd HH:mm:ss'),zona:ss.getSpreadsheetTimeZone(),ringkasan:stats,jumlah:{masalah:temuan.filter(x=>x.tingkat==='masalah').length,peringatan:temuan.filter(x=>x.tingkat==='peringatan').length,informasi:temuan.filter(x=>x.tingkat==='informasi').length},total:temuan.length,temuan:temuan.slice(0,1000)};
}

function konfigurasiEdit_(){const cfg={Indikator_Perilaku:{id:'id_indikator',fields:['definisi_indikator','jenis_indikator','poin_per_kejadian','status_indikator']},Program:{id:'id_program',fields:['nama_program','kategori_pelatihan','jenjang','tanggal_mulai','tanggal_selesai','status_program']},Sesi:{id:'id_sesi',fields:['nama_sesi','tanggal_sesi','jam_mulai','jam_selesai','status_jp']},Peserta:{id:'id_peserta',fields:['nama_pegawai','nip','unit_kerja']}};if(typeof bacaMentahJenjang_==='function'&&bacaMentahJenjang_('Jenjang',true)){cfg.Program.fields=cfg.Program.fields.filter(f=>f!=='jenjang');cfg.Jenjang={id:'id_jenjang',fields:['nama_jenjang']};}return cfg;}
function lokasiEdit_(jenis,id){
  const ss=databasePelatihan_(),spec=konfigurasiEdit_()[jenis];if(!spec)throw Error('Jenis data tidak didukung.');
  const table=tabelIndex_(jenis,[spec.id].concat(spec.fields)),sheet=ss.getSheetByName(jenis),values=sheet.getDataRange().getValues(),found=[];
  values.slice(1).forEach((row,n)=>{if(String(row[table.header.indexOf(spec.id)]).trim()===String(id).trim())found.push({row:row,nomor:n+2});});
  if(found.length!==1)throw Error('Data tidak ditemukan atau ID duplikat.');const record={};table.header.forEach((k,i)=>{if(k)record[k]=found[0].row[i];});
  return {sheet:sheet,header:table.header,record:record,nomor:found[0].nomor,spec:spec};
}
function snapshotEdit_(jenis,id){const x=lokasiEdit_(jenis,id),r={record:x.record};if(jenis==='Sesi')r.jeda=tabelIndex_('Jeda_Sesi',['id_jeda','id_sesi','jam_mulai_jeda','jam_selesai_jeda','keterangan']).records.filter(j=>String(j.id_sesi).trim()===String(id).trim());return r;}
function muatEditDataIndex(jenis,id){
  if(typeof wajibEndpointAkses_==='function')wajibEndpointAkses_('muatEditDataIndex');
  wajibPemilikIndex_();const s=snapshotEdit_(jenis,id),z=databasePelatihan_().getSpreadsheetTimeZone(),spec=konfigurasiEdit_()[jenis],values={};
  spec.fields.forEach(k=>{const v=s.record[k];values[k]=v instanceof Date?Utilities.formatDate(v,z,k.startsWith('tanggal_')?'yyyy-MM-dd':'HH:mm:ss'):String(v==null?'':v);});
  return {sukses:true,jenis:jenis,id:String(id),versi:versiBarisIndex_(s),values:values,jeda:(s.jeda||[]).map(j=>({mulai:j.jam_mulai_jeda instanceof Date?Utilities.formatDate(j.jam_mulai_jeda,z,'HH:mm:ss'):String(j.jam_mulai_jeda),selesai:j.jam_selesai_jeda instanceof Date?Utilities.formatDate(j.jam_selesai_jeda,z,'HH:mm:ss'):String(j.jam_selesai_jeda),keterangan:String(j.keterangan||'')})),zona:z};
}
function blokirEditTertunda_(){
  const a=tabelIndex_('Riwayat_Validasi',['id_transaksi_perubahan','jenis_tindakan','status_transaksi']).records,m=new Map();a.filter(r=>r.jenis_tindakan==='edit_data').forEach(r=>m.set(String(r.id_transaksi_perubahan),r.status_transaksi));
  if(Array.from(m.values()).some(v=>v!=='SELESAI'))throw Error('Ada edit data belum selesai. Pulihkan Edit Tertunda pada halaman Pengelolaan terlebih dahulu.');
}
function jalankanRencanaEdit_(plan,tx,petugas){
  const ss=databasePelatihan_(),z=ss.getSpreadsheetTimeZone();
  function locate(w){const sheet=ss.getSheetByName(w.sheet),v=sheet.getDataRange().getValues(),h=v[0].map(String),at=h.indexOf(w.key);if(at<0)throw Error('Kolom ID hilang: '+w.sheet);const rows=[];v.slice(1).forEach((r,i)=>{if(String(r[at]).trim()===String(w.id))rows.push({r,n:i+2});});if(rows.length>1)throw Error('ID duplikat pada '+w.sheet);return {sheet,h,item:rows[0]};}
  function same(x,record){return x.item&&!cocokRecordKelola_(x.item.r,x.h,record,z).length;}
  // Periksa seluruh target sebelum melanjutkan transaksi parsial.
  plan.writes.forEach(w=>{const x=locate(w);if(w.after&&same(x,w.after))return;if(!w.after&&!x.item)return;if(w.before?same(x,w.before):!x.item)return;if(w.before&&w.after&&x.item&&Object.keys(w.after).every(k=>!cocokRecordKelola_(x.item.r,x.h,{[k]:w.before[k]},z).length||!cocokRecordKelola_(x.item.r,x.h,{[k]:w.after[k]},z).length))return;throw Error('Data berubah di luar transaksi: '+w.sheet+' '+w.id);});
  plan.writes.forEach(w=>{const x=locate(w);if(w.after&&same(x,w.after)||!w.after&&!x.item)return;
    if(!w.after){x.sheet.deleteRow(x.item.n);return;}
    if(w.sheet==='Peserta'){const c=x.h.indexOf('nip');if(c>=0)x.sheet.getRange(x.item?x.item.n:x.sheet.getLastRow()+1,c+1).setNumberFormat('@');}
    if(x.item){Object.keys(w.patch).forEach(k=>{const c=x.h.indexOf(k);if(c<0)throw Error('Kolom hilang: '+k);x.sheet.getRange(x.item.n,c+1).setValue(w.after[k]);});}
    else{x.sheet.appendRow(x.h.map(k=>w.after[k]===undefined?'':w.after[k]));}
  });SpreadsheetApp.flush();
  plan.writes.forEach(w=>{const x=locate(w);if(w.after?!same(x,w.after):Boolean(x.item))throw Error('Verifikasi simpan gagal: '+w.sheet+' '+w.id);});
  tulisRiwayatEdit_(plan,tx,'SELESAI',petugas);return {sukses:true,pesan:plan.pesan};
}
function tulisRiwayatEdit_(plan,tx,status,petugas){
  const a=tabelIndex_('Riwayat_Validasi',['id_riwayat','jenis_data','id_referensi','jenis_tindakan','kolom_diubah','nilai_sebelum','nilai_sesudah','alasan_perubahan','diubah_oleh','waktu_perubahan','id_transaksi_perubahan','status_transaksi']);
  const r={id_riwayat:'RV-'+Utilities.getUuid(),jenis_data:plan.jenis,id_referensi:plan.id,jenis_tindakan:'edit_data',kolom_diubah:JSON.stringify(plan.writes.map(w=>({sheet:w.sheet,id:w.id,kolom:Object.keys(w.patch||{})}))),nilai_sebelum:JSON.stringify(plan.writes.map(w=>({sheet:w.sheet,id:w.id,record:w.before}))),nilai_sesudah:JSON.stringify(plan),alasan_perubahan:plan.alasan,diubah_oleh:petugas,waktu_perubahan:new Date(),id_transaksi_perubahan:tx,status_transaksi:status};
  if(String(r.nilai_sebelum).length>45000||String(r.nilai_sesudah).length>45000||String(r.kolom_diubah).length>45000)throw Error('Perubahan terlalu besar untuk satu transaksi prototype.');ssEditAppend_(a.header,r);SpreadsheetApp.flush();
}
function bacaRencanaEdit_(json){const plan=JSON.parse(json);plan.writes.forEach(w=>['before','after','patch'].forEach(key=>{if(!w[key])return;Object.keys(w[key]).forEach(k=>{const v=w[key][k];if(typeof v==='string'&&/^(?:tanggal_|jam_|waktu_|created_at$|updated_at$)|_pada$/.test(k)&&/^\d{4}-\d{2}-\d{2}T.*Z$/.test(v))w[key][k]=new Date(v);});}));return plan;}
function ssEditAppend_(header,r){databasePelatihan_().getSheetByName('Riwayat_Validasi').appendRow(header.map(k=>r[k]===undefined?'':r[k]));}
function simpanEditDataIndex(d){
  if(typeof wajibEndpointAkses_==='function')wajibEndpointAkses_('simpanEditDataIndex');
  const petugas=wajibPemilikIndex_();if(!d||!/^[a-zA-Z0-9_-]{16,100}$/.test(String(d.id_permintaan||'')))throw Error('Permintaan edit tidak valid.');
  const lock=LockService.getScriptLock();lock.waitLock(30000);try{
    pastikanTidakAdaHapusTertunda_();
    const tx='EDIT|'+d.id_permintaan,logs=tabelIndex_('Riwayat_Validasi',['id_transaksi_perubahan','status_transaksi','nilai_sesudah']).records.filter(a=>a.id_transaksi_perubahan===tx);
    const signature=JSON.stringify(d);
    if(logs.length){const plan=bacaRencanaEdit_(logs[0].nilai_sesudah);if(plan.signature!==signature)throw Error('ID permintaan sudah digunakan untuk isi berbeda.');if(logs[logs.length-1].status_transaksi==='SELESAI')return {sukses:true,pesan:plan.pesan};return jalankanRencanaEdit_(plan,tx,petugas);}
    blokirEditTertunda_();const spec=konfigurasiEdit_()[d.jenis];if(!spec)throw Error('Jenis tidak valid.');
    const snap=snapshotEdit_(d.jenis,d.id);if(versiBarisIndex_(snap)!==d.versi)throw Error('Data berubah. Tutup formulir, muat ulang, lalu edit kembali.');
    const alasan=String(d.alasan||'').trim();if(!alasan||alasan.length>2000)throw Error('Alasan wajib diisi, maksimal 2.000 karakter.');
    const ss=databasePelatihan_(),z=ss.getSpreadsheetTimeZone(),old=snap.record,patch={},now=new Date(),txt=v=>String(v==null?'':v).trim();
    const val={};spec.fields.forEach(k=>{val[k]=txt(d.values&&d.values[k]);if(val[k].length>(k==='definisi_indikator'?2000:200)||/^[=]/.test(val[k]))throw Error('Nilai '+k+' tidak valid.');});
    spec.fields.filter(k=>k!=='jenjang').forEach(k=>{if(!val[k])throw Error(k+' wajib diisi.');});
    Object.assign(patch,val);
    if(d.jenis==='Indikator_Perilaku'){
      const n=Number(val.poin_per_kejadian);if(!['positif','negatif'].includes(val.jenis_indikator)||!['aktif','nonaktif'].includes(val.status_indikator)||!Number.isFinite(n)||Math.abs(n)>1000||(val.jenis_indikator==='positif'&&n<0)||(val.jenis_indikator==='negatif'&&n>0))throw Error('Jenis, status, atau poin indikator tidak valid.');
      const used=tabelIndex_('Catatan_Perilaku',['id_indikator']).records.some(r=>txt(r.id_indikator)===txt(d.id));
      const ruleUsed=tabelIndex_('Aturan_Penilaian',['konfigurasi_indikator']).records.some(r=>{try{return Object.prototype.hasOwnProperty.call(JSON.parse(String(r.konfigurasi_indikator)),txt(old.kode_indikator));}catch(e){throw Error('Konfigurasi aturan penilaian tidak valid. Periksa sheet Aturan_Penilaian.');}});
      if((used||ruleUsed)&&(val.definisi_indikator!==txt(old.definisi_indikator)||val.jenis_indikator!==txt(old.jenis_indikator)))throw Error('Definisi dan jenis indikator yang sudah digunakan pada catatan/aturan tidak dapat diubah. Buat kode baru untuk perubahan makna.');
      const base=aturanPerilakuDefault_().indikator[txt(old.kode_indikator)];if(base!==undefined&&val.jenis_indikator!==(base>=0?'positif':'negatif'))throw Error('Jenis indikator bawaan tidak dapat diubah.');
      if(txt(old.kode_indikator)==='IZIN_SESI'&&val.status_indikator!=='aktif')throw Error('IZIN_SESI harus tetap aktif untuk pencatatan izin.');
      if(val.status_indikator==='aktif'&&tabelIndex_('Indikator_Perilaku',['id_indikator','kode_indikator','status_indikator']).records.some(r=>txt(r.id_indikator)!==txt(d.id)&&txt(r.kode_indikator)===txt(old.kode_indikator)&&txt(r.status_indikator)==='aktif'))throw Error('Sudah ada versi aktif untuk kode ini.');
      patch.poin_per_kejadian=n;
    }
    if(d.jenis==='Jenjang'){if(val.nama_jenjang.length>100||tabelIndex_('Jenjang',['id_jenjang','id_program','nama_jenjang']).records.some(j=>txt(j.id_jenjang)!==txt(d.id)&&txt(j.id_program)===txt(old.id_program)&&txt(j.nama_jenjang).toLowerCase()===val.nama_jenjang.toLowerCase()))throw Error('Nama Jenjang terlalu panjang atau sudah digunakan pada program ini.');}
    if(d.jenis==='Peserta'){
      if(!/^\d{18}$/.test(val.nip)&&!(val.nip===txt(old.nip)&&/^\d{12}$/.test(val.nip)))throw Error('NIP baru wajib teks 18 digit. NIP dummy lama boleh dipertahankan.');
      if(tabelIndex_('Peserta',['id_peserta','nip']).records.some(r=>txt(r.id_peserta)!==txt(d.id)&&txt(r.nip)===val.nip))throw Error('NIP sudah digunakan peserta lain.');
    }
    if(d.jenis==='Program'){
      if(!['draft','aktif','selesai'].includes(val.status_program))throw Error('Status program tidak valid.');
      const a=tanggalKelola_(val.tanggal_mulai,z),b=tanggalKelola_(val.tanggal_selesai,z);if(b<a)throw Error('Tanggal selesai mendahului mulai.');
      tabelIndex_('Sesi',['id_program','tanggal_sesi']).records.filter(r=>txt(r.id_program)===txt(d.id)).forEach(r=>{const t=tanggalKelola_(r.tanggal_sesi,z);if(t<a||t>b)throw Error('Rentang program tidak mencakup seluruh sesi yang sudah ada.');});
      patch.tanggal_mulai=parseWaktuAbsensiManual_(a+' 00:00',z);patch.tanggal_selesai=parseWaktuAbsensiManual_(b+' 00:00',z);
    }
    const writes=[];function write(sheet,key,before,change){writes.push({sheet,key,id:txt(before[key]),before:before,patch:change,after:Object.assign({},before,change)});}
    let dampak=false;
    if(d.jenis==='Sesi'){
      if(!['dihitung','tidak_dihitung'].includes(val.status_jp)||!Array.isArray(d.jeda)||d.jeda.length>20)throw Error('Status JP atau jumlah jeda tidak valid.');
      const t=tanggalKelola_(val.tanggal_sesi,z),a=waktuJadwalJP_(t,val.jam_mulai,z),b=waktuJadwalJP_(t,val.jam_selesai,z);if(b<=a)throw Error('Jam selesai harus setelah jam mulai.');
      const prog=lokasiEdit_('Program',old.id_program).record;if(t<tanggalKelola_(prog.tanggal_mulai,z)||t>tanggalKelola_(prog.tanggal_selesai,z))throw Error('Tanggal sesi di luar rentang program.');
      const ranges=d.jeda.map(j=>{const x=waktuJadwalJP_(t,j.mulai,z),y=waktuJadwalJP_(t,j.selesai,z);if(x<a||y>b||y<=x||txt(j.keterangan).length>200||/^[=]/.test(txt(j.keterangan)))throw Error('Jeda tidak valid atau berada di luar sesi.');return [x,y];}).sort((x,y)=>x[0]-y[0]);
      ranges.forEach((r,i)=>{if(i&&r[0]<ranges[i-1][1])throw Error('Jeda bertumpang tindih.');});
      patch.tanggal_sesi=parseWaktuAbsensiManual_(t+' 00:00',z);
      const oldRanges=snap.jeda.map(j=>[waktuJadwalJP_(t,j.jam_mulai_jeda,z),waktuJadwalJP_(t,j.jam_selesai_jeda,z)]).sort((x,y)=>x[0]-y[0]);
      dampak=t!==tanggalKelola_(old.tanggal_sesi,z)||a!==waktuJadwalJP_(t,old.jam_mulai,z)||b!==waktuJadwalJP_(t,old.jam_selesai,z)||val.status_jp!==txt(old.status_jp)||JSON.stringify(oldRanges)!==JSON.stringify(ranges);
      if(dampak){
        const jeda=ranges.reduce((n,r)=>n+(r[1]-r[0])/60000,0);Object.assign(patch,{durasi_rencana_menit:(b-a)/60000,durasi_jeda_menit:jeda,durasi_efektif_menit:(b-a)/60000-jeda,jp_rencana:'',status_pemeriksaan:'belum_diperiksa',status_validasi_realisasi:'belum_divalidasi'});
        const kehadiran=tabelIndex_('Kehadiran',['id_kehadiran','id_sesi','status_perhitungan_ulang','alasan_perhitungan_ulang','updated_at']).records.filter(r=>txt(r.id_sesi)===txt(d.id));
        kehadiran.forEach(r=>write('Kehadiran','id_kehadiran',r,{status_perhitungan_ulang:'menunggu_perhitungan',alasan_perhitungan_ulang:'Jadwal/jeda sesi diubah: '+alasan,updated_at:now}));
      }
      const jt=tabelIndex_('Jeda_Sesi',['id_jeda','id_sesi','jam_mulai_jeda','jam_selesai_jeda','durasi_jeda_menit','keterangan','updated_at','created_at','status_validasi_jeda']);const ids=jt.records.slice();
      d.jeda.forEach((j,i)=>{const prev=snap.jeda[i],id=prev?txt(prev.id_jeda):nomorIdKelola_(ids,'id_jeda','JDA');if(!prev)ids.push({id_jeda:id});const change={jam_mulai_jeda:txt(j.mulai),jam_selesai_jeda:txt(j.selesai),keterangan:txt(j.keterangan)};
        const check=prev?cocokRecordKelola_(jt.header.map(k=>prev[k]),jt.header,change,z):['baru'];if(!check.length)return;
        Object.assign(change,{durasi_jeda_menit:(waktuJadwalJP_(t,j.selesai,z)-waktuJadwalJP_(t,j.mulai,z))/60000,status_validasi_jeda:'belum_divalidasi',updated_at:now});
        if(prev)write('Jeda_Sesi','id_jeda',prev,change);else writes.push({sheet:'Jeda_Sesi',key:'id_jeda',id:id,before:null,patch:change,after:Object.assign({id_jeda:id,id_sesi:txt(d.id),created_at:now},change)});
      });
      snap.jeda.slice(d.jeda.length).forEach(r=>writes.push({sheet:'Jeda_Sesi',key:'id_jeda',id:txt(r.id_jeda),before:r,patch:{},after:null}));
    }
    const actual=cocokRecordKelola_(Object.keys(old).map(k=>old[k]),Object.keys(old),patch,z);if(!actual.length&&!writes.length)return {sukses:true,pesan:'Tidak ada perubahan data.'};
    patch.updated_at=now;const loc=lokasiEdit_(d.jenis,d.id);Object.keys(patch).forEach(k=>{if(!loc.header.includes(k))throw Error('Kolom '+k+' belum tersedia.');});write(d.jenis,spec.id,old,patch);
    const plan={jenis:d.jenis,id:txt(d.id),alasan,signature,writes,pesan:'Perubahan '+d.jenis+' '+d.id+' tersimpan beserta riwayat.'+(dampak?' JP perlu dihitung ulang dan JP rencana perlu dikonfirmasi kembali.':'')};
    plan.writes.forEach(w=>{const tab=tabelIndex_(w.sheet,[w.key].concat(Object.keys(w.patch)));if(tab.header.filter(Boolean).length!==new Set(tab.header.filter(Boolean)).size)throw Error('Header duplikat pada '+w.sheet);});
    const pending=new Map();tabelIndex_('Riwayat_Validasi',['jenis_data','id_referensi','id_transaksi_perubahan','status_transaksi']).records.forEach(r=>{if(r.id_transaksi_perubahan)pending.set(r.id_transaksi_perubahan,r);});
    const affected=new Set(plan.writes.map(w=>w.sheet+'|'+w.id));if(d.jenis==='Sesi')affected.add('Program|'+txt(old.id_program));
    if(Array.from(pending.values()).some(r=>r.status_transaksi!=='SELESAI'&&affected.has(r.jenis_data+'|'+txt(r.id_referensi))))throw Error('Ada transaksi tertunda pada data terkait. Periksa dan pulihkan terlebih dahulu.');
    tulisRiwayatEdit_(plan,tx,'PENDING',petugas);
    try{return jalankanRencanaEdit_(plan,tx,petugas);}catch(e){throw Error('Edit belum terkonfirmasi. Gunakan Pulihkan Edit Tertunda. '+e.message);}
  }finally{lock.releaseLock();}
}
function pulihkanEditDataIndex(){
  if(typeof wajibEndpointAkses_==='function')wajibEndpointAkses_('pulihkanEditDataIndex');
  const petugas=wajibPemilikIndex_(),lock=LockService.getScriptLock();lock.waitLock(30000);try{
    pastikanTidakAdaHapusTertunda_();
    const logs=tabelIndex_('Riwayat_Validasi',['jenis_tindakan','id_transaksi_perubahan','status_transaksi','nilai_sesudah']).records.filter(r=>r.jenis_tindakan==='edit_data'),latest=new Map();logs.forEach(r=>latest.set(r.id_transaksi_perubahan,r));let count=0;
    latest.forEach((r,tx)=>{if(r.status_transaksi!=='SELESAI'){jalankanRencanaEdit_(bacaRencanaEdit_(r.nilai_sesudah),tx,petugas);count++;}});return {sukses:true,pesan:count+' transaksi edit dipulihkan. Data yang berbeda dari rencana tidak ditimpa.'};
  }finally{lock.releaseLock();}
}

function folderBuktiPelatihan_(){
  const ss=databasePelatihan_(),props=PropertiesService.getScriptProperties(),key='FOLDER_BUKTI|'+ss.getId(),id=props.getProperty(key);
  if(id){const f=DriveApp.getFolderById(id);if(f.isTrashed())throw Error('Folder bukti ada di Sampah. Pulihkan folder terlebih dahulu.');return f;}
  const f=DriveApp.createFolder('Bukti Monitoring Pelatihan - '+ss.getName());props.setProperty(key,f.getId());return f;
}
function siapkanPenyimpananBukti(){
  if(typeof wajibEndpointAkses_==='function')wajibEndpointAkses_('siapkanPenyimpananBukti');wajibPemilikIndex_();const lock=LockService.getScriptLock();lock.waitLock(30000);try{
    pastikanTidakAdaHapusTertunda_();return {sukses:true,pesan:'Folder bukti siap. Sistem tidak mengaktifkan berbagi publik.',url:folderBuktiPelatihan_().getUrl()};}finally{lock.releaseLock();}}
function targetBukti_(d){
  const txt=v=>String(v||'').trim();
  if(d.jenis==='izin'){const t=tabelIndex_('Kehadiran',['id_kehadiran']).records.filter(r=>txt(r.id_kehadiran)===txt(d.id_kehadiran));if(t.length!==1)throw Error('Kehadiran untuk lampiran tidak ditemukan atau duplikat.');return 'IZIN|'+txt(d.id_kehadiran);}
  if(d.jenis==='perilaku'){
    const s=tabelIndex_('Sesi',['id_sesi','id_program']).records.filter(r=>txt(r.id_sesi)===txt(d.id_sesi));if(s.length!==1)throw Error('Sesi untuk lampiran tidak ditemukan.');
    const k=tabelIndex_('Keikutsertaan',['id_keikutsertaan','id_program','status_keikutsertaan']).records.filter(r=>txt(r.id_keikutsertaan)===txt(d.id_keikutsertaan)&&txt(r.id_program)===txt(s[0].id_program)&&sesuaiJenjang_(s[0],r)&&txt(r.status_keikutsertaan).toLowerCase()==='terdaftar');if(k.length!==1)throw Error('Peserta lampiran tidak terdaftar aktif pada program sesi.');
    return 'PERILAKU|'+txt(d.id_sesi)+'|'+txt(d.id_keikutsertaan);
  }throw Error('Jenis lampiran tidak valid.');
}
function unggahBuktiIndex(d){
  if(typeof wajibEndpointAkses_==='function')wajibEndpointAkses_('unggahBuktiIndex');
  wajibPemilikIndex_();if(!d||!/^[a-zA-Z0-9_-]{16,100}$/.test(String(d.id_permintaan||'')))throw Error('ID unggahan tidak valid.');
  const text=String(d.base64||''),max=5*1024*1024;if(!text||text.length>Math.ceil(max/3)*4||!/^[A-Za-z0-9+/]*={0,2}$/.test(text))throw Error('File kosong, rusak, atau melebihi 5 MB.');
  const bytes=Utilities.base64Decode(text);if(!bytes.length||bytes.length>max)throw Error('Maksimal ukuran file 5 MB.');const b=bytes.slice(0,8).map(x=>(x+256)%256),ext=String(d.nama||'').toLowerCase().match(/\.([a-z0-9]+)$/);let mime='';
  if(b[0]===37&&b[1]===80&&b[2]===68&&b[3]===70&&b[4]===45)mime='application/pdf';
  else if(b[0]===255&&b[1]===216&&b[2]===255)mime='image/jpeg';
  else if(b.slice(0,8).join(',')==='137,80,78,71,13,10,26,10')mime='image/png';
  const extensions={'application/pdf':['pdf'],'image/jpeg':['jpg','jpeg'],'image/png':['png']};if(!mime||!ext||!extensions[mime].includes(ext[1]))throw Error('Format isi dan ekstensi file harus sesuai: PDF, JPG/JPEG, atau PNG.');
  const lock=LockService.getScriptLock();lock.waitLock(30000);try{
    pastikanTidakAdaHapusTertunda_();
    const target=targetBukti_(d),hash=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,bytes).map(x=>('0'+((x+256)%256).toString(16)).slice(-2)).join(''),folder=folderBuktiPelatihan_();
    const name='BUKTI_'+d.id_permintaan+'.'+ext[1],found=folder.getFilesByName(name);let file=null;
    while(found.hasNext()){const f=found.next();if(file)throw Error('ID unggahan duplikat dalam folder bukti.');file=f;}
    const desc=JSON.stringify({schema:'bukti_v1',target:target,sha256:hash,nama:String(d.nama||'').slice(0,180)});
    if(file){if(file.isTrashed()||file.getDescription()!==desc)throw Error('ID unggahan sudah digunakan untuk file atau peserta berbeda. Pilih ulang file.');}
    else{file=folder.createFile(Utilities.newBlob(bytes,mime,name));file.setDescription(desc);}
    return {sukses:true,id:file.getId(),url:'https://drive.google.com/file/d/'+file.getId()+'/view',nama:String(d.nama||'').slice(0,180)};
  }finally{lock.releaseLock();}
}
function buktiDenganLampiran_(text,id,target){
  text=String(text||'').trim();if(text.length>2000)throw Error('Keterangan bukti maksimal 2.000 karakter.');if(!id)return text;
  if(!/^[A-Za-z0-9_-]{10,150}$/.test(String(id)))throw Error('ID file bukti tidak valid.');
  const ss=databasePelatihan_(),folderId=PropertiesService.getScriptProperties().getProperty('FOLDER_BUKTI|'+ss.getId());if(!folderId)throw Error('Folder bukti belum disiapkan.');
  const file=DriveApp.getFileById(String(id));if(file.isTrashed())throw Error('File bukti ada di Sampah.');let validFolder=false;const parents=file.getParents();while(parents.hasNext())if(parents.next().getId()===folderId)validFolder=true;
  let meta;try{meta=JSON.parse(file.getDescription());}catch(e){throw Error('Metadata file bukti tidak valid.');}
  if(!validFolder||meta.schema!=='bukti_v1'||meta.target!==target)throw Error('File bukti tidak sesuai peserta atau sesi.');
  return (text?text+'\n':'')+'Lampiran: https://drive.google.com/file/d/'+id+'/view';
}

function katalogIndikator_(){
  const t=tabelIndex_('Indikator_Perilaku',['id_indikator','kode_indikator','definisi_indikator','jenis_indikator','poin_per_kejadian','status_indikator']),txt=v=>String(v==null?'':v).trim();
  const list=t.records.map(r=>({id:txt(r.id_indikator),kode:txt(r.kode_indikator),definisi:txt(r.definisi_indikator),jenis:txt(r.jenis_indikator).toLowerCase(),status:txt(r.status_indikator).toLowerCase(),poin:r.poin_per_kejadian===''||r.poin_per_kejadian==null?null:Number(r.poin_per_kejadian),versi:versiBarisIndex_({record:r})}));
  return {indikator:list,versi:versiBarisIndex_(t.records)};
}
function validasiPoinKatalog_(cfg,katalog,previous){
  const active=new Map();katalog.indikator.filter(i=>i.status==='aktif').forEach(i=>{if(active.has(i.kode))throw Error('Lebih dari satu indikator aktif memakai kode '+i.kode+'.');active.set(i.kode,i);});
  active.forEach((i,k)=>{if(!/^[A-Z][A-Z0-9_]{1,79}$/.test(k)||!['positif','negatif'].includes(i.jenis))throw Error('Lengkapi kode/jenis indikator '+i.id+' melalui Kelola Indikator.');if(!Object.prototype.hasOwnProperty.call(cfg.indikator,k))throw Error('Isi poin untuk indikator aktif '+k+'.');const n=cfg.indikator[k];if(!Number.isFinite(n)||(i.jenis==='positif'&&n<0)||(i.jenis==='negatif'&&n>0))throw Error('Tanda poin tidak sesuai jenis '+k+'.');});
  Object.keys(cfg.indikator).forEach(k=>{const meta=active.get(k)||katalog.indikator.find(i=>i.kode===k);if(meta&&((meta.jenis==='negatif'&&cfg.indikator[k]>0)||(meta.jenis==='positif'&&cfg.indikator[k]<0)))throw Error('Tanda poin tidak sesuai jenis '+k);if(!meta&&!Object.prototype.hasOwnProperty.call(aturanPerilakuDefault_().indikator,k)&&!(previous&&Object.prototype.hasOwnProperty.call(previous.cfg.indikator,k)))throw Error('Kode indikator belum terdaftar: '+k);});
  if(previous)Object.keys(previous.cfg.indikator).forEach(k=>{if(!Object.prototype.hasOwnProperty.call(cfg.indikator,k))throw Error('Poin indikator lama '+k+' harus dipertahankan untuk riwayat.');});
}
function tambahIndikatorIndex(d){
  if(typeof wajibEndpointAkses_==='function')wajibEndpointAkses_('tambahIndikatorIndex');
  wajibPemilikIndex_();if(!d)throw Error('Data indikator tidak tersedia.');const txt=v=>String(v==null?'':v).trim();
  const input={kode:txt(d.kode).toUpperCase(),definisi:txt(d.definisi),jenis:txt(d.jenis),poin:Number(d.poin),alasan:txt(d.alasan),status:txt(d.status||'aktif')};
  if(!['aktif','nonaktif'].includes(input.status)||!/^[A-Z][A-Z0-9_]{1,79}$/.test(input.kode)||!input.definisi||input.definisi.length>2000||input.definisi.startsWith('=')||!['positif','negatif'].includes(input.jenis)||d.poin===''||!Number.isFinite(input.poin)||Math.abs(input.poin)>1000||(input.jenis==='positif'&&input.poin<0)||(input.jenis==='negatif'&&input.poin>0)||!input.alasan||input.alasan.length>2000)throw Error('Kode, definisi, jenis, poin bertanda sesuai jenis, dan alasan wajib valid.');
  if(!/^[a-zA-Z0-9_-]{16,100}$/.test(txt(d.id_permintaan)))throw Error('ID permintaan tidak valid.');
  const lock=LockService.getScriptLock();lock.waitLock(30000);try{
    pastikanTidakAdaHapusTertunda_();blokirEditTertunda_();const recovered=pulihkanTambahIndikator_(txt(d.id_permintaan),input);if(recovered)return recovered;return pembuatanKelola_('Indikator_Perilaku',input,txt(d.id_permintaan),()=>{
    const t=tabelIndex_('Indikator_Perilaku',['id_indikator','kode_indikator']);if(t.records.some(r=>txt(r.kode_indikator).toUpperCase()===input.kode))throw Error('Kode indikator sudah ada. Gunakan Edit pada indikator tersebut.');
    const id=nomorIdKelola_(t.records,'id_indikator','IND'),now=new Date(),record={id_indikator:id,kode_indikator:input.kode,nomor_versi:1,id_versi_sebelumnya:'',definisi_indikator:input.definisi,parameter_penilaian:'Per kejadian yang disetujui',berlaku_mulai:now,berlaku_sampai:'',jenis_indikator:input.jenis,konteks_penerapan:'sesi',metode_perhitungan:'per_kejadian',poin_per_kejadian:input.poin,status_indikator:input.status,keterangan:input.alasan,created_at:now,updated_at:now};
    return {id,writes:[{sheet:'Indikator_Perilaku',id_column:'id_indikator',record}],hasil:{pesan:'Indikator '+input.kode+' ditambahkan. Periksa dan simpan poin pada aturan program sebelum digunakan untuk penilaian.'},alasan:input.alasan};
  });}finally{lock.releaseLock();}
}
function pulihkanTambahIndikator_(request,input){
  const tx='BUAT-Indikator_Perilaku|'+request,a=tabelIndex_('Riwayat_Validasi',['id_riwayat','jenis_data','id_referensi','jenis_tindakan','nilai_sesudah','id_transaksi_perubahan','status_transaksi']),logs=a.records.filter(r=>r.id_transaksi_perubahan===tx);
  const latest=new Map();a.records.filter(r=>r.jenis_data==='Indikator_Perilaku').forEach(r=>latest.set(r.id_transaksi_perubahan,r));
  if(Array.from(latest.values()).some(r=>r.id_transaksi_perubahan!==tx&&r.status_transaksi!=='SELESAI'))throw Error('Ada transaksi indikator tertunda. Ulangi penyimpanan awal atau periksa riwayat dahulu.');
  if(!logs.length)return null;const first=logs.find(r=>r.status_transaksi==='PENDING');if(!first)throw Error('Audit indikator tidak lengkap.');const plan=JSON.parse(first.nilai_sesudah);if(plan.sidik_input!==versiBarisIndex_(input))throw Error('ID permintaan dipakai untuk data berbeda.');
  if(logs[logs.length-1].status_transaksi==='SELESAI')return plan.hasil;
  if(!Array.isArray(plan.data)||plan.data.length!==1||plan.data[0].sheet!=='Indikator_Perilaku')throw Error('Rencana indikator tidak valid.');
  const w=plan.data[0];['created_at','updated_at','berlaku_mulai','berlaku_sampai'].forEach(k=>{if(typeof w.record[k]==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(w.record[k]))w.record[k]=new Date(w.record[k]);});
  const t=tabelIndex_(w.sheet,Object.keys(w.record));const matches=t.records.filter(r=>String(r.id_indikator)===String(w.record.id_indikator));
  if(!matches.length){if(t.records.some(r=>String(r.kode_indikator)===String(w.record.kode_indikator)))throw Error('Kode indikator sudah dipakai record lain.');databasePelatihan_().getSheetByName(w.sheet).appendRow(t.header.map(k=>w.record[k]===undefined?'':w.record[k]));SpreadsheetApp.flush();}
  verifikasiWriteKelola_(w);const done=Object.assign({},first,{id_riwayat:'RV-'+Utilities.getUuid(),status_transaksi:'SELESAI',waktu_perubahan:new Date()});databasePelatihan_().getSheetByName('Riwayat_Validasi').appendRow(a.header.map(k=>done[k]===undefined?'':done[k]));SpreadsheetApp.flush();return plan.hasil;
}

function muatRingkasanPesertaIndex(idProgram){
  if(typeof wajibEndpointAkses_==='function')wajibEndpointAkses_('muatRingkasanPesertaIndex');const r=muatPesertaProgramIndex(idProgram,'',0);return {sukses:true,total:r.total,peserta:r.peserta.slice(0,10).map(p=>({id_peserta:p.id_peserta,id_keikutsertaan:p.id_keikutsertaan,nama:p.nama,unit:p.unit,status:p.status}))};}
function bukaPanelPeserta_(){wajibPemilikIndex_();SpreadsheetApp.getUi().showModalDialog(keluaranPanelAplikasi_('Peserta').setWidth(1100).setHeight(780),'Peserta Program');}

function statusKehadiranProfil_(s,k,now,zona){
  let start,end;try{start=waktuJadwalJP_(s.tanggal_sesi,s.jam_mulai,zona);end=waktuJadwalJP_(s.tanggal_sesi,s.jam_selesai,zona);if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)throw Error('Jadwal tidak valid.');}catch(e){return {status:'perlu_verifikasi',selesai:false,terlambat:null,keterangan:e.message};}
  if(now<start)return {status:'belum_berlangsung',selesai:false,terlambat:null,keterangan:'Sesi belum berlangsung.'};
  const ended=now>=end,d=k&&(k.waktu_datang_terverifikasi||k.waktu_datang),p=k&&(k.waktu_pulang_terverifikasi||k.waktu_pulang);
  if(!d&&!p)return {status:ended?'belum_tercatat_hadir':'sedang_berlangsung',selesai:ended,berlangsung:!ended,terlambat:null,keterangan:ended?'Tidak ada waktu absensi. Konfirmasi kepada petugas sebelum menyimpulkan ketidakhadiran.':'Sesi berlangsung; absensi belum tercatat.'};
  const warning=peringatanWaktuKehadiran_(d,p,s.tanggal_sesi,zona);if(warning)return {status:'perlu_verifikasi',selesai:ended,berlangsung:!ended,terlambat:null,keterangan:warning};
  if((d&&(!(d instanceof Date)||!Number.isFinite(d.getTime())))||(p&&(!(p instanceof Date)||!Number.isFinite(p.getTime())))||d&&p&&p<=d)return {status:'perlu_verifikasi',selesai:ended,berlangsung:!ended,terlambat:null,keterangan:'Format atau urutan waktu kehadiran tidak valid.'};
  const late=d?Math.max(0,(d.getTime()-start)/60000):null;
  return {status:d&&p?'hadir_lengkap':'belum_lengkap',selesai:ended,berlangsung:!ended,terlambat:late,keterangan:d&&p?'Waktu datang dan pulang tersedia.':'Waktu datang atau pulang belum lengkap.'};
}
function muatProfilPesertaIndex(d){
  if(typeof wajibEndpointAkses_==='function')wajibEndpointAkses_('muatProfilPesertaIndex');
  wajibPemilikIndex_();d=d||{};const txt=v=>String(v==null?'':v).trim(),ss=databasePelatihan_(),zona=ss.getSpreadsheetTimeZone(),now=Date.now();
  const ik=tabelIndex_('Keikutsertaan',['id_keikutsertaan','id_program','id_peserta','unit_kerja_saat_pelatihan','status_keikutsertaan']).records.filter(k=>typeof dalamJenjangAkses_!=='function'||dalamJenjangAkses_(k));let pid=txt(d.id_peserta);
  if(d.id_keikutsertaan){const match=ik.filter(k=>txt(k.id_keikutsertaan)===txt(d.id_keikutsertaan));if(match.length!==1)throw Error('Keikutsertaan tidak ditemukan atau duplikat.');if(pid&&pid!==txt(match[0].id_peserta))throw Error('Identitas peserta dan keikutsertaan tidak sesuai.');pid=txt(match[0].id_peserta);if(d.id_program&&txt(d.id_program)!==txt(match[0].id_program))throw Error('Program tidak sesuai keikutsertaan.');d=Object.assign({},d,{id_program:txt(match[0].id_program)});}
  const person=tabelIndex_('Peserta',['id_peserta','nip','nama_pegawai','unit_kerja']).records.filter(p=>txt(p.id_peserta)===pid);if(person.length!==1)throw Error('Peserta tidak ditemukan atau ID duplikat.');
  const programs=tabelIndex_('Program',['id_program','nama_program','kategori_pelatihan','jenjang']).records,links=ik.filter(k=>txt(k.id_peserta)===pid),seen=new Set();
  const choices=links.map(k=>{const id=txt(k.id_program),p=programs.filter(p=>txt(p.id_program)===id);if(!id||seen.has(id)||p.length!==1)throw Error('Relasi program peserta kosong, duplikat, atau tidak ditemukan.');seen.add(id);return {id,nama:txt(p[0].nama_program),kategori:txt(p[0].kategori_pelatihan),id_jenjang:txt(k.id_jenjang),jenjang:typeof konteksJenjang_==='function'?(konteksJenjang_(id,'',false).daftar.find(j=>j.id===txt(k.id_jenjang))||{}).nama||txt(p[0].jenjang):txt(p[0].jenjang),id_keikutsertaan:txt(k.id_keikutsertaan),unit:txt(k.unit_kerja_saat_pelatihan),status:txt(k.status_keikutsertaan)};}).sort((a,b)=>a.nama.localeCompare(b.nama,'id'));
  const selected=txt(d.id_program)||choices[0]&&choices[0].id||'';if(selected&&!seen.has(selected))throw Error('Peserta tidak terdaftar pada program yang dipilih.');const program=choices.find(p=>p.id===selected)||null;
  const result={sukses:true,peserta:{id:pid,nama:txt(person[0].nama_pegawai),nip:txt(person[0].nip),unit:txt(person[0].unit_kerja)},programs:choices,program:program,navigasi:navigasiPelatihan_(),zona,waktu:Utilities.formatDate(new Date(now),zona,'yyyy-MM-dd HH:mm:ss'),kehadiran:[],catatan:[],riwayat:[],jp:null,nilai:null,peringatan:[]};if(!program)return result;
  const sesi=tabelIndex_('Sesi',['id_sesi','id_program','nama_sesi','tanggal_sesi','jam_mulai','jam_selesai']).records.filter(s=>txt(s.id_program)===selected&&(!program.id_jenjang||sesuaiJenjang_(s,{id_program:selected,id_jenjang:program.id_jenjang}))),sids=new Set(sesi.map(s=>txt(s.id_sesi)));
  if(sids.size!==sesi.length||sids.has(''))throw Error('ID sesi kosong atau duplikat pada program.');
  const hadir=tabelIndex_('Kehadiran',['id_kehadiran','id_sesi','id_keikutsertaan','waktu_datang','waktu_pulang','waktu_datang_terverifikasi','waktu_pulang_terverifikasi','status_validasi']).records.filter(k=>txt(k.id_keikutsertaan)===program.id_keikutsertaan&&sids.has(txt(k.id_sesi)));
  const fmt=v=>v instanceof Date&&!isNaN(v.getTime())?Utilities.formatDate(v,zona,'yyyy-MM-dd HH:mm:ss'):txt(v),date=v=>v instanceof Date?Utilities.formatDate(v,zona,'yyyy-MM-dd'):txt(v),jam=v=>v instanceof Date?Utilities.formatDate(v,zona,'HH:mm:ss'):txt(v);
  const stat={sesi_selesai:0,hadir_lengkap:0,belum_lengkap:0,belum_tercatat:0,belum_berlangsung:0,berlangsung:0,perlu_verifikasi:0,terlambat:0,izin:0,persentase:null,status:'sementara'};
  result.kehadiran=sesi.map(s=>{const found=hadir.filter(k=>txt(k.id_sesi)===txt(s.id_sesi));if(found.length>1)throw Error('Kehadiran duplikat pada sesi '+txt(s.id_sesi));const k=found[0],state=statusKehadiranProfil_(s,k,now,zona);if(state.selesai)stat.sesi_selesai++;if(state.status==='hadir_lengkap'&&state.selesai)stat.hadir_lengkap++;if(state.status==='belum_lengkap')stat.belum_lengkap++;if(state.status==='belum_tercatat_hadir')stat.belum_tercatat++;if(state.status==='belum_berlangsung')stat.belum_berlangsung++;if(state.berlangsung)stat.berlangsung++;if(state.status==='perlu_verifikasi')stat.perlu_verifikasi++;if(state.terlambat>10)stat.terlambat++;
    return {id:txt(s.id_sesi),nama:txt(s.nama_sesi),tanggal:date(s.tanggal_sesi),mulai:jam(s.jam_mulai),selesai:jam(s.jam_selesai),status:state.status,keterangan:state.keterangan,terlambat:state.terlambat,datang:fmt(k&&(k.waktu_datang_terverifikasi||k.waktu_datang)),pulang:fmt(k&&(k.waktu_pulang_terverifikasi||k.waktu_pulang)),datang_asli:fmt(k&&k.waktu_datang),pulang_asli:fmt(k&&k.waktu_pulang),validasi:txt(k&&k.status_validasi),id_kehadiran:txt(k&&k.id_kehadiran)};
  }).sort((a,b)=>a.tanggal.localeCompare(b.tanggal)||a.mulai.localeCompare(b.mulai));
  stat.persentase=stat.sesi_selesai?stat.hadir_lengkap/stat.sesi_selesai*100:null;
  stat.status=stat.sesi_selesai&&!stat.belum_lengkap&&!stat.belum_tercatat&&!stat.perlu_verifikasi&&result.kehadiran.filter(s=>s.status==='hadir_lengkap').every(s=>s.validasi==='terverifikasi')?'data_lengkap':'sementara';
  const inds=tabelIndex_('Indikator_Perilaku',['id_indikator','kode_indikator','jenis_indikator','definisi_indikator']).records,im=new Map(inds.map(i=>[txt(i.id_indikator),i]));
  const cat=tabelIndex_('Catatan_Perilaku',['id_catatan','id_keikutsertaan','id_sesi','id_indikator','waktu_kejadian','keterangan','bukti_pendukung','status_validasi']).records.filter(c=>txt(c.id_keikutsertaan)===program.id_keikutsertaan&&sids.has(txt(c.id_sesi)));
  result.catatan=cat.map(c=>{const i=im.get(txt(c.id_indikator))||{};return {id:txt(c.id_catatan),id_sesi:txt(c.id_sesi),kode:txt(i.kode_indikator)||txt(c.id_indikator),jenis:txt(i.jenis_indikator).toLowerCase(),definisi:txt(i.definisi_indikator),nama_sesi:txt((sesi.find(s=>txt(s.id_sesi)===txt(c.id_sesi))||{}).nama_sesi),mulai_izin:fmt(c.waktu_mulai_izin),selesai_izin:fmt(c.waktu_selesai_izin),durasi_izin_menit:c.waktu_mulai_izin instanceof Date&&c.waktu_selesai_izin instanceof Date&&c.waktu_selesai_izin>c.waktu_mulai_izin?(c.waktu_selesai_izin-c.waktu_mulai_izin)/60000:null,status_pengurangan_jp:txt(c.status_pengurangan_jp),waktu:fmt(c.waktu_kejadian),keterangan:txt(c.keterangan),bukti:txt(c.bukti_pendukung),status:txt(c.status_validasi)||'belum_divalidasi',alasan_validasi:txt(c.alasan_validasi)};}).sort((a,b)=>b.waktu.localeCompare(a.waktu));
  stat.izin=new Set(result.catatan.filter(c=>c.kode==='IZIN_SESI'&&c.status!=='ditolak').map(c=>c.id_sesi)).size;result.ringkasan=stat;
  try{const r=muatRekapJPProgramIndex(selected);result.jp=r.peserta.find(p=>p.id_keikutsertaan===program.id_keikutsertaan)||null;result.peringatan.push(...r.masalah);}catch(e){result.peringatan.push('Rekap JP belum tersedia: '+e.message);}
  try{const r=muatNilaiPerilakuProgramIndex(selected);result.nilai=r.aturan?r.peserta.find(p=>p.id_keikutsertaan===program.id_keikutsertaan)||null:null;result.aturan=r.aturan?{nama:r.aturan.nama,versi:r.aturan.versi,bobot:r.aturan.cfg.bobot}:null;}catch(e){result.peringatan.push('Nilai perilaku belum tersedia: '+e.message);}
  const hids=new Set(hadir.map(k=>txt(k.id_kehadiran))),cids=new Set(cat.map(c=>txt(c.id_catatan))),audit=tabelIndex_('Riwayat_Validasi',['id_riwayat','jenis_data','id_referensi','jenis_tindakan','nilai_sebelum','nilai_sesudah','alasan_perubahan','diubah_oleh','waktu_perubahan','id_transaksi_perubahan','status_transaksi']).records;
  const transactions=new Map();audit.filter(a=>(a.jenis_data==='Peserta'&&(typeof petugasDalamKonteksAkses_!=='function'||!petugasDalamKonteksAkses_())&&txt(a.id_referensi)===pid||a.jenis_data==='Kehadiran'&&hids.has(txt(a.id_referensi))||a.jenis_data==='Catatan_Perilaku'&&cids.has(txt(a.id_referensi)))&&/koreksi|validasi|edit_data|izin/.test(txt(a.jenis_tindakan))).forEach(a=>{const key=txt(a.id_transaksi_perubahan)||txt(a.id_riwayat);if(!transactions.has(key))transactions.set(key,{first:a,last:a});else transactions.get(key).last=a;});
  const events=Array.from(transactions.values()).map(t=>({id:txt(t.last.id_transaksi_perubahan)||txt(t.last.id_riwayat),jenis:txt(t.last.jenis_data),referensi:txt(t.last.id_referensi),tindakan:txt(t.last.jenis_tindakan),waktu:fmt(t.last.waktu_perubahan),oleh:txt(t.last.diubah_oleh),alasan:txt(t.last.alasan_perubahan),status:txt(t.last.status_transaksi),sebelum:txt(t.first.nilai_sebelum).slice(0,10000),sesudah:txt(t.last.nilai_sesudah).slice(0,10000)})).sort((a,b)=>b.waktu.localeCompare(a.waktu));result.jumlah_riwayat=events.length;result.riwayat=events.slice(0,100);return result;
}

function muatDaftarIzinIndex(idSesi){
  if(typeof wajibEndpointAkses_==='function')wajibEndpointAkses_('muatDaftarIzinIndex');const r=muatCatatanPerilakuIndex(idSesi);return {sukses:true,id_sesi:String(idSesi).trim(),zona_waktu:r.zona_waktu,catatan:r.catatan.filter(c=>c.kode==='IZIN_SESI')};}

// Beranda reads existing records only; it does not calculate or write JP/scores.
function muatBerandaIndex() {
  if(typeof wajibEndpointAkses_==='function')wajibEndpointAkses_('muatBerandaIndex');
  wajibPemilikIndex_();
  const zona = databasePelatihan_().getSpreadsheetTimeZone();
  const data = {
    program: tabelIndex_('Program', ['id_program','nama_program','kategori_pelatihan','jenjang','tanggal_mulai','tanggal_selesai','status_program']).records.map(p=>Object.assign({},p,{jenjang:typeof namaJenjangProgram_==='function'?namaJenjangProgram_(p.id_program,p.jenjang):p.jenjang})),
    peserta: tabelIndex_('Peserta', ['id_peserta']).records,
    ikut: tabelIndex_('Keikutsertaan', ['id_keikutsertaan','id_program','id_peserta','status_keikutsertaan']).records,
    sesi: tabelIndex_('Sesi', ['id_sesi','id_program','nama_sesi','tanggal_sesi','jam_mulai','jam_selesai']).records,
    hadir: tabelIndex_('Kehadiran', ['id_kehadiran','id_sesi','id_keikutsertaan','waktu_datang','waktu_pulang','waktu_datang_terverifikasi','waktu_pulang_terverifikasi']).records,
    catatan: tabelIndex_('Catatan_Perilaku', ['id_catatan','id_keikutsertaan','id_sesi','status_validasi']).records
  };
  const result = ringkasBeranda_(typeof saringBerandaPanitia_==='function'?saringBerandaPanitia_(data):data, Date.now(), zona);
  result.navigasi = navigasiPelatihan_();
  return result;
}

function ringkasBeranda_(data, now, zona) {
  const txt = v => String(v == null ? '' : v).trim();
  const norm = v => txt(v).toLowerCase();
  const tanggal = v => v instanceof Date && Number.isFinite(v.getTime()) ? Utilities.formatDate(v, zona, 'yyyy-MM-dd') : txt(v);
  const jam = v => v instanceof Date && Number.isFinite(v.getTime()) ? Utilities.formatDate(v, zona, 'HH:mm') : txt(v);
  function byId(rows, key, label) {
    const map = new Map();
    rows.forEach(row => {
      const id = txt(row[key]);
      if (!id || map.has(id)) throw Error('ID kosong atau duplikat pada ' + label + '. Periksa Data di Pengelolaan sebelum memuat Beranda.');
      map.set(id, row);
    });
    return map;
  }
  const programs = byId(data.program, 'id_program', 'Program');
  const people = byId(data.peserta, 'id_peserta', 'Peserta');
  byId(data.ikut, 'id_keikutsertaan', 'Keikutsertaan');
  const rawSessions = byId(data.sesi, 'id_sesi', 'Sesi');
  byId(data.hadir, 'id_kehadiran', 'Kehadiran');
  byId(data.catatan, 'id_catatan', 'Catatan_Perilaku');
  const hari = Utilities.formatDate(new Date(now), zona, 'yyyy-MM-dd');
  const members = new Map(), sessions = new Map(), perProgram = new Map();
  const category = new Map(), statuses = {draft: 0, aktif: 0, selesai: 0, lainnya: 0};
  let relasi = 0, jadwalInvalid = 0, registered = 0;
  programs.forEach((p, id) => {
    perProgram.set(id, {peserta: new Set(), sesi: 0});
    const status = norm(p.status_program);
    statuses[Object.prototype.hasOwnProperty.call(statuses, status) ? status : 'lainnya']++;
    const value = txt(p.kategori_pelatihan), known = ['Manajerial', 'Sosial Kultural', 'Teknis'].find(k => norm(k) === norm(value));
    const label = known || value || 'Belum diisi';
    category.set(label, (category.get(label) || 0) + 1);
  });
  const membershipPairs = new Set();
  data.ikut.forEach(k => {
    const program = txt(k.id_program), person = txt(k.id_peserta);
    if (!programs.has(program) || !people.has(person)) { relasi++; return; }
    const pair = JSON.stringify([program, person]);
    if (membershipPairs.has(pair)) throw Error('Keikutsertaan peserta duplikat pada program. Periksa Data di Pengelolaan.');
    membershipPairs.add(pair);
    members.set(txt(k.id_keikutsertaan), k);
    if (norm(k.status_keikutsertaan) === 'terdaftar') {
      perProgram.get(program).peserta.add(person);
      registered++;
    }
  });
  let sesiTotal = 0, sesiHariIni = 0, sesiMendatang = 0;
  data.sesi.forEach(s => {
    const program = txt(s.id_program);
    if (!programs.has(program)) { relasi++; return; }
    sesiTotal++;
    perProgram.get(program).sesi++;
    try {
      const start = waktuJadwalJP_(s.tanggal_sesi, s.jam_mulai, zona);
      const end = waktuJadwalJP_(s.tanggal_sesi, s.jam_selesai, zona);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) throw Error('Jadwal tidak valid.');
      sessions.set(txt(s.id_sesi), {raw: s, start: start, end: end, hari: tanggal(s.tanggal_sesi)});
      if (tanggal(s.tanggal_sesi) === hari) sesiHariIni++;
      if (start > now) sesiMendatang++;
    } catch (_) { jadwalInvalid++; }
  });
  let pending = 0, attendanceReview = 0;
  data.catatan.forEach(c => {
    const member = members.get(txt(c.id_keikutsertaan)), sid = txt(c.id_sesi);
    const rawSession = sid ? rawSessions.get(sid) : null;
    if (!member || (sid && (!rawSession || (txt(rawSession.id_program) !== txt(member.id_program)||!sesuaiJenjang_(rawSession,member))))) { relasi++; return; }
    if (norm(c.status_validasi) === 'belum_divalidasi') pending++;
  });
  const attendancePairs = new Set();
  data.hadir.forEach(k => {
    const s = sessions.get(txt(k.id_sesi)), member = members.get(txt(k.id_keikutsertaan));
    if (!member || !s || (txt(s.raw.id_program) !== txt(member.id_program)||!sesuaiJenjang_(s.raw,member))) { relasi++; return; }
    const pair = JSON.stringify([txt(k.id_sesi), txt(k.id_keikutsertaan)]);
    if (attendancePairs.has(pair)) throw Error('Catatan kehadiran duplikat pada sesi. Periksa Data di Pengelolaan.');
    attendancePairs.add(pair);
    if (s.end > now) return;
    const state = statusKehadiranProfil_(s.raw, k, now, zona);
    if (state.selesai && state.status !== 'hadir_lengkap') attendanceReview++;
  });
  const programRows = Array.from(programs, ([id, p]) => ({
    id: id, nama: txt(p.nama_program) || id, kategori: txt(p.kategori_pelatihan) || 'Belum diisi',
    jenjang: txt(p.jenjang), status: norm(p.status_program) || 'belum_diisi',
    mulai: tanggal(p.tanggal_mulai), selesai: tanggal(p.tanggal_selesai),
    peserta: perProgram.get(id).peserta.size, sesi: perProgram.get(id).sesi
  })).sort((a, b) => b.mulai.localeCompare(a.mulai) || a.nama.localeCompare(b.nama, 'id'));
  const agenda = Array.from(sessions, ([id, s]) => ({
    id: id, program: txt(s.raw.id_program), nama: txt(s.raw.nama_sesi) || id,
    nama_program: txt(programs.get(txt(s.raw.id_program)).nama_program), tanggal: s.hari,
    mulai: jam(s.raw.jam_mulai), selesai: jam(s.raw.jam_selesai), start: s.start,
    status: s.end <= now ? 'selesai' : s.start <= now ? 'berlangsung' : 'mendatang',
    urutan: s.start <= now && s.end > now ? 0 : s.hari === hari ? (s.start > now ? 1 : 2) : 3,
    tampil: s.end > now || s.hari === hari
  })).filter(s => s.tampil).sort((a, b) => a.urutan - b.urutan || a.start - b.start).slice(0, 6)
    .map(s => ({id:s.id, program:s.program, nama:s.nama, nama_program:s.nama_program, tanggal:s.tanggal, mulai:s.mulai, selesai:s.selesai, status:s.status}));
  const peringatan = [];
  if (jadwalInvalid) peringatan.push(jadwalInvalid + ' sesi memiliki jadwal tidak valid; tidak disertakan dalam agenda dan hitungan waktu.');
  if (relasi) peringatan.push(relasi + ' baris dengan relasi tidak valid atau jadwal yang tidak dapat dibaca tidak disertakan dalam ringkasan terkait. Periksa Data di Pengelolaan.');
  return {
    sukses: true, zona_waktu: zona, waktu: Utilities.formatDate(new Date(now), zona, 'yyyy-MM-dd HH:mm:ss'),
    ringkasan: {program: programs.size, aktif: statuses.aktif, peserta: people.size, pendaftaran: registered, sesi: sesiTotal, hari_ini: sesiHariIni, mendatang: sesiMendatang},
    status_program: statuses, kategori: Array.from(category, ([nama, jumlah]) => ({nama:nama, jumlah:jumlah})).sort((a,b) => b.jumlah-a.jumlah || a.nama.localeCompare(b.nama,'id')),
    tindak_lanjut: {tanpa_sesi: programRows.filter(p => !p.sesi).length, tanpa_peserta: programRows.filter(p => p.status === 'aktif' && !p.peserta).length, catatan: pending, absensi: attendanceReview},
    program: programRows, agenda: agenda, peringatan: peringatan
  };
}

function bukaPanelBeranda_() {
  wajibPemilikIndex_();
  SpreadsheetApp.getUi().showModalDialog(keluaranPanelAplikasi_('Beranda').setWidth(1100).setHeight(780), 'Beranda Pelatihan');
}


function muatTampilanAbsensiQR(token) {
  const hasil = validasiTokenQR(token);
  if (!hasil || !hasil.valid) return hasil;
  const sesi = tabelIndex_('Sesi', ['id_sesi', 'nama_sesi']).records.filter(s => String(s.id_sesi || '').trim() === String(hasil.id_sesi || '').trim());
  if (sesi.length !== 1) throw Error('Data sesi tidak ditemukan atau duplikat. Hubungi petugas pelatihan.');
  return Object.assign({}, hasil, {nama_sesi: String(sesi[0].nama_sesi || '').trim()});
}

function keluaranPanelAplikasi_(name){return typeof aplikasiPanitiaAktif_==='function'&&aplikasiPanitiaAktif_()?keluaranAplikasiPanitia_(name,'Monitoring Pelatihan Pegawai'):HtmlService.createHtmlOutputFromFile(name);}
