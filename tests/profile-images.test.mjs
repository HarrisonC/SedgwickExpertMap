import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateProfiles } from '../js/experts.js';
import { loadProfiles } from '../scripts/validate-experts.mjs';
import { imageExtension } from '../scripts/download-profile-images.mjs';

test('local portrait paths stay inside the profile image folder and match the expert', () => {
  const profile = loadProfiles('data/experts')[0];
  for (const imagePath of ['https://example.com/photo.jpg','/images/profiles/adam-jackson.jpg','images/profiles/../photo.jpg','images/profiles/someone-else.png','javascript:alert(1)']) {
    assert.throws(()=>validateProfiles({'profile.json':{...profile,imagePath}}), /imagePath/);
  }
  for (const extension of ['jpg','png','webp']) {
    assert.equal(validateProfiles({'profile.json':{...profile,imagePath:`images/profiles/${profile.id}.${extension}`}}).length,1);
  }
});

test('every existing expert has a local portrait with matching image bytes', () => {
  const profiles = loadProfiles('data/experts');
  assert.equal(profiles.length,34);
  for (const profile of profiles) {
    assert.ok(profile.imageUrl.startsWith('https://www.sedgwick.com/'));
    assert.ok(profile.imagePath,`${profile.id}: missing local portrait`);
    const bytes = readFileSync(profile.imagePath);
    assert.ok(profile.imagePath.endsWith(`.${imageExtension(bytes)}`));
  }
});

test('image validation rejects HTML error pages and empty downloads', () => {
  assert.throws(()=>imageExtension(Buffer.from('<html>Not an image</html>')), /not a supported/);
  assert.throws(()=>imageExtension(Buffer.alloc(0)), /truncated/);
});
