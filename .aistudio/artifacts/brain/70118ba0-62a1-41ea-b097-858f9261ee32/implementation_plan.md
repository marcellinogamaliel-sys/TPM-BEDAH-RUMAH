# SISTEM MONITORING BEDAH RUMAH 2026 — TPM

Aplikasi web pemantauan operasional lapangan dan administrasi program Bedah Rumah 2026 untuk dua pengguna resmi: TPM Pemberdayaan (Gamaliel Tumiwa) dan TPM Konstruksi (Valerian Poluan). Sistem mencakup pemetaan spasial interaktif, monitoring progres mingguan dengan verifikasi selfie kamera langsung, pelacakan kendala berjenjang dengan penyelesaian wajib beralasan, administrasi pencairan toko & upah, mode lapangan ramah satu tangan dengan tautan WhatsApp antar-TPM, serta pencatatan audit log dan mode offline PWA.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **Keputusan yang Dikonfirmasi dari Sesi Klarifikasi:**
> - **Arsitektur Backend & Database**: Fullstack Express lokal terintegrasi yang menyimpan data secara persisten dan reliabel di lingkungan runtime, dilengkapi opsi konektor sinkronisasi Supabase resmi.
> - **Data Awal (Seeding)**: Mengisi 4 desa dan 5 KPB awal sesuai lampiran master prompt:
>   - Desa Parepei: KPB SUMESEGAH & KPB EMBUNG KULO
>   - Desa Kauneran Satu: KPB PA'ASUN
>   - Desa Kiawa Satu Barat: KPB BLESSING KISBAR
>   - Desa Kiawa Satu Utara: KPB KANAAN DAMAI
> - **Mekanisme Autentikasi**: Formulir email & kata sandi resmi dengan kartu profil dua TPM terpisah, validasi ketat, serta perlindungan sesi.

---

## 1. Overview & Core Concept

- **Tujuan Sistem**: Menyediakan platform terpadu bagi kedua Tenaga Pendamping Masyarakat (TPM) dalam mengelola penerima bantuan (PB), memverifikasi kondisi lapangan secara faktual, memantau pencairan bertahap, menyelesaikan kendala konstruksi/sosial, dan menyusun laporan mingguan otomatis tanpa risiko kehilangan histori data.
- **Pengguna Utama**:
  1. **Gamaliel Tumiwa** — TPM Pemberdayaan
  2. **Valerian Poluan** — TPM Konstruksi
- **Nilai Utama**:
  - Integritas data lapangan melalui kewajiban selfie langsung via kamera dan koordinat GPS.
  - Reset mingguan yang cerdas (Senin 00:00 WITA) yang memperbarui indikator tanpa pernah menghapus catatan riwayat atau bukti kunjungan.
  - Alur kerja pencegahan manipulasi status kendala: kendala tidak dapat ditandai selesai tanpa justifikasi tertulis, tindakan nyata, dan dokumentasi bukti.
  - Dukungan lapangan penuh dengan offline-first queue (Outbox), kompresi foto otomatis, dan tombol WhatsApp instan antar-rekan kerja.

---

## 2. User Experience & Visual Design

### A. Alur Pengguna Utama (Key User Flows)

1. **Autentikasi & Pemilihan Profil (`/login`)**:
   - Pemilihan salah satu dari 2 kartu profil resmi ("TPM Pemberdayaan - Gamaliel Tumiwa" dan "TPM Konstruksi - Valerian Poluan").
   - Masukan kredensial email & password dengan proteksi sesi.
   - Pengecekan kesesuaian profil dan peran sebelum diarahkan ke Dashboard.

2. **Dashboard Operasional (`/`)**:
   - Ringkasan KPI interaktif: Total PB, PB per desa, distribusi status (SK PPK, Pengganti, Mundur, dll.), progres (0%, 1-99%, 100%), status kunjungan minggu ini, rekap pencairan, dan kendala aktif.
   - Panel aktivitas terbaru real-time (audit log dalam narasi bahasa Indonesia yang natural).
   - Setiap kartu metrik dapat diklik untuk langsung menyaring daftar data pendukung.

3. **Peta Sebaran PB (`/peta`)**:
   - Peta Leaflet dengan tile OpenStreetMap responsif.
   - Warna marker mingguan dinamis: Abu-abu (belum dikunjungi), Biru (TPM Pemberdayaan), Hijau Kebiruan (TPM Konstruksi), Ungu (keduanya).
   - Bentuk/ikon penanda aksesibel (P, K, P+K, –) untuk non-color visual distinction.
   - Popup interaktif dengan progres, tombol navigasi Google Maps driving route, dan panel perbaikan PB tanpa koordinat.

