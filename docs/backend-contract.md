# Future progress API contract

This is a prepared integration boundary, not a running backend. Kotoba still saves plain progress JSON in the existing `kotoba-n3-progress` localStorage key. The static application makes no progress API calls, opens no database connection and ships no server credentials. GitHub Pages hosts the static application; a future API needs separate hosting.

The current pieces are:

| Layer | Source | Responsibility |
| --- | --- | --- |
| Local repository | [progress-repository.ts](../src/lib/progress-repository.ts) | Preserve synchronous load/save, canonical validation, recoverable original bytes and ordinary JSON backups. |
| Remote port | [progress-repository.ts](../src/lib/progress-repository.ts) | Typed asynchronous snapshot/commit boundary for a future authenticated client. No remote implementation is instantiated. |
| Routes | [progress.routes.mjs](../server/Routes/progress.routes.mjs) | Describe authenticated GET/PUT routes; they do not open an HTTP listener. |
| Controllers | [progress.controller.mjs](../server/Controllers/progress.controller.mjs) | Receive a trusted authenticated subject context and map service results to HTTP status codes. |
| Service | [progress.service.mjs](../server/Services/progress.service.mjs) | Validate request types, size and canonical progress; hash the normalized mutation; delegate transactional persistence. |
| Test repository | [memory-progress.mjs](../server/repositories/memory-progress.mjs) | Exercise revisions and idempotency in one process. Memory is lost when the process exits. |
| Future schema | [schema.sql](../server/schema.sql) | Prepare PostgreSQL snapshots, receipts, curriculum, SRS projections and activity tables. This migration has not been executed. |
| HTTP description | [openapi.json](../server/openapi.json) | Define the proposed wire contract and future authentication/CSRF requirements. |

These layers use dependency injection and native modules. No Express package, database driver, production authentication provider or network transport is connected.

## Wire protocol

`GET /v1/progress` returns the authenticated learner's snapshot:

```json
{
  "progress": { "schemaVersion": 1, "contentVersion": "2026.10.4" },
  "revision": 0
}
```

The abbreviated `progress` above represents a complete canonical progress object, including required settings, attempts, reviews, bookmarks, completion marks, study events and active-attempt reference. For a new learner, the service returns the actual `initialProgress()` object at revision zero. Optional feature state, including SRS, is added only when present and validated.

`PUT /v1/progress` replaces that learner's complete validated snapshot:

```json
{
  "expectedRevision": 0,
  "mutationId": "62a08031-d975-4fd9-bfab-d7e6fca47b36",
  "progress": { "schemaVersion": 1, "contentVersion": "2026.10.4" }
}
```

This example also abbreviates the complete progress object. `expectedRevision` is a nonnegative JavaScript safe integer. `mutationId` is a UUIDv4 generated once for a logical save and retained across retries. Both GET and PUT operate on the subject supplied by trusted authentication middleware. Body fields, query parameters and client-generated IDs do not establish an owner.

The service rejects a serialized request larger than **2,000,000 UTF-8 bytes** before canonical validation. This is a byte limit, not a JavaScript string-length limit. A future HTTP adapter must also bound the request stream before parsing JSON, reject malformed JSON, and set `Cache-Control: no-store` on these private responses.

| HTTP status | Response | Client action |
| --- | --- | --- |
| 200 GET | `{ progress, revision }` | Keep the received revision alongside the remote snapshot. |
| 200 PUT | `{ status: "committed", snapshot, replayed }` | Acknowledge the saved mutation. `replayed: true` acknowledges its original committed snapshot. |
| 401 | `{ error: true, message }` | Preserve local work and authenticate; an owner in the request body cannot bypass this response. |
| 403 PUT, future middleware | `{ error: true, message }` | Refresh the session/token or resolve the rejected origin; keep local work. The controller does not yet implement CSRF checks. |
| 409 PUT | `{ status: "conflict", snapshot }` | Preserve both versions. Show or otherwise explicitly resolve the conflict before sending a new mutation ID with the latest revision. |
| 422 PUT | `{ status: "invalid", message }` | Correct invalid input; do not overwrite the previous stored snapshot. |
| 503 | GET: `{ error: true, message }`; PUT: `{ status: "unavailable", message }` | Keep local progress and the pending mutation; retry later. |

A fresh learner's stale commit returns the canonical initial snapshot at revision zero, rather than a null conflict snapshot. Controller error messages do not expose repository exception details. Authentication or CSRF failures are middleware concerns; the provided controller is not an authentication system.

## Compare-and-swap and retries

The digest is SHA-256 over the service's serialization of `{ expectedRevision, progress: validatedProgress }`. Validation uses the actual course validator and its canonical output, including supported legacy migrations. The mutation ID is the receipt key, not part of the digest. Unknown metadata discarded by canonical validation is not a distinct stored progress value; changing the canonical progress or expected revision changes the digest.

Within an owner, a matching stored mutation receipt is checked **before** a stale revision comparison:

1. If this mutation ID already has a matching digest, return its recorded successful result with `replayed: true`. Do not append attempts, rate cards, award rewards or increase the revision again.
2. If the receipt exists with a different digest, return 422. The mutation ID cannot be reused for different canonical data.
3. Otherwise compare the current revision with `expectedRevision`. A mismatch returns 409 and the current snapshot without overwriting it.
4. A match stores the validated snapshot at revision + 1 and records its receipt atomically. The revision cannot advance beyond `Number.MAX_SAFE_INTEGER`.

