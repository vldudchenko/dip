import { STOP_TYPE_OPTIONS } from '../routeConstants';

/**
 * Создаёт popup для выбора типа остановки прямо на карте
 */
export function createStopTypePopupElement({ currentType, onSelect, onCancel, isLeaflet = false }) {
  const popupElement = document.createElement('div');
  popupElement.className = 'stop-type-popup';
  popupElement.style.cssText = `
    background: white;
    padding: 1.25rem;
    border-radius: 16px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    min-width: 240px;
    max-width: 300px;
    margin-top: -10px;
    pointer-events: auto;
    z-index: 2000;
    border: 1px solid #e5e7eb;
    position: relative;
  `;

  // Предотвращаем закрытие при клике внутри
  popupElement.addEventListener('click', (e) => e.stopPropagation());

  const title = document.createElement('div');
  title.style.cssText = 'font-size: 0.75rem; font-weight: 800; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1rem;';
  title.textContent = 'Тип остановки';
  popupElement.appendChild(title);

  const grid = document.createElement('div');
  grid.style.cssText = 'display: grid; grid-template-columns: repeat(1, 1fr); gap: 0.4rem;';

  // Исключаем 'start' и 'finish' (финиш обрабатывается отдельно логикой, но тут даем выбрать если надо)
  STOP_TYPE_OPTIONS.filter(opt => {
    if (opt.value === 'start') return false;
    // Убираем "Без остановки", если она и так уже выбрана
    if (opt.value === 'none' && currentType === 'none') return false;
    return true;
  }).forEach(opt => {

    const btn = document.createElement('div');
    const isActive = currentType === opt.value;

    btn.style.cssText = `
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.6rem 0.8rem;
      border-radius: 10px;
      border: 1px solid ${isActive ? '#7c3aed' : '#f3f4f6'};
      background: ${isActive ? '#f5f3ff' : '#fff'};
      cursor: pointer;
      font-size: 0.9rem;
    `;

    btn.innerHTML = `
      <span style="font-weight: 600; color: ${isActive ? '#7c3aed' : '#374151'};">${opt.label.split(' ').slice().join(' ')}</span>
    `;

    btn.onmouseover = () => {
      if (!isActive) {
        btn.style.borderColor = '#7c3aed';
        btn.style.background = '#f9fafb';
      }
    };
    btn.onmouseout = () => {
      if (!isActive) {
        btn.style.borderColor = '#f3f4f6';
        btn.style.background = '#fff';
      }
    };

    btn.onclick = () => {
      onSelect(opt.value);
    };

    grid.appendChild(btn);
  });

  popupElement.appendChild(grid);

  const closeBtn = document.createElement('div');
  closeBtn.style.cssText = 'position: absolute; top: 0.75rem; right: 0.75rem; cursor: pointer; color: #9ca3af; font-size: 1rem; padding: 4px; line-height: 1;';
  closeBtn.innerHTML = '✕';
  closeBtn.onclick = onCancel;
  popupElement.appendChild(closeBtn);

  return popupElement;
}
