import { readdirSync, writeFileSync } from 'node:fs';
import { loadProfiles } from './validate-experts.mjs';
loadProfiles('data/experts');
const files = readdirSync('data/experts').filter(f => f.endsWith('.json') && f !== 'index.json').sort();
if(files.some(f => !/^[a-z0-9-]+\.json$/.test(f))) throw new Error('Use lowercase hyphenated JSON filenames.');
writeFileSync('data/experts/index.json', JSON.stringify(files, null, 2) + '\n');
console.log(`Updated index with ${files.length} profiles.`);
