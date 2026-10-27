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
6. Use **Refresh owner truth** when a dependency is degraded or stale.
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
   a completion receipt. Use **Read original run** or **View Runs** for actual
   owner state and receipts.

A first explicit pre-dispatch refusal permits source review again. An unknown
outcome freezes the original request; **Retry original start** sends that same
request and approval. A later refusal cannot erase its earlier unknown effect.
After reload, use the workspace's **Read original run** entry with the retained
reference. No replacement start is submitted automatically, and reading does
not grant execution or control authority.

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
