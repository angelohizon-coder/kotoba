// Future-backend boundary tests only: native Node 24+, in-memory adapter, no HTTP/DB.
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createProgressService } from '../server/Services/progress.service.mjs';
import { createProgressController } from '../server/Controllers/progress.controller.mjs';
import { progressRoutes } from '../server/Routes/progress.routes.mjs';
import { MemoryProgressRepository } from '../server/repositories/memory-progress.mjs';

registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith('.') && context.parentURL?.endsWith('.ts') && !/\.[a-z]+$/i.test(specifier)) {
    for (const suffix of ['.ts', '/index.ts']) {
      const candidate = new URL(specifier + suffix, context.parentURL);
      if (existsSync(fileURLToPath(candidate))) return next(candidate.href, context);
    }
  }
  return next(specifier, context);
} });
const C = await import('../src/content/index.ts');
const E = await import('../src/lib/engine.ts');
const S = await import('../src/lib/storage.ts');
const M = await import('../src/lib/sm2.ts');
const P = await import('../src/lib/progress-repository.ts');
const owner = '243c9570-b6c3-4bf2-9d69-982691649e57';
const otherOwner = '49624d77-a9ad-47f1-80eb-336066d0bf02';
const mutation = index => '12345678-90ab-4cde-8123-' + String(index).padStart(12, '0');
const now = Date.UTC(2026, 9, 9, 14);
let count = 0;
async function check(name, fn) { await fn(); count++; console.log('PASS ' + name); }
function fixture(repository = new MemoryProgressRepository()) {
  const service = createProgressService({ repository, validate: S.validateProgress, initialProgress: E.initialProgress });
  return { repository, service, controller: createProgressController(service) };
}
function request(progress = E.initialProgress(), expectedRevision = 0, mutationId = mutation(1)) { return { progress, expectedRevision, mutationId }; }
function canonicalHistory() {
  const question = C.questions[0], map = Object.fromEntries(C.questions.map(item => [item.id, item]));
  const attempt = E.createAttempt([question], 'practice', { now });
  let progress = E.selectAnswer({ ...E.initialProgress(), attempts: [attempt], activeAttemptId: attempt.id }, attempt.id, question.id, question.correctOptionId);
  progress = E.submitAttempt(progress, attempt.id, map, now);
  return M.rateSrsItem(progress, { type: 'vocabulary', id: C.vocabulary[0].id }, 4, 'repository-rating-1', now, { maxIntervalDays: 365 });
}

