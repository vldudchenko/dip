-- Добавляем поле is_guide в таблицу users
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_guide BOOLEAN DEFAULT FALSE NOT NULL;

-- Индекс для быстрого поиска гидов
CREATE INDEX IF NOT EXISTS idx_users_is_guide ON users(is_guide);
