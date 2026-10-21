const initialCenter = [0, 20];
const initialZoom = 0.8;

export function mapCoordinates({ lng, lat }) {
  if (!Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lat) > 90) throw new Error('Invalid map location');
  return {
    latitude: Number(lat.toFixed(6)),
    longitude: Number(((((lng + 180) % 360) + 360) % 360 - 180).toFixed(6)),
  };
}

// Only a deliberate click, marker drag or centre selection commits a location.
export function createLocationMap({ mapboxgl, container, accessToken, onSelect, onStatus }) {
  let map, marker, timer, ready = false;
  const status = (message, available = false) => {
    ready = available;
    onStatus(message, available);
  };
  const select = lngLat => {
    if (!ready) return;
    const coordinates = mapCoordinates(lngLat);
    marker.setLngLat([coordinates.longitude, coordinates.latitude]);
    onSelect(coordinates);
  };
  try {
    if (!mapboxgl || !accessToken) throw new Error('Map configuration missing');
    map = new mapboxgl.Map({
      container, accessToken, style: 'mapbox://styles/mapbox/light-v11',
      projection: 'equirectangular', center: initialCenter, zoom: initialZoom,
      minZoom: 0, maxZoom: 19, maxBounds: [[-180, -85], [180, 85]],
      renderWorldCopies: false,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();
    marker = new mapboxgl.Marker({ draggable: true, color: '#212121' }).setLngLat(initialCenter).addTo(map);
    marker.getElement().setAttribute('aria-label', 'Drag expert location marker');
    marker.on('dragend', () => select(marker.getLngLat()));
    map.on('click', event => select(event.lngLat));
    map.on('load', () => {
      clearTimeout(timer);
      if (map.getLayer('water')) map.setPaintProperty('water', 'fill-color', '#b9dbe9');
      status('', true);
    });
    map.on('error', event => {
      if (/401|403|token|unauthorized/i.test(event.error?.message || '')) {
        clearTimeout(timer);
        status('Map unavailable. Check the Mapbox token in config.js.');
      }
    });
    timer = setTimeout(() => status('Map unavailable. Check your connection and reload.'), 20000);
  } catch {
    status('Map unavailable. Check your connection and Mapbox configuration, then reload.');
  }
  return {
    useCenter() { if (ready) select(map.getCenter()); },
    setLocation({ latitude, longitude }) {
      // Loading a saved profile moves the marker without rounding its stored values
      // or firing the user-selection callback, including before the map loads.
      marker?.setLngLat([longitude, latitude]);
      map?.jumpTo({ center: [longitude, latitude], zoom: 4 });
    },
    reset() {
      marker?.setLngLat(initialCenter);
      map?.jumpTo({ center: initialCenter, zoom: initialZoom });
    },
    destroy() { clearTimeout(timer); map?.remove(); },
  };
}
