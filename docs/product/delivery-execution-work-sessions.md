# Delivery Execution Work Sessions

Before source authorization, use **Covered ART items (comma-separated)** to
review every story sharing the same source landing and rollback unit. The
selected work item must remain included; enter IDs such as `1338, 1340, 1344`.
The source approval and start decision retain that exact coverage. OOS still
verifies every item's current owner, readiness and exact Architecture Packet
Landing Unit match; entering an ID grants no authority. Original-scope recovery
restores its recorded coverage. Existing single-item clients retain their
owner-generated default.

## Purpose

This is the primary Console instruction surface for running a governed Delivery
work session from Execution Board. The board keeps its approved package and
action presentation. **Choose Work Item** opens a searchable list of recorded
names, types, numbers and statuses. Selecting a node in **ART Tree** opens that
same chooser with its exact work item selected. Choose **Code or content
changes** for source work, or **Complete work without file changes** for an
actual completed planning/review outcome. An explicit number entry remains for
work not loaded in the current inventory. Opening a target starts no work.
Both routes read authoritative OOS state when live integration is configured.

Current includes deferred packages in the **Deferred** lane. **Resume Work**
opens a reviewed return-status/reason form; the service checks prerequisites
and records the result. History remains read-only. Defer, retirement and blocker
controls likewise open reviews rather than grant eligibility. Package review
requires a current owner read, retains its reviewed source revision and never
replaces a missing live result with a local receipt. Successful package actions
refresh the overview before the updated posture is presented.

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

## Technical Plan & Approval

Open **Technical Plan** under the selected package's **Manage Package** panel.
Its status explains when to use it: Open Technical Plan is inspection/drafting;
a missing-plan owner gate makes Prepare Technical Plan the primary next action.
An existing binding requirement asks for review and linkage of the approved plan.
Choose Work Item opens the existing work-item workflow. No missing record
or generated decision default establishes an exemption. Not required and covered
are shown only after an owner-confirmed implementation-ready check for that work.
The workspace is titled Technical Plan & Approval. The global Architecture Packet toolbar entry is removed. When the current
source session reports a missing or unbound architecture requirement, Next Action
also opens the same package-scoped workspace and identifies the affected work.
No package-wide permission is inferred from one work item's requirement.

Overview includes a purpose diagram and a labelled example, independent of live
plan contents. Next Action uses the primary rail treatment with descriptions and
visible disabled reasons. Leaving an edited plan to check work uses the normal
discard guard. The workspace separates five jobs, with ordinary navigation rather
than a wizard:

- **Overview** explains applicability, the selected package, covered work and
  current recorded-plan availability. Missing, unavailable and historical records
  are distinct. A missing plan never means approval is unnecessary. The current
  work-session owner remains the authority for whether architecture is required.
- A native missing-reference response identifies **No approved plan recorded**.
  The current-plan read recognizes the exact OpenProject envelope: HTTP 404,
  `error: not_found`, and `details: delivery_art_reference_missing`. Other
  missing records and access failures remain unavailable; they are not treated
  as absent plans.
  The Console preserves OOS's machine-readable `error` identifier as well as its
  HTTP status; missing records, permission denials and unavailable services remain
  different outcomes. An explicit `code` retains precedence and prose-only errors
  retain the generic rejection code. A missing record grants no execution rights.
- Failed plan validation preserves the owner's individual string findings under
  **Plan checks requiring attention**. Arbitrary owner details are not projected.
  Editing or checking another attempt clears the previous findings; validation
  failure retains the draft and grants no approval or execution rights.
- **Prepare Plan** starts with a compact scope summary. Use Edit Scope to change
  covered work and Edit Summary for the overall justification. Work & Changes,
  Sequence & Handoffs, Operation & Recovery, Approvals & Decisions and Verification
  are freely navigable planning areas. Open a named entry to edit it; other entries
  stay compact. Local Empty/Draft/Needs attention indicators do not certify
  readiness. Verification required is an explicit existing plan decision. Written
  explanations remain free text; structured plan data uses guided fields.
  It uses named work and section guidance from the existing v6
  contract. Selecting work fills recorded type, parent and repository observations
  where available, preserving explicit edits. Verification applicability, change
  grouping, source pins and approval are not invented as form defaults. Verified
  source observations can be read from the existing work-session endpoint; JSON
  import/export stays under Technical data for specialist use.
