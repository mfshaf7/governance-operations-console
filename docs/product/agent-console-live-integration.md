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
