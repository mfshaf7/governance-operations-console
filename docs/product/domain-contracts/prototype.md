# Prototype Domain Contract

Status: accepted local-baseline domain contract.

Prototype owns prototype registry inspection, Candidate Promotion, baseline
evidence preparation, preview runtime proof, and source-side
lifecycle-transition intent preparation.

## Surface Purpose

The operator uses Prototype to inspect and shape prototypes before they become
governed delivery work, durable owner-repo source, admitted platform work, or
retired records.

Prototype is not a lifecycle-transition authority and not a Delivery execution
surface.

## Ingress

Allowed ingress classes:

- `local-entry`
- `proposal-routed`
- `existing-source`
- `imported`

Direct local entry is allowed for fast incubation. It cannot become governed,
client-visible, real-mutable, or graduated without the later approval and
route-specific graduation path.

The accepted Prototype surface must expose a first-class direct request entry,
such as `New Prototype Request`, at the same control level as Proposal capture
and Repository request. A direct request creates a prototype-local record with
`ingress: local-entry` and `lifecycle: exploring`, then routes into Prototype
Landing. It must not bypass Landing, Candidate Promotion, Preview Runtime
proof, Baseline Promotion, or route-specific lifecycle-transition control.

## Outbound Transition Terminology

The current prototype source and UI use `Movement Request` for the workflow
that prepares source-side transition intent. That label does not grant
Prototype or a central Movement Control surface target admission, exception,
execution, or mutation authority.

This contract uses `source transition intent` for the architecture concept.
The implementation label may remain until Prototype outbound routes and
operator wording are reviewed. No pending route may be inferred from that
temporary label.

## Landing And Admission Model

Prototype request capture is not the same as Prototype landing.

Request capture answers: "someone wants a prototype." Proposal routing,
existing-source review, and imports may create the same entry intent through a
different upstream surface. Landing answers: "the prototype is admitted into
Prototype Studio with the right record, structure, tools, first required move,
and recovery path."

All ingress classes produce a Prototype Entry Packet. Direct Request may
produce a richer packet because there is no upstream proposal context.
Proposal-routed work usually produces a lighter packet with proposal context,
route reason, and known constraints only. Landing normalizes either packet
shape into the admitted Prototype Studio record. Proposal must not become a
Prototype setup form, and Landing must not assume the Request form was filled.
Proposal title is source metadata and may seed the initial suggested Prototype
name. It is not the accepted Prototype name until Landing accepts it or the
operator changes it. The same rule applies to other reusable proposal metadata:
owner, objective/summary, source home, preview need, data mode, mutation
boundary, visibility, support profile, and setup assumptions are suggestions
or defaults until Landing records them as Prototype metadata.

Every new prototype must pass through a Landing workflow before normal lifecycle
work starts. Landing does not force a final project type. It records the support
profile needed for the prototype to land cleanly, then keeps missing, unknown,
or blocked support visible. Landing may create an `exploring` record first, but
that record stays incomplete until the landing workflow produces a landing
receipt or a blocked landing state.

Landing must record:

- ingress class: `local-entry`, `proposal-routed`, `existing-source`, or
  `imported`
- prototype name, or an explicit missing-name state when the entry packet only
  carries a source/proposal title
- support profile shortcut: simple prototype, interactive prototype, prototype
  with local runtime, prototype with external dependency, or existing source
  review
- support rows for source, studio home, interface, runtime, data, integration,
  tooling, evidence, visibility, and recovery
- source home: docs-only, existing source path, new prototype folder, console
  domain module, app folder, or future owner repo
- intended starting lifecycle: usually `exploring`, or `candidate` only when
  the source evidence already proves the operator wants it shaped
- preview need: none, static preview, local dev server, local backend stub,
  prototype-devint preview profile, or future dev-integration profile
- data mode and mutation boundary
- visibility tier and exposure posture
- required evidence and tools
- blocked conditions and allowed recovery path

Landing must produce structured output:

- registry draft or record fields for `prototypes.yaml`
- docs path plan for brief, backlog, design profile, decision log, and change
  log
- source path plan when source is needed
- fixture/read-model plan when interface support needs scenario data
- preview profile draft when preview proof is required
- validation or smoke plan when the prototype has executable source
- security trigger notes for real data, client exposure, identity, secrets,
  AI-assisted action paths, mutable external systems, or external hosting
- first required move after landing
- landing receipt, or blocked landing state with owner and required fix

The first required move is an output for the selected panel and Prototype Dashboard
after Landing completes. It is not an extra Landing wizard step. Normal
successful Landing records `lifecycle: exploring` and sets the next current
required action to Candidate Promotion. Exceptional packets may stay blocked,
review-only, or already candidate only when the entry packet carries explicit
source evidence for that state.

Request capture is only a capture surface. It must still be first-class:
required fields and selected support options must be visible in a readiness
checklist, and each row should turn ready only when the corresponding input is
filled or selected. Request capture may expose a top-right Selection Guide
button in the Entry Packet panel that opens a simple dialog explaining the
available dropdown selections. It must not use a separate guide panel that
competes with the readiness panel. Request capture must not present itself as
the final Landing workflow once the accepted Prototype replacement is being
evaluated.

## Landing Support Profile

Landing uses a support profile, not a rigid prototype type matrix. The support
profile is a readiness map for what the prototype needs so it can start cleanly
inside Prototype Studio. It is intentionally softer than baseline approval.

Landing also owns the scaffold profile. The scaffold profile records the
preferred base platform for the prototype while it is still in Prototype
Studio. It is not platform runtime admission. It tells Prototype what starting
shape to create or track, and it seeds the local preview profile when preview
is needed.

Support profile shortcuts are allowed only as precomputed starting points:

- simple prototype
- interactive prototype
- prototype with local runtime
- prototype with external dependency
- existing source review
- custom support profile

Base platform options are bounded but soft:

- unassigned or custom
- Next.js app
- Vite React app
- Node.js Express API
- FastAPI service
- Flask service
- static site
- container compose
- existing source
- docs only

Each named shortcut generates support rows. Generated support-row content is
locked while a named profile is selected, because the row states belong to the
selected support profile. The operator can inspect generated rows, but cannot
manually change their state unless `custom support profile` is selected.
Custom support profile keeps support rows as editable structured state. Row
edits remain local draft state until the operator records the landing move,
and leaving with unrecorded row edits must use the shared draft close guard
rather than silently discarding them. Hard system blockers such as real mutable
data or real-system mutation remain locked even in custom mode.

