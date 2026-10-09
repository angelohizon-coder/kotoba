// A deterministic test adapter. This is not a persistent database or production server.
export class MemoryProgressRepository {
  #snapshots = new Map();
  #receipts = new Map();
  async read(subject) { return structuredClone(this.#snapshots.get(subject) || null); }
  async commit(subject, { progress, expectedRevision, mutationId, digest }) {
    // No await separates receipt lookup, compare and update in this test adapter.
    const key = JSON.stringify([subject, mutationId]);
    const receipt = this.#receipts.get(key);
    if (receipt) return receipt.digest === digest
      ? { ...structuredClone(receipt.result), replayed: true }
      : { status: 'invalid', message: 'This mutation ID was already used for different data.' };
    const current = this.#snapshots.get(subject);
    if ((current?.revision || 0) !== expectedRevision)
      return { status: 'conflict', snapshot: structuredClone(current) };
    if (expectedRevision >= Number.MAX_SAFE_INTEGER)
      return { status: 'invalid', message: 'Revision limit reached.' };
    const snapshot = { progress: structuredClone(progress), revision: expectedRevision + 1 };
    const result = { status: 'committed', snapshot, replayed: false };
    this.#snapshots.set(subject, structuredClone(snapshot));
    this.#receipts.set(key, { digest, result: structuredClone(result) });
    return result;
  }
}
