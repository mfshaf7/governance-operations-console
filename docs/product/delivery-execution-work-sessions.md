# Delivery Execution Work Sessions

## Purpose

This is the primary Console instruction surface for running a governed Delivery
work session from Execution Board. The board keeps its approved package and
action presentation. `Start Work` opens the package-bound target, while
`Open Work Item` accepts an exact ART reference for work that is not yet
represented by a Delivery package. Both routes switch to authoritative OOS
state only when live integration is configured.

OOS owns session semantics, exact next action, revisions, source observations,
evidence acquisition, merge and closeout legality, terminal cleanup, command
outcomes, and receipts. The Console owns operator interaction,
same-origin routing, decision entry, strict response validation, and bounded
presentation. The browser does not read Git, call OpenProject, hold OOS
credentials, or derive progress and completion.

## Runtime Modes

- `disconnected-preview`: `OOS_BASE_URL` is absent. The established structured
  fixture action and visibly prototype-local receipt remain available.
- `live`: OOS is configured. `Start Work` reads the authoritative target work
  item session and never falls back to a local success when OOS is unavailable,
  rejects the command, or returns malformed truth.

The source adapter can land while inactive. Mutable `dev-integration`
activation remains gated by the exact-head Security review and composed
positive and negative proof in the owning Delivery ART.

## Server Configuration

Provide these values through the local or Platform-owned runtime environment.
Do not expose them through `NEXT_PUBLIC_*` variables or commit concrete values.

| Variable | Required in live mode | Purpose |
| --- | --- | --- |
| `OOS_BASE_URL` | yes | OOS HTTP endpoint visible to the Console server. |
| `OOS_CALLER_SECRET` | yes | Caller-specific secret for the Console application identity. |
| `GOVERNANCE_CONSOLE_OPERATOR_ID` | yes | Separately attributed accountable operator identity used by the OOS session. |
| `OOS_CALLER_ID` | yes | Console application caller identity; defaults to `governance-operations-console`. |

The browser calls only same-origin
`/api/delivery/execution/{workItemId}/work-session` routes. The server assembles
credentials and the server-owned operator header. The application caller and
accountable operator are distinct bindings; neither is supplied by the browser.
Work-session reads and commands use a bounded 75-second server timeout because
the local ART backend may perform sequential authoritative reads. Other OOS
Console calls retain their shorter timeout.

## Architecture Packet Authoring

Execution Board exposes one `Architecture Packet` action beside direct work-item
entry. It is the primary operator surface for the packet transition that must
finish before architecture-bound source work starts.

The workflow has three distinct steps:

1. Author editable scope, exact repository revisions, architecture design,
   conformance plan, and rationale. `Validate Draft` sends only those fields to
   the same-origin Console route. OOS binds fresh ART truth, server-held
   operator identity, current supersession, fingerprints, timestamps, custody
   posture, and the content digest. The result is still a local candidate.
2. Inspect the complete canonical candidate in the Console. `Approve Candidate`
   re-authors the reviewed input with `architecture-ready`; changing any editor
   field invalidates the candidate and requires fresh validation.
3. `Persist Approved Packet` submits that exact OOS-authored candidate. OOS
   rechecks caller, operator, ART snapshot, supersession, semantics, and digest;
   WGCF issues durable custody; OOS projects the accepted reference to ART.

`Inspect Current` reads the immutable packet and custody posture currently
projected for one Delivery initiative. `Use as Starting Point` copies only its
editable design fields into the editor; it does not copy operator authority,
integrity, timestamps, or custody as new input.

The Console performs an early completeness check for ownership, Landing Units,
source topology, execution order, evidence handoffs, runtime boundaries, human
gates, rollback and terminal conditions, conformance dimensions and cases, exact
repository revisions, and the operator rationale. That check improves the
operator experience but does not replace OOS validation against the canonical
schema-v6 Workspace Governance contract and fresh ART topology.

Disconnected preview is read-only for this workflow. It never creates or
persists a fixture packet. Missing or malformed input, unavailable OOS, stale
ART truth, contradictory topology, an unapproved decision, or failed WGCF
custody remains visible as a blocked request. The Console does not retain a
parallel packet ledger or report success from browser state.

## Operator Flow