await check('local repository keeps synchronous plain progress JSON, the existing key and raw recovery bytes', () => {
  const oldStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage'), bytes = new Map();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, writable: true, value: { getItem: key => bytes.get(key) ?? null, setItem: (key, value) => bytes.set(key, value) } });
  try {
    const local = P.createLocalProgressRepository(), progress = canonicalHistory();
    assert.deepEqual(local.save(progress), { saved: true });
    assert.deepEqual(JSON.parse(bytes.get(S.STORAGE_KEY)), progress);
    assert.equal(Object.hasOwn(JSON.parse(bytes.get(S.STORAGE_KEY)), 'revision'), false);
    assert.deepEqual(local.load().progress, progress); assert.equal(local.readOriginalRaw(), bytes.get(S.STORAGE_KEY));
    const damaged = '{"schemaVersion":1,"broken":'; bytes.set(S.STORAGE_KEY, damaged);
    assert.ok(local.load().warning); assert.equal(local.readOriginalRaw(), damaged); assert.equal(bytes.get(S.STORAGE_KEY), damaged);
  } finally { if (oldStorage) Object.defineProperty(globalThis, 'localStorage', oldStorage); else delete globalThis.localStorage; }
});
await check('injected local ports preserve warning/save results and still use canonical validation', () => {
  const progress = E.initialProgress(), loadResult = { progress, warning: 'Device storage unavailable.' }, saveResult = { saved: false, error: 'No storage.' };
  const calls = [];
  const local = P.createLocalProgressRepository({ loadProgress: () => { calls.push('load'); return loadResult; }, saveProgress: input => { calls.push(input); return saveResult; }, readOriginalRaw: () => 'original-bytes' });
  assert.equal(local.load(), loadResult); assert.equal(local.save(progress), saveResult); assert.equal(local.readOriginalRaw(), 'original-bytes');
  assert.deepEqual(local.validate(progress), progress); assert.throws(() => local.validate({ ...progress, schemaVersion: 99 }), /Invalid progress/);
  assert.deepEqual(calls, ['load', progress]);
});
await check('a new remote subject reads a canonical revision-zero snapshot without writing it', async () => {
  const f = fixture(), baseline = await f.service.read(owner);
  assert.deepEqual(baseline, { progress: E.initialProgress(), revision: 0 }); assert.equal(await f.repository.read(owner), null);
  baseline.progress.settings.dailyGoal = 99;
  assert.equal((await f.service.read(owner)).progress.settings.dailyGoal, E.initialProgress().settings.dailyGoal);
});
await check('concurrent clients against one revision produce one commit and one conflict', async () => {
  const f = fixture(), first = E.initialProgress(), second = E.initialProgress();
  first.settings.dailyGoal = 11; second.settings.dailyGoal = 22;
  const results = await Promise.all([f.service.commit(owner, request(first, 0, mutation(1))), f.service.commit(owner, request(second, 0, mutation(2)))]);
  assert.deepEqual(results.map(result => result.status).sort(), ['committed', 'conflict']);
  const success = results.find(result => result.status === 'committed'), conflict = results.find(result => result.status === 'conflict');
  assert.equal(success.snapshot.revision, 1); assert.deepEqual(conflict.snapshot, success.snapshot);
  assert.deepEqual(await f.service.read(owner), success.snapshot);
});
await check('matching retry receipt wins before stale CAS even after another commit', async () => {
  const f = fixture(), original = request(canonicalHistory(), 0, mutation(1)), committed = await f.service.commit(owner, original);
  const newer = structuredClone(committed.snapshot.progress); newer.settings.dailyGoal = 17;
  const next = await f.service.commit(owner, request(newer, 1, mutation(2))); assert.equal(next.status, 'committed');
  const retry = await f.service.commit(owner, structuredClone(original));
  assert.equal(retry.status, 'committed'); assert.equal(retry.replayed, true); assert.deepEqual(retry.snapshot, committed.snapshot);
  assert.deepEqual(await f.service.read(owner), next.snapshot); assert.equal(next.snapshot.revision, 2);
});
await check('one mutation ID cannot be reused for changed canonical data or revision', async () => {
  const f = fixture(), original = request(); await f.service.commit(owner, original);
  const changed = structuredClone(original); changed.progress.settings.dailyGoal++;
  assert.equal((await f.service.commit(owner, changed)).status, 'invalid');
  assert.equal((await f.service.commit(owner, { ...original, expectedRevision: 1 })).status, 'invalid');
  assert.equal((await f.service.read(owner)).revision, 1);
});
await check('replaying saved progress never duplicates canonical attempts or explicit SRS rating events', async () => {
  const f = fixture(), original = request(canonicalHistory());
  for (let i = 0; i < 4; i++) { const result = await f.service.commit(owner, structuredClone(original)); assert.equal(result.status, 'committed'); assert.equal(result.replayed, i !== 0); }
  const snapshot = await f.service.read(owner);
  assert.equal(snapshot.revision, 1); assert.equal(snapshot.progress.attempts.length, 1);
  assert.equal(snapshot.progress.srs['vocabulary:' + C.vocabulary[0].id].events.length, 1);
  assert.deepEqual(snapshot.progress, original.progress);
});
await check('fresh-owner conflicts have a usable initial snapshot and successful explicit retry can resolve them', async () => {
  const f = fixture(), conflict = await f.service.commit(owner, request(E.initialProgress(), 4));
  assert.equal(conflict.status, 'conflict'); assert.deepEqual(conflict.snapshot, { progress: E.initialProgress(), revision: 0 });
  const resolved = await f.service.commit(owner, request(conflict.snapshot.progress, conflict.snapshot.revision, mutation(2)));
  assert.equal(resolved.status, 'committed'); assert.equal(resolved.snapshot.revision, 1);
});
await check('owner context isolates snapshots and body ownership claims grant no access', async () => {
  const f = fixture(), progress = E.initialProgress(); progress.settings.dailyGoal = 42;
  const body = { ...request(progress), subjectId: otherOwner, ownerId: otherOwner, userId: otherOwner };
  assert.equal((await f.controller.commit({}, body)).statusCode, 401);
  assert.equal((await f.controller.commit({ subjectId: owner }, body)).statusCode, 200);
  assert.equal((await f.service.read(owner)).progress.settings.dailyGoal, 42);
  assert.deepEqual(await f.service.read(otherOwner), { progress: E.initialProgress(), revision: 0 });
  assert.equal((await f.controller.read({ subjectId: otherOwner })).body.revision, 0);
});
await check('UUID, revision and request/progress types are strict and invalid inputs never persist', async () => {
  const f = fixture();
  for (const subject of ['', 'not-a-uuid', 42, null, {}, new String(owner), '243c9570-b6c3-3bf2-9d69-982691649e57']) assert.equal((await f.service.commit(subject, request())).status, 'invalid');
  for (const value of ['', null, 42, {}, new String(mutation(1)), '12345678-90ab-5cde-8123-000000000001']) assert.equal((await f.service.commit(owner, request(E.initialProgress(), 0, value))).status, 'invalid');
  for (const revision of [-1, .5, '0', null, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) assert.equal((await f.service.commit(owner, request(E.initialProgress(), revision))).status, 'invalid');
  for (const body of [null, false, 1, 'body', [], { expectedRevision: 0, mutationId: mutation(1) }]) assert.equal((await f.service.commit(owner, body)).status, 'invalid');
  for (const progress of [null, [], false, 'progress', { ...E.initialProgress(), schemaVersion: 7 }, { ...E.initialProgress(), bookmarks: ['unknown-content'] }]) assert.equal((await f.service.commit(owner, request(progress))).status, 'invalid');
  assert.equal(await f.repository.read(owner), null);
});
await check('the size limit counts UTF-8 bytes before normalization rather than JS characters', async () => {
  const f = fixture(), body = { ...request(), ignoredMetadata: 'あ'.repeat(666_667) };
  const serialized = JSON.stringify(body); assert.ok(serialized.length < 2_000_000); assert.ok(Buffer.byteLength(serialized, 'utf8') > 2_000_000);
  const result = await f.service.commit(owner, body); assert.equal(result.status, 'invalid'); assert.match(result.message, /2 MB/);
  assert.equal(await f.repository.read(owner), null);
  const cycle = request(); cycle.self = cycle; assert.equal((await f.service.commit(owner, cycle)).status, 'invalid');
});
await check('service uses actual legacy migration and rejects duplicate attempts or malformed SRS before CAS', async () => {
  const f = fixture(), current = canonicalHistory(), previous = structuredClone(current); previous.contentVersion = '2026.10.1';
  const migrated = await f.service.commit(owner, request(previous)); assert.equal(migrated.status, 'committed'); assert.equal(migrated.snapshot.progress.contentVersion, C.CONTENT_VERSION);
  const duplicate = structuredClone(current); duplicate.attempts.push(duplicate.attempts[0]);
  assert.equal((await f.service.commit(owner, request(duplicate, 1, mutation(2)))).status, 'invalid');
  const malformed = structuredClone(current); malformed.srs['vocabulary:' + C.vocabulary[0].id].events[0].quality = 6;
  assert.equal((await f.service.commit(owner, request(malformed, 1, mutation(3)))).status, 'invalid');
  assert.equal((await f.service.read(owner)).revision, 1);
});
await check('repository returns isolated clones and does not accept caller mutation of receipts', async () => {
  const f = fixture(), original = request(), result = await f.service.commit(owner, original);
  result.snapshot.progress.settings.dailyGoal = 300; original.progress.settings.dailyGoal = 400;
  const loaded = await f.repository.read(owner); loaded.progress.settings.dailyGoal = 500;
  assert.equal((await f.service.read(owner)).progress.settings.dailyGoal, E.initialProgress().settings.dailyGoal);
  const replay = await f.service.commit(owner, request()); assert.equal(replay.replayed, true);
  assert.equal(replay.snapshot.progress.settings.dailyGoal, E.initialProgress().settings.dailyGoal);
});
await check('transport/repository failures are unavailable and controllers map 401/409/422/503 correctly', async () => {
  const failure = fixture({ read: async () => { throw new Error('private adapter detail'); }, commit: async () => { throw new Error('private adapter detail'); } });
  assert.deepEqual(await failure.service.commit(owner, request()), { status: 'unavailable', message: 'Progress storage is unavailable. Keep local progress and retry later.' });
  assert.equal((await failure.controller.read({ subjectId: owner })).statusCode, 503);
  const unavailable = await failure.controller.commit({ subjectId: owner }, request()); assert.equal(unavailable.statusCode, 503); assert.equal(unavailable.body.status, 'unavailable'); assert.ok(!unavailable.body.message.includes('private'));
  const f = fixture();
  for (const context of [undefined, {}, { subjectId: 'invalid' }, { subjectId: 42 }, { subjectId: new String(owner) }]) {
    assert.equal((await f.controller.read(context)).statusCode, 401); assert.equal((await f.controller.commit(context, request())).statusCode, 401);
  }
  assert.equal((await f.controller.commit({ subjectId: owner }, request())).statusCode, 200);
  assert.equal((await f.controller.commit({ subjectId: owner }, request(E.initialProgress(), 0, mutation(2)))).statusCode, 409);
  assert.equal((await f.controller.commit({ subjectId: owner }, request(E.initialProgress(), -1, mutation(3)))).statusCode, 422);
});
await check('route and OpenAPI descriptors expose the prepared authenticated owner-scoped contract', () => {
  const routes = progressRoutes(fixture().controller);
  assert.deepEqual(routes.map(route => [route.method, route.path, route.authenticated]), [['GET', '/v1/progress', true], ['PUT', '/v1/progress', true]]);
  assert.ok(routes.every(route => typeof route.handler === 'function'));
  const spec = JSON.parse(readFileSync(new URL('../server/openapi.json', import.meta.url), 'utf8'));
  assert.equal(spec.openapi, '3.1.1'); assert.deepEqual(spec.servers, []);
  assert.deepEqual(Object.keys(spec.paths), ['/v1/progress']); assert.deepEqual(spec.security, [{ sessionCookie: [] }]);
  assert.equal(spec.components.securitySchemes.sessionCookie.in, 'cookie');
  assert.ok(spec.paths['/v1/progress'].put.parameters.some(parameter => parameter.name === 'X-CSRF-Token' && parameter.required));
  for (const status of ['200', '401', '409', '422', '503']) assert.ok(spec.paths['/v1/progress'].put.responses[status]);
  assert.equal(spec.components.schemas.CommitRequest['x-max-serialized-utf8-bytes'], 2_000_000);
  assert.equal(spec.components.schemas.Progress['x-canonical-validator'], 'src/lib/storage.ts#validateProgress');
  function visit(value) {
    if (!value || typeof value !== 'object') return;
    if (value.$ref) { assert.ok(value.$ref.startsWith('#/')); const target = value.$ref.slice(2).split('/').reduce((node, key) => node?.[key], spec); assert.ok(target, 'Unresolved ' + value.$ref); }
    Object.values(value).forEach(visit);
  }
  visit(spec);
});
await check('prepared native repositories/services make no network calls and do not import a database driver', async () => {
  const originalFetch = globalThis.fetch; let calls = 0;
  globalThis.fetch = () => { calls++; throw new Error('Unexpected network call'); };
  try { const f = fixture(); await f.service.read(owner); await f.service.commit(owner, request()); assert.equal(calls, 0); }
  finally { globalThis.fetch = originalFetch; }
  for (const path of ['../src/lib/progress-repository.ts', '../server/Services/progress.service.mjs', '../server/Controllers/progress.controller.mjs', '../server/repositories/memory-progress.mjs']) assert.ok(!/from\s+['"](?:pg|postgres|express|mysql|mysql2|mongodb)['"]/.test(readFileSync(new URL(path, import.meta.url), 'utf8')));
});

console.log(count + ' local repository and prepared API checks passed. Memory adapter only; no HTTP server or database was started.');
