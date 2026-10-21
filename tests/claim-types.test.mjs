import test from 'node:test';
import assert from 'node:assert/strict';
import { claimTypes, vesselTypes } from '../js/claim-types.js';
import { filterExperts, validateProfiles } from '../js/experts.js';
import { loadProfiles } from '../scripts/validate-experts.mjs';

const base = {id: 'test', name: 'Test Expert', role: 'Surveyor', region: 'Europe', city: 'London', country: 'UK', latitude: 51, longitude: 0, vesselTypes: ['Cruise']};
const admiralty = {...base, claimExpertise: [{claimType: 'Admiralty', subCategory: 'Towage'}, {claimType: 'Cargo', subCategory: 'Dry Bulk'}]};
const salvage = {...base, id: 'salvage', region: 'Asia', claimExpertise: [{claimType: 'Emergency Response & Salvage', subCategory: 'Towage'}]};

test('catalogue retains every claim group and vessel type from the supplied spreadsheet', () => {
  assert.equal(Object.keys(claimTypes).length, 11);
  assert.equal(Object.values(claimTypes).flat().length, 53);
  assert.equal(vesselTypes.length, 26);
  assert.ok(claimTypes['Machinery & Technical Failure'].includes('Electrical, Power & Control (inc. DP)'));
});

test('claim type and sub-category match as a pair, including repeated sub-category names', () => {
  const experts = [admiralty, salvage, {...base, id: 'unassigned', claimExpertise: []}];
  assert.deepEqual(filterExperts(experts, 'Admiralty', 'Towage'), [admiralty]);
  assert.deepEqual(filterExperts(experts, 'Emergency Response & Salvage', 'Towage'), [salvage]);
  assert.deepEqual(filterExperts(experts, 'Cargo', 'all'), [admiralty]);
  assert.deepEqual(filterExperts(experts, 'Cargo', 'Dry Bulk', 'Asia'), []);
  assert.deepEqual(filterExperts(experts, 'Admiralty', 'Dry Bulk'), []);
  assert.deepEqual(filterExperts(experts), experts);
  assert.deepEqual(filterExperts(experts, 'Cruise'), []);
});

test('validation rejects unknown, duplicate and mismatched assignments', () => {
  for (const claimExpertise of [null, 'Cargo', ['Cargo'], [null], [{claimType: 'toString', subCategory: 'Towage'}], [{claimType: 'Cargo', subCategory: 'Towage'}], [admiralty.claimExpertise[0], admiralty.claimExpertise[0]]]) {
    assert.throws(() => validateProfiles({'test.json': {...base, claimExpertise}}), /claimExpertise/);
  }
  for (const types of [null, 'Cruise', ['Unknown'], ['Cruise', 'Cruise']]) {
    assert.throws(() => validateProfiles({'test.json': {...admiralty, vesselTypes: types}}), /vesselTypes/);
  }
  assert.equal(validateProfiles({'test.json': {...admiralty, claimExpertise: [...admiralty.claimExpertise, ...salvage.claimExpertise]}}).length, 1);
});

test('all active profiles use claim and vessel arrays instead of old expertise', () => {
  for (const profile of loadProfiles('data/experts')) {
    assert.ok(Array.isArray(profile.claimExpertise));
    assert.ok(Array.isArray(profile.vesselTypes));
    assert.equal(Object.hasOwn(profile, 'expertise'), false);
  }
});
