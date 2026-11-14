export const SUPABASE_SQL_SCHEMA = `-- AeroBalon Ops — Supabase PostgreSQL + Row Level Security (RLS) Şeması
-- Bu SQL kodunu Supabase Dashboard -> SQL Editor kısmında çalıştırarak bulut veritabanını kurabilirsiniz.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Şirketler (Çoklu Firma)
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  aoc_number TEXT NOT NULL,
  base_location TEXT NOT NULL,
  logo_data_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Dinamik Sorumluluk Tanımları (Uçuş İşletme, Bakım, Kalite vb.)
CREATE TABLE IF NOT EXISTS responsibilities (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  title_tr TEXT NOT NULL,
  title_en TEXT NOT NULL,
  can_upload_special_docs BOOLEAN DEFAULT TRUE,
  can_create_trainings BOOLEAN DEFAULT TRUE
);

-- 3. Modüler Evrak Şablonları
CREATE TABLE IF NOT EXISTS document_templates (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('balloon','pilot','ground_crew','special')),
  title_tr TEXT NOT NULL,
  title_en TEXT NOT NULL,
  has_expiry BOOLEAN DEFAULT TRUE,
  warning_days INTEGER DEFAULT 30,
  required_for_audit BOOLEAN DEFAULT TRUE
);

-- 4. Modüler Eğitim Şablonları
CREATE TABLE IF NOT EXISTS training_templates (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  title_tr TEXT NOT NULL,
  title_en TEXT NOT NULL,
  default_content TEXT,
  validity_months INTEGER DEFAULT 12
);

-- 5. Balon Kartları & Envanter
CREATE TABLE IF NOT EXISTS balloons (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  registration TEXT NOT NULL,
  model TEXT NOT NULL,
  serial_number TEXT,
  total_flight_hours NUMERIC(8,2) DEFAULT 0,
  hours_at_last_100h_check NUMERIC(8,2) DEFAULT 0,
  cylinders JSONB DEFAULT '[]'::jsonb,
  custom_fields JSONB DEFAULT '{}'::jsonb
);

-- 6. Personel & Pilot Kartları
CREATE TABLE IF NOT EXISTS personnel (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  auth_user_id UUID,
  category TEXT NOT NULL CHECK (category IN ('pilot','copilot','ground_crew')),
  full_name TEXT NOT NULL,
  license_number TEXT,
  email TEXT,
  phone TEXT,
  responsibility_ids JSONB DEFAULT '[]'::jsonb,
  custom_fields JSONB DEFAULT '{}'::jsonb
);

-- 7. Evrak Kayıtları (Süreli / Süresiz PDF)
CREATE TABLE IF NOT EXISTS compliance_documents (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  target_id TEXT NOT NULL,
  target_kind TEXT NOT NULL CHECK (target_kind IN ('balloon','personnel')),
  template_id TEXT,
  custom_title TEXT,
  file_name TEXT NOT NULL,
  file_mime TEXT NOT NULL,
  file_size_bytes INTEGER DEFAULT 0,
  file_data_url TEXT NOT NULL,
  uploaded_by_id TEXT NOT NULL,
  uploaded_by_role TEXT NOT NULL,
  is_special_doc BOOLEAN DEFAULT FALSE,
  has_expiry BOOLEAN DEFAULT FALSE,
  expiry_date DATE,
  admin_verified BOOLEAN DEFAULT FALSE,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Şirket İçi Eğitim & İmza Tutanakları
CREATE TABLE IF NOT EXISTS training_records (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  template_id TEXT,
  title TEXT NOT NULL,
  content TEXT,
  training_date DATE NOT NULL,
  instructor_personnel_id TEXT,
  participant_ids JSONB DEFAULT '[]'::jsonb,
  signed_sheet_file_name TEXT,
  signed_sheet_data_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Uçuş Logları & GPS/Varyometre Noktaları (Silinemez Denetim Kaydı)
CREATE TABLE IF NOT EXISTS flight_logs (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  balloon_id TEXT REFERENCES balloons(id),
  pilot_id TEXT REFERENCES personnel(id),
  copilot_id TEXT,
  started_at BIGINT NOT NULL,
  ended_at BIGINT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  max_alt_m INTEGER DEFAULT 0,
  max_speed_kmh NUMERIC(6,2) DEFAULT 0,
  max_climb_ms NUMERIC(5,2) DEFAULT 0,
  max_sink_ms NUMERIC(5,2) DEFAULT 0,
  points JSONB NOT NULL DEFAULT '[]'::jsonb,
  sync_status TEXT DEFAULT 'synced',
  notes TEXT
);

-- RLS Güvenlik Politikaları (Örnek: Pilotlar flight_logs silemez)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE balloons ENABLE ROW LEVEL SECURITY;
ALTER TABLE personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE flight_logs ENABLE ROW LEVEL SECURITY;

-- Not: Canlı Auth entegrasyonunda auth.uid() üzerinden company_id bazlı politika bağlanır.
CREATE POLICY "flight_logs_no_delete" ON flight_logs FOR DELETE USING (false);
`;
