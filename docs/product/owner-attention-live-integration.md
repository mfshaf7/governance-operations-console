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

