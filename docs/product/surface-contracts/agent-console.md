# Agent Console Contract

Status: accepted governed dev-integration cross-surface contract.

Agent Console owns bounded agent-assist visibility, command posture, governed
path health, and the live runtime-presence projection used by its embedded,
floating, and future admitted agent instances. Domain workflows decide where
agent assistance is allowed.

## Surface Purpose

The operator uses Agent Console for manual assistant interaction with a visible
Console context candidate and an explicit model-projection decision.

Agent Console is cross-cutting. It is not an Operation Workbench domain.

The fixed Agent Runtime dock is the canonical cross-console runtime surface. Its
aggregate status card reports governed-path readiness separately from logical
agent-runtime activity. Its bounded, scrollable roster lists only logical
runtimes with a current heartbeat and keeps `idle`, `working`, `waiting`, and
`failed` activity separate from presence. Each entry carries runtime identity,
caller, owner surface, source authority, provider, model, current operation,
current invocation, and optional model-profile and durable-run references.

The embedded Agent Console and the Docking Agent are separate logical agents.
Each keeps its browser presentation state but binds its generated nonce,
interaction mode, invocation identity, and operator identity to an OOS-owned
session. Both start in Focus mode. Workspace mode is selectable only when the
Shell exposes a current workspace candidate; General mode is not an invocation
path in the governed OOS contract.

Both agents register independently through the `agent-console` source so the
shared Agent Runtime dock can observe them without merging sessions. The
Console keeps no durable session or invocation authority; OOS owns that state.

Each request creates a structured browser projection while OOS creates the
durable session and invocation. A response is accepted only when the same-origin
server adapter validates the OOS session binding, the CGG projection receipt and
artifact digest, the exact `agent-console-assistant-v1` governed profile, the
gateway audit reference, and the OOS invocation receipt. Those references are
displayed after completion. The Console must not fabricate them.

## Provider Observation Boundary

Runtime-path health is a source-timestamped observation, not a browser
assumption. The same-origin probe reports whether OOS is reachable; it does not
call a model provider or claim a completed invocation. Failure to reach the
Console probe route is not proof that every upstream is offline. The Console
retains the last path facts as `stale`, records the newer check time, and projects the runtime as waiting until
a fresh observation succeeds. With no prior observation, the provider is
`unavailable`, not offline.

Routine path polling must be lightweight, non-overlapping, visibility
aware, abortable during teardown, and backed off after transport failures.
Detailed provider inventory and credentials are not path-health facts and must
not enter the polling response.

## Request Lifecycle Boundary

Each browser agent permits one active governed request through its
own request controller. The embedded Agent Console and Docking Agent can run
independently; one agent's busy, cancel, compact, or expansion state must not
change the other agent. While a request is active, that agent's existing Run
control becomes Cancel.

Every request is bounded by browser and server timeouts. Operator cancellation
propagates through the same-origin route to OOS. Reset and mode changes close
the exact current OOS revision before rotating the browser session binding.

Completion, operator cancellation, timeout, owner rejection, empty response,
and response interruption remain distinct outcomes. The Console does not retry
model generation automatically because an automatic retry could duplicate cost
or produce a second divergent answer. OOS owns deterministic replay when the
same invocation identity is deliberately retried.

Model Operations owns model-profile lifecycle, policy, and caller eligibility.
Agent Runtime may resolve and display a versioned model-profile reference, but
it does not expose, approve, or mutate profile truth. An unresolved path is
shown as unavailable, never as approved.

## Context Boundary

Console Shell owns the visible context candidate. A candidate carries a stable
schema version, source authority, source mode, surface identity, scope,
freshness, observation and projection timestamps, bounded signals, safe
actions, references, and an explicit boundary. Presentation-only tone does not
enter model projection.

Agent Console exposes the pre-admission boundary. The current policy profile is
`governed-cgg-required/v1`:

- Focus mode accepts a bounded current page candidate.
- General mode attaches no page or workspace context.
- Workspace mode accepts only a bounded current workspace candidate.
- `live`, `source-projected`, and `synthetic` candidates all require CGG
  admission; none is locally attached to a model request.
- `unavailable` or over-budget candidates fail closed.

The browser sends the interaction mode, candidate, nonce-bound session, and
invocation identity. It does not declare admission. The server validates those
inputs, strips presentation metadata, constructs the OOS contract, keeps caller
credentials server-only, and discards mismatched or incomplete OOS evidence.
The browser discards responses missing the governed receipt headers.

Obvious secret-like or oversized operator input is rejected before it enters
the transcript, prompt history, conversation history, or governed request.
Server validation independently enforces the same input boundary. `clear`
removes only the transcript; `reset` removes transcript, command history,
conversation history, and current invocation state.

CGG packet admission, redaction, model-safe projection, and downstream model
access occur only behind OOS. The Console has no CGG or provider credential and
must not receive raw operational context. The OOS Agent Action route remains a
separate explicit-action boundary; this manual assistance surface does not
construct or dispatch mutations.

## Modes

Agent Console may support:

- Focus mode for the active visible candidate
- Workspace mode for a current workspace candidate

Mode changes must not weaken context admission or source-of-truth boundaries.
The selected mode belongs to the individual OOS session. A mode change closes
the old session and opens a new binding on the next invocation.

Explicit surface actions such as `Ask Agent About Focus` must request Focus
mode directly. They must not inherit a stale General mode while claiming that
focused context was attached.

## Domain Relationship

Domains decide whether agent/advisor assistance belongs inside a workflow
step. Simple domains should not inherit a persistent agent panel by default.

For Proposal, advisor assistance is allowed only inside draft-assist workflow
content such as Triage or Disposition, not as a persistent workspace console.

## Non-Goals

Agent Console must not:

- mutate canonical records
- make autonomous governance decisions
- replace Model Operations
- infer live runtime presence from static advisor UI
- approve or mutate a referenced model profile
- replace domain workflow actions
- cover or compete with modal footer actions
- bypass context admission
- trust a browser-supplied admission decision
- fabricate CGG admission, redaction, digest, or receipt evidence

## Sources

- `../system-design.md`
- `../operation-workbench-contract.md`
