-- Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  yandex_id TEXT UNIQUE NOT NULL,
  email TEXT,
  login TEXT,
  avatar TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица видео
CREATE TABLE IF NOT EXISTS videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  original_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_location ON videos(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_users_yandex_id ON users(yandex_id);

-- RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- Политики для users
CREATE POLICY "Public view" ON users FOR SELECT USING (true);
CREATE POLICY "User insert" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "User update own" ON users FOR UPDATE USING (true);

-- Политики для videos
CREATE POLICY "Public view" ON videos FOR SELECT USING (true);
CREATE POLICY "User insert" ON videos FOR INSERT WITH CHECK (true);
CREATE POLICY "User update own" ON videos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "User delete own" ON videos FOR DELETE USING (auth.uid() = user_id);

-- Bucket для видео в Storage
-- Создается через панель Supabase или API:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', true);
