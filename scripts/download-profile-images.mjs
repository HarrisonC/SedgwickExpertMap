import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateProfiles } from '../js/experts.js';

export function imageExtension(bytes) {
  if (bytes.length < 16) throw new Error('Empty or truncated image');
  if (bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'png';
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'jpg';
  if (bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP') return 'webp';
  throw new Error('Response is not a supported PNG, JPEG or WebP image');
}

export async function downloadProfileImages(root = resolve(import.meta.dirname, '..')) {
  const directory = resolve(root, 'data/experts');
  const files = JSON.parse(await readFile(resolve(directory, 'index.json'), 'utf8'));
  const entries = Object.fromEntries(await Promise.all(files.map(async file => [file, JSON.parse(await readFile(resolve(directory,file),'utf8'))])));
  validateProfiles(entries);
  await mkdir(resolve(root, 'images/profiles'), {recursive:true});
  const failures = [];
  let downloaded = 0, reused = 0;
  for (const [file, profile] of Object.entries(entries)) {
    try {
      let imagePath;
      for (const extension of ['jpg','png','webp']) {
        const candidate = `images/profiles/${profile.id}.${extension}`;
        try {
          if (imageExtension(await readFile(resolve(root,candidate))) === extension) {imagePath=candidate; break;}
        } catch { /* Missing or invalid copies can be downloaded again. */ }
      }
      if (imagePath) reused++;
      else {
        const url = new URL(profile.imageUrl);
        if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Expected an HTTP(S) imageUrl');
        const response = await fetch(url, {signal:AbortSignal.timeout(30000)});
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const mime = response.headers.get('content-type')?.split(';')[0];
        if (!['image/jpeg','image/png','image/webp'].includes(mime)) throw new Error(`Unexpected content type: ${mime}`);
        const bytes = Buffer.from(await response.arrayBuffer());
        const extension = imageExtension(bytes);
        if (mime !== {jpg:'image/jpeg',png:'image/png',webp:'image/webp'}[extension]) throw new Error('Image content does not match its content type');
        imagePath = `images/profiles/${profile.id}.${extension}`;
        const destination = resolve(root,imagePath);
        await writeFile(`${destination}.tmp`, bytes);
        await rename(`${destination}.tmp`,destination);
        downloaded++;
      }
      if (profile.imagePath !== imagePath) {
        profile.imagePath = imagePath;
        await writeFile(resolve(directory,file),JSON.stringify(profile,null,2)+'\n');
      }
    } catch(error) {
      failures.push(profile.id);
      console.error(`${profile.id}: ${error.message}`);
    }
  }
  console.log(`Profile images: ${downloaded} downloaded, ${reused} reused, ${failures.length} failed.`);
  return failures;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if ((await downloadProfileImages()).length) process.exitCode = 1;
}