- **System Architecture** reads the exact selected package's saved finalized Work
  Design brief and retained diagrams. Multiple diagrams can be inspected
  individually or together using the existing zoomable viewer. Missing original
  data remains unavailable. Changes to that underlying design belong in Work
  Design; this workspace does not silently rewrite it.
- **Implementation Sequence** is derived from the current draft, validated
  candidate or recorded plan, labelled accordingly. Change landing order, work
  dependencies and required approvals remain distinguishable. Select a node for
  complete readable details, zoom or open the full diagram. Unknown references
  and dependency cycles are visible; the drawing grants no execution permission.
  No second manually maintained diagram or execution engine is introduced.
- **Review Plan** presents the covered work, responsibilities, ordering,
  verification, approvals and recovery in readable sections. Canonical JSON,
  identity and custody receipts remain inspectable under Technical details.

**Validate Plan** authors a local candidate through OOS. Explicit operator
acceptance enables **Approve Plan**, which rebinds the reviewed input to fresh ART
truth. A change in the reviewed work/source snapshot requires validation and
review again. **Record Approved Plan** records that exact approved candidate
through the existing OOS/WGCF custody path. Approval is visibly unrecorded until
that owner result is confirmed. A recording failure retains the approved candidate
for retry; it is not a successful result. Editing input invalidates the candidate.
Recording does not start execution or grant release authority. Existing approved
plans require an explicit **Revise Current Plan** action before manual revision.

The standard **Technical Plan Advisor** uses the existing Agent Console AI
capability, permission profile and model routing configured in Model Operations
(`agent-console-assistant-v1`). Its role is `execution-architecture`, with normal
CGG admission, native structured replies, receipt evidence, private conversations,
new conversation, cancellation and undo. No separate provider or default model is
hard-coded for this workspace.

Only manual chat requests invoke it. Questions do not edit. An explicit draft
request can modify only the selected local `sectionJson`, preserving other
sections, scope, human justification, source revisions and approval. Repository
revision assistance is read-only. Context contains the actual selected-section
schema, supplied covered-work records and available canonical ancestor narratives,
the saved finalized brief and selected diagram's contents, including supplied core
nodes. The advisor's Context controls identify related plan sections and the
selected diagram. Unselected diagrams and linked evidence are references rather
than loaded knowledge. Oversized context fails visibly and can be narrowed; no
source content is silently cut. Late replies cannot overwrite a changed scope or
changed local draft. The advisor can propose plan data that produces a sequence,
but cannot approve, record, start work, grant permission or fabricate source proof.

History uses the same workspace with editing and approval locked. Its recorded
plan read is labelled as the current owner record, not invented as a frozen
historical snapshot. Disconnected preview permits local inspection/preparation
and never creates a fixture approved packet or reports a live model result.
Composed live proof requires current OOS, CGG, model and custody services; source
and isolated browser tests do not replace that qualification.

## Operator Flow

The package panel's Work Overview distinguishes hierarchy-wide open work from
story/defect/task status counts. View work or View all opens the same named work
picker, scoped to that package and selected status; switching to All work keeps
the package scope. History offers work-structure inspection only. The global
Open Work Item entry continues to cover all loaded packages.

What’s Blocking Progress shows the recorded issue, impact, responsible team or
service, agreed approach and review date. Original descriptions and rationale
remain under Blocker details. Review Blocker uses the existing owner command.
Next Action points to blocked/deferred review, recorded closeout, or current
work as appropriate; it does not infer execution approval from status counts.
Manage Package retains secondary operations with clearer labels. Recent Activity
shows the latest loaded event, readable time and an explicit coverage note;
original timestamps, receipt references and source text remain under details.

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

A background Intake refresh keeps the last complete verified register visible
until its replacement is complete. A transient refresh failure retains those
rows with explicit stale coverage and their original observation, for at most
the existing five-minute bound. Denied access clears them. During the first
load, unknown totals and filter results remain explicitly loading; a partial
first page must not temporarily erase a previously verified source.

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

After an uncertain network, HTTP timeout or server failure, use **Read Current
Session** before another decision. That action only reads the original OOS
session; it neither resubmits the source command nor grants authority. An
accepted operation may have completed after its HTTP acknowledgement was lost.
Retrying unchanged input retains the original command identity even after a
server error. A different target, scope or reviewed input gets its own identity;
an explicit rejection still allows a corrected operator action. Source tests
for this recovery do not replace exact composed acceptance or live qualification.

### Continue An Approved Source Scope