The accepted compact Landing setup surface uses shared Teras panels, trays,
checklist rows, status pills, and fields. The first visible step is
`Landing Profile` because it covers both prototype identity and support
profile selection. The body keeps prototype identity separate from the support profile
configuration tray. A support guide action belongs inside the support profile
configuration tray, not in the outer Landing Profile panel header, because the
guide explains profile and row-state semantics for those controls. The support
option and support state controls must be
nested together so they do not look like sibling profile selectors. Named
profiles generate locked support-row content. Custom profile enables support
row editing. The right check panel shows the rows relevant to the selected
profile; custom profile shows the full row map. In a named generated profile,
the right check panel remains informational unless there is an actual blocker,
but each row still renders its own support state. Generated `needed` and
`unknown` rows are locked profile output, not editable operator warnings.
Disabled controls inside the generated row inspector remain muted.
Setup Plan keeps only setup choices in the body and shows grouped setup status
in the right check panel by record/docs, source home, fixture, preview,
validation, and integration instead of listing every planned artifact as a
repeated row.
Prototype owns the support row semantics, dirty state, command, receipt, and
guard behavior; Teras owns the reusable row, tray, panel, field, log, and guard
chrome.

Support rows use these states:

- `unknown`
- `not-needed`
- `needed`
- `ready`
- `blocked`

Support rows:

- source support records origin, source reference, proposal link, existing
  path, or import context.
- studio-home support records where docs, source, fixtures, and custody notes
  belong during incubation.
- scaffold profile records the preferred base platform, generated scaffold
  outputs, and the preview launch adapter seed when preview is needed.
- interface support records whether visible UI, command, API, workflow,
  review, or no interaction surface is needed.
- runtime support records whether the prototype needs no preview, static
  review, local dev server, local backend stub, prototype-devint preview, or
  future dev-integration.
- data support records mock, synthetic, real-readonly, or real-mutable data
  posture.
- integration support records no integration, mock boundary, read-only
  external boundary, sandbox mutation, or blocked real-system mutation.
- tooling support records install, start, preview, fixture, smoke, or
  validation commands needed for continuation.
- evidence support records brief, backlog, decision log, change log, design
  profile, validation proof, and receipts needed now or later.
- visibility support records private, operator-review, client-review, or
  public-demo exposure requirements.
- recovery support records missing info, blocked landing reason, owner,
  required fix, and the first next move.

Baseline approval hardens the support profile into stronger requirements. A
prototype does not need a final classification to land, but baseline approval
does require enough confirmed shape, support tooling, validation evidence,
visibility posture, data boundary, and unresolved-risk visibility to proceed.

## Source Of Truth

Prototype records are sourced from `../../../prototypes.yaml` and linked
prototype records while the work remains in Prototype Studio.

Canonical fields include:

- lifecycle
- visibility tier
- data mode
- mutation boundary
- linked records
- design baseline ref
- graduation ref
- retirement ref

The console may display and prepare baseline evidence. It must not claim a
baseline, graduation, security acceptance, or platform readiness without the
required records.

## Primary Surfaces

Prototype should separate:

- Registry
- Request Capture
- Landing
- Prototype Dashboard
- Candidate Promotion
- Preview Runtime
- Baseline Promotion
- Source Transition Intent preparation (currently labeled `Movement Request`)
- History/receipts

The previous temporary `prebaseline` extraction has been removed from active
source. Prototype Control is designed from this contract, not mechanically
normalized from the page-era code.

## Prototype Control Shape

Prototype is a register-led focused control modal. It has deeper workflows
than Proposal or Repository, but its first screen uses the same compact
control pattern: top summary plus dedicated request panel, register plus
selected launcher, compact row actions, whole-record status pills, and compact
register-side selected panel. It is not a Delivery clone and not a
lifecycle-transition authority surface.

Prototype's admitted entry class is `focused-control-modal`.

Rules:

- the Workbench `PROTOTYPE` button opens `PrototypeWorkspace`
- `PrototypeWorkspace` owns a `TerasModalShell`, close behavior, shell title,
  and shell description for the Prototype Control modal
- Prototype Control renders as the modal body, not as an inline Workbench panel
- `app/page.tsx` must not mount `PrototypeWorkspaceSurface` directly after the
  modal entry shell exists
- after final cutover, the Workbench `PROTOTYPE` path must not mount inline
  legacy comparison code
- `prototype/prebaseline`, `PrototypeLegacyComparisonSurface`, and public
  legacy exports must stay removed after final cutover

The first screen must be compact-control shaped:

- summary panel on the left
- dedicated Prototype Request ingress panel on the right
- Prototype register with search, material filters, whole-record status pill,
  and one secondary Inspect row action
- compact register-side `TerasSelectedPanel` with selected-record metadata and
  required action

The selected launcher may summarize the selected record, but deep record work
starts from either the Prototype Dashboard or the state-derived Current Required
Action.

The Prototype Dashboard is the stable selected-record cockpit. It replaces the
separate "status modal" concept rather than competing with it. The dashboard should
show:

- selected prototype identity and source context
- lifecycle, landing, baseline, preview, outbound-transition, evidence, and
  open-issue posture
- why the current required action is needed
- links to stable surfaces such as Preview Runtime and read-only History
- safe focused details for status areas

The dashboard must not be a workflow session, workflow chooser, or generic menu. It
must not embed Landing, Candidate Promotion, Baseline Promotion, Source
Transition Intent preparation, Preview Runtime controls, or History contents.
It may link to those surfaces, but the surfaces own their own content, draft
state, actions, guards, commands, and receipts.

The register selected panel owns the two primary selected-record routes:

- `Open Dashboard` opens the Prototype Dashboard cockpit.
- `Current Required Action` opens exactly one state-derived owning workflow or
  control surface.

Workflow sessions are not freely browsable from a generic dashboard step list. A
workflow opens when the selected record state makes that workflow the current
required action, or through a safe read-only review link for already-recorded
evidence.

Deep work belongs in focused workflow modals:

- Landing
- Candidate Promotion
- Baseline Promotion
- Source Transition Intent preparation (currently labeled `Movement Request`)
- Closeout / Retirement
- Retirement or closeout request, when allowed

Persistent subsystem status belongs in stable subsystem modals:

- Prototype Dashboard
- Preview Runtime

Preview Runtime owns runtime/profile/proof inspection and local preview runtime
actions. A preview proof action may record prototype-local evidence, but
Preview Runtime itself is not a lifecycle workflow step and must not use
workflow-session chrome. It does not use an advisor panel.