For planning-stage hierarchy maintenance, choose `Open Work Item`, enter an
exact canonical initiative or child id, then choose `Inspect ART Tree`.
This resolves the item through the current inventory and selects its initiative
without preparing or starting a source session. The normal Control Board still
lists execution/audit work; inspection does not force planning work into Ready.
Unknown, ambiguous, or unloaded targets are not guessed.

The global Delivery register includes all current and retained package roots.
Its routine refresh loads full active and parked execution trees while
explicitly deferring completed and retired child graphs. Unloaded archived
counts are unknown, never zero. Current/History navigation, global package
totals, filters and cross-project active actions keep their existing meaning.
History uses the original exact owner stage reads; these do not require
scanning every archived execution graph before the register can appear.

Original Intake evidence loads independently through bounded target pages.
Verified rows can appear progressively, but global admission totals remain
loading until every inspected target is reconciled against the global root
inventory. Missing evidence stays partial or unavailable. Operational package
custody is read separately even before History is opened. An unsuccessful
refresh retains last verified rows with their original timestamp and stale
label; denied identity clears them. Neither retained display nor a shared
pending GET can grant execution, review, mutation or completion authority.

`Edit ART Tree` reads a fresh OOS change projection before opening a local draft.
Use the existing typed child menu (including PI Objective under Epic), then
`Done Editing`, inspect the exact change plan and enter an acceptance note.
Only `Apply Changes` submits canonical mutations; OOS rechecks source revision,
operator and operation authority. A visible tree is not permission to mutate.
For a new PI Objective, Task or Milestone, enter `New item Target PI` and
`New item Iteration` in the selected node's planning panel before finishing the
draft. Iteration must match `<Target PI> / <iteration>` or use a
`Program-wide / <label>`. Other child types may inherit their parent's PI;
committed children still need Iteration. A backlog Feature can be created here,
but Feature PI commitment belongs to coordinated initiative plan/apply through
Refinement, not this generic create path. Review shows submitted planning
values. These inputs create a new item; they do not make it Ready or grant
execution authority. Native OOS/OpenProject validation remains decisive.
For a completed initiative, `Inspect Closeout` opens the existing native owner
readiness/closeout flow. Neither inspection action grants source, closure or
review authority.

1. Select a Delivery package whose structured action intent identifies an
   executable OpenProject work item and open `Start Work`, or choose
   `Open Work Item` and enter the exact ART work-item reference.
2. Wait for the Console to read that target from OOS. Direct entry is only a
   routing key; it does not create package truth or grant work eligibility.
3. In disconnected preview, use the established local action flow. In live
   mode, wait for the OOS work-session projection.
4. If no session exists, choose `Prepare Session`. OOS returns the
   caller-bound Landing Unit decision draft.
5. Review the Landing Unit model, identity, branch, split reason, rollback
   boundary, and architecture packet decision. The Console sends only these
   bounded operator inputs; the server retains OOS-owned work item, covered
   items, human gates, base ref, and operator identity from a fresh
   caller-bound draft requested when the accepted decision is submitted.
6. Choose `Start Work Session`. OOS validates the exact decision and returns
   the next projection and immutable command receipt.
7. Use the action shown for the exact OOS projection. Automatable transitions
   include source-workspace preparation, source publication, evidence checks,
   Review Packet preparation, readiness evaluation, and finalization.
8. Human review, Security, architecture, source-work, exception, and other
   authority gates remain read-only. The Console shows their owner and reason
   instead of presenting a bypass action.
9. `Merge Source` appears only for `source-merge-approval-required`.
   `Close Landing Unit` appears only for `art-closeout-required`. The selected
   work item is a resumable alias; OOS closes the full Review Packet scope and
   the Console shows the covered item count and structured result. A partial
   closeout retains the session for retry, while failed terminal cleanup exposes
   `Retry Cleanup` against the same OOS close command.
10. If OOS reports an explicit rejection, correct the input and issue a new
   operator action. If the network outcome is unknown, retry retains the same
   command identity so OOS can replay the retained result safely.

### Continue An Approved Source Scope

Source Authorization displays the selected scope, its expiry, credential receipt
and original owner operation. The scope approval and its short-lived source
credential have separate lifetimes. When a current live session requires source
credentials and the selected scope remains approved, choose
`Continue Approved Source Access`. This submits the existing guarded OOS
continuation with that exact selected intent. OOS revalidates the scope and
renews its credential when needed before attempting source work. The primary
owner next action remains authoritative; this supporting control grants no
source permission or local success.