**Source access** displays the selected scope, its expiry, credential receipt
and original owner operation. The scope approval and its short-lived source
credential have separate lifetimes. When a current live session requires source
credentials and the selected scope remains approved, choose
`Continue Approved Source Access`. This submits the existing guarded OOS
continuation with that exact selected intent. OOS revalidates the scope and
renews its credential when needed before attempting source work. The primary
owner next action remains authoritative; this supporting control grants no
source permission or local success.

After an interruption, use **Open access request** and **Check access status**
(or **Check original access request** after a lost response) to
inspect the same approval and owner operation. Wait for the current session
projection before continuing. An unknown command outcome must be reconciled
through the original session before another action. A valid approval does not
require another scope or manual token handling just because its hourly
credential expired. Expired or revoked approval requires the existing explicit
scope review; unavailable or stale authority never enables continuation.

## Evidence-Only Completion And Completed Parents

In live Execution Board, choose `Open Work Item`, select the named item or enter
its exact ART id, and select `Complete work without file changes`.
`Open Completion` reads current
native continuation context and any source session before presenting a review.
Use this path only when the outcome requires no source change. A source-backed
outcome must use its existing governed work session, merged evidence and close
command; an existing source session blocks this form.

Review the exact subject, responsible repository, status and blocking reasons.
Describe the completion, changes and evidence in ordinary notes; explicitly
choose test and validation results. The form converts these notes to the native
paragraph/bullet format without changing their facts or choosing a result.
Existing formatted evidence retains its recorded outcome; contradicting a
selected result is rejected. Code-format or link paths and receipt URIs in
changed outcomes when applicable. Confirm the non-source
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
The outcome selector uses choices read from that objective's native OpenProject
form; unavailable choices do not enable review. OOS validates those current
options again. No planning value is copied into earned value.

Existing-product closeout searches active Workspace Registry products and fills
the registration reference/version from the selected record. Responsibility is
chosen from its registered repositories. OOS rechecks current version and
responsibility before accepting a new command; stale or unavailable registration
cannot become success. Existing command replays retain their historical receipt.
Workspace-entrant closeout uses the Registry's responsibility/check options;
the server binds candidate correlation and provenance to the exact closeout
command and reviewed revision. Users do not manufacture internal references.

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


## Execution routing, resumption and closeout

OOS supplies read-only `execution_navigation` from current ART facts. Native
New remains New in ART; prepared work is routed into Execution for inspection,
without an automatic status transition or permission to start. Open packages
with completed or retired executable children stay visible for closeout.
**Closeout Pending** means review the remaining parent work, evidence and gates;
it does not certify completion. Unfinished planning scope stays available in
Refinement alongside execution already underway. No historical receipt is
invented for older records.

The normal Execution board omits an empty New lane. During a mixed-version
rollout it retains any real New records rather than hiding them. Other boards
keep their existing lane policy. Source sessions are read from existing OOS
custody, scoped to the authenticated caller. A recorded session keeps open work
visible even when ART status has not changed; open it for current progress and
permissions. The overview does not perform Git or provider inspection per item.

Choose Work Item lists saved sessions first, then active ART work and prepared
candidates. No item is selected or started automatically. Dependencies and
blocker details are attached to their exact work item. A child blocker is never
presented as a blocker recorded on the package itself. The owner preflight
continues checking exact source coverage and dependency legality.

The session follows known owner actions: retry retained partial Landing Unit
closeout, continue to remaining work, review package closeout, rebuild an
eligible session binding, or review superseded-session archival. Archival
requires an explicit reason and binds the already reviewed session/source/PR
facts; users do not transcribe Git hashes. Retries retain the exact command
identity and payload. Archival preserves evidence and does not close ART work.
Human PR review opens the current PR in a new tab. It never auto-approves it.
Unknown next actions remain explicitly unresolved and are not executable shell
commands.

Confirmed source, non-source, Refinement and closeout effects refresh connected
Delivery views. A verified read after an uncertain result also refreshes the
board while preserving the original command for safe retry. No refresh is
triggered merely by opening a dialog. The board retains last verified rows with
stale status if that refresh fails; a successful command is not fabricated.
Application preview/runtime integration remains separate from these workflow
repairs.


Choose Work Item opens the existing picker and execution review; it does not run
a separate requirement check. In the selected package, the button appears in
Next Action when that is the current move, otherwise once in Manage Package.
Technical Plan remains a separate inspection/planning entry. For a blocked
package, address the stated blocker before trying to start work. Requirement
results come from the existing work-start review, not from opening the picker.
