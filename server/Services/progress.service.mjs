import { createHash } from 'node:crypto';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid = value => typeof value === 'string' && uuid.test(value);

// Inject a transactional repository and the app's canonical validator at future server startup.
export function createProgressService({ repository, validate, initialProgress }) {
  if (!repository || typeof validate !== 'function' || typeof initialProgress !== 'function')
    throw new TypeError('A repository, progress validator and initial-progress factory are required.');
  return {
    async read(subject) {
      if (!isUuid(subject)) throw new TypeError('Authenticated subject must be a UUIDv4.');
      return await repository.read(subject) || { progress: initialProgress(), revision: 0 };
    },
    async commit(subject, request) {
      if (!isUuid(subject)) return { status: 'invalid', message: 'Invalid authenticated subject.' };
      let progress, digest;
      try {
        if (!request || !Number.isSafeInteger(request.expectedRevision) || request.expectedRevision < 0 || !isUuid(request.mutationId))
          return { status: 'invalid', message: 'A nonnegative revision and UUIDv4 mutation ID are required.' };
        const raw = JSON.stringify(request);
        if (Buffer.byteLength(raw, 'utf8') > 2_000_000)
          return { status: 'invalid', message: 'Progress payload exceeds 2 MB.' };
        progress = validate(request.progress);
        digest = createHash('sha256').update(JSON.stringify({ expectedRevision: request.expectedRevision, progress })).digest('hex');
      } catch (error) {
        return { status: 'invalid', message: error instanceof Error ? error.message : 'Invalid progress.' };
      }
      try {
        const result = await repository.commit(subject, { progress, expectedRevision: request.expectedRevision, mutationId: request.mutationId, digest });
        if (result.status === 'conflict' && !result.snapshot) result.snapshot = { progress: initialProgress(), revision: 0 };
        return result;
      }
      catch { return { status: 'unavailable', message: 'Progress storage is unavailable. Keep local progress and retry later.' }; }
    },
  };
}
