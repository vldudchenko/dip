-- ============================================
-- Таблица "Прохождения по маршруту" (route_sessions)
-- ============================================
CREATE TABLE IF NOT EXISTS route_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  guide_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Дата и время
  start_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  
  -- Статус: waiting - Ожидает набора, pending_date - Ожидает даты прохождения, 
  --        in_progress - Идет, completed - Завершен, cancelled - Отменено
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'pending_date', 'in_progress', 'completed', 'cancelled')),
  
  -- Счётчики
  participants_count INTEGER DEFAULT 0,
  
  -- Метаданные
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_route_sessions_route_id ON route_sessions(route_id);
CREATE INDEX IF NOT EXISTS idx_route_sessions_guide_id ON route_sessions(guide_id);
CREATE INDEX IF NOT EXISTS idx_route_sessions_status ON route_sessions(status);
CREATE INDEX IF NOT EXISTS idx_route_sessions_start_date ON route_sessions(start_date);

-- Комментарии
COMMENT ON TABLE route_sessions IS 'Прохождения по маршрутам';
COMMENT ON COLUMN route_sessions.status IS 'waiting - Ожидает набора, pending_date - Ожидает даты прохождения, in_progress - Идет, completed - Завершен, cancelled - Отменено';

-- ============================================
-- Таблица связи "Участники прохождения" (session_participants)
-- ============================================
CREATE TABLE IF NOT EXISTS session_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES route_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Уникальная пара session_id + user_id
  UNIQUE(session_id, user_id)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_session_participants_session_id ON session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_user_id ON session_participants(user_id);

-- Комментарии
COMMENT ON TABLE session_participants IS 'Участники прохождений маршрутов (связь многие-ко-многим)';

-- ============================================
-- RLS (Row Level Security)
-- ============================================
ALTER TABLE route_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;

-- Политики для route_sessions
CREATE POLICY "Public view sessions" ON route_sessions FOR SELECT USING (true);
CREATE POLICY "User insert sessions" ON route_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "User update own sessions" ON route_sessions FOR UPDATE USING (auth.uid() = guide_id);
CREATE POLICY "User delete own sessions" ON route_sessions FOR DELETE USING (auth.uid() = guide_id);

-- Политики для session_participants
CREATE POLICY "Public view participants" ON session_participants FOR SELECT USING (true);
CREATE POLICY "User insert participants" ON session_participants FOR INSERT WITH CHECK (true);
CREATE POLICY "User delete own participants" ON session_participants FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- Функция для обновления updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для обновления updated_at в route_sessions
CREATE TRIGGER update_route_sessions_updated_at
  BEFORE UPDATE ON route_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Функция для подсчёта участников
-- ============================================
CREATE OR REPLACE FUNCTION update_participants_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE route_sessions 
    SET participants_count = participants_count + 1,
        updated_at = NOW()
    WHERE id = NEW.session_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE route_sessions 
    SET participants_count = participants_count - 1,
        updated_at = NOW()
    WHERE id = OLD.session_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Триггер для подсчёта участников при добавлении/удалении
CREATE TRIGGER update_participants_count_on_join
  AFTER INSERT OR DELETE ON session_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_participants_count();

-- ============================================
-- Функция для авто-смены статуса при изменении количества участников
-- ============================================
CREATE OR REPLACE FUNCTION check_session_status_by_participants()
RETURNS TRIGGER AS $$
DECLARE
  v_route_min_people INTEGER;
BEGIN
  -- Получаем min_people из маршрута
  SELECT r.min_people INTO v_route_min_people
  FROM routes r
  WHERE r.id = NEW.route_id;

  -- Если количество участников >= min_people, меняем статус на pending_date
  IF NEW.participants_count >= v_route_min_people AND NEW.status = 'waiting' THEN
    UPDATE route_sessions
    SET status = 'pending_date',
        updated_at = NOW()
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для проверки статуса после обновления participants_count
CREATE TRIGGER check_status_after_participants_update
  AFTER UPDATE OF participants_count ON route_sessions
  FOR EACH ROW
  EXECUTE FUNCTION check_session_status_by_participants();

