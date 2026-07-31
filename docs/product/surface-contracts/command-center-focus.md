# Command Center Focus

Status: accepted local-baseline surface contract.

## Recommendation Posture

- `replace` the stale fixture-driven priority briefing and its Action, Context,
  and Queue tabs
- `extend` Console Shell with one generic typed focus-entry intent
- `reuse` domain-owned required-move projections, source metadata, Agent
  Context, and the existing Console visual language
- introduce no new backend service, authority, database, mutation path, or
  shared product

## Purpose

Command Center Focus answers:

> What requires operator action now, why, who owns it, how trustworthy is the
> projection, and where should the operator go?

It is a read-only cross-console priority projection and navigation surface. It
does not execute the required move, reinterpret domain state, or become a
general queue, activity feed, health dashboard, or workflow engine.

## Ownership

Command Center owns:

- the neutral attention-source and attention-candidate contracts
- explicit source admission and exclusion
- candidate validation, deduplication, deterministic ranking, and selection
- the default Focus presentation
- truthful synthetic design scenarios before live adapters are admitted
- conversion of the selected candidate into a bounded Agent Context candidate

Console Shell owns:

- the focus slot and cross-capability router
- generic typed entry intents
- opening the owning Workbench domain or workspace
- returning from an owning surface to the retained Focus selection

Each domain or workspace owns:

- whether one of its records requires operator attention
- the required move, urgency, owner, reason, and canonical subject identity
- the route intent that its public workspace can resolve
- source version, observation time, freshness, receipts, and evidence refs
- removing or replacing a candidate when its state changes

Command Center must import only public attention-source boundaries. It must not
import domain presentation internals, private fixtures, workflow controllers,
or workspace implementations.

## Non-Ownership

Focus does not own:

- domain lifecycle or workflow state
- canonical backend writes
- approval, security, platform, release, or ART authority
- runtime health truth
- chronology or audit history
- raw operational context
- model context admission
- durable business persistence
- autonomous action or recovery

The Console has no Command Center business database. Pre-baseline continuity
is derived from structured fixtures and prototype-local domain runtimes.
Post-baseline adapters read owner systems and preserve the same candidate
contract.

## Source Admission

The pre-baseline projection admits public sources from:

- Proposal
- Repository
- Delivery
- Prototype
- Portfolio
- Orchestration
- Lifecycle Transitions
- Dev Integration
- Governed Releases

The source registry explicitly reserves or excludes:

- Model Operations until it projects a real routed operator action
- Runtime Readiness until an alert carries a typed owner route and required
  operator move
- direct WGCF attention until stable escalation or decision-listing reads exist
- Workspace Pulse because it is an aggregate posture projection
- Governance Activity because it is chronology
- CGG because it is context admission
- Agent Console and Agent Runtime because they are assistance and runtime
  surfaces
- completed, historical, passively waiting, or merely active records

OOS, WGCF, Platform Engineering, OpenProject, and other owner systems remain
authorities behind the public sources. They are not duplicated as extra
Command Center candidates.

Every registered Workbench domain and Console workspace must have an explicit
`admitted`, `reserved`, or `excluded` disposition. Silent omission is invalid.

## Candidate Contract

An attention candidate carries:

- schema version
- stable candidate id
- canonical subject ref and operator-facing subject title
- stable required-move id and label
- attention class:
  - `recovery`
  - `decision`
  - `required-action`
  - `review`
  - `external-follow-up`
- explicit urgency independent of visual tone
- concise reason
- owner label and owner ref
- source authority, source mode, source ref, source version, observed time,
  projected time, and freshness
- canonical deduplication key
- typed route target, route label, availability, and unavailable reason
- optional due time, review time, correlation ref, receipt refs, and evidence
  refs

Visual tone is derived presentation. It is never a ranking input or source of
business meaning.

Only a current source projection may claim that its route is executable. A
stale, unavailable, or unverified source cannot silently remain actionable. If
refreshing that source is itself a real owner-issued action, the owner emits a
separate current candidate for that move.

## Projection Rules

The projection:

