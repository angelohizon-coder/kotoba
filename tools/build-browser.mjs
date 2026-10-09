import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const webRoot = path.join(projectRoot, 'web');
await mkdir(webRoot, { recursive: true });

const modules = [
  { source: 'src/content/index.ts', output: 'content.js', namespace: 'KotobaContent' },
  { source: 'src/lib/engine.ts', output: 'engine.js', namespace: 'KotobaEngine' },
  { source: 'src/lib/storage.ts', output: 'storage.js', namespace: 'KotobaStorage' },
  { source: 'src/lib/sm2.ts', output: 'sm2.js', namespace: 'KotobaSm2' },
  { source: 'src/lib/progress-repository.ts', output: 'repository.js', namespace: 'KotobaRepository' },
  { source: 'src/lib/preferences.ts', output: 'preference-model.js', namespace: 'KotobaPreferenceModel' },
  { source: 'src/lib/learnlab.ts', output: 'learnlab-model.js', namespace: 'KotobaLearnLabModel' },
  { source: 'src/lib/motivation.ts', output: 'motivation-engine.js', namespace: 'KotobaMotivationEngine' },
];

async function resolveSource(specifier, parent) {
  if (!specifier.startsWith('.')) throw new Error('Browser content cannot depend on packages: '+specifier);
  for (const suffix of ['', '.ts', '/index.ts']) {
    const candidate=path.resolve(path.dirname(parent),specifier+suffix);
    if (!candidate.startsWith(projectRoot)) throw new Error('Source import escaped the project.');
    try {await access(candidate);if (candidate.endsWith('.ts')) return candidate;} catch {}
  }
  throw new Error('Missing source '+specifier+' imported by '+parent);
}
for (const module of modules) {
  const entry=path.join(projectRoot,module.source);
  const emitted=new Set();const parts=[];
  async function emit(file) {
    const key=path.relative(projectRoot,file).replaceAll('\\','/');
    if (emitted.has(file)) return key;
    emitted.add(file);
    let javascript=stripTypeScriptTypes(await readFile(file,'utf8'),{mode:'strip'});
    const imports=[...javascript.matchAll(/^\s*import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"];?\s*$/gm)];
    for (const imported of imports) {
      const dependency=await resolveSource(imported[2],file);
      const external=modules.slice(0,3).find(m => path.join(projectRoot,m.source) === dependency && dependency !== entry);
      const reference=external ? `global.${external.namespace}` : `compiled[${JSON.stringify(await emit(dependency))}]`;
      const names=imported[1].replace(/\s+as\s+/g,':');
      javascript=javascript.replace(imported[0],`\nconst {${names}} = ${reference};\n`);
    }
    const exports=[...javascript.matchAll(/\bexport\s+(?:async\s+)?(?:function|const|let|var|class)\s+(\w+)/g)].map(m => m[1]);
    javascript=javascript.replace(/\bexport\s+(?=(?:async\s+)?(?:function|const|let|var|class)\b)/g,'');
    if (/^\s*(?:import|export)\b/m.test(javascript)) throw new Error('Unsupported runtime module syntax in '+key);
    parts.push(`compiled[${JSON.stringify(key)}] = (() => {\n${javascript.trim()}\nreturn {${exports.join(',')}};\n})();`);
    return key;
  }
  const entryKey=await emit(entry);
  const output=`// Generated from ${module.source} and its local imports. Edit src/ then run tools/build-browser.mjs.\n(function(global){\n'use strict';\nconst compiled={};\n${parts.join('\n')}\nglobal.${module.namespace}=compiled[${JSON.stringify(entryKey)}];\n})(window);\n`;
  // Parse the actual output before replacing the checked-in browser artifact.
  new Function(output);
  await writeFile(path.join(webRoot, module.output), output, 'utf8');
  console.log(`Built web/${module.output} (${emitted.size} source modules).`);
}
