/**
 * Константы для отображения сложности маршрутов
 */
export const DIFFICULTY_LABELS = {
  easy: 'Лёгкий',
  medium: 'Средний',
  hard: 'Сложный'
};

export const DIFFICULTY_CLASSES = {
  easy: 'difficulty-easy',
  medium: 'difficulty-medium',
  hard: 'difficulty-hard'
};

/**
 * Константы для отображения статусов прохождений
 */
export const STATUS_LABELS = {
  waiting: 'Ожидает набора',
  pending_date: 'Ожидает даты прохождения',
  in_progress: 'Идет',
  completed: 'Завершен',
  cancelled: 'Отменено'
};

export const STATUS_CLASSES = {
  waiting: 'status-waiting',
  pending_date: 'status-pending',
  in_progress: 'status-in-progress',
  completed: 'status-completed',
  cancelled: 'status-cancelled'
};

/**
 * Хелперы для получения меток и классов
 */
export const getDifficultyLabel = (difficulty) => {
  return DIFFICULTY_LABELS[difficulty] || difficulty;
};

export const getDifficultyClass = (difficulty) => {
  return DIFFICULTY_CLASSES[difficulty] || '';
};

export const getStatusLabel = (status) => {
  return STATUS_LABELS[status] || status;
};

export const getStatusClass = (status) => {
  return STATUS_CLASSES[status] || '';
};
