import { formatDuration } from './helpers';

/**
 * Создаёт popup для загрузки видео (обычного и live)
 */
export function createUploadPopupElement(
  map,
  initialCoords,
  onUpload,
  onCancel,
  uploading,
  onLiveRouteSelect
) {
  const popupElement = document.createElement('div');
  popupElement.classList.add('upload-popup');
  popupElement.style.cssText = `
    background: white;
    padding: 1rem;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
    min-width: 300px;
    max-width: 400px;
    transform: translate(-50%, -100%);
    margin-top: -10px;
    pointer-events: auto;
  `;

  popupElement.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  // Заголовок
  const titleElement = document.createElement('div');
  titleElement.style.cssText = 'font-size: 1.1rem; font-weight: bold; margin-bottom: 0.5rem; color: #333;';
  titleElement.textContent = 'Загрузка видео';
  popupElement.appendChild(titleElement);

  // Переключатель режимов
  const modeToggleContainer = document.createElement('div');
  modeToggleContainer.style.cssText = 'display: flex; gap: 0.5rem; margin-bottom: 1rem;';

  const modeLabel = document.createElement('span');
  modeLabel.style.cssText = 'font-size: 0.9rem; color: #666; align-self: center;';
  modeLabel.textContent = 'Режим:';

  const modeToggle = document.createElement('div');
  modeToggle.style.cssText = 'display: flex; border: 1px solid #ddd; border-radius: 6px; overflow: hidden;';

  const normalModeBtn = document.createElement('button');
  normalModeBtn.textContent = 'Обычный';
  normalModeBtn.style.cssText = `
    padding: 0.375rem 0.75rem;
    border: none;
    background: #7c3aed;
    color: white;
    cursor: pointer;
    font-size: 0.85rem;
  `;
  normalModeBtn.disabled = uploading;

  const liveModeBtn = document.createElement('button');
  liveModeBtn.textContent = 'Live маркер';
  liveModeBtn.style.cssText = `
    padding: 0.375rem 0.75rem;
    border: none;
    background: #f5f5f5;
    color: #333;
    cursor: pointer;
    font-size: 0.85rem;
  `;
  liveModeBtn.disabled = uploading;

  modeToggle.appendChild(normalModeBtn);
  modeToggle.appendChild(liveModeBtn);
  modeToggleContainer.appendChild(modeLabel);
  modeToggleContainer.appendChild(modeToggle);
  popupElement.appendChild(modeToggleContainer);

  // Информация о точках
  const pointsInfoElement = document.createElement('div');
  pointsInfoElement.style.cssText = 'font-size: 0.75rem; color: #666; margin-bottom: 0.5rem;';
  popupElement.appendChild(pointsInfoElement);

  // Инструкция для live-режима
  const liveInstructionElement = document.createElement('div');
  liveInstructionElement.style.cssText = `
    font-size: 0.75rem;
    color: #7c3aed;
    background: #f3e8ff;
    padding: 0.4rem;
    border-radius: 4px;
    margin-bottom: 0.5rem;
    display: none;
  `;
  liveInstructionElement.textContent = 'Выберите вторую точку маршрута на карте';
  popupElement.appendChild(liveInstructionElement);

  // Выбор файла
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'video/*';
  fileInput.style.cssText = `
    width: 100%;
    margin: 0.5rem 0;
    padding: 0.5rem;
    font-size: 0.85rem;
    border: 1px dashed #ddd;
    border-radius: 6px;
    background: #fafafa;
    cursor: pointer;
  `;
  fileInput.disabled = uploading;
  fileInput.addEventListener('click', (e) => e.stopPropagation());
  popupElement.appendChild(fileInput);

  // Имя файла
  const fileNameElement = document.createElement('div');
  fileNameElement.style.cssText = 'font-size: 0.75rem; color: #666; margin: 0.4rem 0; word-break: break-all;';
  popupElement.appendChild(fileNameElement);

  // Длительность видео
  const durationElement = document.createElement('div');
  durationElement.style.cssText = 'font-size: 0.7rem; color: #888; margin: 0.2rem 0; display: none;';
  popupElement.appendChild(durationElement);

  // Кнопки
  const buttonsElement = document.createElement('div');
  buttonsElement.style.cssText = 'display: flex; gap: 0.5rem; margin-top: 0.75rem;';

  const uploadButton = document.createElement('button');
  uploadButton.style.cssText = `
    flex: 1;
    padding: 0.45rem 0.85rem;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 500;
    background: #7c3aed;
    color: white;
    transition: background 0.2s;
  `;
  uploadButton.textContent = uploading ? 'Загрузка...' : 'Загрузить видео';
  uploadButton.disabled = uploading;

  const cancelButton = document.createElement('button');
  cancelButton.style.cssText = `
    flex: 1;
    padding: 0.45rem 0.85rem;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 500;
    background: #f5f5f5;
    color: #333;
    transition: background 0.2s;
  `;
  cancelButton.textContent = 'Отмена';
  cancelButton.disabled = uploading;

  buttonsElement.appendChild(uploadButton);
  buttonsElement.appendChild(cancelButton);
  popupElement.appendChild(buttonsElement);

  // Состояние
  let isLiveMode = false;
  let routeSelected = false;
  let routeStart = null;
  let routeEnd = null;
  let routeGeometry = null;

  function refreshUploadButtonState() {
    if (uploading) {
      uploadButton.disabled = true;
      return;
    }

    const hasFile = Boolean(fileInput.files?.[0]);
    const canUpload = isLiveMode ? hasFile && routeSelected : hasFile;
    uploadButton.disabled = !canUpload;
  }

  function setMode(isLive) {
    if (uploading || routeSelected) return;

    isLiveMode = isLive;
    normalModeBtn.style.background = isLive ? '#f5f5f5' : '#7c3aed';
    normalModeBtn.style.color = isLive ? '#333' : 'white';
    liveModeBtn.style.background = isLive ? '#7c3aed' : '#f5f5f5';
    liveModeBtn.style.color = isLive ? 'white' : '#333';

    liveInstructionElement.style.display = isLive ? 'block' : 'none';

    if (isLive) {
      onLiveRouteSelect?.(initialCoords, true);
    } else {
      onLiveRouteSelect?.(null, false);
    }

    refreshUploadButtonState();
  }

  // Обработчики кнопок режима
  normalModeBtn.addEventListener('click', () => setMode(false));
  liveModeBtn.addEventListener('click', () => setMode(true));

  [normalModeBtn, liveModeBtn].forEach((btn) => {
    btn.addEventListener('mouseenter', () => {
      if (!btn.disabled) btn.style.opacity = '0.85';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.opacity = '1';
    });
  });

  // Выбор файла
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) {
      fileNameElement.textContent = '';
      durationElement.style.display = 'none';
      refreshUploadButtonState();
      return;
    }

    fileNameElement.textContent = `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;

    try {
      const tempUrl = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(tempUrl);
        const duration = Math.round(video.duration || 0);
        if (duration > 0) {
          durationElement.style.display = 'block';
          durationElement.textContent = `Длительность: ${formatDuration(duration)}`;
        }
      };
      video.onerror = () => {
        URL.revokeObjectURL(tempUrl);
      };
      video.src = tempUrl;
    } catch (error) {
      console.error('Error getting video duration:', error);
    }

    refreshUploadButtonState();
  });

  // Обновление второй точки маршрута
  popupElement.updateSecondPoint = (secondCoords, geometry) => {
    routeSelected = true;
    routeStart = { lat: initialCoords[1], lng: initialCoords[0] };
    routeEnd = { lat: secondCoords[1], lng: secondCoords[0] };
    routeGeometry = geometry;

    liveInstructionElement.textContent = 'Маршрут выбран. Теперь загрузите видео.';
    liveInstructionElement.style.background = '#dcfce7';
    liveInstructionElement.style.color = '#166534';

    normalModeBtn.disabled = true;
    liveModeBtn.disabled = true;
    normalModeBtn.style.cursor = 'not-allowed';
    liveModeBtn.style.cursor = 'not-allowed';
    normalModeBtn.style.opacity = '0.6';
    liveModeBtn.style.opacity = '0.6';

    refreshUploadButtonState();
  };

  // Загрузка
  uploadButton.addEventListener('click', async (e) => {
    e.stopPropagation();

    const file = fileInput.files?.[0];
    if (!file) {
      alert('Выберите файл видео');
      return;
    }

    if (isLiveMode && !routeSelected) {
      alert('Сначала выберите маршрут (две точки) на карте');
      return;
    }

    uploading = true;
    uploadButton.disabled = true;
    uploadButton.textContent = 'Загрузка...';
    cancelButton.disabled = true;

    try {
      const tempUrl = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.preload = 'metadata';
      const videoDuration = await new Promise((resolve) => {
        video.onloadedmetadata = () => {
          URL.revokeObjectURL(tempUrl);
          resolve(Math.round(video.duration || 0));
        };
        video.onerror = () => {
          URL.revokeObjectURL(tempUrl);
          resolve(0);
        };
        video.src = tempUrl;
      });

      const uploadData = {
        file,
        isLive: isLiveMode,
        coordinates: initialCoords,
        routeStart: isLiveMode ? routeStart : null,
        routeEnd: isLiveMode ? routeEnd : null,
        routeGeometry: isLiveMode ? routeGeometry : null,
        videoDuration
      };

      const result = await onUpload(uploadData);
      if (result?.success) {
        onLiveRouteSelect?.(null, false);
        onCancel();
        return;
      }

      throw new Error(result?.error || 'Ошибка загрузки');
    } catch (error) {
      console.error('Upload error:', error);
      alert(error.message || 'Ошибка загрузки видео');
      uploading = false;
      uploadButton.textContent = 'Загрузить видео';
      cancelButton.disabled = false;
      refreshUploadButtonState();
    }
  });

  // Отмена
  cancelButton.addEventListener('click', (e) => {
    e.stopPropagation();
    onLiveRouteSelect?.(null, false);
    onCancel();
  });

  // Hover эффекты кнопок
  [uploadButton, cancelButton].forEach((btn) => {
    btn.addEventListener('mouseenter', () => {
      if (!btn.disabled) btn.style.opacity = '0.85';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.opacity = '1';
    });
  });

  refreshUploadButtonState();

  return { popupElement, fileInput, fileNameElement, uploadButton };
}
