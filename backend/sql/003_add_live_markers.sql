-- ============================================
-- Миграция для Live Markers (видео-экскурсии)
-- ============================================

-- Добавляем поля для live-маркеров в таблицу videos
ALTER TABLE videos 
  ADD COLUMN IF NOT EXISTS is_live BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS route_start_lat DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS route_start_lng DECIMAL(11, 8),
  ADD COLUMN IF NOT EXISTS route_end_lat DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS route_end_lng DECIMAL(11, 8),
  ADD COLUMN IF NOT EXISTS route_geometry JSONB,
  ADD COLUMN IF NOT EXISTS video_duration INTEGER; -- длительность видео в секундах

-- Индексы для live-маркеров
CREATE INDEX IF NOT EXISTS idx_videos_is_live ON videos(is_live);
CREATE INDEX IF NOT EXISTS idx_videos_route_start ON videos(route_start_lat, route_start_lng);
CREATE INDEX IF NOT EXISTS idx_videos_route_end ON videos(route_end_lat, route_end_lng);

-- Комментарии к полям
COMMENT ON COLUMN videos.is_live IS 'Флаг live-маркера (видео-экскурсия с маршрутом)';
COMMENT ON COLUMN videos.route_start_lat IS 'Широта начальной точки маршрута';
COMMENT ON COLUMN videos.route_start_lng IS 'Долгота начальной точки маршрута';
COMMENT ON COLUMN videos.route_end_lat IS 'Широта конечной точки маршрута';
COMMENT ON COLUMN videos.route_end_lng IS 'Долгота конечной точки маршрута';
COMMENT ON COLUMN videos.route_geometry IS 'JSON геометрии маршрута (координаты пути)';
COMMENT ON COLUMN videos.video_duration IS 'Длительность видео в секундах';
