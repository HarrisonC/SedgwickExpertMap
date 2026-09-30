import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';

// Read a committed snapshot so an older or modified checkout cannot mix versions.
// Usage: node scripts/export-single-html.mjs [git-ref] [output-path] [--optimize-images]
// Image optimization uses macOS sips, preserves originals, and caps portraits at 256px.
const optimizeImages = process.argv.includes('--optimize-images');
const root = fileURLToPath(new URL('../', import.meta.url));
const ref = process.argv[2] || 'origin/main';
const commit = execFileSync('git', ['rev-parse', '--verify', `${ref}^{commit}`], {cwd: root, encoding: 'utf8'}).trim();
const read = path => execFileSync('git', ['show', `${commit}:${path}`], {cwd: root, maxBuffer: 32 * 1024 * 1024});
const source = path => read(path).toString('utf8');
const json = value => JSON.stringify(value).replace(/</g, '\\u003c');
const inline = code => code.replace(/<\/script/gi, '<\\/script');
const plain = code => code.replace(/^export /gm, '');
const replace = (text, needle, replacement) => {
  if (!text.includes(needle)) throw new Error(`Source changed: missing ${needle.slice(0, 80)}`);
  return text.replace(needle, () => replacement);
};
const asset = path => {
  const mime = {png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', svg: 'image/svg+xml'}[path.split('.').pop()];
  if (!mime) throw new Error(`Unsupported image: ${path}`);
  const original = read(path);
  if (optimizeImages && path.startsWith('images/profiles/')) {
    const temporary = mkdtempSync(resolve(tmpdir(), 'sedgwick-portrait-'));
    try {
      const input = resolve(temporary, `input.${path.split('.').pop()}`);
      const output = resolve(temporary, 'portrait.jpg');
      writeFileSync(input, original);
      execFileSync('sips', ['-Z', '256', '-s', 'format', 'jpeg', '-s', 'formatOptions', '80', input, '--out', output], {stdio: 'pipe'});
      const optimized = readFileSync(output);
      if (optimized.length < original.length) return `data:image/jpeg;base64,${optimized.toString('base64')}`;
    } finally {
      rmSync(temporary, {recursive: true, force: true});
    }
  }
  return `data:${mime};base64,${original.toString('base64')}`;
};
const files = JSON.parse(source('data/experts/index.json'));
const profiles = Object.fromEntries(files.map(file => [file, JSON.parse(source(`data/experts/${file}`))]));
const images = Object.fromEntries(Object.values(profiles).filter(p => p.imagePath).map(p => [p.imagePath, asset(p.imagePath)]));
const helpers = plain(source('js/experts.js'));
const validated = new Script(`${helpers}\nvalidateProfiles(${json(profiles)})`).runInNewContext();
let cards = plain(source('js/profile-card.js'));
cards = replace(cards, 'image.src = profile.imagePath;', 'image.src = embeddedImages[profile.imagePath];');
let app = source('js/app.js').replace(/^import .*;\r?\n/gm, '');
const loadStart = app.indexOf("    const files=await fetchJSON('data/experts/index.json');");
const loadEnd = app.indexOf('filtered=experts;', loadStart);
if (loadStart < 0 || loadEnd < 0) throw new Error('Source changed: profile loading block not found');
app = app.slice(0, loadStart) + '    experts=validateProfiles(embeddedProfiles);' + app.slice(loadEnd);
app = replace(app, "  // Local-only convenience file, excluded from Git. Hosted sites use config.js.\n  if(!token) { try { token=(await fetchJSON('config.local.json')).mapboxToken; } catch {} }\n", '');
app = app.replace(/async function fetchJSON\(url\) \{[\s\S]*?\n\}\n/, '');
app = replace(app, 'function initializeMap(token) {', `function initializeMap(token) {
  // Chromium rejects module blob workers from file:// documents. The pinned
  // Mapbox UMD bundle also runs as a classic worker; use its public workerClass
  // hook for local files, preserving normal worker behavior on hosted pages.
  if (location.protocol === 'file:') {
    mapboxgl.workerClass = class extends Worker {
      constructor() {
        super(mapboxgl.workerUrl, {type: 'classic', name: 'Mapbox local-file worker'});
      }
    };
  }`);
const config = plain(source('config.js'));
if (!/mapboxToken:\s*["']pk\./.test(config)) throw new Error('The source snapshot needs a public Mapbox token');
const bundle = `(() => {\n${config}\nconst embeddedProfiles=${json(profiles)};\nconst embeddedImages=${json(images)};\n${helpers}\n${cards}\n${app}\n})();`;
new Script(bundle); // Check the complete generated JavaScript before writing.
let html = source('index.html');
html = replace(html, '<html lang="en">', `<html lang="en">\n<!-- Single-file export of main snapshot ${commit}. Mapbox requires internet access. -->`);
html = replace(html, '<link rel="stylesheet" href="css/styles.css">', `<style>\n${source('css/styles.css')}\n</style>`);
html = replace(html, '<script type="module" src="js/app.js"></script>', '');
html = html.replace(/(src|href)="(images\/[^\"]+)"/g, (_, attr, path) => `${attr}="${asset(path)}"`);
html = replace(html, '</body>', `<script>\n${inline(bundle)}\n</script>\n</body>`);
html = html.replace(/^[ \t]+$/gm, '');
const output = resolve(root, process.argv[3] || 'exports/sedgwick-marine-experts.html');
mkdirSync(dirname(output), {recursive: true});
writeFileSync(output, html);
console.log(`Exported ${validated.length} profiles and ${Object.keys(images).length} portraits from ${commit.slice(0, 7)} to ${output} (${Buffer.byteLength(html)} bytes)`);
