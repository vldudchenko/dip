import React from 'react';

/**
 * Универсальное модальное окно подтверждения
 */
export const ConfirmModal = ({ 
  isOpen, 
  title, 
  message, 
  confirmLabel = 'Подтвердить',
  cancelLabel = 'Отмена',
  confirmVariant = 'delete', // 'delete', 'save', 'primary'
  showCancel = true,
  onConfirm, 
  onCancel 
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">{title}</h3>
        <p className="modal-message">{message}</p>
        <div className="modal-buttons">
          {showCancel && (
            <button
              className="modal-button modal-button--cancel"
              onClick={onCancel}
            >
              {cancelLabel}
            </button>
          )}
          <button
            className={`modal-button modal-button--${confirmVariant}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
