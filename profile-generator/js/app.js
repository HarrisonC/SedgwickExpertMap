import { buildProfile, optionalFields, profileId, profileJSON, readProfileJSON, requiredFields, selectionFields } from './profile.js';
import { claimTypes, vesselTypes } from '../../js/claim-types.js';
import { config } from '../config.js';
import { createLocationMap } from './location-map.js';

const form = document.querySelector('#profile-form');
const fields = [...requiredFields, ...optionalFields, ...selectionFields];
const control = field => selectionFields.includes(field) ? document.getElementById(field) : form.elements.namedItem(field);
const touched = new Set();
const summary = document.querySelector('#error-summary');
const actionStatus = document.querySelector('#action-status');
const copyButton = document.querySelector('#copy-json');
let customId = false;
let submitted = false;
let current;
let locationMap;
let importedProfile = {};
let importVersion = 0;
const fileInput = document.querySelector('#profile-file');
const importStatus = document.querySelector('#import-status');
const importError = document.querySelector('#import-error');
const coordinateFields = ['latitude', 'longitude'];
const userRequiredFields = [...requiredFields.filter(field => !coordinateFields.includes(field)), 'location'];
const locationPicker = document.querySelector('#location-picker');

function focusField(field) {
  (coordinateFields.includes(field) ? locationPicker : control(field)).focus();
}

function displayErrors(errors) {
  for (const field of fields) {
    if (coordinateFields.includes(field)) continue;
    const input = control(field);
    const message = document.getElementById(`${field}-error`);
    const error = (submitted || touched.has(field)) && errors[field];
    input.setAttribute('aria-invalid', String(Boolean(error)));
    message.textContent = error || '';
    message.hidden = !error;
  }
  const locationError = (submitted || touched.has('location')) && (errors.latitude || errors.longitude);
  const message = document.querySelector('#location-error');
  message.textContent = locationError ? 'Select a location on the map.' : '';
  message.hidden = !locationError;
  locationPicker.setAttribute('aria-invalid', String(Boolean(locationError)));
  summary.hidden = !submitted || !Object.keys(errors).length;
  summary.replaceChildren();
  if (!summary.hidden) {
    const heading = document.createElement('p');
    heading.textContent = 'Check these details before downloading:';
    const list = document.createElement('ul');
    for (const [field, error] of Object.entries(errors)) {
      if (field === 'longitude' && errors.latitude) continue;
      const item = document.createElement('li');
      const link = document.createElement('a');
      const isLocation = coordinateFields.includes(field);
      link.href = `#${isLocation ? 'location-picker' : field}`;
      const label = isLocation ? '' : selectionFields.includes(field) ? document.getElementById(`${field}-label`).textContent : control(field).labels[0].textContent;
      link.textContent = isLocation ? 'Map location: Select a location on the map.' : `${label.replace('*', '').trim()}: ${error}`;
      link.addEventListener('click', event => { event.preventDefault(); focusField(field); });
      item.append(link);
      list.append(item);
    }
    summary.append(heading, list);
  }
}

function update() {
  const values = Object.fromEntries(new FormData(form));
  values.claimExpertise = [...form.querySelectorAll('[name="claimExpertise"]:checked')].map(input => JSON.parse(input.value));
  values.vesselTypes = [...form.querySelectorAll('[name="vesselTypes"]:checked')].map(input => input.value);
  current = buildProfile(values, importedProfile);
  const { profile, errors } = current;
  document.querySelector('#preview-name').textContent = profile.name || 'Expert name';
  document.querySelector('#preview-role').textContent = profile.role || 'Job title';
  document.querySelector('#preview-initials').textContent = profile.name ? profile.name.split(/\s+/).map(part => Array.from(part)[0]).slice(0, 2).join('').toUpperCase() : '—';
  document.querySelector('#preview-location').textContent = [profile.city.toLowerCase() === 'not published' ? '' : profile.city, profile.country].filter(Boolean).join(', ') || 'City, Country';
  const expertise = document.querySelector('#preview-expertise');
  expertise.replaceChildren(...(profile.claimExpertise.length ? profile.claimExpertise.map(item => `${item.claimType}: ${item.subCategory}`) : ['Claim expertise not yet assigned']).map(value => {
    const tag = document.createElement('span');
    tag.textContent = value;
    return tag;
  }));
  document.querySelector('#preview-vessels').textContent = `Vessel types: ${profile.vesselTypes.join(', ') || 'Not yet assigned'}`;
  const contact = document.querySelector('#preview-contact');
  contact.replaceChildren(...[profile.email, profile.phone].filter(Boolean).map(value => {
    const line = document.createElement('p');
    line.textContent = value;
    return line;
  }));
  contact.hidden = !contact.childElementCount;
  document.querySelector('#json-output').textContent = profileJSON(profile);
  const complete = userRequiredFields.filter(field => field === 'location' ? !errors.latitude && !errors.longitude : !errors[field]).length;
  const valid = !Object.keys(errors).length;
  document.querySelector('#completion-status').textContent = valid ? 'Ready to download' : complete === userRequiredFields.length ? 'Check optional fields' : `${complete} of ${userRequiredFields.length} required fields complete`;
  document.querySelector('#status-dot').classList.toggle('ready', valid);
  document.querySelector('#filename').textContent = profile.id && !errors.id ? `${profile.id}.json` : 'profile.json';
  copyButton.disabled = !valid;
  displayErrors(errors);
}