After an interruption, use `Recover original` and `Refresh source authority` to
inspect the same approval and owner operation. Wait for the current session
projection before continuing. An unknown command outcome must be reconciled
through the original session before another action. A valid approval does not
require another scope or manual token handling just because its hourly
credential expired. Expired or revoked approval requires the existing explicit
scope review; unavailable or stale authority never enables continuation.

## Evidence-Only Completion And Completed Parents

In live Execution Board, choose `Open Work Item`, enter the exact ART id and
select the `Non-source completion` work path. `Open Completion` reads current
native continuation context and any source session before presenting a review.
Use this path only when the outcome requires no source change. A source-backed
outcome must use its existing governed work session, merged evidence and close
command; an existing source session blocks this form.

Review the exact subject, owner, status and blocking reasons. Enter the four
native evidence fields: a paragraph completion summary, explained flat changed-
outcome bullets (for example `- Product admission: actual change and evidence`),
and test and validation bullets with their displayed prefixes. Code-format or
link paths and receipt URIs in changed outcomes. Confirm the non-source
outcome. The optional completion note adds context; it does not replace proof.
The server rereads the target before submitting the existing OOS completion
operation. It reports completion only after native success and canonical
readback with valid evidence. Current descendants, blockers, required fields,
narrative and native status-transition rules remain enforced by the owners.

For an already completed parent scope still marked open, select
`Reconcile a completed parent (stale-open closeout)` and enter an explicit
parent-closeout justification. This reuses OOS's existing stale-open operation,
requires terminal children and completed related scope, and does not infer
business acceptance from child status. Epics use `Inspect Closeout` instead.

The Epic wizard follows OOS's explicit `prepare_delivery_closeout` action. With
a clean execution tree, OOS may prepare the existing guided command while only
its own Demo, Closing and Inspect & Adapt steps remain. The wizard collects
and reviews that evidence before submission; it does not require a prior write
through another client. Pending canonical readiness remains visible until the
native command records and validates each step. Other blockers and an owner
reconciliation action keep application disabled.

For a PI Objective, this same form also reads its exact initiative, Target PI,
planned value and currently recorded earned value/outcome. If earned review is
missing, inspect the actual outcome and owner evidence, enter its actual business
value, native review outcome and optional evidence note, then explicitly approve and
choose `Record earned PI review`. The existing OOS initiative `pi-review`
operation records those fields; it does not complete the objective or create
source work. Re-read and separately approve normal completion evidence afterward.
Native choices currently include `Met`, `Partially met` and `Not met`; OOS
validates the actual form options. No planning value is copied into earned value.

An uncertain PI-review response retains the original target and locks another
write. `Read current target` verifies the same earned fields; an unresolved read
leaves the write locked. A fresh browser reads canonical values, never a local
success receipt. Existing matching earned fields do not need another write.

If the transport outcome is uncertain, choose `Read current target` before
another write. A successful read of an already completed target remains
read-only. This path creates no source grant, worktree, PR, Review Packet or
Console-owned completion receipt. The same-origin route is
`/api/delivery/execution/{workItemId}/completion`; authenticated server-only
calls reuse OOS `continuation-context`, `complete` and `stale-open-close`.
These native ART requests use the existing 75-second governed-work budget so
readiness/form validation can return its actual owner rejection. Other generic
Console OOS calls retain their shorter budget. A timeout still requires reading
the original target; it never authorizes an automatic replacement write.

## Canonical Register And Bounded Source Realization

In live mode the primary register reads OOS's canonical Delivery initiative
collection through `/api/delivery/workspace`. It projects observed ART identities,
trees, and statuses, not synthetic package action eligibility or source custody.
Use `Open Work Item` to resolve the exact target's current OOS eligibility.
Unavailable and successful-empty reads are distinct; `Refresh owner records`
retries a failed read without fixture fallback. Visible-page polling is bounded.

Inside an active Governed Work Session, the source-realization panel provides:

1. A bounded source objective. **Edit or import source** opens the shared
   [source workspace](source-editor-and-import.md); optional model generation
   remains a separate action using configured model selection.
2. Caller-bound source text, original/diff inspection, file/folder import and
   private manual or amended drafts. Save creates no Git or model effect.
