import React from 'react';

/**
 * Компонент для красивого форматирования даты в стиле соцсетей
 * @param {string|Date} date - Дата для форматирования
 */
export const FormattedDate = ({ date }) => {
  if (!date) return null;

  const d = new Date(date);
  const now = new Date();
  const diffInSeconds = Math.floor((now - d) / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  // Форматирование для старых дат
  const formatFullDate = (showYear = true) => {
    return d.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: showYear ? 'numeric' : undefined
    });
  };

  let result = '';

  if (diffInSeconds < 60) {
    result = 'только что';
  } else if (diffInMinutes < 60) {
    result = `${diffInMinutes} мин. `;
  } else if (diffInHours < 24) {
    result = `${diffInHours} ч. `;
  } else if (diffInDays === 1) {
    result = 'вчера';
  } else if (diffInDays < 7) {
    result = `${diffInDays} д. `;
  } else if (d.getFullYear() === now.getFullYear()) {
    result = formatFullDate(false);
  } else {
    result = formatFullDate(true);
  }

  return (
    <span className="formatted-date" title={d.toLocaleString('ru-RU')}>
      {result}
    </span>
  );
};

export default FormattedDate;
