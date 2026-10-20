import { validateProfiles } from './experts.js';

// Treat the index and all its profiles as one snapshot: never mix remote and
// embedded records when a request fails partway through.
export async function loadExpertProfiles({
  indexUrl = 'data/experts/index.json',
  fallbackEntries,
  embeddedImages = {},
  timeoutMs = 5000,
  fetchImpl = globalThis.fetch,
  baseUrl = globalThis.document?.baseURI,
} = {}) {
  const controller = new AbortController();
  let timer;
  try {
    const url = new URL(indexUrl, baseUrl);
    if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Expert data requires an HTTP(S) URL');
    const readJSON = async target => {
      const response = await fetchImpl(target, {cache: 'no-store', signal: controller.signal, credentials: 'omit'});
      if (!response.ok) throw new Error(`Expert data: HTTP ${response.status}`);
      return response.json();
    };
    const remote = async () => {
      const files = await readJSON(url.href);
      if (!Array.isArray(files) || files.some(f => typeof f !== 'string' || !/^[a-z0-9-]+\.json$/.test(f) || f === 'index.json') || new Set(files).size !== files.length) {
        throw new Error('Invalid profile index');
      }
      const entries = await Promise.all(files.map(async file => [file, await readJSON(new URL(file, url).href)]));
      return validateProfiles(Object.fromEntries(entries)).map(profile => ({
        ...profile,
        portraitSrc: profile.imagePath ? new URL(profile.imagePath, new URL('../../', url)).href : undefined,
      }));
    };
    return await Promise.race([
      remote(),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error('Expert data request timed out'));
        }, timeoutMs);
      }),
    ]);
  } catch (error) {
    controller.abort();
    if (fallbackEntries === undefined) throw error;
    return validateProfiles(fallbackEntries).map(profile => ({
      ...profile,
      portraitSrc: embeddedImages[profile.imagePath],
    }));
  } finally {
    clearTimeout(timer);
  }
}
