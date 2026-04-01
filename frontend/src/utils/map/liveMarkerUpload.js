import { createPointMarkerElement, removeMapEntity } from './helpers';

/**
 * Контроллер для создания live-маршрута с двумя точками
 */
export class LiveMarkerUploadController {
  constructor(map) {
    this.map = map;
    this.isActive = false;
    this.startPoint = null;
    this.endPoint = null;
    this.routeGeometry = null;
    this.startMarker = null;
    this.endMarker = null;
    this.multiRoute = null;
  }

  activate(startPoint) {
    this.reset();
    this.isActive = true;
    this.startPoint = startPoint;
    this.startMarker = this.createPointMarker(startPoint, '#22c55e');
  }

  async complete(endPoint, buildRouteFn) {
    if (!this.isActive || !this.startPoint) {
      return null;
    }

    this.endPoint = endPoint;
    this.endMarker = this.createPointMarker(endPoint, '#ef4444');

    const start = { lat: this.startPoint[1], lng: this.startPoint[0] };
    const end = { lat: endPoint[1], lng: endPoint[0] };
    const route = await buildRouteFn(start, end);

    if (!route?.geometry?.length) {
      throw new Error('Не удалось построить пешеходный маршрут');
    }

    this.routeGeometry = route.geometry;
    this.multiRoute = this.drawRouteLine(this.routeGeometry);
    this.isActive = false;

    return {
      routeStart: start,
      routeEnd: end,
      routeGeometry: this.routeGeometry
    };
  }

  getRouteData() {
    if (!this.startPoint || !this.endPoint || !this.routeGeometry?.length) {
      return null;
    }

    return {
      routeStart: { lat: this.startPoint[1], lng: this.startPoint[0] },
      routeEnd: { lat: this.endPoint[1], lng: this.endPoint[0] },
      routeGeometry: this.routeGeometry
    };
  }

  reset() {
    this.isActive = false;
    this.startPoint = null;
    this.endPoint = null;
    this.routeGeometry = null;
    this.removeMapEntity(this.startMarker);
    this.removeMapEntity(this.endMarker);
    this.removeMapEntity(this.multiRoute);
    this.startMarker = null;
    this.endMarker = null;
    this.multiRoute = null;
  }

  createPointMarker(coords, color) {
    const { YMapMarker } = window.ymaps3;
    const element = createPointMarkerElement(color);
    const marker = new YMapMarker({ coordinates: coords }, element);
    this.map.addChild(marker);
    return marker;
  }

  drawRouteLine(geometry) {
    const { YMapFeature } = window.ymaps3;
    const line = new YMapFeature({
      geometry: {
        type: 'LineString',
        coordinates: geometry
      },
      style: {
        stroke: [{
          color: '#7c3aed',
          width: 4,
          opacity: 0.9
        }]
      }
    });

    this.map.addChild(line);
    return line;
  }

  removeMapEntity(entity) {
    removeMapEntity(this.map, entity);
  }
}