1. reads immutable source snapshots through public attention sources
2. validates candidate identity, source posture, required move, owner, and route
3. removes completed, passive, historical, and invalid entries
4. deduplicates by canonical subject and required move
5. resolves cross-boundary duplicates in favor of the owner of the current move
6. ranks current candidates deterministically
7. retains the selected candidate while it remains present
8. selects the highest-ranked remaining candidate when the selection resolves

Ranking uses, in order:

1. explicit urgency
2. attention class
3. due or review time
4. owner-provided bounded rank
5. stable candidate id

No component may recompute eligibility, urgency, or required moves from display
labels or tones.

## Default Interface

The default surface uses the accepted softer Console visual language, not a
Teras workspace skin.

Its stable content is:

- header:
  - kicker `Command Center Focus`
  - stable title `Operator priority`
  - compact projection/source posture control
- one continuous bounded deck:
  - search across subject, owner, required move, authority, and reference
  - urgency filter
  - `Needs attention`
  - bounded queue with at most five visible rows
  - internal scrolling for additional candidates
  - selected `Operator priority`
  - subject, owner, required move, concise reason, timing, and source posture
  - one primary route action
  - disabled route explanation when the owning path is unavailable
- contained source/evidence information dialog for longer facts
- explicit empty, unavailable, and source-degraded states

The default Focus panel must have the same rendered height as the Workspace
Pulse panel in the first Console grid row. Candidate count, selection, hover,
loading state, or detail length must not resize that row. Queue overflow is
handled inside the bounded queue viewport.

The initial implementation must first:

1. remove duplicate or passive content
2. shorten operator copy
3. move long source and evidence facts into a contained information dialog
4. keep filtering, queue review, and selected-priority action visible together

Tabs are an admitted fallback only when genuinely distinct remaining content
still cannot fit cleanly within the shared panel height. Tabs must not be used
to hide duplicated prose or compensate for an unbounded queue. Introducing a
concrete tab set requires visual inspection and operator discussion before
cutover.

The stale Action, Context, and Queue tabs are not retained by default.

## Navigation Contract

Focus routes through one generic Console entry intent:

- target Workbench domain or Console workspace
- canonical subject ref
- required-move ref
- neutral intent such as inspect, review, resume, resolve, or configure

The destination resolves that intent against its current read model. Command
Center does not name or open private workflow steps.

If the record or required move changed after projection, the destination shows
the current record posture and reports that the original focus is no longer
current. It must not open a stale workflow blindly.

The repository-only `repositoryProposalId` routing exception is removed after
all current callers use the generic intent.

## Agent Context

Selecting a candidate updates the existing Agent Context candidate. Focus does
not need a second Agent Console or a dedicated agent-only priority system.

Before CGG integration:

- synthetic bounded Focus context may be attached under the existing
  prototype-local policy
- live and source-projected candidates remain visible but model-blocked
- unavailable or over-budget candidates fail closed

After CGG admission, the agent receives only the admitted model-safe packet and
its receipt references. Raw source payloads never pass directly from Focus to
the model.

## Pre-Baseline And Live Wiring

Pre-baseline implementation uses:

- structured owner-domain fixtures
- prototype-local domain runtime snapshots and subscriptions
- explicit `synthetic`, `source-projected`, `live`, and `unavailable` modes
- deterministic projection and semantic tests

It does not authorize live cross-repo API wiring.

Post-baseline wiring replaces sources incrementally:

1. OOS Proposal and Delivery reads
2. WGCF escalation and decision reads after those list APIs exist
3. admitted Platform profile and release reads
4. other owner APIs as their contracts become stable
5. CGG admission for model-safe selected-candidate context

Server-side adapters own credentials, source fetching, pagination, bounded
refresh, and response validation. Presentation does not call owner APIs
directly. The Console keeps no canonical business store.

## Required Validation

The implementation must prove:

- every domain and workspace has an explicit source disposition
- attention sources expose read-only public contracts
- presentation imports no domain internals or fixtures
- ranking is deterministic and ignores tone
- stale sources cannot claim executable routes
- cross-boundary candidates deduplicate correctly
- generic entry intents resolve or fail honestly
- returning from an owning surface retains valid Focus selection
- selected Focus context obeys Agent Context and CGG policy
- queue overflow does not change the shared first-row panel height
- no stale fixture decisions, old briefing tabs, or obsolete guards remain