form.addEventListener('input', event => {
  actionStatus.textContent = '';
  if (event.target.name === 'id') customId = Boolean(event.target.value);
  if (event.target.name === 'name' && !customId) form.elements.namedItem('id').value = profileId(event.target.value);
  update();
});
form.addEventListener('focusout', event => {
  if (!fields.includes(event.target.name)) return;
  touched.add(event.target.name);
  update();
});

form.addEventListener('submit', event => {
  event.preventDefault();
  submitted = true;
  update();
  if (Object.keys(current.errors).length) {
    focusField(Object.keys(current.errors)[0]);
    actionStatus.textContent = 'Complete or correct the highlighted fields.';
    return;
  }
  const filename = `${current.profile.id}.json`;
  const url = URL.createObjectURL(new Blob([profileJSON(current.profile)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  actionStatus.textContent = `Download requested: ${filename}`;
});

copyButton.addEventListener('click', async () => {
  update();
  if (Object.keys(current.errors).length) return;
  try {
    await navigator.clipboard.writeText(profileJSON(current.profile));
    actionStatus.textContent = 'JSON copied to clipboard.';
  } catch {
    actionStatus.textContent = 'Clipboard unavailable. Select the JSON to copy it, or download the file.';
  }
});

function resetState() {
  form.reset();
  importedProfile = {};
  document.querySelectorAll('.claim-group').forEach(group => {group.open = false;});
  importStatus.hidden = true;
  importStatus.textContent = '';
  importError.hidden = true;
  importError.textContent = '';
  fileInput.value = '';
  // Hidden inputs use their current value as the reset default.
  for (const field of coordinateFields) form.elements.namedItem(field).value = '';
  customId = false;
  submitted = false;
  touched.clear();
  actionStatus.textContent = '';
}
document.querySelector('#clear-form').addEventListener('click', () => {
  importVersion++;
  resetState();
  locationMap?.reset();
  document.querySelector('#location-coordinates').textContent = 'No location selected';
  update();
  form.elements.namedItem('name').focus();
});

document.querySelector('#load-json').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', async () => {
  const file = fileInput.files[0];
  if (!file) return;
  const version = ++importVersion;
  try {
    const loaded = readProfileJSON(await file.text());
    if (version !== importVersion) return;
    resetState();
    importedProfile = loaded.profile;
    for (const [field, value] of Object.entries(loaded.values)) {
      if (selectionFields.includes(field)) {
        for (const input of form.querySelectorAll(`[name="${field}"]`)) {
          input.checked = field === 'claimExpertise' ? value.some(item => {
            const option = JSON.parse(input.value);
            return item.claimType === option.claimType && item.subCategory === option.subCategory;
          }) : value.includes(input.value);
          if (input.checked) input.closest('details')?.setAttribute('open', '');
        }
      } else form.elements.namedItem(field).value = value;
    }
    customId = true;
    submitted = true;
    update();
    locationMap?.setLocation(loaded.profile);
    document.querySelector('#location-coordinates').textContent = `${loaded.profile.latitude}, ${loaded.profile.longitude}`;
    importStatus.textContent = `Loaded ${file.name}`;
    importStatus.hidden = false;
  } catch (error) {
    if (version !== importVersion) return;
    importError.textContent = `Could not load ${file.name}: ${error.message}`;
    importError.hidden = false;
  } finally {
    if (version === importVersion) fileInput.value = '';
  }
});
function checkbox(name, value, text) {
  const label = document.createElement('label');
  label.className = 'choice';
  const input = document.createElement('input');
  input.type = 'checkbox'; input.name = name; input.value = value;
  label.append(input, document.createTextNode(text));
  return label;
}
for (const [claimType, categories] of Object.entries(claimTypes)) {
  const group = document.createElement('details'); group.className = 'claim-group';
  const heading = document.createElement('summary'); heading.textContent = claimType;
  const choices = document.createElement('div'); choices.className = 'choice-list';
  for (const subCategory of categories) choices.append(checkbox('claimExpertise', JSON.stringify({claimType, subCategory}), subCategory));
  group.append(heading, choices); document.querySelector('#claimExpertise').append(group);
}
for (const type of vesselTypes) document.querySelector('#vesselTypes').append(checkbox('vesselTypes', type, type));
form.addEventListener('change', event => {
  if (selectionFields.includes(event.target.name)) {
    touched.add(event.target.name);
    update();
  }
});
update();

async function startMap() {
  let token = config.mapboxToken;
  if (!token) {
    try {
      const response = await fetch(new URL('../config.local.json', import.meta.url), { cache: 'no-store', signal: AbortSignal.timeout(3000) });
      if (response.ok) token = (await response.json()).mapboxToken;
    } catch { /* Missing local configuration is handled by the map status. */ }
  }
  locationMap = createLocationMap({
    mapboxgl: window.mapboxgl, container: 'location-map', accessToken: token,
    onSelect({ latitude, longitude }) {
      form.elements.namedItem('latitude').value = latitude;
      form.elements.namedItem('longitude').value = longitude;
      document.querySelector('#location-coordinates').textContent = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      touched.add('location');
      actionStatus.textContent = '';
      update();
    },
    onStatus(message, ready) {
      const status = document.querySelector('#location-map-status');
      status.textContent = message;
      status.hidden = ready;
      document.querySelector('#use-map-center').disabled = !ready;
    },
  });
  // An import may finish while the local token or Mapbox bundle is still loading.
  if (current.profile.latitude !== null && current.profile.longitude !== null) locationMap.setLocation(current.profile);
}
document.querySelector('#use-map-center').addEventListener('click', () => locationMap?.useCenter());
// Wait for the deferred Mapbox bundle, including its failure to load.
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startMap, { once: true });
else startMap();
