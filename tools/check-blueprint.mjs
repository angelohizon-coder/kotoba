import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const audit = JSON.parse(await readFile(path.join(root, 'docs/blueprint-audit.json'), 'utf8'));
const digest = text => createHash('sha256').update(text).digest('hex');
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
let passed = 0;
const pass = message => { console.log('PASS ' + message); passed++; };

assert.equal(audit.schemaVersion, 1);
assert.equal(audit.requirementCount, 350);
assert.equal(audit.requirements.length, 350);
assert.match(audit.auditedAt, /^\d{4}-\d{2}-\d{2}$/);
assert.equal(audit.auditBasis.databaseConnected, false);
assert.equal(audit.auditBasis.staticAppRemoteSyncConnected, false);
assert.equal(audit.auditBasis.testClaims, 'source-audit; final execution reported separately');
assert.deepEqual(audit.requirements.map(item => item.id), Array.from({ length: 350 }, (_, i) => i + 1));
pass('Exactly the 350 supplied numbered requirements, unique and contiguous; no invented 351–1000 entries');

const statuses = Object.keys(audit.statusDefinitions);
const scopes = Object.keys(audit.scopeDefinitions);
assert.deepEqual(new Set(statuses), new Set(['existing', 'implemented-local', 'prepared', 'partial', 'deferred', 'intentional-variant']));
assert.deepEqual(new Set(scopes), new Set(['existing', 'new-local', 'prepared', 'server-required', 'asset-or-platform', 'mismatch-or-partial']));
assert.equal(audit.sources.length, 5);
const sources = new Map(audit.sources.map(source => [source.id, source]));
assert.equal(sources.size, 5);
assert.deepEqual(audit.sources.map(source => [source.id, source.firstId, source.lastId]), [
  ['blueprint-1', 1, 130], ['blueprint-2', 131, 190], ['blueprint-3', 191, 250],
  ['blueprint-4', 251, 300], ['blueprint-5', 301, 350],
]);
for (const source of sources.values()) {
  assert.ok(nonempty(source.attachment));
  assert.match(source.attachment, /^[a-f0-9-]{36}\/Pasted text\.txt$/);
  assert.match(source.sha256, /^[a-f0-9]{64}$/);
  assert.ok(Number.isInteger(source.firstId) && Number.isInteger(source.lastId));
}
for (const item of audit.requirements) {
  assert.ok(nonempty(item.userText), 'Missing original text at ' + item.id);
  assert.ok(nonempty(item.category), 'Missing source category at ' + item.id);
  assert.ok(statuses.includes(item.status), 'Unknown status at ' + item.id);
  assert.ok(scopes.includes(item.scope), 'Unknown scope at ' + item.id);
  assert.ok(nonempty(item.assessment), 'Missing assessment at ' + item.id);
  assert.ok(nonempty(item.remainingGap), 'Missing gap or explicit absence of a gap at ' + item.id);
  assert.ok(Array.isArray(item.evidence) && item.evidence.length > 0, 'Missing evidence at ' + item.id);
  assert.ok(Number.isInteger(item.source.line) && item.source.line > 0);
  const source = sources.get(item.source.id);
  assert.ok(source && item.id >= source.firstId && item.id <= source.lastId, 'Incorrect source range at ' + item.id);
  assert.equal(item.source.textSha256, digest(item.userText), 'Original-text fingerprint at ' + item.id);
  if (['prepared', 'partial', 'deferred', 'intentional-variant'].includes(item.status)) {
    assert.notEqual(item.remainingGap, 'None within the stated scope.', 'Incomplete requirement has no gap at ' + item.id);
  }
  if (item.scope === 'server-required') assert.ok(!['existing', 'implemented-local'].includes(item.status), 'Server behavior cannot be claimed live at ' + item.id);
}
pass('Every requirement has verbatim text provenance, category, defined status/scope, assessment, evidence, and honest gap');