Two clients committing different mutations against the same revision must yield one success and one conflict. A failed conflicting commit does not reserve a successful receipt. It can be resubmitted after explicit resolution with a new expected revision and mutation ID.

A retry may return an older successful receipt after another mutation has already advanced the remote snapshot. A future client must not replace a newer acknowledged local/remote revision with this older receipt; it can read the latest snapshot after resolving its outstanding acknowledgments. A transport timeout is not proof that a commit failed, so the retry uses the original mutation ID and unchanged canonical payload.

## PostgreSQL adapter to implement later

The memory repository provides in-process test ordering, not cross-process or database transactions. A production adapter must put receipt replay, revision comparison, snapshot update and receipt insertion in one transaction. The prepared schema alone does not implement that guarantee.

A concrete adapter can first ensure a revision-zero `learner_progress` row exists, then lock the subject row with `SELECT ... FOR UPDATE`. Under that owner lock, it checks the mutation receipt, compares the revision, updates the snapshot and inserts the successful receipt before committing. A failed transaction must leave both snapshot and receipt unchanged. This also gives the receipt's foreign key a real parent row for a first save. PostgreSQL's [transaction isolation documentation](https://www.postgresql.org/docs/current/transaction-iso.html) explains the concurrency behavior the adapter must account for; the actual adapter and its rollback/concurrency tests remain unimplemented.

`learner_progress.progress` is the authoritative canonical snapshot. `learner_srs` and `learning_activity` can be projections for future queries, but a future adapter must derive and update them consistently in that same transaction. It must not accept a second independent client truth for easiness factors, due dates or rewards. Receipts must remain available for the documented retry window; deleting a receipt silently changes idempotency guarantees.

The curriculum table is prepared for stable course IDs and versioned original content. A future seed must use the repository's authoritative content exports and preserve these IDs. Neither schema nor seed material implies that a database has been started or populated. Database credentials belong in a separately hosted server environment, never in the public static bundle.

## Validation and SM-2

Use the actual [validateProgress](../src/lib/storage.ts) implementation, not a permissive JSON pass-through. It validates canonical question/answer IDs, attempts and section clocks, legacy mistakes, task IDs, settings and optional feature state before returning a clean object. Old saved progress without `srs` keeps that property absent and preserves its old review records. Local backup JSON is not wrapped in `{ progress, revision }`; that envelope belongs only to the remote API.

The pure [sm2.ts](../src/lib/sm2.ts) module exposes `calculateNextReview(state, quality, now, policy)` and `SM2Service.calculateNextReview(quality, currentInterval, currentRepetitions, easinessFactor, now)`. The service wrapper returns ISO UTC `nextReviewDate`. Quality is an integer from 0–5; the requested variant updates EF before computing subsequent intervals. The core default is uncapped; a recorded 365-day policy is explicit app behavior. Scheduling uses injectable UTC milliseconds. It changes neither canonical quiz scoring nor completion choices.

SRS records contain stable target IDs and explicit rating events. Validation replays their quality, time, prior due date and cap policy, then compares the resulting state. Replaying a progress mutation stores the existing events once; it must not call the rating updater again. A future backend can compile the shared TypeScript or use Node 24+ native type stripping with an appropriate resolver for extensionless local imports. The native tests supply that resolver; they do not start a server.

The [original SuperMemo specification](https://www.super-memory.com/english/ol/sm2.htm) supplies the base algorithm. The requested updated-EF-first ordering is documented as a variant. A structurally valid self-reported answer or rating does not prove that learning occurred. The prepared storage boundary is not an anti-cheat, public leaderboard or certification service.

## Authentication and deployment work still required

A future authentication layer must verify the session or identity-provider assertion and map it to a stable internal UUIDv4 before creating `context.subjectId`. It must never use a learner-supplied body owner. Any administrator/content-editor routes need separate server authorization; no role or privilege can be granted through progress JSON.

For the planned same-origin browser API, use an HTTPS session cookie with `HttpOnly`, `Secure` and a deliberate `SameSite` policy. Require and verify the `X-CSRF-Token` header for PUT, bind the token to the authenticated session, and verify the request origin. Cookie flags alone do not supply the complete CSRF defense. Follow [OWASP's CSRF prevention guidance](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html). The OpenAPI cookie/header declarations are requirements for a future HTTP adapter, not protections implemented by the framework-neutral controllers.

The future host still needs authentication, an HTTP framework adapter, parser/stream limits, a transactional PostgreSQL repository, secret management, transport/client queue wiring, operational monitoring, backup/retention and deployment tests. A cross-origin API would additionally need a separately reviewed credential/CORS/CSRF design. Privacy obligations and legal compliance have not been established by these files.

## Executable evidence

Run `node tools/check-repository.mjs`. It uses the actual canonical validator, local port, services/controllers and memory repository. It checks local raw-schema compatibility, concurrent compare-and-swap, exact retry receipts before stale CAS, changed-payload rejection, UUID/revision/type/UTF-8 limits, trusted-owner isolation, 401/409/422/503 responses, and that retries do not duplicate attempts or SRS events. OpenAPI checks inspect the proposed routes and internal schema references; they are not a deployed HTTP integration test or a PostgreSQL transaction test.

The HTTP description follows [OpenAPI 3.1.1](https://spec.openapis.org/oas/v3.1.1.html). Existing static/offline browser checks remain separate from these future-backend tests.
