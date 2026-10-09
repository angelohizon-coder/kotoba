// Keep the standard 16px-root appearance while allowing OS/app root text scaling.
import fs from 'node:fs';
let count = 0;
for (const name of fs.readdirSync('web').filter(name => name.endsWith('.css'))) {
  const path = 'web/' + name, original = fs.readFileSync(path, 'utf8');
  const next = original.replace(/font-size\s*:[^;}]+/g, rule => rule.replace(/([\d.]+)px\b/g, (_, value) => { count++; return Number((Number(value) / 16).toFixed(5)) + 'rem'; }));
  if (next !== original) fs.writeFileSync(path, next);
}
console.log(count + ' text sizes converted to rem; spacing and borders preserved.');
