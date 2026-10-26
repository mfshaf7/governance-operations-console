# Agent Console Live Integration

The Console Agent uses the existing server-only OOS connection. The browser
never receives an OOS, CGG, gateway, or provider credential and never calls
those owners directly.

## Runtime Configuration

The Platform-owned Console runtime supplies:

| Variable | Purpose |
| --- | --- |
| `OOS_BASE_URL` | Private OOS endpoint used by the same-origin Console server. |
| `OOS_CALLER_ID` | Caller identity; normally `governance-operations-console`. |
| `OOS_CALLER_SECRET` | Server-only caller credential. |
| `GOVERNANCE_CONSOLE_OPERATOR_ID` | Exact operator identity bound to OOS. |
| `GOVERNANCE_CONSOLE_SESSION_PROJECTION_PATH` | Private verified Console-session projection used before POST or DELETE. |

Partial configuration fails closed. The GET probe reports only OOS path
reachability and the expected profile identity; it does not prove a model
invocation or expose private endpoints.

## Invocation Path

1. The browser supplies one generated session nonce, one invocation nonce, the
   selected Focus or Workspace mode, the visible bounded candidate, and the
   manual operator prompt to `/api/agent-interaction`.
2. The same-origin route verifies the Console operator session before any OOS
   call and keeps caller credentials server-only.
3. The adapter creates or replays the exact OOS Agent Console session, then
   submits one invocation with a digest-bound candidate.
4. OOS owns ordering and replay, obtains a model-safe CGG projection, invokes
   only `agent-console-assistant-v1` through the governed AI gateway, and
   records the terminal receipt.
5. The adapter accepts the answer only when session, operator, caller, agent,
   interaction mode, invocation, profile, CGG artifact, audit, and OOS receipt
   evidence all match. The browser rejects a response missing those headers.

Reset or interaction-mode change reads the current OOS session revision and
closes it before the browser rotates its nonce. An absent session is already
clean. A conflicting, stale, unauthorized, malformed, failed, or incomplete
projection never becomes a successful Console response.

Focus context uses the same eight-entry list limit as request validation.
It selects unique references in subject, source, receipt and evidence order.
When the owner has more references, the visible candidate states how many
were selected and directs the operator to the full evidence in Focus and the
owning surface. The original owner projection and evidence lists remain intact.
The request validator still rejects oversized or unsafe browser input. Sending
context is not an OOS acknowledgement; only validated owner receipts establish
successful admission and invocation.

## Authority Boundary

The Console submits intent and renders evidence. OOS owns session and
invocation truth; CGG owns context admission; Platform owns model profile and
runtime composition; Security owns activation acceptance. The OOS Agent Action
route remains separate and explicit. Manual chat does not construct or dispatch
workspace mutations, and no direct provider fallback exists.

Source merge-readiness is covered by
`case:agent-console-console-protocol-positive` and
`case:agent-console-console-protocol-negative`. Routine operating activation
still requires `gate:agent-console-operating-acceptance` and the Platform
commissioning proof owned by work item #1246.

## Focus and Workspace

Workbench Focus reads the same current owner collections as Workspace, scoped
to the selected domain. Its summary distinguishes retained Delivery history from
current work and never substitutes the synthetic Workbench registry descriptor
for live record knowledge. Collection context does not claim selected-record
detail. Delivery Home's Open Agent Console entry expands the shared floating
agent, preserves its existing session and uses manual requests; no local mock
answer or automatic model turn is generated.

The whole overview covers nine owner inputs within the unchanged admission
limits. Inventory and repository custody occupy one bounded signal with both
coverage states retained. The reference identifies the visible Console
composition; individual source read times remain in the bounded signals.
Lifecycle's raw owner summary is explicitly an OOS journal count, while its
coordinator also displays separately labelled native owner handoff readbacks.

Both agents start in **Focus**. Focus describes the selected visible page or
record; a workspace screen is a page in this mode. **Workspace** attaches the
same cross-Console overview from Command Center and supported workspace screens.
Changing mode closes the current OOS session before rotating its browser nonce.
The visible context title and Inspect context show what will be submitted.

Workspace is a bounded Console composition of the existing validated read APIs:
WGCF continuity for Registry/Portfolio, OOS Proposal, Prototype, Delivery,
Orchestration and Lifecycle, Platform operation coverage, and current Models
configuration. The separate Registry read supplies Registry page context. Only
allowlisted counts, lifecycle/status summaries, short product names, configuration
selection and source revisions enter the candidate. Prompts, source bytes, raw
logs, credentials, native sign-in data and private connection details do not.
This remains operator-supplied context, subject to the unchanged CGG admission
and redaction path; the Console does not attest new canonical authority.

Each source is explicitly current, unavailable/expired or preview-only. Reads
refresh while the page is visible, do not overlap, abort at teardown, and expire
after two minutes. A missing source contributes no retained facts. An empty
current collection is valid. Other current sources remain usable; the Agent
must explain incomplete coverage instead of inventing missing facts. Workspace
is unavailable when no source qualifies. Full records remain in their owner
views, and a bounded overview does not establish exhaustive record knowledge.
Legacy environment cards and selected profile details remain preview-only unless
their owner specifically supplies live evidence; the admitted Platform subject
catalog is not proof of their runtime status.

The floating Agent presentation enters the native dialog for Dev Integration,
Governed Releases, Lifecycle Transitions, Registry, Delivery, Portfolio and
Orchestration. Its provider, transcript, prompt and request controller stay
mounted. Escape inside an expanded Agent collapses it first; Escape outside it
retains normal workspace behavior. Nested review/approval dialogs hide the
floating presentation and retain their native focus protections. Compact domain
controls still decide their own assist placement; this does not enable an Agent
on every approval surface.

Regression checks include the actual producer-to-request mode matrix and owner
DTO/coverage/budget tests in `tests/console-architecture`. The native-dialog
interaction suite in `tests/browser/agent-workspace.spec.mjs` uses explicit
synthetic owner responses, never operating evidence. Run it against a separate
local preview on port 3320 with
`npx playwright test tests/browser/agent-workspace.spec.mjs --workers=1`. Final commissioning also
requires real Console interaction and OOS/CGG/model receipts on the accepted
source revision; passing synthetic browser tests cannot establish that proof.
