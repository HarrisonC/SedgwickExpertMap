import test from 'node:test';
import assert from 'node:assert/strict';
import { loadExpertProfiles } from '../js/load-experts.js';

const profile = {id: 'alex', name: 'Alex', role: 'Surveyor', expertise: ['Cargo'], region: 'Europe', city: 'London', country: 'UK', latitude: 51, longitude: 0, imagePath: 'images/profiles/alex.jpg'};
const indexUrl = 'https://example.com/map/data/experts/index.json';
const fallbackEntries = {'alex.json': profile};
const embeddedImages = {[profile.imagePath]: 'data:image/jpeg;base64,test'};
const response = value => ({ok: true, json: async () => value});
const options = {indexUrl, fallbackEntries, embeddedImages};

test('remote profiles replace the snapshot and portraits resolve against the hosted site', async () => {
  const requests = [];
  const result = await loadExpertProfiles({...options, fetchImpl: async (url, init) => {
    requests.push(url);
    assert.equal(init.cache, 'no-store');
    return response(url === indexUrl ? ['alex.json'] : {...profile, name: 'Updated Alex'});
  }});
  assert.equal(result[0].name, 'Updated Alex');
  assert.equal(result[0].portraitSrc, 'https://example.com/map/images/profiles/alex.jpg');
  assert.deepEqual(requests, [indexUrl, 'https://example.com/map/data/experts/alex.json']);
});

test('network, HTTP, JSON, index and profile failures use the entire embedded snapshot', async () => {
  for (const fetchImpl of [
    async () => {throw new TypeError('Network/CORS');},
    async () => ({ok: false, status: 404}),
    async () => ({ok: true, json: async () => {throw new SyntaxError('Invalid JSON');}}),
    async () => response(['../escape.json']),
    async () => response(['alex.json', 'alex.json']),
    async url => response(url === indexUrl ? ['alex.json'] : {...profile, latitude: 100}),
    async url => url === indexUrl ? response(['alex.json', 'missing.json']) : url.endsWith('/alex.json') ? response({...profile, name: 'Partial update'}) : {ok: false, status: 404},
  ]) {
    const result = await loadExpertProfiles({...options, fetchImpl});
    assert.equal(result[0].name, 'Alex');
    assert.equal(result[0].portraitSrc, embeddedImages[profile.imagePath]);
  }
});

test('a stalled response body times out and aborts requests', async () => {
  let signal;
  const result = await loadExpertProfiles({...options, timeoutMs: 10, fetchImpl: async (_, init) => {
    signal = init.signal;
    return {ok: true, json: () => new Promise(() => {})};
  }});
  assert.equal(result[0].name, 'Alex');
  assert.equal(signal.aborted, true);
});

test('online loading uses the same loader with relative URLs and reports errors without a snapshot', async () => {
  const result = await loadExpertProfiles({baseUrl: 'https://example.com/map/', fetchImpl: async url => response(url === indexUrl ? ['alex.json'] : profile)});
  assert.equal(result[0].name, 'Alex');
  await assert.rejects(loadExpertProfiles({indexUrl, fetchImpl: async () => ({ok: false, status: 503})}), /503/);
});

test('an intentionally empty hosted index replaces embedded profiles', async () => {
  assert.deepEqual(await loadExpertProfiles({...options, fetchImpl: async () => response([])}), []);
});
