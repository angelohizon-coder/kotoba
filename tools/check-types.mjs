// Optional maintainer check: pass an installed TypeScript compiler, without npm installation.
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const compiler = process.argv[2] || process.env.TYPESCRIPT_PATH;
if (!compiler) throw new Error('Pass the absolute path to an installed typescript.js compiler.');
const ts = require(path.resolve(compiler));
const config = ts.readConfigFile('tsconfig.json', ts.sys.readFile);
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, process.cwd());
const program = ts.createProgram(parsed.fileNames, parsed.options);
const diagnostics = [...parsed.errors, ...ts.getPreEmitDiagnostics(program)];
if (diagnostics.length) {
  console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, { getCurrentDirectory: () => process.cwd(), getCanonicalFileName: x => x, getNewLine: () => '\n' }));
  process.exitCode = 1;
} else console.log('Strict TypeScript ' + ts.version + ': zero source diagnostics.');