History and receipts are read-only archive surfaces. They must not be a
mutable progress step.

History / Receipts is a read-only archive by default. It answers which
decisions, receipts, retained evidence, and closeout records exist for the
prototype. It may be opened from a retired/closed Dashboard utility panel or from
workflow receipt/result views, but it must not appear as an active workflow
step.

History / Receipts should contain:

- Receipt Timeline: landing, candidate promotion, baseline promotion, preview
  proof, source transition intent, lifecycle-transition projection,
  closeout/retirement, local receipts, result state, recorded time, and
  authority boundary.
  The timeline shows actual projected or recorded events only. Pending future
  workflow states belong in Archive Posture, not as fake timeline events.
- Evidence Archive: retained evidence refs, Baseline Packet artifact, preview
  proof, design refs, validation refs, and linked records.
- Archive Posture: lifecycle, ingress, landing, preview, baseline, outbound
  transition, and closeout posture as facts. Closeout appears as a fact, not as
  a separate prose-only panel.
- Receipt Archive: local and projected receipts retained for review. History
  does not expose reopen, reactivation, closeout, or workflow mutation actions
  in this prototype pass.

History must never mutate record identity or lifecycle merely because a new
local event was generated. It shows stable receipts from record truth, local
session receipts, durable/future backend receipts, or lifecycle-transition
receipt projection.

## Prototype Control Flow

Accepted operator flow:

```text
Request Capture or Proposal Handoff -> Prototype Entry Packet
Prototype Entry Packet -> Landing -> Registry
Registry -> Prototype Dashboard for understanding
Registry Current Required Action -> transition-specific workflow or control
Baseline Promotion -> transition-intent preparation -> route-specific validation and admission
Application receipt -> Prototype history and lifecycle projection
```

Prototype may prepare transition intent only after the source record and
evidence packet are complete enough to identify the transition kind, target,
gate snapshot, evidence refs, owner, and next intended path.

The source-intent workflow currently labeled `Movement Request` must not render
the full gate snapshot as an always-visible panel when the operator is choosing
intent. It should show a compact Transition Readiness panel with a first-class
action that opens a simple inspector dialog for source, baseline, custody, and
issue metadata. The review step keeps only the gate summary needed to decide
whether the source intent can be recorded.

Prototype must not use a Prototype-owned Movement tab as the final shape. A
Prototype transition surface may show source intent, validation, target
admission, application status, and receipts, but it must route the next action
to the authority identified by the lifecycle-transition contract.

## Structured Read Model

Prototype read models must be structured data derived from registry truth,
linked records, local drafts, local receipts, or future backend projections.
They must not be generated from loose prose alone.

Prototype Control mock and scenario data must be corrected to this contract
before visual inspection or accepted replacement. Prototype Control must not carry
legacy `prebaseline` data that encodes:

- `parked` as a lifecycle state
- Prototype-owned movement review or direct movement approval
- direct `Request Movement Review` as an accepted action
- Portfolio as a normal Proposal route target
- inline Workbench surface assumptions
- fake backend mutation authority
- old `registry` / `prepare` / `movement` tab structure
- source, baseline, preview, movement, or history states that cannot reconcile
  to the accepted read model, local draft, prototype-local receipt, future
  backend projection, or lifecycle-transition receipt truth

Useful legacy business examples may be kept only after being remodeled into
the accepted Prototype read model below.

## Legacy Reference Inspection Rule

The legacy `prebaseline` surface is a reference artifact, not a parity target.
Prototype must not carry every old capability forward simply because the old
surface had it.

Before a Prototype workflow is reshaped, accepted, or used to justify legacy
removal, inspect the corresponding legacy behavior for one purpose only:
determine whether it solved an operator or workflow problem better than the
new contract currently does.

Each legacy idea must land in one of these outcomes:

- absorb it into the accepted Prototype contract because it strengthens the
  operator workflow
- reshape it through the accepted modal, dashboard, workflow-session, Teras,
  read-model, command, receipt, and guard patterns
- move it to the owning domain or cross-surface authority when Prototype is
  not the right owner
- reject it deliberately because the new contract is stronger or the old
  behavior encodes page-era, inline, stale lifecycle, fake backend, or
  centralized transition-authority drift

This inspection rule is not a capability matrix. It is a drift guard that
prevents useful old workflow knowledge from being missed while still allowing
the new contract to replace legacy behavior cleanly.

Prototype must not enter an accepted replacement or legacy-removal phase while
its new workflow is visibly narrower, less understandable, or less recoverable
than the accepted contract requires.

Required read-model families:

- registry summary
- prototype request capture
- landing draft
- landing decision/scaffold plan
- prototype record summary
- selected prototype record
- linked records
- preview profile
- preview proof
- baseline packet artifact
- source transition-intent draft
- local receipts and history
- open issues and gates

Selected prototype records should expose:

- record id
- name
- owner
- ingress class
- lifecycle
- visibility tier
- data mode
- mutation boundary
- source path or source ref
- linked records
- projection version or freshness label
- preview profile state
- baseline promotion state
- current required move
- evidence refs
- open issue refs
- last local receipt refs
- last lifecycle-transition receipt ref, when available

## State Model

Prototype lifecycle states remain:

- `exploring`
- `candidate`
- `baseline-approved`
- `graduating`
- `graduated`
- `retired`

Prototype must not introduce `parked` as a lifecycle state. Parking-like
operator intent is represented as `exploring`, `retired`, or a defer request
owned by the route-specific authority, depending on the record's actual
posture.

Lifecycle moves are not one generic workflow. Each move has its own workflow
because its evidence, authority boundary, commands, and recovery path differ:

- Landing / admission: request capture or source projection into an admitted
  Prototype Studio shape.
- Candidate Promotion: `exploring -> candidate`.
- Baseline Promotion: `candidate -> baseline-approved`.
- Prepare Source Transition Intent: `baseline-approved -> graduating` only when
  the relevant outbound route contract permits that projection.
- Resolve Returned Transition: `graduating -> baseline-approved`,
  `graduating -> retired`, or continued `graduating` with corrected evidence.
- Retire Prototype: any non-graduated active lifecycle into `retired`, subject
  to route-specific custody and authority rules when a boundary is crossed.
- Review Graduated: read-only projection after source of truth moves elsewhere.

The Prototype Dashboard may show lifecycle posture, but it must route the current
required action to the owning transition workflow instead of forcing all
lifecycle movement into one staged modal or a generic workflow menu.

