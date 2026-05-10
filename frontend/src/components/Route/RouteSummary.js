import React, { useMemo, memo } from 'react';
import { generateRouteDescription } from '../../utils/routeHelpers';

/**
 * Краткое текстовое описание маршрута (старт, сегменты с транспортом, финиш)
 */
const RouteSummary = memo(({ pathData, addresses }) => {
  const segments = useMemo(() => generateRouteDescription(pathData, addresses), [pathData, addresses]);

  if (segments.length === 0) return null;

  return (
    <div className="route-summary" style={{ padding: '12px' }}>
      <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '4px 12px', fontSize: '0.9rem', color: '#4b5563', lineHeight: '1.2' }}>
        {segments.map((seg, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            {!seg.isStart && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#6b7280', fontStyle: 'italic', fontSize: '0.85rem' }}>
                <span>➔</span>
                <span>{seg.transition}</span>
                <span>➔</span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0px', padding: '2px 0' }}>
              <span style={{ fontWeight: '600', color: '#111827', whiteSpace: 'nowrap' }}>{seg.title}</span>
              {seg.address && (
                <span style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '-2px' }}>{seg.address}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export default RouteSummary;
