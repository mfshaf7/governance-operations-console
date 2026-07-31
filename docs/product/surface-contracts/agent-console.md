# Agent Console Contract

Status: accepted local-baseline cross-surface contract.

Agent Console owns bounded agent-assist visibility, command posture, provider
health, and the live runtime-presence projection used by its embedded,
floating, and future admitted agent instances. Domain workflows decide where
agent assistance is allowed.

## Surface Purpose

The operator uses Agent Console for manual assistant interaction with a visible
Console context candidate and an explicit model-projection decision.

Agent Console is cross-cutting. It is not an Operation Workbench domain.

The fixed Agent Runtime dock is the canonical cross-console runtime surface. Its
aggregate status card reports model-provider readiness separately from logical
agent-runtime activity. Its bounded, scrollable roster lists only logical
runtimes with a current heartbeat and keeps `idle`, `working`, `waiting`, and
`failed` activity separate from presence. Each entry carries runtime identity,
caller, owner surface, source authority, provider, model, current operation,
current invocation, and optional model-profile and durable-run references.

The embedded Agent Console and the Docking Agent are separate browser-local
logical agents. Each owns its prompt draft, transcript, bounded conversation
history, interaction mode, busy state, current invocation, expansion state, and
runtime identity. The embedded agent starts in Focus mode because it is paired
with the visible Console context candidate. The Docking Agent starts in General
mode because it is a persistent cross-console assistant and attaches no page
context unless the operator explicitly changes its mode.

Both agents register independently through the local `agent-console` source so
the shared Agent Runtime dock can observe them without merging their sessions.
Future agent runtimes may enter through an admitted OOS projection, but source
authority must remain explicit. A workflow advisor is not listed merely because
its UI exists.

Each model-backed request creates a structured local invocation with identity,
state, timestamps, provider, actual response model, context-admission
decision, policy profile, interaction mode, candidate identity, source mode,
context budget, and failure information. A CGG receipt remains unavailable
until governed integration exists. An invocation is not a durable orchestration
run and must not populate the durable-run reference.

## Provider Observation Boundary

Provider health is a source-timestamped observation, not a browser assumption.
A successful provider probe may report `online` or `offline`; both are live
source observations. Failure to reach the Console probe route is not proof that
the provider is offline. The Console retains the last provider facts as
`stale`, records the newer check time, and projects the runtime as waiting until
a fresh observation succeeds. With no prior observation, the provider is
`unavailable`, not offline.

Routine provider polling must be lightweight, non-overlapping, visibility
aware, abortable during teardown, and backed off after transport failures. It
may resolve the selected model and model count from the provider tags response.
Detailed model inventory and per-model capabilities are not provider-health
facts and must not be expanded on the polling path.

## Request Lifecycle Boundary

Each browser-local agent session permits one active model request through its
own request controller. The embedded Agent Console and Docking Agent can run
independently; one agent's busy, cancel, compact, or expansion state must not
change the other agent. While a request is active, that agent's existing Run
control becomes Cancel.

Every request is bounded by a browser timeout and a slightly longer provider
timeout. Operator cancellation and session teardown abort the browser request,
and browser cancellation propagates through the Console route to the upstream
provider reader. The stream bridge must flush a final provider line, require
the provider completion event, release its reader lock, and cancel upstream
generation when the consumer leaves or provider output is malformed. Provider
EOF without that completion event is a stream interruption.

Completion, operator cancellation, timeout, provider-request failure, empty
response, and stream interruption are distinct invocation outcomes. Partial
output may remain visible in the terminal for diagnosis, but cancelled,
timed-out, empty, or interrupted output must not enter conversation context.
The Console does not retry model generation automatically because an automatic
retry could duplicate cost or produce a second divergent answer. The operator
may rerun the retained command after the active request settles.

Model Operations owns model-profile lifecycle, policy, and caller eligibility.
Agent Runtime may resolve and display a versioned model-profile reference, but
it does not expose, approve, or mutate profile truth. A local runtime without a
governed profile is shown as `Prototype local`, never as approved.

## Context Boundary

Console Shell owns the visible context candidate. A candidate carries a stable
schema version, source authority, source mode, surface identity, scope,
freshness, observation and projection timestamps, bounded signals, safe
actions, references, and an explicit boundary. Presentation-only tone does not
enter model projection.

Agent Console owns the model-projection decision. The current policy profile is
`prototype-synthetic-only/v1`:

- Focus mode may attach a bounded candidate only when its source mode is
  explicitly `synthetic`.
- General mode attaches no page or workspace context.
- Workspace mode remains unavailable until a governed workspace packet source
  exists.
- `live` and `source-projected` candidates remain visible to the operator but
  are not sent to the model; they report `CGG required`.
- `unavailable` or over-budget candidates fail closed.

The browser sends only interaction mode and candidate. It does not declare
admission. The server validates the candidate schema, rejects unsupported
fields, recomputes the policy decision, strips presentation metadata, and
returns decision metadata with the response. The browser discards a response
whose decision headers do not match its local projection.

Obvious secret-like or oversized operator input is rejected before it enters
the transcript, prompt history, conversation history, or provider request.
Server validation independently enforces the same input boundary. `clear`
removes only the transcript; `reset` removes transcript, command history,
conversation history, and current invocation state.

Real CGG packet admission, redaction receipts, model-safe packet projection,
caller authorization, and downstream model adapters remain post-baseline
integration work. The prototype must never fabricate a CGG receipt or describe
its local policy as CGG admission.

Until governed model access exists, Agent Console remains local/manual-only. It
must not receive raw operational context or mutate canonical workspace state.

## Modes

Agent Console may support:

- Focus mode for the active visible candidate
- General mode without context
- future workspace mode after governance admission

Mode changes must not weaken context admission or source-of-truth boundaries.
The selected mode belongs to the individual agent session. Workspace mode
remains visibly unavailable until a governed workspace packet source exists.

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
