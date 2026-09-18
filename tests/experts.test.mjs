import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateProfiles, filterExperts, inBounds, fitExtent } from '../lib/experts.ts';
import { loadProfiles } from '../scripts/validate-experts.mjs';
const expert = { id: 'alex', name: 'Alex', role: 'Surveyor', expertise: ['Cargo'], region: 'Europe', city: 'London', country: 'UK', latitude: 51.5, longitude: -.12 };
test('profiles added as files are discovered, sorted, and removed without a registry', () => {
  const dir = mkdtempSync(join(tmpdir(), 'marine-experts-'));
  try {
    writeFileSync(join(dir, 'b.json'), JSON.stringify({...expert, id: 'bea', name: 'Bea'}));
    assert.equal(loadProfiles(dir).length, 1);
    writeFileSync(join(dir, 'a.json'), JSON.stringify(expert));
    assert.deepEqual(loadProfiles(dir).map(p => p.name), ['Alex', 'Bea']);
    rmSync(join(dir, 'a.json')); assert.equal(loadProfiles(dir).length, 1);
    writeFileSync(join(dir, 'bad.json'), '{broken');
    assert.throws(() => loadProfiles(dir), /bad.json: invalid JSON/);
  } finally { rmSync(dir, {recursive: true}); }
});
test('invalid profiles identify the file and field', () => {
  for (const [field, value] of [['name', ''], ['latitude', 91], ['longitude', -181], ['expertise', []], ['email', 'wrong'], ['phone', 'javascript:alert(1)']]) {
    assert.throws(() => validateProfiles({'bad.json': {...expert, [field]: value}}), new RegExp(`bad.json: ${field}`));
  }
  assert.throws(() => validateProfiles({'one.json': expert, 'two.json': expert}), /two.json: duplicate id/);
});
test('filters combine and permit empty results', () => {
  const other = {...expert, id: 'b', region: 'Asia', expertise: ['Engineering']};
  assert.equal(filterExperts([expert, other], 'all', 'all').length, 2);
  assert.deepEqual(filterExperts([expert, other], 'Cargo', 'Europe'), [expert]);
  assert.equal(filterExperts([expert, other], 'Cargo', 'Asia').length, 0);
});
test('viewport includes each colocated expert independently', () => {
  const bounds = {west: -1, east: 1, south: 50, north: 52};
  assert.equal([expert, {...expert, id: 'b'}].filter(p => inBounds(p, bounds)).length, 2);
  assert.equal(inBounds({...expert, latitude: 53}, bounds), false);
});
test('longitude wrap, whole world, and antimeridian are handled', () => {
  const point = {...expert, latitude: 0, longitude: -179};
  assert.equal(inBounds(point, {west: 170, east: -170, south: -10, north: 10}), true);
  assert.equal(inBounds(point, {west: 170, east: 190, south: -10, north: 10}), true);
  assert.equal(inBounds(point, {west: -180, east: 180, south: -90, north: 90}), true);
  assert.equal(inBounds({...point, longitude: 0}, {west: 170, east: -170, south: -10, north: 10}), false);
  const extent = fitExtent([point, {...point, longitude: 179}]);
  assert.equal(extent[1][0] - extent[0][0], 2);
  assert.equal(fitExtent([]), null);
});
test('sample dataset validates and includes 30 fictional profiles', () => {
  const profiles = loadProfiles('data/experts');
  assert.equal(profiles.length, 30);
  assert.ok(profiles.every(p => p.email.endsWith('@example.com') && !p.phone));
});
