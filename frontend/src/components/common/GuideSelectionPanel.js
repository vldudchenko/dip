import React from 'react';
import defaultAvatar from '../../static/Avatar.png';
import { API_URL } from '../../utils/constants';

/**
 * Панель выбора гида с поиском и пагинацией
 */
export const GuideSelectionPanel = ({ 
  guides, 
  selectedGuideId, 
  onSelect,
  searchQuery,
  onSearchChange,
  currentPage,
  onPageChange,
  totalPages,
  paginatedGuides,
  totalCount
}) => {
  return (
    <div className="guide-selection-panel">
      <div className="search-block">
        <input 
          type="text" 
          placeholder="Поиск гида..." 
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="guide-search-input"
        />
      </div>

      <div className="guide-list">
        {totalCount === 0 ? (
          <div className="empty-state">Гиды не найдены</div>
        ) : (
          <>
            <label className={`guide-item ${selectedGuideId === 'all' ? 'active' : ''}`}>
              <input 
                type="radio" 
                name="guide" 
                value="all" 
                checked={selectedGuideId === 'all'}
                onChange={() => onSelect('all')}
              />
              <div className="guide-item-info">
                <span className="guide-name">Все авторы</span>
              </div>
            </label>

            {paginatedGuides.map(guide => {
              const avatarUrl = guide.avatar ? 
                (guide.avatar.startsWith('http') ? guide.avatar : `${API_URL}${guide.avatar}`) : 
                defaultAvatar;

              return (
                <label 
                  key={guide.id} 
                  className={`guide-item ${selectedGuideId === guide.id ? 'active' : ''}`}
                >
                  <input 
                    type="radio" 
                    name="guide" 
                    value={guide.id} 
                    checked={selectedGuideId === guide.id}
                    onChange={() => onSelect(guide.id)}
                  />
                  <img src={avatarUrl} alt="" className="guide-avatar-mini" />
                  <div className="guide-item-info">
                    <span className="guide-name">{guide.full_name || guide.login}</span>
                    <span className="guide-login">@{guide.login}</span>
                  </div>
                </label>
              );
            })}
          </>
        )}
      </div>

      {totalPages > 1 && (
        <div className="guide-pagination">
          <button 
            disabled={currentPage === 1} 
            onClick={() => onPageChange(currentPage - 1)}
            className="pagination-btn"
            aria-label="Предыдущая страница"
          >
            &lt;
          </button>
          <span className="page-info">{currentPage} / {totalPages}</span>
          <button 
            disabled={currentPage === totalPages} 
            onClick={() => onPageChange(currentPage + 1)}
            className="pagination-btn"
            aria-label="Следующая страница"
          >
            &gt;
          </button>
        </div>
      )}
    </div>
  );
};
