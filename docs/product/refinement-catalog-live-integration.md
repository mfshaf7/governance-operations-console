# Refinement And Catalog Live Integration

## Purpose

This is the primary Console instruction surface for OOS-backed Delivery
Refinement and Catalog behavior. It preserves the established Console visuals
while replacing prototype-local authority with typed canonical projection,
governed commands, readback, and receipts.

OOS owns Refinement source projection, admitted advice, durable apply runs,
Catalog projection and mutation, backend readback, and receipts. The Console
owns operator interaction, semantic-to-visual mapping, strict validation, and
same-origin routing.

## Apply feedback

Apply Refinement immediately shows a busy action and the shared loading
indicator, including while the first backend acknowledgement is pending.
The reviewed plan remains visible until submission; the active view then
distinguishes acknowledgement, backend operations and canonical receipt/readback.
It reports observed progress without assigning unreported completion to an
individual planned operation. Navigation and repeated Apply are guarded while
the request is pending.

The run log preserves owner event timestamps, including events retained in the
canonical receipt. A receipt summary does not replace that timeline. Older
receipts without events show their recorded receipt time and explicitly state
that historical step times are unavailable. A missing reply is unconfirmed,
not proof that the backend failed or made no changes; inspect the original run
before another action. These presentation repairs require normal source
publication and activation before they describe live deployed behavior.

## Runtime Modes

- `disconnected-preview`: `OOS_BASE_URL` is absent. Existing synthetic data and
  prototype-local commands remain available and are labelled as preview truth.
- `live`: OOS is configured. Refinement and Catalog use canonical OOS truth.
  A configured failure locks mutation and never falls back to fixtures.

## Server Configuration

Provide configuration through the local or platform-owned runtime environment.
Never expose it through `NEXT_PUBLIC_*` variables or commit concrete values.

| Variable | Required in live mode | Purpose |
| --- | --- | --- |
| `OOS_BASE_URL` | yes | OOS endpoint visible to the Console server. |
| `OOS_CALLER_SECRET` | yes | Runtime-delivered caller authentication. |
| `GOVERNANCE_CONSOLE_OPERATOR_ID` | yes | Stable operator attribution until authenticated identity is admitted. |
| `OOS_CALLER_ID` | no | Defaults to `governance-operations-console`. |
| `GOVERNANCE_CONSOLE_OPERATOR_HANDLE` | no | Optional bounded display handle. |

The browser calls only same-origin `/api/delivery/refinement/*` and
`/api/delivery/catalog/*` routes. OOS credentials and operator attribution are
assembled server-side.

