import { validateProfiles, validateClaimExpertise, validateVesselTypes } from '../../js/experts.js';

export const requiredFields = ['name', 'id', 'role', 'region', 'city', 'country', 'latitude', 'longitude'];
export const optionalFields = ['email', 'phone', 'imageUrl', 'imagePath', 'sourceUrl'];
export const selectionFields = ['claimExpertise', 'vesselTypes'];

export function profileId(name) {
  return name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// Keep input conversion separate from the UI so downloads and previews agree.
export function buildProfile(values, existingProfile = {}) {
  const errors = {};
  const text = field => String(values[field] ?? '').trim();
  const profile = { ...existingProfile };
  for (const field of ['id', 'name', 'role']) profile[field] = text(field);
  delete profile.expertise;
  profile.claimExpertise = values.claimExpertise ?? [];
  profile.vesselTypes = values.vesselTypes ?? [];
  if (!validateClaimExpertise(profile.claimExpertise)) errors.claimExpertise = 'Choose valid claim sub-categories from the list.';
  if (!validateVesselTypes(profile.vesselTypes)) errors.vesselTypes = 'Choose valid vessel types from the list.';
  for (const field of ['region', 'city', 'country']) profile[field] = text(field);
  for (const field of ['latitude', 'longitude']) {
    const value = text(field);
    // null makes unfinished JSON explicit; a blank coordinate must never become 0.
    profile[field] = value && Number.isFinite(Number(value)) ? Number(value) : null;
  }
  for (const field of optionalFields) {
    delete profile[field];
    if (text(field)) profile[field] = text(field);
  }

  for (const field of requiredFields) {
    if (!text(field)) errors[field] = 'This field is required.';
  }
  if (profile.id && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(profile.id)) errors.id = 'Use lowercase letters, numbers and single hyphens.';
  if (profile.id === 'index') errors.id = 'Choose another ID; index.json is reserved for the profile list.';
  for (const [field, limit] of [['latitude', 90], ['longitude', 180]]) {
    if (text(field) && (profile[field] === null || Math.abs(profile[field]) > limit)) errors[field] = `Enter a number between −${limit} and ${limit}.`;
  }
  if (profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) errors.email = 'Enter a valid email address.';
  if (profile.phone && (!/^\+?[\d\s().-]+$/.test(profile.phone) || !/\d/.test(profile.phone))) errors.phone = 'Use numbers, spaces, +, parentheses, dots or hyphens.';
  for (const field of ['imageUrl', 'sourceUrl']) {
    if (!profile[field]) continue;
    try {
      const url = new URL(profile[field]);
      if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Unsupported URL');
    } catch { errors[field] = 'Enter a full URL starting with https:// or http://.'; }
  }
  if (profile.imagePath && (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(profile.id) ||
    !['jpg', 'png', 'webp'].some(extension => profile.imagePath === `images/profiles/${profile.id}.${extension}`))) {
    errors.imagePath = 'Use images/profiles/<profile-id>.jpg, .png or .webp, matching the ID above.';
  }
  if (!Object.keys(errors).length) validateProfiles({ [`${profile.id}.json`]: profile });
  return { profile, errors };
}

export function profileJSON(profile) {
  return `${JSON.stringify(profile, null, 2)}\n`;
}

export function readProfileJSON(source) {
  let profile;
  try { profile = JSON.parse(source.replace(/^\uFEFF/, '')); }
  catch { throw new Error('The file is not valid JSON.'); }
  // Validate before changing the form, so rejected files cannot erase edits.
  validateProfiles({ 'Profile': profile });
  const values = Object.fromEntries([...requiredFields, ...optionalFields].map(field => [
    field, String(profile[field] ?? ''),
  ]));
  for (const field of selectionFields) values[field] = profile[field] ?? [];
  return { profile, values };
}