Baseline packet states are local Prototype preparation states:

- `not-started`
- `drafting`
- `needs-evidence`
- `ready-for-movement`
- `returned`
- `blocked`
- `receipt-projected`

Lifecycle-transition states remain separate from Prototype lifecycle and
baseline-packet states. Prototype may project the last known transition state
for context, but it must label that state as source intent, validation,
admission, application, or receipt projection.

Preview runtime states are local readiness states:

- `no-profile`
- `profile-draft`
- `profile-configured`
- `not-started`
- `running`
- `proof-failed`
- `proof-ready`

Preview runtime proof means local prototype proof only. It never means platform
readiness, stage readiness, production readiness, or security acceptance.

## Workflow Model

Prototype workflows use surface families, not one generic workflow modal.

- Stable review/runtime surfaces are not lifecycle wizards: Prototype Dashboard,
  Preview Runtime, and History / Receipts. They may use tabs, status panels,
  command logs, and
  detail dialogs. They must not present themselves as lifecycle-transition
  wizards.
- Capture/setup wizards prepare entry or setup state: Request Capture and
  Landing. They may collect structured fields, support rows, setup choices,
  readiness checks, and run output.
- Decision wizards guide one bounded decision: Candidate Promotion, Baseline
  Promotion, Source Transition Intent preparation, and Closeout / Retirement.
  Most decision wizards should be simple: input or selection, review and apply,
  then result or receipt. Add more internal steps only when the required
  evidence cannot be reviewed honestly in two steps.

Prototype wizard visuals follow this contract:

- The modal header keeps a stable workflow title, selected prototype identity,
  and lifecycle/status context. Do not duplicate the selected prototype title in
  unrelated body panels.
- The step indicator is compact and horizontal for normal wizards. A large
  Delivery-style left progress rail is not the default Prototype shape.
- The body uses two clean zones. The left zone owns the active work: form,
  selection, checklist, packet review, or result. The right zone owns bounded
  support: advisor/readiness, run log, authority boundary, impact review, or
  receipt context.
- The footer owns Back, Next, Apply, and Finish actions. Do not duplicate the
  primary action in a body panel unless the workflow uses a dedicated final
  confirmation guard.
- Whole-modal scrolling is a failure state for normal desktop wizard content.
  Long operational output belongs in the log primitive; long references belong
  behind detail dialogs or scrollable trays.
- Panels must have a real job: collect input, show state, show evidence, show a
  log, show an authority boundary, or show a receipt/result. Prose-only panels
  are not a valid wizard body.

Prototype rework must use a rebuild threshold instead of preserving a bad
shape. If the current implementation is materially off-contract in modal
family, zone model, required log/advisor/guard affordances, authority boundary,
state ownership, or operator action path, do not patch it into place just to
reuse old code. Build the accepted surface cleanly from the contract and use the
old or legacy implementation only as capability reference. Legacy code may
inform required data, actions, and edge cases; it must not set the accepted
visual structure, workflow sequence, or component composition. After cutover,
the temporary legacy comparison path must be removed instead of becoming a
second active implementation.

Required workflow affordances:

| Surface | Family | Visual shape | Log | Advisor/readiness | Guard | Output |
| --- | --- | --- | --- | --- | --- | --- |
| Request Capture | Capture/setup | Compact capture modal with readiness checklist | none | readiness checklist only | dirty close guard | entry packet only |
| Landing | Capture/setup | Setup wizard: entry/support, setup plan, landing run | required Landing Run Log | optional bounded advisor/readiness | dirty close guard | landing receipt or blocked landing |
| Candidate Promotion | Decision | Interview, review/apply, result | none | required bounded advisor/readiness | dirty close guard | candidate decision receipt and lifecycle projection |
| Preview Runtime | Runtime surface | Runtime/profile/evidence tabs and control panels | required command log | none | profile dirty guard and stop guard | preview proof receipt only |
| Baseline Promotion | Decision | packet/evidence, review/apply, result | none | required bounded advisor/readiness | dirty close guard | Baseline Packet and baseline receipt |
| Source Transition Intent (`Movement Request` UI label) | Decision | intent, request review, result | none until real backend command exists | optional readiness, no advisor by default | dirty close guard | source-side transition intent and local receipt |
| Closeout / Retirement | Decision | reason/impact, review/apply, result | none | none | dirty close guard and final local-retirement confirmation guard | local retirement receipt or impacted transition intent |
| History / Receipts | Review surface | read-only archive modal | none | none | no mutation guard | retained receipts and evidence |

The architecture guard must enforce the required affordances that are already
represented by Teras primitives. Landing must use `TerasActivityLogPanel`.
Preview Runtime must use `TerasActivityLogPanel`. Candidate Promotion and
Baseline Promotion must use `TerasAdvisorPanel`. Editable wizards must use the
shared dirty close guard or an approved workflow-specific close guard. Local
retirement must use a final confirmation guard before recording the retirement
receipt.

Landing prepares the prototype's studio shape: support profile, support rows,
source home, required scaffold, docs paths, source paths, preview need,
validation plan, security triggers, first required move, and landing receipt or
blocked landing state.

Landing is an admission wizard with one modal and three visible steps:

- Landing Profile: review and normalize direct request, proposal-routed,
  existing-source, or imported context while confirming prototype identity and
  selecting the support profile. Named profiles generate locked support rows
  and the right check panel shows only the relevant generated rows. Custom
  profile enables row-state editing and shows the full row map.
- Setup Plan: choose only the setup fields that affect the landing record:
  source home, base platform, preview need, scaffold outputs, docs/source path
  plan, validation/smoke plan, and preview profile seed when needed.
- Landing Run: run the local landing action from a first-class right-zone
  action panel, show run output in the Landing Run Log, then enable the footer
  Record Landing action only after the current draft has been run. The run
  checklist flips setup rows to done or blocked after the run; the receipt row
  remains pending until the footer records the landing result.

Entry Packet and Support Profile are conceptual responsibilities inside the
Landing Profile step. They must not become separate metadata dumping panels.
Setup Plan must not repeat Entry Packet facts unless the field directly changes
what the landing action records.

Landing must include a structured Landing Run Log. The log shows planned and
actual setup/check output for registry record, docs plan, source path,
scaffold outputs, preview profile seed, validation plan, recovery/blocker
entries, and landing receipt. Rows use explicit states such as pending,
running, done, failed, or skipped. Failed required rows produce a blocked
landing result instead of a fake successful landed record.

