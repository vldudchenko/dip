import React, { useCallback, useMemo } from 'react';

/**
 * Универсальный двойной слайдер для выбора числовых интервалов
 */
export const DualRangeSlider = ({ 
  min = 0, 
  max = 100, 
  step = 1, 
  minValue, 
  maxValue, 
  onChange, 
  onAfterChange,
  label,
  formatValue = (v) => v,
  transformValue,
  unit = '',
  disabled = false
}) => {
  
  const getPercents = useCallback((value) => {
    if (max === min) return 0;
    return ((value - min) / (max - min)) * 100;
  }, [min, max]);

  const activeRangeStyle = useMemo(() => {
    const left = getPercents(minValue);
    const right = getPercents(maxValue);
    return {
      left: `${left}%`,
      width: `${right - left}%`
    };
  }, [minValue, maxValue, getPercents]);

  const handleMinChange = (e) => {
    let value = Number(e.target.value);
    if (transformValue) {
      value = transformValue(value, max);
    }
    const finalValue = Math.min(value, maxValue);
    onChange(finalValue, maxValue);
  };

  const handleMaxChange = (e) => {
    let value = Number(e.target.value);
    if (transformValue) {
      value = transformValue(value, max);
    }
    const finalValue = Math.max(value, minValue);
    onChange(minValue, finalValue);
  };

  const handleMouseUp = () => {
    if (onAfterChange) {
      onAfterChange(minValue, maxValue);
    }
  };

  return (
    <div className={`dual-range-slider-wrapper ${disabled ? 'disabled' : ''}`}>
      <div className="slider-header">
        {label && <span className="slider-label">{label}</span>}
        <span className="slider-value">
          {formatValue(minValue)} - {formatValue(maxValue)} {unit}
        </span>
      </div>
      
      <div className="range-slider-container" onMouseUp={handleMouseUp} onKeyUp={handleMouseUp}>
        <div className="vlad-range-track"></div>
        <div className="vlad-range-active" style={activeRangeStyle}></div>
        
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={minValue}
          onChange={handleMinChange}
          disabled={disabled}
          className="filter-range min-range"
          aria-label={`Минимальное значение ${label}`}
          style={{ zIndex: minValue > max / 2 ? 5 : 4 }}
        />
        
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={maxValue}
          onChange={handleMaxChange}
          disabled={disabled}
          className="filter-range max-range"
          aria-label={`Максимальное значение ${label}`}
          style={{ zIndex: minValue > max / 2 ? 4 : 5 }}
        />
      </div>
    </div>
  );
};
