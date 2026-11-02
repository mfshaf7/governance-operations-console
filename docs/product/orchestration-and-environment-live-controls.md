# Orchestration And Environment Live Controls

Status: Console source implemented; OOS source contract implemented; Platform
owner composition and operating acceptance remain pending.

## Operator Outcome

When the Console has a complete OOS configuration, Orchestration, Dev
Integration, and Governed Releases render only OOS-projected owner truth. The
Console exposes a control only when the current OOS projection says it is
available. It never substitutes fixture state or a local simulated receipt for
missing, stale, denied, blocked, or failed live truth.

Disconnected preview remains available only when no live OOS mode is selected.
Its records and receipts are explicitly local and cannot enter the live path.

## Normal Use

1. Open Orchestration, Dev Integration, or Governed Releases from the Console.
2. Review the current definition, run, Platform subject, source version, and
   capability projection.
3. Select only an enabled action. Destructive Platform actions require a
   separate confirmation; orchestration cancellation retains its explicit
   “cancellation is not rollback” acknowledgement.
4. The Console server re-reads the current OOS catalog before it constructs a
   command. It supplies the verified operator binding, canonical intent digest,
   exact approval binding, stable command/control identity, and server-held OOS
   credential.
5. Follow the returned state, owner, exact next action, events, blocker or
   failure, and terminal receipt. A failed or cancelled operation never renders
   as successful, and cancellation never implies rollback.
6. Use **Refresh** in Environment Lifecycle or **Refresh status** in
   Orchestration when a dependency is degraded or stale.
   Environment controls also refresh every 15 seconds while visible and briefly
   reconcile an accepted nonterminal operation from its exact OOS record.
   Orchestration refreshes on entry, after controls, and through its explicit
   refresh and original-run reads.

### Start the admitted validation run

1. Open **Orchestration → Definitions → Open Definition → Start Run** for the
   admitted Validation readiness run v1. Stale or blocked admission disables
   the action; disconnected preview has no live start.
2. Enter the Delivery initiative's ART Epic number and the run purpose, then
   select **Review current source**. The server reads the selected initiative's
   current canonical owner projection and returns its title and exact version.
   The browser does not choose a provider, worker, queue or source artifact.
3. Review the displayed scope. This definition performs workspace-governance
   smoke validation and WGCF readiness. The initiative binds the request and
   evidence; the run does not complete ART items or validate every project task.
4. Select the explicit read-only approval and **Start reviewed run**. Approval
   binds that source and purpose for fifteen minutes. The server rechecks
   current source and admission, derives the exact intent digest, and supplies
   the bound authenticated operator. There is no model-submitted decision.
5. Keep the original request and run references. **Run admitted** confirms OOS
   admission, including when no worker projection is available yet. It is not
   a completion receipt. Use **Read original run** or **View Run** for actual
   owner state and receipts.

A first explicit pre-dispatch refusal permits source review again. An unknown
outcome freezes the original request; **Retry original start** sends that same
request and approval. A later refusal cannot erase its earlier unknown effect.
After reload, use the workspace's **Read original run** entry with the retained
reference. No replacement start is submitted automatically, and reading does
not grant execution or control authority.

## Select a retained run

The recovery form can select a retained run from the current list or accept an
exact reference. Reading it creates no replacement run. **View Run** selects the
recovered identity in Runs. Home attention and in-progress entries similarly
select their exact definition or run, rather than merely opening its area.

## Preview maintenance: operational presentation

The pending UI batch keeps Home, Definitions and Runs and the existing Teras
patterns. Home prioritizes required actions; **Service details** opens the
complete service inspection. Registers, selected context, dashboards and design
support have explicit scrolling. Technical references remain inspectable without
dominating the operational summary, and activity uses the shared timeline.

Owner gate identities, names, results and evidence stay distinct. An active
definition alone does not mean new runs are admitted: the owner must allow start
and its gates must pass. A retained run's adapter/workflow identity does not
prove current worker health. Unknown health is displayed as unknown. The owner
catalog supplies the current version without historical actor/time metadata;
the Console does not invent a recording timestamp on reread. Retry and timeout
details are separate from rollout/rollback settings.

