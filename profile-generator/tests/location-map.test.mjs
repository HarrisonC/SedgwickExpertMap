import test from 'node:test';
import assert from 'node:assert/strict';
import { createLocationMap, mapCoordinates } from '../js/location-map.js';
import { buildProfile } from '../js/profile.js';

function fixture(t) {
  let map, marker;
  const selections = [], statuses = [];
  class FakeMap {
    constructor(options) { map = this; this.options = options; this.events = {}; this.center = { lng: 10, lat: 30 }; }
    dragRotate = { disable() {} };
    touchZoomRotate = { disableRotation() {} };
    addControl() {}
    on(name, fn) { this.events[name] = fn; }
    getLayer() { return false; }
    getCenter() { return this.center; }
    jumpTo(options) { this.lastJump = options; }
    remove() { this.removed = true; }
  }
  class FakeMarker {
    constructor(options) { marker = this; this.options = options; this.events = {}; }
    setLngLat([lng, lat]) { this.position = { lng, lat }; return this; }
    getLngLat() { return this.position; }
    addTo() { return this; }
    getElement() { return { setAttribute() {} }; }
    on(name, fn) { this.events[name] = fn; }
  }
  const picker = createLocationMap({
    mapboxgl: { Map: FakeMap, Marker: FakeMarker, NavigationControl: class {} },
    container: 'map', accessToken: 'public-test-token',
    onSelect: coordinates => selections.push(coordinates),
    onStatus: (message, ready) => statuses.push({ message, ready }),
  });
  t.after(() => picker.destroy());
  return { picker, map, marker, selections, statuses };
}

test('location picker requires deliberate selection after the map is ready', t => {
  const { map, marker, picker, selections, statuses } = fixture(t);
  assert.equal(marker.options.draggable, true);
  picker.useCenter();
  assert.deepEqual(selections, []);
  map.events.load();
  assert.deepEqual(selections, []);
  assert.deepEqual(statuses.at(-1), { message: '', ready: true });
  picker.useCenter();
  assert.deepEqual(selections, [{ latitude: 30, longitude: 10 }]);
});

test('click and drag export the chosen map location as valid numeric coordinates', t => {
  const { map, marker, selections } = fixture(t);
  map.events.load();
  map.events.click({ lngLat: { lng: -0.1278004, lat: 51.5074001 } });
  assert.deepEqual(selections.at(-1), { latitude: 51.5074, longitude: -0.1278 });
  marker.setLngLat([151.2093, -33.8688]);
  marker.events.dragend();
  assert.deepEqual(selections.at(-1), { latitude: -33.8688, longitude: 151.2093 });
  const { profile, errors } = buildProfile({
    name: 'Test Expert', id: 'test-expert', role: 'Surveyor', expertise: 'Marine',
    region: 'Oceania', city: 'Sydney', country: 'Australia', ...selections.at(-1),
  });
  assert.deepEqual(errors, {});
  assert.equal(profile.latitude, -33.8688);
  assert.equal(profile.longitude, 151.2093);
});

test('reset restores the initial map and marker without selecting that location', t => {
  const { map, marker, picker, selections } = fixture(t);
  map.events.load();
  picker.useCenter();
  picker.reset();
  assert.deepEqual(marker.position, { lng: 0, lat: 20 });
  assert.deepEqual(map.lastJump, { center: [0, 20], zoom: 0.8 });
  assert.equal(selections.length, 1);
});

test('imported locations move the marker before map load without modifying coordinates', t => {
  const { map, marker, picker, selections } = fixture(t);
  const location = { latitude: 51.50740012345, longitude: -0.12780098765 };
  picker.setLocation(location);
  assert.deepEqual(marker.position, { lng: location.longitude, lat: location.latitude });
  assert.deepEqual(map.lastJump, { center: [location.longitude, location.latitude], zoom: 4 });
  map.events.load();
  assert.deepEqual(marker.position, { lng: location.longitude, lat: location.latitude });
  assert.deepEqual(selections, []);
  picker.reset();
  assert.deepEqual(marker.position, { lng: 0, lat: 20 });
});

test('unavailable maps report an error and do not commit a location', t => {
  const { map, picker, selections, statuses } = fixture(t);
  map.events.error({ error: new Error('HTTP 401 Unauthorized') });
  picker.useCenter();
  assert.equal(statuses.at(-1).ready, false);
  assert.match(statuses.at(-1).message, /token/);
  assert.deepEqual(selections, []);
  const failures = [];
  const missing = createLocationMap({ mapboxgl: null, onStatus: message => failures.push(message) });
  assert.match(failures[0], /Map unavailable/);
  missing.destroy();
});

test('map coordinates wrap longitude and retain zero and hemisphere signs', () => {
  assert.deepEqual(mapCoordinates({ lng: 181, lat: 0 }), { longitude: -179, latitude: 0 });
  assert.deepEqual(mapCoordinates({ lng: -181, lat: -10 }), { longitude: 179, latitude: -10 });
  assert.deepEqual(mapCoordinates({ lng: 0, lat: 0 }), { longitude: 0, latitude: 0 });
  assert.throws(() => mapCoordinates({ lng: NaN, lat: 10 }), /Invalid map location/);
  assert.throws(() => mapCoordinates({ lng: 0, lat: 91 }), /Invalid map location/);
});