const references = new Map();
for (const item of audit.requirements) for (const evidence of item.evidence) {
  assert.ok(['source', 'check', 'contract', 'asset', 'reference'].includes(evidence.kind));
  assert.ok(nonempty(evidence.path) && nonempty(evidence.anchor));
  assert.ok(!path.isAbsolute(evidence.path) && !evidence.path.split(/[\\/]/).includes('..'), 'Repository-local evidence only');
  references.set(evidence.path + ':' + evidence.anchor, evidence);
}
for (const evidence of references.values()) {
  const absolute = path.resolve(root, evidence.path);
  assert.ok(absolute.startsWith(root), 'Evidence escapes the repository');
  const file = await readFile(absolute, 'utf8');
  assert.ok(file.includes(evidence.anchor), 'Evidence anchor missing: ' + evidence.path + ' → ' + evidence.anchor);
}
pass('All ' + references.size + ' distinct evidence references resolve to actual repository files and literal anchors');

const totals = field => Object.fromEntries([...new Set(audit.requirements.map(item => item[field]))].sort().map(value => [value, audit.requirements.filter(item => item[field] === value).length]));
assert.deepEqual(audit.totals.byStatus, totals('status'));
assert.deepEqual(audit.totals.byScope, totals('scope'));
assert.equal(Object.values(audit.totals.byStatus).reduce((a, b) => a + b, 0), 350);
assert.equal(Object.values(audit.totals.byScope).reduce((a, b) => a + b, 0), 350);
pass('Status and scope totals are calculated from all 350 records');

let attachmentCount = 0;
for (const source of sources.values()) {
  const candidates = [process.env.KOTOBA_BLUEPRINT_ATTACHMENTS && path.join(process.env.KOTOBA_BLUEPRINT_ATTACHMENTS, source.attachment), source.originalPath].filter(Boolean);
  let original;
  for (const candidate of candidates) { try { original = await readFile(candidate, 'utf8'); break; } catch { /* Attachments are not distributed with the public site. */ } }
  if (original === undefined) {
    assert.ok(!process.argv.includes('--require-sources'), 'Original attachment unavailable: ' + source.attachment);
    continue;
  }
  assert.equal(digest(original), source.sha256, 'Attachment changed: ' + source.id);
  const lines = original.split(/\r?\n/);
  let category = '';
  const entries = lines.map((line, index) => {
    if (line.startsWith('## ')) category = line.slice(3);
    return { match: /^(\d+)\. (.*)$/.exec(line), line: index + 1, category };
  }).filter(item => item.match);
  assert.deepEqual(entries.map(item => Number(item.match[1])), Array.from({ length: source.lastId - source.firstId + 1 }, (_, i) => source.firstId + i));
  for (const entry of entries) {
    const id = Number(entry.match[1]), item = audit.requirements[id - 1];
    assert.equal(item.source.id, source.id);
    assert.equal(item.source.line, entry.line);
    assert.equal(item.category, entry.category);
    assert.equal(item.userText, entry.match[2], 'User text changed at ' + id);
  }
  attachmentCount++;
}
pass(attachmentCount + '/5 available original attachments match complete file hashes, exact numbered text, and source lines' + (attachmentCount < 5 ? '; missing private attachments are explicitly not reverified' : ''));

// Keep the earlier independent audit. This suite must not silently replace it.
const older = JSON.parse(await readFile(path.join(root, 'docs/requirements.json'), 'utf8'));
assert.equal(older.schemaVersion, 1);
assert.equal(older.requirements.length, 100);
await access(path.join(root, 'docs/requirements.json'));
assert.equal(audit.previousAudit, 'docs/requirements.json');
const mustDisclose = ['350', 'pronunciation', 'TTS', 'server', 'clock', 'CEFR', 'AAA', 'orientation', 'opaque', 'hearts'];
const disclosure = JSON.stringify(audit.auditBasis);
for (const term of mustDisclose) assert.ok(disclosure.includes(term), 'Missing scope disclosure: ' + term);
for (const id of [103, 104, 105, 106, 107, 135, 147, 185, 230, 287, 289, 330]) assert.ok(['partial', 'deferred', 'intentional-variant', 'prepared'].includes(audit.requirements[id - 1].status), 'Strict prescription must retain its variance at ' + id);
pass('The earlier 100-item audit stays separate, and platform, server, assessment, accessibility, and prescription limits remain explicit');

console.log(passed + ' blueprint provenance and integrity checks passed. This is an audit check, not proof that all 350 features are implemented.');
