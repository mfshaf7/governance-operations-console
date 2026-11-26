# Delivery Execution Work Sessions

Before source authorization, use **Covered ART items (comma-separated)** to
review every story sharing the same source landing and rollback unit. The
selected work item must remain included; enter IDs such as `1338, 1340, 1344`.
The source approval and start decision retain that exact coverage. OOS still
verifies every item's current owner, readiness and exact Architecture Packet
Landing Unit match; entering an ID grants no authority. Original-scope recovery
restores its recorded coverage. Existing single-item clients retain their
owner-generated default. For a recorded Technical Plan, source authorization
and Start Work Session preserve the approved work group's exact identifier.

## Purpose

Use **Delivery → Execution** to find a package on the Control Board or
Family Map. Select it to inspect its status and manage PI planning, the
technical plan, package blockers, closeout, and records. Choose **Open Work
Board** to manage the items inside the package.

**Next Action**, below **Work Overview**, points to the next review based on
the package status and verified work checks. An unchecked item starts with
**Check Work Requirements** on the Work Board. A checked requirement that
calls for a technical plan points to the plan in **Manage Package**.

- **Epic Board** shows Features and work assigned outside a Feature. A
  Feature card shows its recorded status and child progress. Select the card
  to open its stories, tasks and defects. **Direct work** counts only items
  outside a Feature. The bottom-right board selector
  uses **Package Board**, **Epic Board**, **Feature Board** and **All Work**.
- Choose **All Work** for stories, tasks and defects across the package.
  When a package has several Features, the Feature filter chooses which one
  to show. Both controls sit inside the canvas at the bottom right. The back
  button returns to the board you came from. Use the header switch to choose **Work Board** or **ART Tree**.
  The right panel shows the package, Feature or selected item.
  **Next Action** follows the overview or item context. It guides the first
  selection on Epic Board and All Work, and holds the relevant review or
  work-session controls once an item is selected.
  Select the exact item to check requirements, open a recorded session, or
  review evidence-only completion. Blocked work prioritizes its blocker and
  dependencies. Use **Open item** to inspect a dependency on the Work Board
  and **Review Blocker** for a recorded blocker when a current change review
  is available. The review is bound to that item and the current revision.
- **ART Tree** shows the recorded hierarchy. Open a Feature or executable item
  on the Work Board, or review completion for other eligible structural items.
  **Edit Work Structure** opens the existing reviewed tree-change workflow.

Opening a review or work session reads the existing OOS workflow. Starting or
completing work requires explicit submission.

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

## PI Planning in Preview

Open **PI Planning**, select an initiative that has completed Refinement, and
choose **Prepare PI plan** or **Update PI plan**. Set the planning increment,
objective, and iteration at the top. Drag work between **Unscheduled**,
**Committed**, and **Stretch**, or select a card and use **Move to**. The
selected card shows its description and recorded dependencies when available.
The plan needs at least one committed item, and open prerequisites in the same
plan must also be committed. **Review plan** shows the objective, iteration, and
assignments before **Record in preview** saves the draft locally.

Use **Work items** in the Epic's PI Planning view to place a prepared Risk or
Milestone in a dated iteration. Choose the existing objective, review the
assignment, then apply the plan. This supplies the iteration for readiness.
Complete the item separately when its evidence is ready.

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

Open **Technical Plan** under **Manage Package** on the main Execution board.
Its status explains when to use it: Open Technical Plan is inspection/drafting;
a missing-plan owner gate makes Prepare Technical Plan the primary next action.
An existing binding requirement asks for review and linkage of the approved plan.
**Open Work Board** returns to package work selection. A missing record or
generated decision default grants no exemption. Not required and covered
are shown only after an owner-confirmed implementation-ready check for that work.
The workspace is titled Technical Plan & Approval. The global Architecture Packet toolbar entry is removed. When the current
source session reports a missing or unbound architecture requirement, Next Action
also opens the same package-scoped workspace and identifies the affected work.
No package-wide permission is inferred from one work item's requirement.

Choose the work in **Choose scope**. Browse the package tree by Feature,
search by name or number, and select the exact work the plan covers. Items
already in the current plan and the original work-start target are visible.
The Console fills work type, parent, and repository from recorded facts.
Explain the approach and its limits in **Plan summary and justification**.