The bounded security decision is the
[Refinement and Catalog dev-integration boundary review](https://github.com/mfshaf7/security-architecture/blob/main/docs/reviews/components/2026-08-26-refinement-catalog-dev-integration-boundary.md).

## Refinement

Readiness Review retains the existing panel arrangement and Work Design Handoff
button. Only its repeated metadata field-card list is replaced by **View Metadata
Workbench**. This opens a separate dialog containing only the existing Refinement
metadata tree, with current draft values and review status. Search, filtering and
tree expansion remain available; selecting a field expands its full value within
the tree. There is no editor, advisor, handoff panel or mutation action in this
inspection dialog. Selection stays local; closing returns to the same Readiness
screen without changing or saving the authoring session. The existing Metadata
Workbench step remains the place to edit values. This is not the Work Design
tree or a claim that Apply has completed. Apply retains its existing owner checks.
This operator-approved maintenance is preview-first and unpublished until the
batch is accepted for normal source delivery.

In Metadata Workbench, use **One item** to select one work item, or **Multiple
items** to select an explicit shared set. Search the tree by name, number or
description; **Needs review** narrows it to outstanding fields while keeping
their parent context. Filtering does not remove selected items. Use **Read
work item** for the complete formatted description.

Refinement reuses Work Design's shared structured Build Tree with its structure
locked. Select an item to see its context; its fields appear directly beneath
it, with fields needing attention first. Select a field row to open that field's
editor on the right. Field rows are view details, not ART children, and never
change work-item counts. Add, delete and rename controls are absent here.
The input below the selected work item edits that field's value. Its label, Required/Optional hint,
current value and draft status explain what is being reviewed. Controlled
choices come from the owner packet; a free-text field without supplied choices
must say so. **Mark reviewed** confirms the draft value; it does not write to
OpenProject. Shared review identifies the exact selected items and uses only
common choices and compatible field types. Select the shared field from
**Fields for selected items** above the tree. Changing the selected set returns
to its context view; select a field again before editing or requesting advice. Changed or invalid values need
review before Apply, even if their original values were complete.

Drafts save automatically after actual persisted state changes. An idle render
or a new save timestamp alone is not an edit. **Saved to server** acknowledges
draft storage, independently of the later **Apply Refinement** receipt. The
workbench waits for a live packet rather than showing sample fields during a
live read. These repairs remain preview source until normal publication and
activation qualify the deployed behavior.

1. The Console reads the canonical packet and durable run projection before an
   advice or apply command.
2. Advice binds the packet revision, source revision, selected field, and node
   identities. OOS returns model and CGG evidence with a suggestion; the
   operator remains responsible for accepting or changing it.
3. Apply translates the reviewed workbench targets into exact backend field
   identities and records one resolution for every submitted value.
4. Same-session retries reuse one acceptance identity and deterministic OOS
   idempotency key.
5. The Console polls the durable run and reports success only after a completed
   run carries validated canonical readback and a receipt.
6. Run failures remain visible in the existing apply log and never create a
   local success receipt.

Run polling uses OOS's native package-scoped canonical envelope, not the
OpenProject record coordinates used by packet projection. The server binds
the exact authority, owner, package and run source route, then checks the
returned run/poll coordinates and any completed receipt's package and run.
Existing command/operator acceptance checks remain; read-only history does
not invent a same-operator restriction. A poll failure is not proof that apply
failed: reopen the same package and inspect its retained run/receipt before
considering any retry. Never resubmit a completed run to repair its display.
Recovered live history preserves the native receipt URI, digests, operator,
readback revision and actual event times. Those facts are distinct from
disconnected-preview receipts and do not claim that source delivery is done.

Advice has a bounded 180-second server-to-OOS deadline covering the existing
60-second model budget and one retry. Ordinary reads and asynchronous apply
acknowledgement retain the existing short deadline. A deliberate new advice
action has a fresh invocation id for its new CGG request-time binding; it is
not a retry or acceptance of canonical writes. Accepted apply keeps the same
stable identity and idempotency key. No automatic retry or model-policy change
is introduced.

## Catalog

Refinement's editable metadata session also follows the shared
[durable saved-work procedure](durable-saved-work.md). Draft saving preserves
input across profiles; native packet/source guards and reviewed Apply still own
canonical changes. Saved input and canonical mutation receipts are distinct.

1. The Console reads Catalog items and values from the OOS projection and
   derives presentation tones locally.
2. Add, edit, and retire commands bind the exact source revision, reviewed
   draft, stable acceptance, and target value identity. Retries within one
   acceptance reuse its idempotency key; a later deliberate acceptance of the
   same effective edit receives a distinct key.
3. Success requires OOS canonical readback and a durable mutation receipt; the
   Console refreshes the projection before showing the new value set.
4. Owner Repo mutations require an exact admitted repository identity and its
   current WGCF readiness reference. Missing or mismatched evidence fails
   before mutation and does not call WGCF or OpenProject from the browser.
5. When canonical Catalog truth does not yet carry the matching binding, the
   Console server asks OOS to prepare readiness for the exact Repository
   identity. OOS resolves current Workspace Governance authority and invokes
   WGCF; denied, stale, malformed, or mismatched evidence remains blocked. No
   receipt is synthesized in the browser or Console.
6. An admitted Repository record can open Owner Repo Catalog at that exact
   repository. Existing values are selected and a missing value opens a
   reviewed add draft; neither navigation nor draft creation mutates truth.
7. When the operator enters Owner Repo Catalog from an Execution Board action,
   the Console retains the exact Delivery and work-item target. A reviewed
   `Link to Work Item` action sends the selected Catalog value and its current
   WGCF readiness binding through the OOS `link_repository` command.
8. The Console server constructs the nested Catalog request and accountable
   operator acceptance. The browser cannot supply OOS credentials or backend
   authority. Success requires both the Catalog receipt and the enclosing
   Delivery change receipt; partial failure remains visible with the OOS
   reconciliation action.

## Validation

Run:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/operation-runtime/refinement-catalog-live-adapter.test.mjs
npm run architecture:delivery
npm run check
```

## Catalog maintenance: reviewed changes and recovery

Catalog manages values used by Delivery, not repository creation or workspace
onboarding. Add Value, Save Changes and Retire Value submit reviewed changes;
they are not draft-save or separate approval-request actions. Values still in
use cannot retire. Reassign their records first. Policy-fixed lists remain
read-only; project membership stays under OpenProject authority through the
separate Manage Members workflow described below.

The browser binds the exact reviewed Catalog revision and retains the complete
accepted request, including prepared readiness, for retries in that open session.
A server read must never replace the reviewed revision. Readiness preparation
uses the existing OOS endpoint through the Console server; the browser has no
WGCF or OpenProject credentials. An uncertain response freezes the draft and
Retry same change resends the same acceptance. Closing does not cancel a change
that may already have applied. If that browser session was lost, inspect the
canonical outcome before making a replacement decision.

An OOS applied receipt already includes canonical owner readback. Failure of a
subsequent list refresh retains that applied outcome and receipt, marks the list
unavailable and blocks new changes until Retry loading succeeds. Source refresh
preserves selected value and receipt. Stale, partial and unavailable projections
do not authorize new changes. Fixture values appear only in explicit preview.

Execution's repository action retains its concrete work-item target even when
Start Work is unavailable. Linking records the Catalog value and then updates
Delivery, with separate receipts and explicit partial-failure reconciliation;
it is not a transactional rollback boundary or a separate manual Sync step.

Values use the shared pagination and page-size preference. Lifecycle filtering
keeps retired records inspectable while retired planning parents are excluded
from new iterations. Counts describe the loaded values, including retained
history, not just currently available choices.

Read-only Catalog categories do not render an Action column or disabled pretend
actions. Fixed or retired values within an editable list retain their status,
with no edit/retire controls. A value still in use retains Edit but has no Retire
action. Transient connection restrictions can still disable a real action.

Policy definitions and selecting those definitions are different operations:
blocker outcomes, Committed/Stretch objective types and lineage roles can be
used in their Delivery workflows but cannot be redefined as arbitrary labels.
The unpublished membership extension provides **Assignee / Responsible → Manage
Members**. It lists project members, supports existing user/group selection and
native project roles, and reviews add/change/remove decisions. Accounts,
invitations and global roles remain in OpenProject. Protected installation and
group-inherited access are identified rather than exposed as unsafe edit actions.
The existing verified Console session and server-derived OOS operator binding
remain required. POST additionally requires this Console origin and JSON input.

The native membership change and receipt share the existing OpenProject
transaction store. Uncertain outcomes freeze the original request; Retry same
change or Recover pending change reuses that exact decision. Closing does not
undo it or enable a replacement. Reopening after browser restart reads recorded
outcomes and current members. A receipt survives a failed list refresh, while
new changes stay blocked until the section reloads. Initial read failure uses
full-section Retry loading and never substitutes sample members. Disconnected
preview changes explicitly report that no live membership changed.

Member browsing uses server search and shared 25/50/100 pagination. Available
existing-account choices preserve native visibility and are search-bounded.
The workflow, permission, rollback and recovery contract lives in the
[OOS operator surface](https://github.com/mfshaf7/operator-orchestration-service/blob/main/docs/operations/delivery-project-members.md).
Native rollback-only qualification and isolated browser checks are distinct
from final composed Security acceptance and activation of this preview batch.

The operator-facing status for fixed Catalog values is System managed. Detailed
policy or membership explanations stay in technical disclosure. This is a
presentation label; canonical read_only/owner_routed capability tokens and their
permissions remain unchanged. Do not render this status as an action button.

### Paired advisor and governed-field repair

The existing Delivery Catalog supplies PI/Iteration, repository, team and account
choices, further narrowed by native permissions. Backend String storage does not
make those identifiers free-entry fields. Reserved roadmap buckets are not PI
choices. Iteration choices follow the selected item's effective PI and the OOS
planning rules; blank optional controls retain their saved source values.
Dates and Delivery references have typed validation, while narrative and business
responsibility text remain editable prose. Create missing values through Catalog,
membership or repository onboarding rather than typing an unregistered name.

Advice sends the exact selected set and related edited fields on those items and
their ancestors. Mixed shared values are preserved per item; selecting two items
does not silently target an entire metadata group. OOS loads canonical planning
facts and current constraints, distinguishes unsaved drafts, and admits the
complete context through CGG. A changed related draft invalidates a late proposed
edit. Advice and Apply retain the packet/source revision the operator reviewed;
the proxy rejects changed source or choices rather than silently rebinding input. AI values stay visibly unreviewed until the operator marks review; existing
final Apply acceptance remains required. The default High model route is retained.

UI transport tests use controlled replies; they do not qualify native model
quality. Publish compatible CGG first, OOS next and this Console batch last, then
perform exact-source acceptance/activation and native qualification. Until then,
the current live backend retains its previous behavior.


Current completion and run feedback must bind the packet's Work Design handoff.
Older completed runs remain owner history and cannot block a newer pass. A changed
post-Apply source revision does not erase the matching handoff receipt. Apply
always submits its own reviewed command to the owner rather than borrowing any
retained active/completed run as acknowledgement. Canonical receipts expose the
original accepted-draft digest and events; `applied_payload` is null when the
owner has not exposed original accepted values. Current metadata must not be
presented as an historical accepted payload. Canonical receipts are re-read from
OOS, while local sample receipts retain their existing payload shape.

Per-record choice maps drive individual controls; shared controls intersect only
the selected records. Optional native numeric typing sets whole-number controls
and validation while preserving decimal fields. The same selected constraints
are enforced by OOS before advice/Apply and by the native integer writer before
mutation. Publication is operator-approved; live operating claims still require the accepted composition and native verification.


### Packet reads during ordinary navigation

The packet GET reads the admitted hierarchy, native forms and current Catalog
choices. It has a bounded 60-second transport deadline, with the existing loading
and unavailable states. The general 12-second deadline expired reproducibly during
normal page opening even though the same live packet could be read in isolation.
This change reuses the existing per-call budget; it adds no cache, retry, source
fallback or authority. Apply acknowledgement and run polling remain at 12 seconds,
and model advice retains its existing independent budget. A timeout is an
unavailable read, never evidence that a mutation ran or that a new model call
should be issued.

Operator-approved publication repair, Landing Unit Decision
`feature_single_landing_unit`, `refinement-packet-read-budget-console-20261119`.
Agent Gary authors and the standing delegated human reviews/merges. Publication
requires the existing exact composed Security acceptance and normal activation.
No Work Design or Refinement Apply is replayed by qualification.

Loading and failed reads use the Hub-width shell, selected package name and one
full-width state frame. Loading keeps the shared animated signal and skeleton.
Failure shows one plain-language message with an in-place Retry loading action;
raw diagnostics stay in technical disclosure. Retry performs only the same GET,
returns to loading, retains the package and cannot replay Apply or advice.


### Selected advisor context

A Refinement advice request includes the selected records' field facts and their
applicable choices, plus relevant selected/ancestor drafts. Packet-wide target
maps are not copied into this local scope. Per-record value, status, numeric and
other validation facts remain intact; authoritative source context still comes
through OOS and CGG. A one-record request must not grow with unrelated sibling
choice maps. Genuine oversize selected content is still refused without silent
trimming, and the existing local advisor-scope limit is unchanged. OOS and CGG separately
use the same finite 32,000-token complete-context planning allowance as Work Design.

Operator-approved required maintenance, Landing Unit Decision
`child_isolated_landing_unit`, `refinement-selected-scope-console-20261119`.
The normal composed Security acceptance and activation qualify this source fix;
it does not apply any of the current Refinement drafts.


### Apply acknowledgement after native validation

A native Apply request revalidates the full packet before acknowledging its
durable run. The observed validation took longer than the generic 12-second
transport deadline, leaving a real accepted run without its acknowledgement.
Apply now uses the same finite 60-second native-packet budget as the packet
read. Polls retain 12 seconds; advice and durable worker budgets are unchanged.
This adds no automatic retry, second acceptance or cached authorization.
Unconfirmed responses still require reading the original run before another
mutation. Source tests verify the separate deadlines and unchanged input binding.

This required correction is included in the operator-approved Readiness batch,
`refinement-readiness-review-console-20261119`, alongside the tree-only reader
and paired native-principal backend repair. Agent Gary authors; standing delegated
human review, exact composed acceptance and normal activation remain required.