The current Landing Run is a prototype-local simulation. A future durable
Landing definition starts only after Landing Profile and Setup Plan produce one
immutable approved setup plan. That definition selects a bounded conditional
node set for registry, docs, source/scaffold, fixtures, preview-profile
preparation, validation, and evidence. The support profile may select or skip
definition-owned nodes, but it may not supply arbitrary commands or executable
steps.

Missing required inputs, unsafe real-system mutation, and unresolved security
triggers block preflight. They do not become vague human waits inside the run.
The future run locks the prototype record and affected source home, emits
structured progress plus log and artifact refs, and completes only after the
required output inventory and landing receipt verify. Prototype lifecycle and
landing state remain domain projections; they are not replaced by generic run
state.

Landing may use a bounded advisor/readiness panel to suggest support rows,
flag missing source or source-home fields, warn about real data, mutable
integration, visibility, or security triggers, and suggest base platform or
preview mode. It must not decide candidate status, approve baseline, apply a
cross-domain transition, or claim platform/runtime readiness.

Candidate Promotion prepares the `exploring -> candidate` decision. The wizard
uses a bounded candidate interview: identity, prototype objective, target
operator or user, expected proof, scope, non-goals, source context, data mode,
mutation boundary, visibility tier, security/governance triggers, and open
issues.

Candidate Promotion should feel like a bounded interview workflow, not a
static record-inspection page and not a generic "record a receipt" button. It
should guide the operator through:

- Candidate Brief: objective, target operator or user, problem or opportunity,
  and expected proof.
- Scope and Non-Goals: in-scope work, out-of-scope work, involved surfaces,
  and support assumptions.
- Boundaries and Risks: owner, source authority, data mode, mutation boundary,
  visibility tier, security/governance triggers, and unresolved issues.
- Promotion Decision: promote to `candidate`, block promotion with required fix
  and owner, or route to retirement/closeout when the idea is no longer worth
  pursuing. Leaving without recording keeps the prototype exploring; the
  workflow must not create a no-op `keep exploring` receipt. Block promotion is
  available only when a visible blocked issue already supplies the owner and
  required fix; the decision must not manufacture a generic blocker.

Most Candidate Promotion steps may use a bounded advisor/readiness panel. The
advisor may suggest clearer wording, identify vague scope, flag boundary gaps,
and recommend a decision with reasons. It must not auto-promote, silently edit
drafts, invent source truth, hide uncertainty, or trigger movement/baseline
actions. Operator action records the decision.

Preview Runtime inspects the local preview profile, runtime status, logs, and
proof path. It may record a prototype-local preview proof receipt from a
Preview Runtime action. Baseline Promotion consumes preview proof when the baseline
requires it. Preview Runtime does not create platform runtime authority and is
not a lifecycle transition workflow.

Baseline Promotion is the `candidate -> baseline-approved` workflow. Baseline
Packet is the evidence artifact assembled inside that workflow. Use Baseline
Promotion when referring to the operator workflow, current required action, or
lifecycle move. Use Baseline Packet only when referring to the evidence bundle
artifact.

Baseline Promotion assembles the baseline evidence:

- identity and owner
- prototype objective
- scope and non-goals
- workflow and state map
- design evidence
- data and mutation boundary
- source boundary
- preview proof
- open issues
- security/governance triggers
- next intended path

Baseline Promotion is not a second Candidate Promotion interview and not a
source transition-intent workflow. It reads
Landing, Candidate Promotion, Preview Runtime, Dashboard facts, and local receipts,
then lets the operator assemble packet-specific evidence, resolve missing
requirements, and record the baseline decision.

Baseline Packet artifact requirements are grouped as:

- Definition: prototype id, owner, objective, target operator or user,
  accepted scope, non-goals, and Candidate Promotion receipt or source
  projection that proves candidate posture.
- Design and Workflow: design profile, surface list, workflow map, state map,
  major interaction states, and baseline-visible assumptions.
- Evidence: preview proof when required, validation or smoke proof when
  applicable, design review proof, screenshots or inspection notes when used,
  local receipts, and linked record refs.
- Boundaries: data mode, mutation boundary, source boundary, visibility tier,
  integration boundary, security/governance triggers, and explicit
  post-baseline or graduation work.
- Issues and Risk Disposition: unresolved issues, accepted risks, deferred
  items, blockers, required fix owner, review date when deferred, and
  justification when a risk is accepted or deferred.
- Decision: approve baseline, block baseline with required fix, or route to
  retirement/closeout when the prototype is no longer viable.

Baseline Promotion may expose limited editable fields: baseline title, baseline
statement, accepted/excluded summary, selected evidence refs, missing evidence
disposition, issue/risk disposition, and the final baseline decision. It must
not re-ask Landing setup questions or Candidate Promotion interview questions
unless those prior outputs are missing or stale.

Approving the packet records Prototype Studio baseline acceptance only. It
does not authorize real mutation, platform runtime, client exposure, security
acceptance, Delivery ART execution, source graduation, or cross-domain
application.

Baseline Promotion is one workflow modal with internal progression:

- Baseline Brief: reads Candidate Promotion output and shows objective, target
  operator or user, accepted scope, non-goals, owner, and candidate promotion
  receipt. Editable fields are limited to baseline title, baseline statement,
  accepted summary, and excluded summary.
- Design and Workflow: shows design profile, surface list, workflow map, state
  map, interaction states, and required diagrams when applicable. The operator
  may mark items included, missing, not required, or deferred with a short note.
- Evidence Assembly: shows preview proof when required, validation/smoke proof
  when applicable, design proof, screenshots or inspection notes, local
  receipts, and linked refs. The operator selects evidence refs and records
  missing-evidence disposition.
- Boundaries and Issues: shows data mode, mutation boundary, source boundary,
  visibility tier, integration boundary, security/governance triggers, and
  open issues. The operator records issue disposition: fix before baseline,
  accept risk, defer with owner and review date, or block baseline. Accepted or
  deferred risks require justification.
- Baseline Decision: shows readiness summary, missing required evidence,
  accepted risks, deferred items, final packet preview, and authority boundary.
  The operator records approve baseline, block baseline, or route closeout.
  Approve baseline is disabled until the current packet can produce a real
  transition-ready local baseline record; incomplete packet drafts remain
  editable and must not create partial local submission receipts.

