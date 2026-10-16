# PANDUAN SETUP & DEPLOYMENT — SISTEM MONITORING BEDAH RUMAH 2026

Dokumen ini menjelaskan tata cara deployment dan konfigurasi resmi untuk Sistem Monitoring Bedah Rumah 2026 bagi kedua Tenaga Pendamping Masyarakat (TPM): Gamaliel Tumiwa (Pemberdayaan) dan Valerian Poluan (Konstruksi).

---

## 1. Persiapan Akun Autentikasi (Supabase Auth)
1. Buka dashboard Supabase project Anda.
2. Masuk ke menu **Authentication > Providers > Email**.
3. **PENTING**: Matikan opsi **"Allow new users to sign up"** (hanya dua akun resmi yang diundang).
4. Masuk ke **Authentication > Users** dan klik **"Add User" > "Create User"**:
   - Akun 1: `gamaliel.tumiwa@bedahrumah.id` (TPM Pemberdayaan) dengan password kuat.
   - Akun 2: `valerian.poluan@bedahrumah.id` (TPM Konstruksi) dengan password kuat.
5. Salin UUID masing-masing pengguna untuk dihubungkan ke tabel `profiles`.

---

## 2. Eksekusi Skema Database (SQL Migration)
Buka menu **SQL Editor** di Supabase, jalankan skrip migrasi berikut:

```sql
-- Extensions
create extension if not exists pgcrypto;
create extension if not exists citext;

-- Enum Types
create type app_role as enum ('tpm_pemberdayaan', 'tpm_konstruksi');
create type issue_status as enum ('baru', 'dalam_penanganan', 'menunggu_tindak_lanjut', 'selesai');
create type issue_priority as enum ('rendah', 'sedang', 'tinggi', 'kritis');
create type payment_stage as enum ('toko_1', 'upah_1', 'toko_2', 'upah_2');
create type payment_state as enum ('belum_diverifikasi', 'belum_dibayar', 'sudah_dibayar');

-- Tables
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role app_role unique not null,
  display_name text not null,
  title text not null,
  whatsapp_number text not null check (whatsapp_number ~ '^62[0-9]{8,13}$'),
  avatar_initials text not null,
  is_active boolean default true,
  version int default 1
);

create table villages (
  id uuid primary key default gen_random_uuid(),
  name citext unique not null,
  is_archived boolean default false,
  archived_at timestamptz,
  archived_by uuid references profiles(id),
  archive_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  version int default 1
);

create table kpbs (
  id uuid primary key default gen_random_uuid(),
  village_id uuid references villages(id) on delete restrict,
  name citext not null,
  is_archived boolean default false,
  archived_at timestamptz,
  archived_by uuid references profiles(id),
  archive_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  version int default 1,
  unique(village_id, name)
);

create table pb_statuses (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  label text not null,
  color text not null,
  sort_order int not null,
  is_active boolean default true,
  requires_visit boolean default true,
  counts_in_active_total boolean default true
);

create table beneficiaries (
  id uuid primary key default gen_random_uuid(),
  pb_code text unique not null,
  full_name text not null,
  village_id uuid references villages(id),
  kpb_id uuid references kpbs(id),
  address text,
  phone text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  status_id uuid references pb_statuses(id),
  notes text,
  current_progress smallint default 0 check (current_progress between 0 and 100),
  last_visit_at timestamptz,
  last_visit_by uuid references profiles(id),
  doc_status text default 'belum_ada',
  is_archived boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  version int default 1
);

create table monitoring_visits (
  id uuid primary key default gen_random_uuid(),
  client_op_id uuid unique not null,
  beneficiary_id uuid references beneficiaries(id),
  village_id uuid references villages(id),
  kpb_id uuid references kpbs(id),
  tpm_id uuid references profiles(id),
  visited_at timestamptz not null,
  received_at timestamptz default now(),
  week_start date not null,
  progress_before smallint not null,
  progress_after smallint not null,
  progress_change_reason text,
  condition_notes text not null,
  recommendation text,
  gps_lat numeric(9,6),
  gps_lng numeric(9,6),
  gps_accuracy_m numeric,
  distance_to_pb_m numeric,
  far_from_pb boolean default false,
  selfie_photo_id text not null,
  is_voided boolean default false,
  void_reason text,
  created_at timestamptz default now()
);

-- Row Level Security (RLS)
alter table profiles enable row level security;
alter table villages enable row level security;
alter table kpbs enable row level security;
alter table beneficiaries enable row level security;
alter table monitoring_visits enable row level security;

create policy "Auth access profiles" on profiles for all to authenticated using (true);
create policy "Auth access villages" on villages for all to authenticated using (true);
create policy "Auth access kpbs" on kpbs for all to authenticated using (true);
create policy "Auth access beneficiaries" on beneficiaries for all to authenticated using (true);
create policy "Auth access visits" on monitoring_visits for all to authenticated using (true);
```

---

## 3. Seed Awal Desa & KPB
Setelah tabel dibuat, masukkan data master desa & KPB awal yang telah terstandardisasi:

```sql
insert into villages (name) values
  ('Parepei'),
  ('Kauneran Satu'),
  ('Kiawa Satu Barat'),
  ('Kiawa Satu Utara')
on conflict do nothing;

-- KPBs
insert into kpbs (village_id, name)
select id, 'SUMESEGAH' from villages where name = 'Parepei'
union all
select id, 'EMBUNG KULO' from villages where name = 'Parepei'
union all
select id, 'PA''ASUN' from villages where name = 'Kauneran Satu'
union all
select id, 'BLESSING KISBAR' from villages where name = 'Kiawa Satu Barat'
union all
select id, 'KANAAN DAMAI' from villages where name = 'Kiawa Satu Utara';
```

---

## 4. Pengaturan Zona Waktu
Semua perhitungan minggu berjalan (`week_start`) dan filter tanggal laporan menggunakan zona waktu **Asia/Makassar (WITA, UTC+8)**. Periode mingguan dimulai setiap hari **Senin pukul 00.00 WITA** dan berakhir hari **Minggu pukul 23.59.59 WITA**.