-- ============================================
-- Функция для авто-смены статусов по времени
-- ============================================
CREATE OR REPLACE FUNCTION update_session_status_by_time()
RETURNS TRIGGER AS $$
BEGIN
  -- Если статус pending_date и наступила start_date + start_time, меняем на in_progress
  IF NEW.status = 'pending_date' AND 
     (NEW.start_date < CURRENT_DATE OR 
      (NEW.start_date = CURRENT_DATE AND NEW.start_time <= CURRENT_TIME)) THEN
    NEW.status := 'in_progress';
  END IF;
  
  -- Если статус in_progress и наступило end_time, меняем на completed
  IF NEW.status = 'in_progress' AND 
     (NEW.start_date < CURRENT_DATE OR 
      (NEW.start_date = CURRENT_DATE AND NEW.end_time <= CURRENT_TIME)) THEN
    NEW.status := 'completed';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для проверки статуса по времени при обновлении
CREATE TRIGGER check_status_by_time_on_update
  BEFORE UPDATE ON route_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_session_status_by_time();

-- ============================================
-- Функция для периодической проверки статусов (запускается по расписанию)
-- ============================================
CREATE OR REPLACE FUNCTION update_all_sessions_status_by_time()
RETURNS VOID AS $$
BEGIN
  -- Меняем pending_date на in_progress если наступило время начала
  UPDATE route_sessions 
  SET status = 'in_progress',
      updated_at = NOW()
  WHERE status = 'pending_date' 
    AND (start_date < CURRENT_DATE OR 
         (start_date = CURRENT_DATE AND start_time <= CURRENT_TIME));
  
  -- Меняем in_progress на completed если наступило время окончания
  UPDATE route_sessions 
  SET status = 'completed',
      updated_at = NOW()
  WHERE status = 'in_progress' 
    AND (start_date < CURRENT_DATE OR 
         (start_date = CURRENT_DATE AND end_time <= CURRENT_TIME));
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Функция проверки возможности записи (не позднее чем за 24 часа)
-- ============================================
CREATE OR REPLACE FUNCTION check_join_deadline()
RETURNS TRIGGER AS $$
DECLARE
  v_session_start_timestamp TIMESTAMPTZ;
BEGIN
  -- Получаем дату и время начала сессии
  SELECT (start_date + start_time)::TIMESTAMPTZ INTO v_session_start_timestamp
  FROM route_sessions
  WHERE id = NEW.session_id;
  
  -- Проверяем, что до начала сессии больше 24 часов
  IF v_session_start_timestamp - NOW() < INTERVAL '24 hours' THEN
    RAISE EXCEPTION 'Запись на прохождение возможна не позднее чем за 24 часа до начала';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для проверки дедлайна записи
CREATE TRIGGER check_join_deadline_on_insert
  BEFORE INSERT ON session_participants
  FOR EACH ROW
  EXECUTE FUNCTION check_join_deadline();

-- ============================================
-- Функция проверки максимального количества участников
-- ============================================
CREATE OR REPLACE FUNCTION check_max_participants()
RETURNS TRIGGER AS $$
DECLARE
  v_max_people INTEGER;
  v_current_count INTEGER;
BEGIN
  -- Получаем max_people из маршрута
  SELECT r.max_people INTO v_max_people
  FROM route_sessions rs
  JOIN routes r ON rs.route_id = r.id
  WHERE rs.id = NEW.session_id;
  
  -- Получаем текущее количество участников
  SELECT COUNT(*) INTO v_current_count
  FROM session_participants
  WHERE session_id = NEW.session_id;
  
  -- Проверяем, что не превышаем максимум
  IF v_current_count >= v_max_people THEN
    RAISE EXCEPTION 'Достигнуто максимальное количество участников (%)', v_max_people;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для проверки максимального количества участников
CREATE TRIGGER check_max_participants_on_insert
  BEFORE INSERT ON session_participants
  FOR EACH ROW
  EXECUTE FUNCTION check_max_participants();

-- ============================================
-- Функция проверки статуса сессии при записи
-- ============================================
CREATE OR REPLACE FUNCTION check_session_status_for_join()
RETURNS TRIGGER AS $$
DECLARE
  v_session_status TEXT;
BEGIN
  -- Получаем статус сессии
  SELECT status INTO v_session_status
  FROM route_sessions
  WHERE id = NEW.session_id;
  
  -- Проверяем, что статус позволяет запись
  IF v_session_status != 'waiting' THEN
    RAISE EXCEPTION 'Запись возможна только на сессии со статусом "Ожидает набора"';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для проверки статуса сессии при записи
CREATE TRIGGER check_session_status_for_join_on_insert
  BEFORE INSERT ON session_participants
  FOR EACH ROW
  EXECUTE FUNCTION check_session_status_for_join();