4. **Monitoring Kunjungan & Verifikasi Selfie (`/monitoring`)**:
   - Pemilihan bertingkat: Desa → KPB → PB aktif.
   - Deteksi GPS dengan perhitungan jarak otomatis (toleransi peringatan >500m).
   - **Kamera Selfie Wajib**: Pratinjau langsung kamera depan perangkat (`getUserMedia`) tanpa pengunggah galeri; fallback draf jika izin ditolak.
   - Input progres 0–100% dengan tombol cepat (0, 30, 50, 75, 100%). Justifikasi wajib bila progres menurun.
   - Dokumentasi foto fisik pembangunan (hingga 10 foto) terkompresi otomatis.
   - Pembuatan kendala instan terintegrasi jika ditemukan hambatan saat kunjungan.

5. **Rekap Kunjungan Mingguan & Arsip Snapshot (`/rekap`)**:
   - Tab "Minggu Ini" dan "Arsip Periode" dengan pembagian zona waktu WITA (`Asia/Makassar`).
   - Penutupan periode otomatis Senin 00:05 WITA yang membekukan snapshot nama dan status tanpa mengubah rekaman asli.
   - Dukungan data susulan (*late-synced*) dengan penandaan revisi transparan.
   - Ekspor laporan berformat Excel dan PDF resmi dengan kompresi foto.

6. **Manajemen Kendala (`/kendala`)**:
   - Pelaporan masalah (bahan, tukang, administrasi, dll.) dengan target tindak lanjut berdasarkan prioritas.
   - Timeline interaktif setiap pembaruan catatan.
   - **Modal Penyelesaian Wajib**: Alasan penyelesaian (min 10 karakter), tindakan yang diambil, dan catatan hasil wajib diisi sebelum status menjadi "Selesai".
   - Alur buka kembali kendala dengan alasan wajib tanpa menimpa histori lama.

7. **Pencairan Toko & Upah (`/pencairan`)**:
   - Matriks status 4 tahap: Toko I, Upah I, Toko II, Upah II.
   - 3 kondisi visual: Kosong belum diverifikasi, Terverifikasi belum dibayar, Sudah dibayar.
   - Pembatalan centang membutuhkan alasan wajib dan tercatat di riwayat audit.
   - Ekspor formal PDF & Excel siap cetak A4 landscape.

8. **Mode Lapangan Ramah Satu Tangan (`/lapangan`)**:
   - Tampilan mobile-first yang dioptimalkan untuk pengoperasian dengan jempol di luar ruangan.
   - Alur cepat: Desa → KPB → Peta ringkas (40%) + Daftar PB kartu sentuh.
   - Bottom Sheet menu 7 aksi (Update Progres, Cek Rute, Cek Status, Cek Pembayaran, Riwayat, Foto, Kendala).
   - Tombol mengambang WhatsApp cerdas: Otomatis menghubungkan ke nomor TPM rekan kerja (Gamaliel → Valerian, Valerian → Gamaliel).

9. **Import & Export Excel (`/import`)**:
   - Template resmi untuk Desa/KPB, Master PB, Koordinat PB, Status PB, dan Pencairan.
   - Wizard validasi: pratinjau warna status baris, deteksi koordinat tertukar, penanganan sel kosong aman, dan opsi impor atomik.

10. **Pengaturan, Audit Log & Backup (`/pengaturan`)**:
    - Pengaturan profil & nomor WhatsApp kedua TPM.
    - Master status PB, tahap progres (anti-tumpang tindih), dan kategori kendala.
    - Audit Log *append-only* dengan inspeksi perbedaan (diff) nilai lama vs baru.
    - Cadangan data sistem (JSON backup) dan unduhan arsip.

### B. Visual Identity & Design System

- **Palet Warna Terarah (60-30-10 Rule)**:
  - Kanvas Dominan (60%): `#F8FAFC` / `#FFFFFF` (bersih, kontras tinggi di bawah sinar matahari lapangan).
  - Permukaan Struktural (30%): Navy Utama `#0B1F3A` (sidebar desktop & header), Navy Sekunder `#12325C`, Border Lembut `#E2E8F0`.
  - Aksen Aksi (10%): Biru Utama `#2563EB`, Teal Lapangan `#0D9488`, Peringatan `#D97706`, Bahaya `#DC2626`.
- **Tipografi**:
  - Display & Headings: `Plus Jakarta Sans` / `Inter` tegas, rapi, bebas ornamen semu.
  - Angka Data & Metrik: `tabular-nums` atau `JetBrains Mono` untuk presisi tabel perbandingan.
