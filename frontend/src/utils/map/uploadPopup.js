import { formatDuration } from './helpers';

/**
 * Создаёт popup для загрузки видео
 */
export function createUploadPopupElement(
  map,
  initialCoords,
  onUpload,
  onCancel,
  uploading,
  isLeaflet = false
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
    ${isLeaflet ? 'transform: translateY(-100%);' : 'transform: translate(-50%, -100%);'}
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
  uploadButton.disabled = true;

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

  function refreshUploadButtonState() {
    if (uploading) {
      uploadButton.disabled = true;
      return;
    }
    uploadButton.disabled = !fileInput.files?.[0];
  }

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

  // Загрузка
  uploadButton.addEventListener('click', async (e) => {
    e.stopPropagation();

    const file = fileInput.files?.[0];
    if (!file) return;

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
        coordinates: initialCoords,
        videoDuration
      };

      const result = await onUpload(uploadData);
      if (result?.success) {
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

  return { popupElement, fileInput, fileNameElement, uploadButton };
}
