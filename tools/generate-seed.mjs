// Generate reviewable future SQL; this tool never connects to or executes a database.
import fs from 'node:fs';
import vm from 'node:vm';
const context = vm.createContext({}); context.window = context;
vm.runInContext(fs.readFileSync('web/content.js', 'utf8'), context);
const bank = context.KotobaContent.vocabulary;
const words = ['n5', 'n4'].flatMap(level => bank.filter(word => word.jlptLevel === level).slice(0, 50));
if (words.length !== 100 || new Set(words.map(word => word.id)).size !== 100) throw new Error('Seed needs 50 original words at each foundation level.');
const quote = value => "'" + value.replaceAll("'", "''") + "'";
const rows = words.map(word => '(' + [quote(word.id), "'vocabulary'", quote(word.jlptLevel), quote(JSON.stringify(word)) + '::jsonb', 'true'].join(', ') + ')');
fs.writeFileSync('server/seed.sql', '-- Prepared foundation seed: 100 existing original words, 50 N5 and 50 N4.\n-- Not executed. Review content and apply schema.sql to a future database first.\nBEGIN;\nINSERT INTO curriculum_items (content_id, kind, jlpt_level, payload, is_active) VALUES\n' + rows.join(',\n') + '\nON CONFLICT (content_id) DO NOTHING;\nCOMMIT;\n');
console.log('Prepared server/seed.sql with 100 canonical original foundation words; no connection made.');
