-- Добавляем поле max_people в таблицу routes
ALTER TABLE routes ADD COLUMN IF NOT EXISTS max_people INTEGER DEFAULT 10;

-- Обновляем существующие записи (устанавливаем max_people = 10 по умолчанию)
UPDATE routes SET max_people = 10 WHERE max_people IS NULL;

-- Комментарий к полю
COMMENT ON COLUMN routes.max_people IS 'Максимальное количество людей в группе';
