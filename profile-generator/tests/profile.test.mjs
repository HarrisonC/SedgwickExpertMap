import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProfile, optionalFields, profileId, profileJSON, requiredFields } from '../js/profile.js';
import { validateProfiles } from '../../js/experts.js';

const input = {
  id: 'alex-morgan', name: 'Alex Morgan', role: 'Marine cargo surveyor',
  expertise: 'Cargo, Marine engineering', region: 'Europe', city: 'London',
  country: 'United Kingdom', latitude: '51.5074', longitude: '-0.1278',
};

test('generator produces a downloadable profile accepted by the map', () => {
  const { profile, errors } = buildProfile({ ...input, name: ' Alex Morgan ', email: ' alex@example.com ' });
  assert.deepEqual(errors, {});
  assert.equal(profile.name, 'Alex Morgan');
  assert.equal(profile.email, 'alex@example.com');
  assert.equal(profile.latitude, 51.5074);
  assert.equal(profile.longitude, -0.1278);
  assert.deepEqual(profile.expertise, ['Cargo', 'Marine engineering']);
  const downloaded = JSON.parse(profileJSON(profile));
  assert.deepEqual(validateProfiles({ 'alex-morgan.json': downloaded }), [profile]);
  assert.ok(profileJSON(profile).endsWith('\n'));
});

test('blank required fields are rejected and blank coordinates do not become zero', () => {
  const { profile, errors } = buildProfile({});
  assert.deepEqual(Object.keys(errors).sort(), [...requiredFields].sort());
  assert.equal(profile.latitude, null);
  assert.equal(profile.longitude, null);
  for (const field of requiredFields) assert.ok(buildProfile({ ...input, [field]: '  ' }).errors[field], field);
  assert.deepEqual(buildProfile({ ...input, latitude: '0', longitude: '0' }).errors, {});
});

test('invalid numbers and out-of-range coordinates are rejected, boundaries are valid', () => {
  for (const [field, value] of [['latitude', '91'], ['latitude', '-90.1'], ['longitude', '180.1'], ['longitude', '-181'], ['latitude', 'NaN'], ['longitude', 'Infinity'], ['latitude', 'not a number']]) {
    assert.ok(buildProfile({ ...input, [field]: value }).errors[field], `${field}=${value}`);
  }
  assert.deepEqual(buildProfile({ ...input, latitude: '-90', longitude: '180' }).errors, {});
});

test('expertise handles new lines, repeated labels and empty separators', () => {
  assert.deepEqual(buildProfile({ ...input, expertise: ' Cargo, cargo\n Marine engineering, ,Cargo\n' }).profile.expertise, ['Cargo', 'Marine engineering']);
  assert.ok(buildProfile({ ...input, expertise: ',\n, ' }).errors.expertise);
});

test('profile IDs are suggested from names and checked for safe export filenames', () => {
  assert.equal(profileId('  José O’Neill-Smith  '), 'jose-oneill-smith');
  for (const id of ['Alex', '../alex', 'alex--morgan', 'alex.json', 'index']) assert.ok(buildProfile({ ...input, id }).errors.id, id);
  assert.deepEqual(buildProfile({ ...input, id: 'alex-morgan-2' }).errors, {});
});

test('optional blanks are omitted and invalid contact details identify their fields', () => {
  const blanks = Object.fromEntries(optionalFields.map(field => [field, '  ']));
  const { profile } = buildProfile({ ...input, ...blanks, portraitSrc: 'do not export' });
  for (const field of [...optionalFields, 'portraitSrc']) assert.equal(Object.hasOwn(profile, field), false);
  for (const [field, value] of [['email', 'not-email'], ['phone', 'call me'], ['phone', '...']]) assert.ok(buildProfile({ ...input, [field]: value }).errors[field]);
  assert.deepEqual(buildProfile({ ...input, email: 'alex@example.com', phone: '+44 (0) 20 1234 5678' }).errors, {});
});

test('URLs require HTTP(S) and local portraits must match the profile ID', () => {
  for (const field of ['sourceUrl', 'imageUrl']) {
    for (const value of ['javascript:alert(1)', 'file:///photo.jpg', 'portrait.jpg', 'https://']) assert.ok(buildProfile({ ...input, [field]: value }).errors[field]);
    assert.deepEqual(buildProfile({ ...input, [field]: 'https://example.com/photo.jpg' }).errors, {});
  }
  for (const imagePath of ['images/profiles/other.jpg', 'images/profiles/alex-morgan.svg', '../alex-morgan.jpg']) assert.ok(buildProfile({ ...input, imagePath }).errors.imagePath);
  for (const extension of ['jpg', 'png', 'webp']) assert.deepEqual(buildProfile({ ...input, imagePath: `images/profiles/alex-morgan.${extension}` }).errors, {});
});
