# Private decision canvas

The CLI and API share a Postgres-backed data model. No MCP server is required. Cloudflare Access JWT verification and an explicit email allowlist guard every canvas route; all queries are scoped to the verified email. The database is server-only.

## Setup

1. Set `DECISIONS_DATABASE_URL` to an application Postgres connection, or grant the runtime Vault token read access to `secret/data/prod/apps/website/decisions-database` with field `database_url`. Keep TLS certificate verification enabled.
2. Apply `migrations/001_decisions.sql` using a direct migration connection. Test against an isolated database first. This repository has no active ORM migration configuration, so the canvas uses a versioned SQL migration.
3. Configure existing `CLOUDFLARE_ACCESS_TEAM_DOMAIN`, `CLOUDFLARE_ACCESS_AUD`, and `CLOUDFLARE_ACCESS_ALLOWED_EMAILS`. A nonempty allowlist is mandatory for canvas access. The Cloudflare application must cover `/api/decisions` and its descendants. No password or unauthenticated fallback is provided.
4. Keep the existing Decisions API key configuration. `DECISIONS_DAILY_LIMIT` defaults to 10 new calls per owner per UTC day (maximum 100). Cached evaluations do not consume that limit.
5. Install the CLI with `npm install -g ./tools/decisions`. Authenticate with `cloudflared access login https://anmho.com`, or supply `CLOUDFLARE_ACCESS_TOKEN` privately. `DECISIONS_URL` can target a deployed preview or localhost. CLI requests never follow redirects carrying credentials.
6. Install `skills/decisions` into the local agent skill directory. Reload skill discovery in the client or start a new session; installation does not prove a running chat has reloaded its skill catalog.

## Commands

```sh
decisions put career-choice --file decision.json --revision 0
decisions get career-choice
decisions options put career-choice option-a --file option.json
decisions context put career-choice trust --option option-a --file context.json
decisions context get career-choice trust --option option-a
decisions context delete career-choice trust --option option-a
decisions evaluate career-choice
decisions evaluations get career-choice
decisions evaluations get career-choice <evaluation-id>
```

Omit an item ID on GET to list its collection. Context without `--option` is shared. PUT fully replaces the addressed object; replacing a parent replaces its nested collections too. Optional `--revision` checks the whole decision's revision. Identical PUTs do not change revision. Decision GET returns `{id, document, revision, created_at, updated_at}`; PUT takes only the `document` object. IDs are caller-selected, up to 80 letters, digits, underscores or hyphens.

Decision document:

```json
{
  "title": "Next career move",
  "question": "Which path best fits my values and current circumstances?",
  "state": "",
  "constraints": "",
  "context": {},
  "options": {
    "option-a": { "label": "Option A", "context": {} },
    "option-b": { "label": "Option B", "context": {} }
  }
}
```

Context is a map of IDs to `{text, kind, source: {type, basis, url?}, recorded_at, observed_at?, caveat?}`. Dates use ISO format. Kinds distinguish `reported_fact`, `verified_fact`, `personal_assessment`, and `inference`. Unknown fields are rejected. Up to eight options and 100 entries per context collection are allowed; the entire decision is capped at 128 KB. The first version lists up to 200 decisions and 100 evaluations per decision.

## API

Base: `/api/decisions`. GET lists decisions. GET/PUT/DELETE `/:decisionId` operates on a decision. Append `/options/:optionId`, `/context/:contextId`, or `/options/:optionId/context/:contextId` for child resources. Collection GETs omit the final item ID. Mutation responses return the updated decision; `ETag` contains its revision. `If-Match: "3"` provides optimistic concurrency protection.

POST `/:decisionId/evaluate` snapshots all current tenet bodies (including private ones), watch entries and the Die With Zero reading alongside the decision. Its fingerprint includes canonicalized input, model, and policy version, not mutable timestamps outside the document. Identical inputs reuse a saved evaluation. GET `/:decisionId/evaluations/:evaluationId` returns its exact snapshot. GET never invokes the model.

An atomic claim and owner-level daily quota prevent concurrent duplicate calls. A provider timeout or crash can leave an evaluation failed or pending with an unknown provider outcome; it is deliberately not retried automatically. Exactly-once delivery across a network failure is not promised. Operators must reconcile ambiguous evaluations before any deliberate retry. A process crash after claiming can consume a quota slot without a model call. Deleting decisions does not reset the daily quota.

Deleting context removes it from the current canvas, not from previous evaluation snapshots. Deleting an entire decision deletes its evaluation history as well. There is no separate edit-history feature.

The legacy chat POST `/api/decisions` remains available for the existing UI; the persisted canvas and its cache use the ID-addressed endpoints above. The CLI does not call the legacy endpoint.

Public code contains no personal seed data. Import the private Vault example with the operator seed script after configuring the database and owner identity. Seeding does not run a paid evaluation.
