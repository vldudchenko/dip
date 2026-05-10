import React, { useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Map } from '../Map';
import { calculateTotalDistance } from '../../utils/routeHelpers';

/**
 * Секция с интерактивной картой маршрута и отображением дистанции
 */
const RouteMapSection = memo(({ routeId, pathData, videos, ymapsReady, loadError, isGuide }) => {
  const navigate = useNavigate();
  const totalDistance = useMemo(() => calculateTotalDistance(pathData), [pathData]);

  if (!pathData || pathData.length === 0) {
    return isGuide ? (
      <div style={{ marginBottom: '40px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
        <p style={{ color: '#6b7280', marginBottom: '15px' }}>
          У данного маршрута еще не построен путь.<br />Перейдите на страницу построения маршрута, чтобы построить его.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            className="btn btn--secondary btn--small"
            onClick={() => navigate(`/route/${routeId}/path`)}
          >
            Построить маршрут
          </button>
        </div>
      </div>
    ) : (
      <div style={{ marginBottom: '40px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
        <p style={{ color: '#6b7280' }}>Путь для этого маршрута еще не проложен автором.</p>
      </div>
    );
  }

  return (
    <div className="route-detail-map" style={{ marginBottom: isGuide ? '20px' : '40px', position: 'relative' }}>
      <div className="route-path-map-container" style={{ height: '400px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ddd', position: 'relative' }}>
        <Map
          mode="route-viewer"
          routePoints={pathData}
          videos={videos}
          ymapsReady={ymapsReady}
          loadError={loadError}
          configLoaded={true}
          onReset={() => {}}
        />
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          zIndex: 1000,
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '4px 10px',
          borderRadius: '6px',
          border: '1px solid #ccc',
          fontSize: '0.85rem',
          fontWeight: '600',
          color: '#374151',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          Расстояние ~ {totalDistance.toFixed(1)} км
        </div>
      </div>

      {isGuide && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
          <button className="btn btn--secondary btn--small" onClick={() => navigate(`/route/${routeId}/path`)}>
            Редактировать путь
          </button>
        </div>
      )}
    </div>
  );
});

export default RouteMapSection;
