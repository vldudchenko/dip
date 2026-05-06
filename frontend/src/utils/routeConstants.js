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
  { value: 'walking', label: 'Пешком', color: '#059669', bgClass: 'transport-walking' },
  { value: 'bus', label: 'Автобус', color: '#2563eb', bgClass: 'transport-bus' },
  { value: 'train', label: 'Электричка', color: '#7c3aed', bgClass: 'transport-train' },
  { value: 'boat', label: 'Паром / Лодка', color: '#3bb1ff', bgClass: 'transport-boat' },
];

export const TRANSPORT_MAP = Object.fromEntries(
  TRANSPORT_OPTIONS.map(t => [t.value, t])
);

/**
 * Типы остановки в контрольной точке
 */
export const STOP_TYPE_OPTIONS = [
  { value: 'none', label: 'Промежуточная точка' },
  { value: 'sightseeing', label: 'Достопримечательность' },
  { value: 'accommodation', label: 'Ночёвка' },
  { value: 'camp', label: 'Лагерь' },
  { value: 'food', label: 'Еда / Кафе' },
  { value: 'viewpoint', label: 'Смотровая площадка' },
  { value: 'rest', label: 'Отдых' },
  { value: 'finish', label: 'Финиш' },
];

export const STOP_TYPE_MAP = Object.fromEntries(
  STOP_TYPE_OPTIONS.map(s => [s.value, s])
);

/**
 * Хелперы для получения меток и классов
 */
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