Baseline Promotion may use a bounded advisor/readiness panel on each step. The
advisor may check whether the baseline statement matches the candidate scope,
flag missing workflow/state coverage, warn about stale or missing preview
proof, identify unsafe data/mutation/visibility combinations, and recommend a
decision with reasons. It must not approve baseline, edit packet fields
silently, apply lifecycle transitions, approve platform/runtime/security
posture, or claim source graduation.

Baseline Promotion output is a Baseline Packet artifact, a baseline promotion
receipt, and a lifecycle update only when the operator approves. The next
current required action may become Source Transition Intent only after the
relevant outbound route contract is locked. Preview Runtime remains the next
action when proof is still needed; otherwise the Dashboard shows the current
local posture without inventing a target route.

Source Transition Intent preparation, currently labeled `Movement Request`,
translates the approved baseline or impacted closeout into a versioned
source-side lifecycle-transition intent. It prepares source fields, target
intent, evidence refs, gate snapshot, and request reason. It does not decide
target admission, exceptions, or target application.

The current Prototype surface models the following source-intent categories for
route discussion. They are not target authorization, and no category is live
or route-approved until its route-specific contract is locked:

- Governed Delivery Request: prepare intent for a `baseline-approved`
  prototype to enter Workspace Delivery ART. This requires a Baseline
  Promotion receipt, Baseline Packet artifact, resolved source custody, and the
  route-specific `Prepare Delivery Handoff` contract. Delivery ingress owns
  admission and Delivery Intake Consume owns target shell application.
- Impacted Closeout or Retirement Request: prepare source intent when closeout
  crosses linked-record, custody, visibility, client, source, data, Delivery,
  or another owner boundary. Simple local retirement remains Prototype-owned.
- Returned Transition Correction: respond to a returned validation or target
  admission result by fixing evidence, request fields, or gate facts before
  producing a superseding intent.

Prototype source-intent preparation must not expose these as direct operator
choices:
Product Ownership, New Repo, Existing Repo, Portfolio Publication, Platform
Runtime, Production Deployment, Security Acceptance, Delivery ART mutation, or
Direct Graduation Completion. Those remain target-owner,
Repository/Portfolio/Platform, named decision authority, or downstream governed
work; Prototype must not present them as source-owned outcomes.

The workflow currently labeled `Movement Request` has internal progression:

- Movement Intent: governed delivery request, impacted closeout/retirement
  request, or returned movement correction. Intent is a bounded choice derived
  from the current prototype posture; target route and target owner are
  generated from that intent and must not be free-text operator fields.
- Packet and Source: Baseline Packet artifact, baseline promotion receipt,
  prototype id, source path/ref, owner, lifecycle, visibility/data/mutation
  posture, and movement-specific rationale.
- Gate Snapshot: baseline readiness, open issues, accepted/deferred risks,
  data/visibility/mutation boundary, security/governance triggers, source
  ownership, preview proof, validation proof, and linked records. Gate facts
  owned outside Prototype must be labeled as external owner facts. Impact facts
  that require target admission or an authority-decision receipt use review
  posture; they must not block forming the source packet.
- Request Review: structured transition-intent preview, authority boundary,
  unresolved blockers, and final prepare or returned-correction action.

Its output is a structured transition-intent draft, a prototype-local source
record, and a projected current required action. It may use `request-recorded`
only for a real local source record produced by that workflow. The shared
transition projection correlates later validation, admission, application, and
receipt truth. Once a local source receipt exists, the workflow must stop
offering the prepare action and route the operator to History / Receipts for
review.
A returned transition receipt is not terminal completion; it is return
evidence. Returned records remain actionable through Returned Transition
Correction until the operator records a superseding source intent or a later
application receipt is projected.

Closeout / Retirement is a standalone workflow, not only a source-transition
substep. It is available from landed active Prototype states because the
operator may decide the prototype is no longer worth pursuing at any stage.
The Dashboard exposes it as a dedicated lifecycle-control panel, but the Dashboard never
retires directly.

Closeout / Retirement availability:

- `exploring`, `candidate`, `baseline-approved`, and `graduating` may open the
  workflow.
- `graduated` and `retired` are review-only in Prototype Studio. Graduated
  records belong to the target owner for closeout.
- not-yet-landed entries use ingress language such as Cancel Request, Return
  Prototype Entry, Reject Import, or Cancel Entry. They are not retired
  prototypes.

Closeout / Retirement is one workflow modal with internal progression:

- Closeout Reason: no longer valuable, duplicate/superseded, unsafe or
  blocked, wrong route, completed elsewhere, stale/no longer pursued, or
  operator decision. The operator records a short explanation and superseding
  record/ref when relevant.
- Impact Review: lifecycle state, linked records, proposal, delivery, and
  product-registration references, source custody, visibility tier, data mode, mutation boundary,
  client exposure, baseline approval, pending transition intent, and
  security/governance triggers. The output is local eligible, impact review
  required, boundary review required, or blocked.
- Retention Plan: docs/brief/decision log, source archive, receipts/history,
  superseded-by link, local draft removal, preview proof retention, and owner
  review/date when needed.
- Closeout Decision: retire locally or prepare impacted closeout request. If a
  decision is unavailable, keep the option visible but disabled and show the
  reason directly under the decision tray. If the operator wants to keep working
  or cannot close out yet, they leave the workflow without recording a no-op
  closeout receipt. A future closeout blocker path requires its own explicit
  blocker model before it can be added.

Local retirement is allowed only when impact review proves the prototype is
still local to Prototype Studio and does not cross linked-record, custody,
visibility, client, source, real-data, mutable-integration, Delivery, or
pending-transition boundaries. Impacted closeout prepares source intent for the
route-specific transition path. Final local retirement uses a confirmation
guard and records a local retirement receipt before lifecycle becomes
`retired`.

The Dashboard Closeout / Retirement panel shows availability only. It should show a
status such as Available, Impact review, Boundary review required, Review only,
or Already retired, and an `Open Closeout` action when allowed. Its tone should
be warn/amber by default, muted for review-only, and danger only inside the
final confirmation step when destructive local retirement is selected.

The Dashboard must not show Closeout / Retirement and History / Receipts as sibling
utility panels at the same time. Active landed records show the Closeout /
Retirement utility panel as the final low-priority right-rail action. Retired
or closed records replace that panel with History / Receipts. History owns
retained evidence, receipts, closeout reason, and any future guarded
reopen/reactivation path. Reopen/reactivation must not be a Dashboard action.

## Transition Evidence Model

Each transition must declare required evidence before implementation. A
transition action is review-only or disabled until the required evidence exists
or an allowed blocker path is selected.