3. Explicit inspection and acceptance of the saved exact digest before Agent Gary
   source executor can create a commit. This acceptance does not approve a PR,
   merge source, close ART, or grant Platform or Security authority.
4. Owner refresh, reason-bound cancellation before apply, and linked retry.
   Accepted-only generation interrupted before a draft may be cancelled; an
   applying or unknown apply may only recover the same owner action. Unknown
   acknowledgement retains command identity instead of issuing another write.

All realization routes are under the existing work-session route's
`realization` suffix, with `start`, `continue`, `cancel`, and `recover` commands.
The staged editor adds bounded `files` reads and `draft` reads/saves. These
private source routes require the verified Console session, and retain original
save identity on an uncertain response. They reuse server-built caller/operator/
session bindings. Canonical GET envelopes, terminal receipt integrity, target,
objective and accepted-digest bindings must agree before success is displayed.
Source merge alone does not commission `source-realization-v1` or activate its
model profile: Platform and Security own that exact operating boundary.

## Source Landing Order

Keep the Landing Unit pull request open until OOS reports that its exact head
has a durable merge-ready Review Packet. Merge only after that gate passes,
then continue the same work session to bind the real merge commit and finalize
operating evidence.

If a runtime interruption prevents packet authoring and the source lands
first, recover through a truthful follow-up change in the same Landing Unit.
Do not relabel merged pull-request work as a direct land or bypass OOS
completion evidence.

Evidence produced for an earlier source revision must be rerun or explicitly
re-authored for the follow-up head before OOS can generate a replacement
Review Packet.

## Owner Evidence Profile

The accepted Console base owns its Delivery ART evidence profile at
`contracts/delivery-art-work-session/evidence-profile.json`. OOS reads that
profile from the work session's recorded base commit and executes it against
the exact clean pushed source revision through the authenticated source
executor. Candidate branches cannot replace the policy used to validate
themselves.

The profile installs only lockfile-pinned dependencies and runs the semantic
suite, repository safety validator, architecture guards, type validation,
production build, and exact source-diff check without a shell. OOS validates
the profile schema, command allowlist, source bindings, results, and receipt
before projecting evidence into a Review Packet. The profile grants no merge,
ART, platform, Security, stage, or production authority.

The architecture-guard command is the profile's filesystem conformance
binding. The semantic suite retains the real-Git conformance binding, so an
accepted base covers both fidelity classes required by source-backed Delivery
architecture packets before implementation evidence is acquired.

The first profile landing is a controlled bootstrap through the existing
reviewed evidence path. Automated owner evidence is valid only for later work
sessions whose recorded base already contains the accepted profile.

In-flight plan adaptation and Delivery package closeout retain their own
authority surfaces. This adapter performs only the exact work-session merge,
evidence finalization, ART child closeout, and terminal cleanup action projected
by OOS; it does not replace those domain workflows.

## Current Boundary

Implemented in source:

- structured execution-target work-item identity
- exact direct ART target entry with local syntax validation and authoritative
  OOS eligibility readback before mutation
- strict work-session projection, decision, source, and receipt validation
- same-origin read, start, continue, merge, and close routes
- caller/operator binding and server-only credentials
- stable retry identities and exact session revisions
- exact-action controls that keep human gates read-only
- authoritative lifecycle, source, evidence, Review Packet, readiness, and
  cleanup projection
- command and terminal cleanup receipt presentation
- exact Landing Unit scope and whole-scope closeout result presentation
- explicit disconnected preview and configured fail-closed behavior
- Execution Board interaction without direct browser source authority
- current Architecture Packet inspection plus complete author, validate,
  operator-approve, and persist controls through OOS and WGCF
- visible completeness blockers and exact local-candidate review without
  fixture fallback or browser-supplied authority fields

Still separate from the work-session adapter:

- admitted source-executor activation and allowlisted source roots
- composed positive and negative `dev-integration` proof
- authenticated human identity beyond configured local attribution
- in-flight change control and Delivery package closeout, documented in
  `delivery-change-control-live-integration.md` and
  `delivery-closeout-live-integration.md`
- stage, production, release, and Portfolio authority

## Validation

Run:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/operation-runtime/delivery-work-session-live-adapter.test.mjs
npm run architecture:delivery
npm run check
```