**Design Orchestration** prepares a definition contract and **Record Draft
Request** records its existing local implementation-request outcome. This does
not create an ART item, implement a worker or activate a workflow. The shared
saved-work indicator separately reports server acknowledgement or browser-only
continuity. The advisor offers draft help only when requested. An empty register
retains the drafting entry; unavailable source is never replaced with samples.

Control input is protected by a discard guard, and pending controls cannot be
edited or dismissed. An unconfirmed request does not display a false refusal;
inspect its run before sending changed input. Recorded owner controls remain
distinct from final receipts and disconnected simulated control receipts.

These are source/preview changes. Exact-source review, commissioning and real
operating proof remain required before treating this batch as released.

## Dev Integration maintenance preview

The pending source extends the existing operation catalog with bounded owner
profile readback and native OOS request recording. In **Dev Integration**, choose a reported profile
and a supported operation. **Authorize**, **Renew** and **Revoke** source access
belong to the project's **Source authoring** workflow because they require its
repository, approved intent and source session; the generic profile action list
must not send empty source-authorization inputs.

**Stop profile** opens a separate review bound to that profile, capability and
source version. A changed or removed capability, a new source version or a lost
connection disables confirmation. The server rereads current source before issuing
a command and rejects a mismatch. A submitted acknowledgement is not completion;
follow its original operation until the owner records the outcome and receipt.

**Operation history** shows only this workspace's loaded records. **Show more
operations** reveals the next ten, including older records. Select any operation
for owner events, receipt, failure/blocker and exact technical references. **Refresh
original operation** rereads that exact identity, even when the current profile
catalog has changed. Retry/cancel appear only when the owner advertises them for
the selected operation; cancellation rechecks current availability and never
implies rollback. A retained list does not establish current runtime health.

The staged profile adapter reads the committed owner registry and keeps absent
support/runtime evidence unknown. Its accepted Intent, Runtime Contract and Review
stages record a native OOS request, with retained request history and an exact
recording receipt. Recording does not register or admit a profile. Admission is
read separately and linked to the original request; no Proposal or ART item is
created. Historical admission references are retained.

These source paths have isolated composed proof, including cold readback and exact
receipt replay. They are not commissioned in the live Console yet. Disconnected
sample views remain explicitly labelled; provider failure never substitutes them
for live records. Exact-source Security review and Platform composition remain
required before activation.

## Governed Releases maintenance preview

The pending product read adapter keeps the existing register and three Dashboard
tabs. It reads registered products independently of executable Platform subjects;
owner-managed products and products without a release rail remain inspectable.
Product support, owner-record status, recorded runtime state, current resource
health and authorized Console execution are separate facts.

Release Path shows recorded owner evidence with its original timestamps,
candidate references and pinned source links. A record is not projected as an
executable or completed workflow step. Missing evidence remains not recorded.

Protected workflow buttons open existing Platform GitHub workflows in a new tab.
Review current source and inputs there and satisfy their environment approvals.
Opening the link does not submit a Console command, authorize production or create
a release receipt. Native Console dispatch remains uncommissioned in the live installation. The
staged native entry is described below. A failed product
refresh retains old facts visibly and preserves read-only workflow navigation. Current source and inputs must be
reviewed in GitHub; the Console cannot authorize its execution.

Both workspaces use the owner-scoped history API before pagination. **Load older
operations** reads another bounded owner page instead of revealing only a global
200-record slice. Immutable command-creation continuation survives state updates
and new commands. Exact-original refresh remains the recovery route. The current
file store retains lightweight metadata; cold discovery and file-stat costs still
grow with history. This does not claim a database index or constant query cost.

Disconnected release dashboards and forms retain explicit Preview/Simulation
labels. Sample review values remain reachable at shorter desktop sizes and empty
optional values say Not provided. Protected owner routes never use the simulator.

