-- Таблица маршрутов (routes)
CREATE TABLE IF NOT EXISTS routes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guide_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  min_people INTEGER NOT NULL DEFAULT 5,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_routes_guide_id ON routes(guide_id);
CREATE INDEX IF NOT EXISTS idx_routes_difficulty ON routes(difficulty);

-- RLS
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;

-- Политики для routes
CREATE POLICY "Public view" ON routes FOR SELECT USING (true);
CREATE POLICY "User insert" ON routes FOR INSERT WITH CHECK (true);
CREATE POLICY "User update own" ON routes FOR UPDATE USING (auth.uid() = guide_id);
CREATE POLICY "User delete own" ON routes FOR DELETE USING (auth.uid() = guide_id);
