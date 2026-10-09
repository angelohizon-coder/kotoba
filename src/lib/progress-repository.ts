import { loadProgress, saveProgress, STORAGE_KEY, validateProgress } from './storage';
import type { Progress } from '../types';

export interface ProgressSnapshot { progress: Progress; revision: number }
export interface ProgressCommit { progress: Progress; expectedRevision: number; mutationId: string }
export type CommitResult =
  | { status: 'committed'; snapshot: ProgressSnapshot; replayed: boolean }
  | { status: 'conflict'; snapshot: ProgressSnapshot }
  | { status: 'invalid' | 'unavailable'; message: string };

// A future authenticated API implements this port. It is never instantiated by the static app.
export interface RemoteProgressRepository {
  read(): Promise<ProgressSnapshot>;
  commit(request: ProgressCommit): Promise<CommitResult>;
}
export interface LocalStoragePort {
  loadProgress: typeof loadProgress;
  saveProgress: typeof saveProgress;
  readOriginalRaw(): string | null;
}
export interface LocalProgressRepository {
  load(): ReturnType<typeof loadProgress>;
  save(progress: Progress): ReturnType<typeof saveProgress>;
  readOriginalRaw(): string | null;
  validate(input: unknown): Progress;
}

// Preserve synchronous saves, the existing key, recoverable raw bytes and plain JSON backups.
// Revision comparison belongs in a server transaction; localStorage is not atomic across tabs.
export function createLocalProgressRepository(port?: LocalStoragePort): LocalProgressRepository {
  const storage = port || {
    loadProgress, saveProgress,
    readOriginalRaw: () => localStorage.getItem(STORAGE_KEY),
  };
  return {
    load: () => storage.loadProgress(),
    save: progress => storage.saveProgress(progress),
    readOriginalRaw: () => storage.readOriginalRaw(),
    validate: input => validateProgress(input),
  };
}
