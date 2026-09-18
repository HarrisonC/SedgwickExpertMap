import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateProfiles } from '../lib/experts.ts';
export function loadProfiles(directory) {
  const entries = Object.fromEntries(readdirSync(directory).filter(f => f.endsWith('.json')).sort().map(file => {
    const filename = resolve(directory, file);
    try { return [filename, JSON.parse(readFileSync(filename, 'utf8'))]; }
    catch (error) { throw new Error(`${filename}: invalid JSON (${error.message})`); }
  }));
  return validateProfiles(entries);
}
if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  const experts = loadProfiles(resolve('data/experts'));
  console.log(`Validated ${experts.length} expert profiles.`);
}
