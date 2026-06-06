import React from 'react';
import { DualRangeSlider } from '../common/DualRangeSlider';
import { GuideSelectionPanel } from '../common/GuideSelectionPanel';
import { TRANSPORT_OPTIONS } from '../../utils/routeConstants';
import { formatDuration, getSnappedTime } from '../../utils/routeHelpers';
import '../../styles/routeSearchPanel.css';

/**
 * Единый компонент для поиска и фильтрации маршрутов.
 * Используется на главной странице и на странице интерактивной карты.
 */
export const RouteSearchPanel = ({
  filters,
  draftFilters,
  updateFilter,
  applyFilters,
  resetFilters,
  maxAvailableDistance,
  maxAvailableDuration,
  uniqueGuides = [],
  guideSelection,
  user,
  isDraftDirty,
  isFilterActive,
  showGuide = true,
  showSort = true,
  showAdvanced = true,
  showTransport = true,
  mapAdditions = null,
  showMilestonesToggle = false,
  showMilestones = true,
  onMilestonesToggle = () => { },
  showVideosToggle = false,
  showVideos = true,
  videoFilterMode = 'all',
  onVideoModeChange = () => { }
}) => {
  const [transportDropdownOpen, setTransportDropdownOpen] = React.useState(false);
  const transportDropdownRef = React.useRef(null);
  const [sortDropdownOpen, setSortDropdownOpen] = React.useState(false);
  const sortDropdownRef = React.useRef(null);
  const [videoDropdownOpen, setVideoDropdownOpen] = React.useState(false);
  const videoDropdownRef = React.useRef(null);

  React.useEffect(() => {
    const handleOutsideClick = (event) => {
      if (transportDropdownRef.current && !transportDropdownRef.current.contains(event.target)) {
        setTransportDropdownOpen(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target)) {
        setSortDropdownOpen(false);
      }
      if (videoDropdownRef.current && !videoDropdownRef.current.contains(event.target)) {
        setVideoDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleTransportToggle = (value) => {
    const current = draftFilters.transports || [];
    const next = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    updateFilter('transports', next);
  };

  return (
    <div className="route-search-panel">
      {/* Текстовый поиск */}
      <div className="filter-group">
        <div className="search-input-wrapper">
          <input
            id="search-input"
            type="text"
            className="filter-search-input"
            placeholder="Название или описание..."
            value={draftFilters.searchQuery}
            onChange={(e) => updateFilter('searchQuery', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            aria-label="Поиск маршрутов по названию или описанию"
          />
          {draftFilters.searchQuery && (
            <button
              className="search-clear-inline"
              onClick={() => updateFilter('searchQuery', '')}
              title="Очистить поиск"
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {/* Сортировка */}
      {showSort && (() => {
        const SORT_OPTIONS = [
          { value: 'newest', label: 'Сначала новые' },
          { value: 'oldest', label: 'Сначала старые' },
          { value: 'popular', label: 'Популярные' },
          { value: 'videos', label: 'По количеству видео' }
        ];
        const activeOption = SORT_OPTIONS.find(opt => opt.value === draftFilters.sortBy) || SORT_OPTIONS[0];

        return (
          <div className="filter-group" ref={sortDropdownRef}>
            <div className="status-filter-dropdown" style={{ position: 'relative', width: '100%' }}>
              <button
                type="button"
                id="sort-select"
                className={`sort-select status-filter-trigger${sortDropdownOpen ? ' status-filter-trigger--open' : ''}`}
                style={{ width: '100%', display: 'block', textAlign: 'left' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSortDropdownOpen(!sortDropdownOpen);
                }}
                aria-label="Порядок сортировки маршрутов"
              >
                <span>{activeOption.label}</span>
              </button>
              {sortDropdownOpen && (
                <div className="status-filter-menu" style={{ width: '100%', zIndex: 200 }} onClick={e => e.stopPropagation()}>
                  {SORT_OPTIONS.map(opt => {
                    const isSelected = draftFilters.sortBy === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        className={`status-filter-option-btn${isSelected ? ' active' : ''}`}
                        onClick={() => {
                          updateFilter('sortBy', opt.value);
                          setSortDropdownOpen(false);
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Выбор гида */}
      {showGuide && uniqueGuides.length > 0 && (
        <div className="filter-group">
          <label>
            <span className="filter-label-text">Гид</span>
          </label>
          <GuideSelectionPanel
            {...guideSelection}
            selectedGuideId={draftFilters.selectedGuide}
            onSelect={(id) => updateFilter('selectedGuide', id)}
            guides={uniqueGuides}
          />
        </div>
      )}

      {/* Выбор транспорта */}
      {showTransport && (() => {
        const selectedTransports = draftFilters.transports || [];
        let triggerElement;
        if (selectedTransports.length === TRANSPORT_OPTIONS.length || selectedTransports.length === 0) {
          triggerElement = <span>Все виды транспорта</span>;
        } else if (selectedTransports.length === 1) {
          const activeOpt = TRANSPORT_OPTIONS.find(opt => opt.value === selectedTransports[0]);
          triggerElement = <span>{activeOpt ? activeOpt.label : selectedTransports[0]}</span>;
        } else {
          triggerElement = (
            <span>
              Транспорт <span className="tab-count">{selectedTransports.length}</span>
            </span>
          );
        }

        return (
          <div className="filter-group" ref={transportDropdownRef}>
            <div className="status-filter-dropdown" style={{ position: 'relative', width: '100%' }}>
              <button
                type="button"
                className={`sort-select status-filter-trigger${transportDropdownOpen ? ' status-filter-trigger--open' : ''}`}
                style={{ width: '100%' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setTransportDropdownOpen(!transportDropdownOpen);
                }}
              >
                {triggerElement}
              </button>
              {transportDropdownOpen && (
                <div className="status-filter-menu" style={{ width: '100%', zIndex: 200 }} onClick={e => e.stopPropagation()}>
                  {TRANSPORT_OPTIONS.map(opt => {
                    const isChecked = selectedTransports.includes(opt.value);
                    return (
                      <label key={opt.value} className="status-filter-item">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleTransportToggle(opt.value)}
                        />
                        <span>{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Дистанция */}
      <div className="filter-group">
        <label className="filter-label-with-toggle">
          <input
            type="checkbox"
            checked={draftFilters.useDistance}
            onChange={(e) => updateFilter('useDistance', e.target.checked)}
          />
          <span className="filter-label-text">Дистанция</span>
        </label>

        {draftFilters.useDistance && (
          <div className="slider-filter-anim-container">
            <DualRangeSlider
              unit="км"
              min={0}
              max={maxAvailableDistance}
              minValue={draftFilters.distance[0]}
              maxValue={draftFilters.distance[1]}
              onChange={(min, max) => updateFilter('distance', [min, max])}
            />
          </div>
        )}
      </div>

      {/* Длительность */}
      <div className="filter-group">
        <label className="filter-label-with-toggle">
          <input
            type="checkbox"
            checked={draftFilters.useDuration}
            onChange={(e) => updateFilter('useDuration', e.target.checked)}
          />
          <span className="filter-label-text">Длительность</span>
        </label>

        {draftFilters.useDuration && (
          <div className="slider-filter-anim-container">
            <DualRangeSlider
              min={0}
              max={maxAvailableDuration}
              minValue={draftFilters.duration[0]}
              maxValue={draftFilters.duration[1]}
              formatValue={formatDuration}
              transformValue={getSnappedTime}
              onChange={(min, max) => updateFilter('duration', [min, max])}
            />
          </div>
        )}
      </div>

      {/* Точки (Старт, Финиш...) */}
      {showMilestonesToggle && (
        <div className="filter-group">
          <label className="filter-label-with-toggle">
            <input
              type="checkbox"
              checked={showMilestones}
              onChange={(e) => onMilestonesToggle(e.target.checked)}
            />
            <span className="filter-label-text">Контрольные точки</span>
          </label>
        </div>
      )}

      {/* Видео маркеры */}
      {showVideosToggle && (() => {
        const options = [
          { value: 'by_route', label: 'По маршрутам' },
          { value: 'all', label: 'Все видео' },
          { value: 'none', label: 'Скрыть' }
        ];
        let currentVal = 'none';
        if (showVideos) {
          currentVal = videoFilterMode;
        }
        const activeOpt = options.find(o => o.value === currentVal) || options[0];

        return (
          <div className="filter-group" ref={videoDropdownRef}>
            <label htmlFor="video-marker-select" className="filter-label" style={{ marginBottom: '6px', display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#4b5563' }}>Видео маркеры</label>
            <div className="status-filter-dropdown" style={{ position: 'relative', width: '100%' }}>
              <button
                type="button"
                id="video-marker-select"
                className={`sort-select status-filter-trigger${videoDropdownOpen ? ' status-filter-trigger--open' : ''}`}
                style={{ width: '100%', display: 'block', textAlign: 'left' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setVideoDropdownOpen(!videoDropdownOpen);
                }}
              >
                <span>{activeOpt.label}</span>
              </button>
              {videoDropdownOpen && (
                <div className="status-filter-menu" style={{ width: '100%', zIndex: 200 }} onClick={e => e.stopPropagation()}>
                  {options.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`status-filter-option-btn${currentVal === opt.value ? ' active' : ''}`}
                      onClick={() => {
                        if (opt.value === 'none') {
                          onVideoModeChange(false, 'all');
                        } else {
                          onVideoModeChange(true, opt.value);
                        }
                        setVideoDropdownOpen(false);
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Дополнительные фильтры */}
      {showAdvanced && (
        <>
          <div className="filter-group">
            <label className="filter-checkbox-group" htmlFor="only-active-checkbox">
              <input
                id="only-active-checkbox"
                type="checkbox"
                checked={draftFilters.onlyActive}
                onChange={(e) => updateFilter('onlyActive', e.target.checked)}
              />
              <span>Только с набором</span>
            </label>
          </div>

          {user && (
            <div className="filter-group">
              <label className="filter-checkbox-group" htmlFor="only-completed-checkbox">
                <input
                  id="only-completed-checkbox"
                  type="checkbox"
                  checked={draftFilters.onlyCompleted}
                  onChange={(e) => updateFilter('onlyCompleted', e.target.checked)}
                />
                <span>Скрыть пройденные</span>
              </label>
            </div>
          )}
        </>
      )}

      {/* Добавить на карту и пагинация для страницы карты */}
      {mapAdditions}

      {/* Кнопки действий */}
      <div className="filter-actions">
        <button
          className="apply-filters-btn"
          disabled={!isDraftDirty}
          onClick={applyFilters}
        >
          Применить
        </button>
        <button
          className="clear-filters-btn"
          disabled={!isFilterActive && !isDraftDirty}
          onClick={resetFilters}
        >
          Сбросить
        </button>
      </div>
    </div>
  );
};