Use **Plan the changes** to assign covered items to change groups, choose what
must happen before start or closeout, and record checks and recovery. A change
group brings items from the same repository together for review and rollback.
The Console prepares one group when all covered work uses the same repository.
Confirm whether it changes repository files. The Console assigns group
identifiers and derives which groups appear in the source order. In
**Work dependencies**, choose when each recorded prerequisite must complete.
To add a dependency, record it in Delivery and reopen the plan with refreshed
work data.
Work through **Work & Changes**, **Approvals & Decisions**, **Sequence &
Handoffs**, **Operation & Recovery**, and **Verification**. You can return to
any area directly. Under **Required approvals**, choose the work item that
provides the approval. Its repository and entry under **Work dependencies**
are filled automatically. Evidence from other work must be a recorded
dependency of the approval work item. In **Source revisions**, select **Read missing
revisions** to pin the default branch for each unpinned repository. Open
**Pin a revision** to read the branch head or verify an exact
commit on that branch. **Manage revisions** opens the full list to add or edit
recorded pins. Correct work type, parent, or repository on the original work
item and reopen the plan with refreshed Delivery data. The draft keeps a parent
link when both items are in scope. Search the repository registry from a field
that can use another registered repository, such as a transition's responsible
repository. Select a change group or plan entry to open its
dedicated detail view. **Back to entries** restores the list, search and
focused row. The same navigation is available for entries in **Review & record**.
Add actions that create plan records open a dialog. Short forms use a compact
dialog. **Add to draft** puts the new entries into the list. **Cancel** returns
without adding anything. Individual values and selections stay in the section.

Add approvals, open decisions, and evidence handoffs when the work needs them.
Use a handoff when a change group in another repository needs a specific result.
Select each group and its work item. The Console fills the repositories from
the groups. The plan uses standard installation access unless the work needs
its own authorization rules. Use the verified work-start requirements to
determine whether a particular item requires a Technical Plan. Under **Activation order**, the
selected approval supplies the groups to commission. Select a pinned source
repository and enter the path and setting name to read a boolean or declared
activation posture from its committed JSON or YAML. Authorization records can
reuse a reference from the approved plan or read a document from a pinned
revision. The Console fills the immutable link and digest. Confirm what the
document authorizes before using it.

Switching to standard installation access or no lifecycle changes keeps the
previous details in the private draft. Select the earlier option to restore
them, including after reopening the draft. The reviewed plan includes the
active choices. Reopening a decision with a written resolution, replacing an
entered source value, or removing work with assigned checks or timing asks
for confirmation before clearing that input.

Describe a success and failure case for each covered item in **Verification**.
Use **Check coverage** to see the standard checks, add plan-specific checks,
and assign them to work. Use **Connection and Git checks** when the change affects how systems exchange
commands, data, or results, or needs proof of a Git dependency. The Console
adds the standard connection checks when you select **Yes** for that question.
**Change merge order** sets the intended order when several groups change source.
Use the form for drafting. If a saved value cannot open in the form,
**Open draft repair** exposes its retained content for recovery.

Open **Implementation sequence** to select a change or work item and see its
prerequisites and dependents. Labels distinguish source order, start and
closeout requirements, and approvals. Use **Open full map** to inspect the
entire sequence. **Saved architecture** opens the retained Work Design
diagrams and finalized brief as a reference while planning. Bring focus or the
pointer into the preview to switch diagrams. Open the snapshot to zoom.

In **Review & record**, select **View covered work** to search the included
items by name or number. Read open decisions and recovery from their panels.
Choose a review area and open its section to inspect records in the reader.
**Back to entries** restores the list and search after opening a record.
Verification uses the same case summaries, **Check coverage**, and
**Connection and Git checks** as the plan editor. Source revision rows show the
recorded branch and short commit. Open a row to read the full revision.
**Review next issue** and **Open section** return to the relevant form when
preparation is incomplete. Owner validation findings remain available until
the plan changes or another validation runs.

Draft edits retain their private save acknowledgement. A confirmed recording
lets the selected item’s start review check the new plan. **Return to work
start** opens that exact item and refreshes its current requirements. Plans
opened from the package can return to the **Work Board** to choose the item.
History keeps read-only access to scope, references, the sequence, and review.
Select **View plan** to browse the recorded form when it uses the current
authoring schema. Earlier schemas remain available through the reference and
review views that can read their saved fields.