These are uncommitted source/preview repairs. Separate default-off OOS product
readback, exact-source Security review, Platform composition and live readback
qualification remain required before activation. No actual release was performed.


### Native owner workflow entry and source freshness

The staged OpenClaw adapter reuses the existing release Details/Review pattern
and OOS Platform-operation journal. Owner-defined inputs, product, capability and
exact source are reviewed before submission. Actual verification results start
blank. Human environment approval, source PR review/merge, desired-state readback
and observed health remain separate. Workflow success alone is not completion.
Native authority stays unavailable until the accepted composition and dedicated
Platform App are commissioned. Read-only GitHub links grant no mutation.

The running Platform code stays at its accepted revision. A bounded read adapter
may follow GitHub main only when every non-record Git leaf still matches that
revision and main retains the accepted lineage. Only the explicit existing
OpenClaw release/verification/lifecycle GitOps records may advance. A normal
release merge therefore refreshes owner records and permits the next reviewed
operation without a manual pull, checkout change or runtime-code repin.

`owner-main` means current owner main was verified. `accepted-snapshot` is the
reviewed local source snapshot; `retained-owner-main` is a last verified remote
snapshot. The latter two remain inspectable, with a source notice and original
observation time, and cannot enable a new native action. A source outage never
substitutes examples. A bounded derived cache retains one verified snapshot for
restart recovery; it is not canonical work-state authority. Immutable blobs and
shared head proofs avoid per-product probes and repeated full source reads.

A lost response retains only an opaque browser recovery pointer. Recover the
original OOS request; never redispatch after Platform's write-ahead marker. Exact
original reads, events, workflow/PR links and immutable receipts remain available
independently of current catalog admission. Cancellation targets the original run
and does not prove rollback. The two-consecutive-operation qualification uses an
isolated GitHub transport; it is source evidence, not live operating acceptance.

## Recovery

- A lost browser response keeps the same request identity for the same pending
  intent during the current browser session. Repeating that intent exercises
  OOS idempotency instead of creating a second effect.
- After a reload or process restart, recover from the OOS operation list and
  retained run projection. Do not create a replacement command merely because
  the prior response was lost.
- If catalog truth fails while retained operation history is readable, the
  history, exact owner next action, retry, and cancellation remain visible but
  new actions are disabled.
- A `recovering`, `degraded`, `stale`, or `unavailable` readiness state never
  counts as ready. Correct the named owner condition, then refresh or use the
  retained control that OOS explicitly exposes.
- Stopping a dev-integration profile can stop dependencies used by this
  Console. If the Console can no longer reach OOS afterward, use the projected
  Platform-owned recovery path; the unavailable Console cannot bootstrap its
  own control plane.
- If a previously current orchestration projection becomes unavailable, the
  last records remain visible as stale, all run controls are disabled, and the
  workspace status names OOS as unavailable.
- Retry or cancel only when the current owner projection exposes that control.
  Preserve terminal receipts and retained effects.

## Authority And Data Boundary

- OOS owns definition and operation admission, durable coordination,
  idempotency, control retention, reconciliation, and safe readback.
- Platform Engineering owns every dev-integration and governed-release effect
  and its capability truth.
- WGCF and the named source owners retain validation and business truth.
- The Console owns browser presentation, bounded intent capture, strict
  response validation, and same-origin HTTP handlers. It has no orchestration
  or environment business database and no direct Platform, Temporal, shell,
  Kubernetes, Argo, or GitHub mutation path.
- OOS credentials and operator attribution remain server-only. Owner error
  bodies, secrets, raw logs, and private endpoints are not projected to the
  browser.

## Activation Boundary

This source is not proof that Platform owner routes or durable runtime workers
are commissioned. Platform composition, Console recovery/readiness proof, the
exact-revision Security gate, and final fixture-free end-to-end proof remain
separate delivery steps. Until those steps pass, unavailable live controls must
stay visibly disabled.