- **Ergonomi**:
  - Seluruh tombol interaktif memiliki target sentuh minimal 44×44px.
  - Label status menggunakan teks unboxed bersih dengan pemisah tipografis (`·`), menghindari tumpukan badge kapsul berlebihan.

---

## 3. Key Product Decisions & Trade-Offs

1. **Fullstack Express + Persistent Store dengan Supabase Schema Parity**:
   - *Pendekatan*: Menyediakan server Express internal yang mengelola REST API transaksional, validasi Zod backend, hashing password, kalkulasi periode WITA, dan penyimpanan database persisten. Dilengkapi skema SQL migrasi dan utilitas sinkronisasi Supabase lengkap.
   - *Alasan*: Menjamin aplikasi langsung siap pakai 100% di browser pratinjau tanpa konfigurasi rumit, sekaligus mempertahankan arsitektur database relasional PostgreSQL untuk migrasi ke cloud Supabase.
2. **Kamera Langsung untuk Verifikasi Lapangan**:
   - *Pendekatan*: Form monitoring menggunakan API `navigator.mediaDevices.getUserMedia` langsung ke video stream dan kanvas snapshot. Pemilih file galeri dinonaktifkan khusus untuk slot selfie.
   - *Alasan*: Memenuhi syarat integritas pelaporan lapangan; mencegah manipulasi foto arsip lama sebagai kunjungan hari ini.
3. **Penyelesaian Kendala Transaksional & Append-Only History**:
   - *Pendekatan*: Status kendala "Selesai" dilindungi di backend; permintaan update langsung tanpa alasan dan catatan hasil ditolak.
   - *Alasan*: Mencegah penutupan kendala prematur di lapangan dan mempertahankan catatan pertanggungjawaban program.
4. **Offline Resilience via IndexedDB & Outbox**:
   - *Pendekatan*: Menggunakan IndexedDB untuk menyimpan antrean operasi (`client_op_id`), foto kompresi blob, dan draf input form saat sinyal di pedesaan Minahasa melemah.
   - *Alasan*: Memastikan data survei kedua TPM tidak lenyap saat sinyal seluler hilang.

---

## 4. Technical Architecture & Data Strategy

### A. Arsitektur Komponen & Aliran Data