- `request -> landed` requires request source, support profile shortcut, support
  rows, owner, intended source home, base platform or explicit unassigned
  decision, visibility tier, data mode, mutation boundary, docs/scaffold plan,
  first required move, and landing receipt or blocked landing reason.
- `exploring -> candidate` requires source context, prototype objective,
  target operator or user, expected proof, scope, non-goals, owner, source
  boundary, data/visibility/mutation boundary, security/governance trigger
  review, open issue list, and explicit candidate promotion decision.
- `candidate -> baseline-approved` requires design profile, workflow/state map
  when applicable, preview proof when applicable, baseline evidence packet,
  security/governance trigger review, and explicit operator baseline acceptance.
- `baseline-approved -> graduating` requires a locked route contract, target,
  transition kind, packet refs, gate snapshot, target owner, reason, and a
  prepared source intent. Preparing intent alone must not infer target
  admission or application.
- `graduating -> graduated` requires a target application receipt. Prototype
  only projects the result.
- `returned -> corrected` requires return reason, owner, required fix, updated
  packet or request, and a superseding local or lifecycle-transition receipt.
- `active -> retired` requires retirement reason, impact/retention decision,
  linked records, confirmation guard, and route-specific admission or exception
  evidence when another authority is affected.

## Baseline Approval Boundary

Baseline approval is a Prototype Studio design and workflow acceptance record.
It means the operator accepts the local product shape, workflow model,
boundaries, and proof enough to continue implementation or prepare a later
route-specific transition.

Baseline approval does not authorize real mutation, platform runtime, client
exposure, security acceptance, Delivery ART execution, or source graduation.
Those require their owning control path.

Prototype may record baseline approval only when a structured design-baseline
record or equivalent future backend receipt exists. A later cross-boundary
route follows the source, validation, target admission, exception, and
application authorities in the lifecycle-transition contract.

## Preview And Runtime Admission

Preview runtime proof is local proof only. Landing or Preview Runtime must choose
the smallest truthful preview mode:

- no preview required
- static or docs-only review
- local dev server
- local backend stub
- prototype-devint preview profile
- future dev-integration profile after owner/platform/security admission

Prototype must not create a dev-integration profile, platform runtime, or
durable backend service by implication. It may prepare the profile draft,
surface missing profile fields, and record local preview proof when the
configured profile exists.

Preview Runtime outputs are limited to confirmed preview profile, runtime
action receipt, preview proof receipt, and evidence refs that Baseline
Promotion may consume. It must not approve candidate promotion, baseline
promotion, source transition intent, platform runtime, security, production
readiness, or source graduation.

The local preview profile carries a launch adapter, command, working directory,
host, port, and healthcheck. The launch adapter comes from Landing scaffold
profile by default, then Preview Runtime may adjust it when the local runtime
profile is edited. The adapter describes how to start the local preview, not
what the product permanently is.

## Command And Receipt Model

Prototype commands are prototype-local unless a future backend command path is
admitted.

Expected prototype-local commands:

- capture prototype request
- land prototype request
- record candidate promotion decision
- save or confirm preview profile
- start, stop, or restart preview runtime
- refresh preview proof
- record baseline promotion
- prepare source transition intent
- record closeout decision

Every command must define input draft, validation, authority boundary,
disabled reason, failure path, and receipt shape before implementation. The
receipt retains the applied input, applied record projection, schema version,
source version, route owner, and result state. Advisor prompts and generated
advisor text remain transient unless the operator explicitly accepts them into
a durable workflow field.

Workflow transitions are owned by the work model and invoked by the local
runtime command handler. Presentation controllers submit typed command input;
they must not provide arbitrary record-projector callbacks or persist whole
workflow records as competing local overrides.

Presentation may derive a read-only work-model plan from the current source
record and draft, but it must not invoke the record transition to speculate on
an applied result. The runtime independently derives the same plan from the
submitted draft before it runs or records a command.

Local workflow receipts are append-only and ordered. Effective projection
applies a receipt only when its record identity and source version match the
current projected record. Stale receipts remain reviewable evidence but do not
overwrite newer source truth. Direct request records are legitimate local
source records; later workflow outcomes project from receipts.

Prototype-local receipts must be labeled as local evidence. They do not prove
target admission, target application, backend mutation, platform readiness,
security acceptance, or Delivery ART execution.

Prototype History and Dashboard receipt counts derive from one normalized
receipt projection. When the same receipt exists in local runtime evidence and
an imported source record, it appears once and the local runtime receipt is
the preferred copy. Retry projection must not append the same receipt id twice.
The effective projection exposes that normalized receipt list to presentation;
Dashboard, History, and Preview views must not independently merge raw local
and source receipt collections.

`projectPrototypeEffectiveReadModel` is the single merge boundary for registry
records, Proposal entry records, local request records, ordered local workflow
receipts, and imported receipt references. Summary, filters, register,
selected context, Dashboard, workflow launchers, and History must resolve their
record from that effective read model.

## Persistence And Guard Model

Prototype selection and filters are ephemeral UI state.

Record, preview, and packet drafts are local draft state. Dirty state is
derived from the draft compared with the selected record projection, saved
draft baseline, or local receipt. Closing or navigating away from unapplied
dirty draft content requires the shared close guard.

Recorded or source-projected content remains reviewable but locks editing.

## Recovery Model

Blocked Prototype work must show the blocker, owner, required fix, and allowed
next move.

Common recovery paths:

- return to Landing and complete missing support, scaffold, or source context
- edit draft and retry validation
- refresh projection
- resolve missing source context
- resolve repository/source custody gate
- attach or replace evidence
- rerun preview proof
- prepare defer request
- prepare accepted-risk request
- record local closeout or prepare impacted closeout request

Accept-risk decisions belong to the authority identified by the named control.
Defer and retire decisions that cross lifecycle or custody boundaries belong to
the authority identified by the route-specific contract. Prototype may prepare
source intent and justification only.

## Validation Guard Expectations

Prototype validation must eventually prove more than file existence.

The accepted replacement should add focused guards for:

- request capture is not treated as completed landing
- landed prototypes have support profile, support rows, and matching scaffold plan
- support profile drives required docs/source/preview/validation artifacts at
  landing, while baseline approval carries the stronger evidence requirement
- lifecycle state is consistent with design baseline, graduation, and
  retirement refs
- preview-ready states have a preview profile or explicit no-preview decision
- baseline-approved states have a design-baseline record or accepted future
  receipt
- source transition-intent drafts use structured fields and gate snapshots,
  not prose alone
