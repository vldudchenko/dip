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
 * Типы транспорта между контрольными точками
 */
export const TRANSPORT_OPTIONS = [
  { value: 'walking', label: '🚶 Пешком',        color: '#059669', bgClass: 'transport-walking' },
  { value: 'bus',     label: '🚌 Автобус',        color: '#2563eb', bgClass: 'transport-bus' },
  { value: 'train',   label: '🚂 Электричка',     color: '#7c3aed', bgClass: 'transport-train' },
  { value: 'driving', label: '🚗 На авто',        color: '#d97706', bgClass: 'transport-driving' },
  { value: 'bicycle', label: '🚲 Велосипед',      color: '#0891b2', bgClass: 'transport-bicycle' },
  { value: 'boat',    label: '🚢 Паром / Лодка',  color: '#0d9488', bgClass: 'transport-boat' },
];

export const TRANSPORT_MAP = Object.fromEntries(
  TRANSPORT_OPTIONS.map(t => [t.value, t])
);

/**
 * Типы остановки в контрольной точке
 */
export const STOP_TYPE_OPTIONS = [
  { value: 'sightseeing',   label: '🏛️ Достопримечательность' },
  { value: 'accommodation', label: '🏨 Ночёвка / Отель' },
  { value: 'camp',          label: '⛺ Лагерь / Стоянка' },
  { value: 'food',          label: '🍽️ Еда / Кафе' },
  { value: 'transport_hub', label: '🚉 Транспортный узел' },
  { value: 'viewpoint',     label: '🌄 Смотровая площадка' },
  { value: 'rest',          label: '☕ Отдых' },
];

export const STOP_TYPE_MAP = Object.fromEntries(
  STOP_TYPE_OPTIONS.map(s => [s.value, s])
);

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

export const getTransportOption = (value) => {
  return TRANSPORT_MAP[value] || { value, label: value, color: '#6b7280', bgClass: '' };
};

export const getStopTypeOption = (value) => {
  return STOP_TYPE_MAP[value] || { value, label: value };
};