```
┌────────────────────────────────────────────────────────────────────────┐
│                          APLIKASI FRONTEND                             │
│                                                                        │
│  ┌───────────────────────┐  ┌──────────────────────────────────────┐  │
│  │   Desktop Workspace   │  │        Mode Lapangan (Mobile)        │  │
│  │  Sidebar + Breadcrumb │  │  Peta (40%) + Bottom List + Sheet    │  │
│  │  Tabel & Dialog Modal │  │  Tombol Cepat WA & Touch Target 48px │  │
│  └───────────┬───────────┘  └──────────────────┬───────────────────┘  │
│              │                                 │                      │
│  ┌───────────▼─────────────────────────────────▼───────────────────┐  │
│  │      Aplikasi Router & Halaman Utama (/peta, /monitoring,       │  │
│  │      /rekap, /kendala, /pencairan, /master, /import, dsb.)      │  │
│  └──────────────────────────────┬──────────────────────────────────┘  │
│                                 │                                     │
│  ┌──────────────────────────────▼──────────────────────────────────┐  │
│  │      State Management, TanStack Query & Form Zod Validation     │  │
│  └──────────────┬───────────────────────────────┬──────────────────┘  │
│                 │                               │ (saat offline)      │
│                 │                               ▼                     │
│                 │              ┌──────────────────────────────────┐   │
│                 │              │    IndexedDB Outbox & Cache      │   │
│                 │              │  • Draf monitoring & foto blob   │   │
│                 │              │  • Antrean op_id idempotensi     │   │
│                 │              └────────────────┬─────────────────┘   │
└─────────────────┼───────────────────────────────┼─────────────────────┘
                  │                               │ (saat online kembali)
                  ▼                               ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        BACKEND SERVER (EXPRESS)                        │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │   API Endpoints (/api/auth, /api/master, /api/visits,            │  │
│  │   /api/issues, /api/payments, /api/recap, /api/import, /api/logs)│  │
│  └──────────────────┬───────────────────────────┬───────────────────┘  │
│                     │                           │                      │
│  ┌──────────────────▼──────────┐     ┌──────────▼───────────────────┐  │
│  │    Business Logic & Guards   │     │   WITA Period Calculator     │  │
│  │  • Guard Status Kendala     │     │   (Senin 00:00 - Minggu 23:59│  │
│  │  • Verifikasi Selfie & GPS  │     │    Asia/Makassar Engine)     │  │
│  │  • Audit Logger Append-Only │     │   Snapshot Builder & Freeze  │  │
│  └──────────────────┬──────────┘     └──────────┬───────────────────┘  │
│                     │                           │                      │
│  ┌──────────────────▼───────────────────────────▼───────────────────┐  │
│  │    Penyimpanan Relasional Persisten (Data Store Engine)          │  │
│  │    + Konektor Supabase (Skema, Migrasi, & SQL RLS Test Kit)      │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### B. Entitas Data Utama

- `profiles`: Akun TPM (Gamaliel Tumiwa - Pemberdayaan, Valerian Poluan - Konstruksi, nomor WA, display name).
- `villages` & `kpbs`: Master wilayah dampingan dengan relasi hierarkis dan penanda arsip.
- `pb_statuses`: Konfigurasi status PB (SK PPK, Pengganti, Mundur, Tidak Lolos Verifikasi, Mundur SK PPK) beserta flag wajib kunjungan.
- `beneficiaries`: Data lengkap penerima bantuan, koordinat geografis, progres terkini, status 4 pencairan, dan riwayat status.
- `monitoring_visits`: Catatan kunjungan, snapshot wilayah saat kunjungan, progres sebelum/sesudah, bukti selfie kamera, foto fisik, koordinat GPS, jarak ke PB, status verifikasi, dan periode minggu berjalan.
- `issues`: Daftar kendala lapangan dengan pelapor, kategori, skala prioritas, batas target waktu, status, dan riwayat pembaruan (`issue_updates`).
- `issue_resolution_records`: Arsip permanen resolusi kendala memuat alasan resmi, aksi konkret, dan catatan hasil.
- `payment_records` & `payment_history`: Status tahapan pencairan Toko I/II dan Upah I/II dengan catatan pembatalan beralasan.
- `weekly_recap_periods` & `weekly_recap_snapshots`: Pencatatan periode mingguan WITA dan pembekuan snapshot data historis.
- `audit_logs`: Buku besar audit sistem anti-hapus (append-only).

---

## 5. Rencana Tahapan Eksekusi

1. **Konfigurasi Dependensi & Server Fullstack**: Menyiapkan Leaflet untuk peta, SheetJS & jsPDF untuk ekspor dokumen, modul kamera dan kompresi gambar, serta Express backend server dengan REST route lengkap.
2. **Setup Skema Database, Seed Data & Audit Engine**: Menginisialisasi 4 desa dan 5 KPB awal, konfigurasi akun resmi kedua TPM, aturan status PB, serta pencatatan audit log otomatis.
3. **Autentikasi & Shell Aplikasi**: Membangun halaman login dua profil TPM dengan validasi ketat, sidebar responsif, bottom navigation mobile, dan indikator koneksi/sinkronisasi.
4. **Master Data & Import Wizard**: Mengembangkan manajemen Desa, KPB, dan Penerima Bantuan (PB), formulir validasi, penanganan konflik versi, serta fitur impor Excel 5 template dengan deteksi kesalahan baris.
5. **Monitoring Kunjungan & Verifikasi Selfie**: Mengimplementasikan form monitoring dengan akses kamera perangkat langsung (`getUserMedia`), penangkap GPS, validasi progres, dan unggahan foto bangunan.
6. **Peta Sebaran & Mode Lapangan HP**: Mengembangkan visualisasi titik koordinat PB berbasis Leaflet dengan warna status mingguan dan antarmuka Mode Lapangan ramah jempol dengan tombol WhatsApp antar-TPM.
7. **Manajemen Kendala Berjenjang**: Membangun sistem pelaporan kendala, notifikasi, timeline pembaruan, dan modal penyelesaian wajib dengan validasi ketat.
8. **Pencairan Toko & Upah**: Mengembangkan tabel interaktif 4 tahap pembayaran, dialog konfirmasi pembatalan dengan alasan wajib, dan ekspor formal PDF/Excel.
9. **Rekap Mingguan, Siklus Otomatis & Arsip**: Menerapkan kalkulasi periode Senin-Minggu WITA, penutupan otomatis snapshot, dukungan data susulan, serta laporan per TPM/wilayah.
10. **Offline PWA, Pengaturan & Verifikasi Kompilasi**: Menambahkan manifest PWA, tombol install, penyimpanan antrean IndexedDB, halaman pengaturan, dan verifikasi menyeluruh terhadap kriteria akhir.
