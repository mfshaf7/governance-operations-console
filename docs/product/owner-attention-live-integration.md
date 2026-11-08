# Owner Attention Live Integration

Status: implemented Console consumer boundary.

## Purpose

Command Center Focus and Workspace Pulse consume one normalized, read-only
attention composition. Focus presents and routes owner-issued required moves;
Pulse aggregates posture from the same deduplicated snapshot. Neither surface
owns domain state, workflow decisions, readiness, or mutation authority.

## Source Rules

- Each admitted domain or workspace exposes one public attention snapshot.
- Canonical Lifecycle Transition attention is projected from the server-only
  OOS adapter and includes WGCF readiness and escalation references already
  carried by the OOS projection.
- Current source-projected records retain typed owner routes.
- Stale, unverified, unavailable, malformed, duplicated, or partial sources
  cannot retain an executable route or fabricate a live candidate.
- In configured live mode, synthetic and prototype-local candidates are
  suppressed and their sources are reported as unavailable.
- Explicit disconnected preview remains synthetic and clearly labelled.

## Composition

The in-memory Command Center projector validates, deduplicates, and ranks
candidates. Workspace Pulse then derives required decisions, blocked work,
active required actions, source coverage, and system posture from that exact
projected snapshot. Pulse does not maintain a second fixture-backed operating
truth in live mode.

No Console business database, aggregate mutation API, direct WGCF credential,
or background authority is introduced. The accepted Command Center and Pulse
layout remains unchanged.

Initial owner reads use a distinct loading posture, not an unavailable-source
claim. Counts stay partial until reads complete, and loading carries no action
route. Retained failed operations remain owner facts; their last-change time
and scope are visible. Workspace blocked-work posture is not a whole-system
outage claim. Priority detail selection follows the current filtered queue.


## Current work and retained history

Primary attention is a current-work projection, not a count of historical
failures. Platform operation history keeps original requests, outcomes, events,
receipts and retry controls unchanged.

- Terminal `status` and `access` failures are diagnostic history. They do not
  create blocked delivery work. Current runtime observations remain separate.
- Failed source-credential attempts leave current attention only after a
  successful verified revocation receipt matches the entire original intent.
  Match subject, repository/installation, source revision, branch, landing unit,
  caller/operator and approval lifetime. A shared profile name, token expiry,
  newer success or a different replacement intent alone is insufficient.
- Current unresolved workflow failures and pending commands are evaluated across
  the available collection. The newest unrelated success cannot hide them.
  Environment readiness and primary attention reuse this classification.
- A successful owner read does not upgrade an individually stale, unverified or
  unavailable record to current. Such records retain their freshness, disable
  executable routing and qualify aggregate source coverage.
- An explicitly partial Prototype response or continuation is incomplete even
  when the available page is fresh and empty. Its count is a lower bound.
- The legacy Platform overview is bounded to 200 operations and Orchestration
  to 100 recent runs. A full window cannot certify complete attention coverage;
  recent-run summaries identify their scope. A paginated Environment history
  likewise cannot certify readiness from its first page: it shows a non-blocking
  "History incomplete" state until coverage is known. Known per-item actions remain
  usable with current catalog authority. Full history remains paginated in its
  existing inspection surface.

Domain failure semantics still apply. A failed durable Orchestration run may
require correction of its own intent; a successful different run cannot erase
it. Delivery terminal roots, retired/graduated Prototypes and completed Proposals
follow their existing owner selectors. Repository attention uses reconciled
current Inventory, while Portfolio eligibility alone creates no required move.
These rules cover the nine primary attention inputs; they do not certify every
workspace screen or legacy historical record as complete.
