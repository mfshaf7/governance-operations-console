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