- prototype-local receipts cannot be rendered as durable backend, platform,
  security, lifecycle-transition, or Delivery receipts
- legacy `prebaseline` cannot re-enter accepted source after final cutover

## Code Structure

Prototype Control uses the standard stateful-operation ownership layers:

```text
prototype/
  index.ts
  domain/
    support/
  read-model/
    fixtures/
      records/
    selectors/
  work-model/
    commands/
    entry/
    preview-runtime/
    workflows/
  local-runtime/
  presentation/
    workspace/
    surface/
    dialogs/
      request/
      history/
    dashboards/
      prototype-dashboard/
      preview-runtime/
    workflows/
      shared/
      landing/
      candidate-promotion/
      baseline-promotion/
      movement-request/
      closeout-retirement/
```

`domain/` owns Prototype identity, lifecycle, movement state, support profiles,
and support-option rules. `read-model/` owns the projected registry,
selectors, activity/attention sources, and structured scenarios.
`work-model/` owns request, entry-packet, preview-state, command, and lifecycle
workflow models. `local-runtime/` owns prototype-local projection, ingress,
landing simulation, receipts, and subscriptions. `presentation/` owns the
public workspace, compact control, dashboards, dialogs, and workflow views.

Prototype uses Compact Control With Dashboard Extensions: compact-control entry
like Proposal and Repository, plus `presentation/dashboards/` for stable
focused control surfaces and `presentation/workflows/` for lifecycle workflow
wizards. React views render prepared props and emit bounded intents; read-model,
selector, command, receipt, controller, and guard logic must not be buried in
one surface file.

The old `prebaseline` path is no longer an active source path after final
cutover. Stale imports, public exports, guards, and mount references must stay
clean so it cannot re-enter as a competing implementation.

## Lifecycle Transition Dependency

Prototype Control must not infer outbound authority from the historical
Movement Control design. The shared authority model is locked in
`../surface-contracts/lifecycle-transitions.md`; each outbound route is locked
separately before its target application behavior changes.

Prototype may record an operator design-baseline acceptance as a Prototype
Studio record. It may prepare source intent for graduation, impacted closeout,
or another cross-boundary route. It does not own target admission, exception
authority, OOS execution, or target mutation.

The removed legacy path is historical evidence only. It must not be restored as
a comparison mode, alternate mount, type source, or workflow implementation.

## Lifecycle

Prototype lifecycle states:

- `exploring`
- `candidate`
- `baseline-approved`
- `graduating`
- `graduated`
- `retired`

`baseline-approved` means the operator accepted design/workflow/boundary proof.
It does not approve real mutation, stage/prod, client exposure, security
acceptance, Delivery ART execution, or source graduation.

## Baseline Promotion

Baseline Promotion must prepare, not silently approve, a baseline packet
artifact containing:

- identity and owner
- prototype objective
- scope and non-goals
- workflow and state map
- design evidence
- data and mutation boundary
- source boundary
- preview proof
- open issues
- security/governance triggers
- next intended path

For this console prototype, baseline evidence also requires diagrams:

- system boundary
- primary flow
- data flow
- lifecycle/state
- component

Baseline Promotion is a Prototype responsibility. A later cross-boundary route
uses the route-specific transition contract once the Baseline Packet is ready.
Baseline approval itself is recorded as an explicit Prototype Studio
design-baseline acceptance record or future backend receipt.

## Graduation

Allowed graduation paths:

- Workspace Delivery ART
- existing owner repo
- a new repo after Repository provisioning, Workspace Intake classification,
  and active repo promotion
- platform path after owner, delivery, and security gates
- retirement

ART is not mandatory for every prototype. It is required only when the work
becomes accepted governed delivery work.

Portfolio is not a Prototype graduation target. Prototype Preview Runtime owns
early proof and review visibility while the item remains a prototype. When
Prototype establishes a new durable repository, product, or component boundary,
it may prepare a generic Workspace Intake candidate. Classification remains
separate from Prototype baseline approval and graduation, and an `admitted`
candidate is not active inventory. A later Product Portfolio entry becomes
possible only after active product promotion establishes durable product
identity and ownership plus applicable Platform and Security evidence. Product
publication is a downstream product operation, not a Prototype lifecycle
transition.

Prototype may prepare the intended graduation target, but it does not own
target admission or target application. Graduation intent must preserve the
prepared evidence and target rationale for route-specific validation.

When Prototype prepares movement toward Workspace Delivery ART, the movement
packet must carry source-custody classification: `existing-repo`,
`new-repo-required`, `platform-internal`, or `non-source-work`, plus owner,
repo/source ref when applicable, repository gate state, and rationale. Delivery
Intake verifies that metadata before consume instead of assuming every
graduating prototype requires a new repository. Prototype must not hand off to
Delivery while a repository/source-custody gate is still unresolved.

The accepted route is:

```text
baseline-approved
  -> Prepare Delivery Handoff
  -> versioned Prototype Delivery packet
  -> shared validation
  -> automatic Delivery ingress admission
  -> Delivery Intake / needs_consume
  -> Consume creates or reuses one Delivery shell and backlinks
  -> final graduation receipt
  -> graduated / review-only Prototype history
```

The Delivery handoff uses a fixed target and generated target ownership. It
must not expose target lane or target owner as free text. Target PI, Iteration,
Delivery Team, and the ART execution tree remain Delivery-owned metadata.

Work Design receives approved Prototype context and remaining-work evidence as
continuation input. It does not restart discovery from an empty proposal, and
it does not treat a Prototype component, UI, or evidence tree as an executable
ART tree.

Prototype becomes `graduating` when an accepted source intent is recorded. It
becomes `graduated` only when a final target application receipt proves the
Delivery shell, Prototype and baseline backlinks, and resolved durable source
custody. Intake admission or request acceptance alone is not graduation.

## Non-Goals

Prototype must not:

- claim target admission or target application
- classify Workspace Intake or promote active Workspace inventory
- replace lifecycle-transition validation, named decision authorities, or
  Orchestration
- treat Preview Runtime proof as platform readiness
- use local entry to bypass Proposal for serious accepted work
- mutate real systems under pre-baseline local proof
- model the Governance Operations Console's pre-system ART relationship as a
  normal Prototype ingress, lifecycle state, graduation route, or operator
  action; that bootstrap mismatch belongs to one-time future live-wiring
  reconciliation
- keep page-era temporary implementation as final Prototype Control

## Sources

- `../system-design.md`
- `../operation-workbench-contract.md`
