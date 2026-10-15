---
name: decisions
description: Manage a private decision canvas with the decisions CLI, research options, elicit missing firsthand context, and evaluate against personal values. Use when comparing choices or updating an existing decision with new facts, conversations, impressions, or priorities.
---

# Decisions

Use the installed `decisions` CLI, or `node tools/decisions/cli.mjs` from the website repository. Run `--help` for syntax. Store private context in the authenticated service, never in public repository fixtures or PRs.

## Understand before evaluating

GET the decision and its current options/context first. Do not reconstruct an existing decision solely from chat memory. Read the referenced sources that matter, but do not mistake scraped information for complete context.

Look for consequential gaps that only the user can fill. Ask a few targeted questions at a time, informed by what is already known, not a repetitive questionnaire. Useful areas:

- Firsthand conversations: who said what, approximately when, whether it was an explicit commitment, an offer, exploratory interest, or the user's interpretation. Verbal acquisition or employment offers are user reports worth preserving; do not demand documentation that the user says does not exist.
- People: trust, respect, chemistry, disagreement, management behavior, technical ability, and specific interactions behind the user's “vibe.” A subjective impression is valid context without being an objective character judgment.
- Personal meaning: what attracts or repels the user beyond the public facts, current relationships, energy, ambitions, fears, and what daily life would actually feel like.
- Values and media: which principles, books, films, blogs, or passages resonate and why. A reading list does not establish the reader's beliefs. Ask about the user's own interpretation when it matters.
- Tradeoffs: priorities for this season, what the user is willing to sacrifice, limits, reversibility, what could be learned, and what could not be recovered by reversing course.

Ask probing questions only when their answers could change the comparison or expose an important uncertainty. Do not make operational trivia dominate a values question. Respect a request to decide with the available context; mark remaining gaps rather than interrogating indefinitely.

## Manage the canvas

Use basic GET, PUT, DELETE. PUT creates or fully replaces the addressed object. Read before replacing and preserve unrelated entries. Use `--revision` from the last GET to detect concurrent changes; on conflict, reread and reconcile instead of blindly retrying. For full decision creation use `--revision 0`.

```sh
decisions get
decisions get <decision-id>
decisions put <decision-id> --file decision.json --revision 0
decisions options put <decision-id> <option-id> --file option.json
decisions context put <decision-id> <context-id> --option <option-id> --file context.json
decisions context get <decision-id> --option <option-id>
decisions context delete <decision-id> <context-id>
```

Decision body: `{title, question, state?, constraints?, context?, options?}`. Collections are objects keyed by stable IDs. Option body: `{label, context?}`. Context entry:

```json
{
  "text": "I respect the team based on our conversations.",
  "kind": "personal_assessment",
  "source": { "type": "user_report", "basis": "User's firsthand conversations" },
  "recorded_at": "2026-10-15",
  "caveat": "Specific examples have not yet been supplied."
}
```

Kinds: `reported_fact`, `verified_fact`, `personal_assessment`, `inference`. Source can include `url`; context can include `observed_at`. Use the current date for recording, not an invented conversation date. Do not silently promote reports or inferences to verified facts. Retain attribution inside imported mixed narrative context until it can be separated faithfully.

Put shared personal circumstances and decision-specific value clarifications in shared context. Put option-specific evidence under that option. Do not infer that a preference for suburban life proves work-life balance, or that accomplishments prove trustworthiness. Preserve the user's exact scope when a relationship assessment does not apply to everyone.

Add options independently when requested. Distinguish an actual offer from a possible path. Remove only entries the user intends to remove; deleting a decision also deletes its evaluation history. There is no context revision-history UI: previous evaluations preserve snapshots, not every intermediate edit.

## Evaluate and explain

`decisions evaluate <id>` is a paid model operation on a cache miss. Use when the user requests a decision/evaluation; do not invoke repeatedly while gathering context. Unchanged inputs return the saved result. `decisions evaluations get <id> [evaluation-id]` is read-only; retrieve a specific evaluation for its input snapshot.

The server snapshots current tenets and media alongside decision context. Keep important new user-stated values in shared context if they are not yet in the site's tenets. Never treat all values as equally weighted or prescribe balance by default.

If pending, retrieve the existing evaluation. Failed/ambiguous calls are not automatically retried. Do not change irrelevant input just to bypass that protection. Report the issue for operator review.

Report the actual choice and input coverage. Model scores are not outcome probabilities. If the API supplies no rationale, any explanation is your interpretation of evidence and values, not a recovered chain of thought. Do not backfill context to justify a preferred result. Different outcomes after a context update do not establish which change caused them.
