-- ============================================
-- Таблица просмотров (views)
-- ============================================
CREATE TABLE IF NOT EXISTS views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_view_per_user UNIQUE (video_id, user_id)
);

-- ============================================
-- Таблица лайков (likes)
-- ============================================
CREATE TABLE IF NOT EXISTS likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_like_per_user UNIQUE (video_id, user_id)
);

-- ============================================
-- Таблица комментариев (comments)
-- ============================================
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Индексы
-- ============================================
CREATE INDEX IF NOT EXISTS idx_views_video_id ON views(video_id);
CREATE INDEX IF NOT EXISTS idx_views_user_id ON views(user_id);
CREATE INDEX IF NOT EXISTS idx_views_video_user ON views(video_id, user_id);

CREATE INDEX IF NOT EXISTS idx_likes_video_id ON likes(video_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_video_user ON likes(video_id, user_id);

CREATE INDEX IF NOT EXISTS idx_comments_video_id ON comments(video_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_video_parent ON comments(video_id, parent_id);

-- ============================================
-- RLS (Row Level Security)
-- ============================================
ALTER TABLE views ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Политики для views
-- ============================================
-- Просмотр: все могут видеть просмотры
CREATE POLICY "Public view" ON views FOR SELECT USING (true);

-- Добавление просмотра: только авторизованные пользователи
CREATE POLICY "Authenticated insert" ON views FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- Политики для likes
-- ============================================
-- Просмотр: все могут видеть лайки
CREATE POLICY "Public view" ON likes FOR SELECT USING (true);

-- Добавление лайка: только авторизованные пользователи
CREATE POLICY "Authenticated insert" ON likes FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- Удаление лайка: только владелец лайка
CREATE POLICY "User delete own" ON likes FOR DELETE 
  USING (auth.uid() = user_id);

-- ============================================
-- Политики для comments
-- ============================================
-- Просмотр: все могут видеть комментарии
CREATE POLICY "Public view" ON comments FOR SELECT USING (true);

-- Добавление комментария: только авторизованные пользователи
CREATE POLICY "Authenticated insert" ON comments FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- Обновление комментария: только владелец комментария
CREATE POLICY "User update own" ON comments FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Удаление комментария: только владелец комментария
CREATE POLICY "User delete own" ON comments FOR DELETE 
  USING (auth.uid() = user_id);

-- ============================================
-- Функции и триггеры
-- ============================================

-- Функция для засчитывания просмотра (не более 1 на пользователя)
CREATE OR REPLACE FUNCTION add_view(p_video_id UUID, p_user_id UUID)
RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
BEGIN
  -- Проверяем, есть ли уже просмотр от этого пользователя
  IF EXISTS (SELECT 1 FROM views WHERE video_id = p_video_id AND user_id = p_user_id) THEN
    RETURN QUERY SELECT false, 'Вы уже смотрели это видео'::TEXT;
  ELSE
    INSERT INTO views (video_id, user_id) VALUES (p_video_id, p_user_id);
    RETURN QUERY SELECT true, 'Просмотр засчитан'::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Функция для получения статистики видео
CREATE OR REPLACE FUNCTION get_video_stats(p_video_id UUID)
RETURNS TABLE (
  view_count BIGINT,
  like_count BIGINT,
  comment_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM views WHERE video_id = p_video_id) AS view_count,
    (SELECT COUNT(*) FROM likes WHERE video_id = p_video_id) AS like_count,
    (SELECT COUNT(*) FROM comments WHERE video_id = p_video_id AND parent_id IS NULL) AS comment_count;
END;
$$ LANGUAGE plpgsql;

-- Триггер для обновления updated_at у комментариев
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