A native HTTP 404 with `error: not_found` and
`details: delivery_art_reference_missing` identifies **No approved plan
recorded**. Unavailable or rejected reads retain their distinct status. The
Console preserves OOS's machine-readable error and presents its safe findings.

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

In **Check Work Requirements**, follow the recorded requirement when a plan
is required or already approved. Where the work can proceed without a
mandatory plan, **Check recommendation** offers optional guidance for the
selected work. It uses the description from the current work record, the
recorded PI and iteration, direct dependencies across iterations, and any
available finalized Work Design note. Unrelated work in the same iteration
is excluded. A positive recommendation offers
**Draft Technical Plan**, which opens the editor with an approach, verification
and rollback starter for the selected work. Existing drafts and recorded plans
are preserved. Review the retained draft if its scope, schedule or dependencies
change before completing validation and approval.

The advisor runs on explicit requests. Questions do not edit. In **Choose scope**,
ask the advisor to draft or rewrite the plan summary. It writes short, plain-language
paragraphs into the textarea, where you can edit or undo them. In the plan editor,
an explicit draft request applies to the selected editable section. Scope
selection and approval stay under operator control. Source revision assistance,
Saved architecture, Implementation sequence, and Review & record offer read-only
advice. Context contains the selected draft field and its schema
when applicable, supplied covered-work records and available canonical ancestor narratives,
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

The selected package panel on the Control Board or Family Map shows its
posture, planning facts, blocker details and recent activity. Package-level
actions open from that panel. The Work Board summary counts the cards in the
selected scope. History keeps navigation and recorded details
available with changes locked.

**What’s Blocking Progress** shows the issue, impact, responsible team or
service, agreed approach, and review date. The package blocker review uses the
existing owner command. Child blockers and dependencies are attached to their
items on the Work Board.

In connected mode, **Find ART Tree** accepts an exact ART number in the
current owner inventory. This opens the matching package's tree, including
planning-stage packages which are outside the Execution lanes. Ambiguous or
unavailable entries show an error.

The global Delivery register includes all current and retained package roots.
Its routine refresh loads full active and parked execution trees while
explicitly deferring completed and retired child graphs. Unloaded archived
counts are unknown, never zero. Current/History navigation, global package
totals and filters keep their existing meaning.
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

**Edit Work Structure** reads a fresh OOS change projection before opening a local draft.
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
For a completed initiative, **Review Closeout** opens the existing native owner
readiness/closeout flow. Neither inspection action grants source, closure or
review authority.

1. Open the package workspace and select the work item on its **Work Board**.
2. Choose **Check Work Requirements** or **Open Work Session**. The exact
   item's OOS read determines eligibility and the next action.
3. In disconnected preview, **Review Start** is available for an item with an
   enabled local start intent. In live mode, wait for the OOS projection.
4. If no session exists, choose `Prepare Session`. When an approved Technical
   Plan defines the selected work, the draft shows its complete approved work
   group and binds the saved plan automatically. Review the branch and rollback
   boundary before approving source access. Reload the decision if the
   approved plan changes while you review it.
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

Inside the package workspace, choose **Review Completion** from the
item on the Work Board. For a Feature, choose **Review Feature Completion**
when its child work is closed. For a PI Objective, open the outcome review
from the **ART Tree**.
The review reads current native continuation context and any source session.
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
business acceptance from child status. Use **Review Closeout** in the main board’s package panel for an Epic.

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
Completion and PI Objective review check the source-session custody bit in
continuation context. They can proceed with no source session even when the
executor is offline. An existing session requires its own completion path.
These native ART requests use the existing 75-second governed-work budget so
readiness/form validation can return its actual owner rejection. Other generic
Console OOS calls retain their shorter budget. A timeout still requires reading
the original target; it never authorizes an automatic replacement write.

## Canonical Register And Bounded Source Realization

In live mode the primary register reads OOS's canonical Delivery initiative
collection through `/api/delivery/workspace`. It projects observed ART identities,
trees, and statuses, not synthetic package action eligibility or source custody.
Open an item on its package Work Board to resolve current OOS eligibility.
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

Select a work item on the package Work Board. Dependencies and blocker
details are attached to that item. The owner preflight checks exact source
coverage and dependency legality before execution.

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
