# Work Design Live Integration

## Purpose

This is the primary Console instruction surface for OOS-backed Delivery Work
Design advice, source projection, apply, and durable receipt readback. The
existing Work Design workflow and visual structure remain unchanged.

OOS owns source revision, bounded AI-advice admission, canonical application,
reconciliation, and durable receipts. The Console owns operator interaction,
draft presentation, same-origin routing, and strict response validation.

## Context Session: understand the system

The existing advisor draft scope supplies canonical board card choices even when
the canvas is empty. Those choices and the draft validator use the same model
vocabulary. Unsupported kinds remain rejected atomically, preserving the note
and diagram; operators do not need to supply technical card-type names.


Context Session explains the system being designed. Build Tree turns that
understanding into ART work. A list such as "write contracts, implement, test,
review" is a delivery plan, not an architectural explanation. A runtime sequence
such as "user request, interface, service, data, response" can explain architecture.

Use relevant source evidence to distinguish the current system, proposed changes
and open questions. Explain responsibilities, interactions and boundaries, plus
data ownership, access, failure and recovery where they matter. For policy,
documentation or other non-runtime work, explain its actors, rules, information
and handoffs without inventing services. Reuse an accepted architecture when
unchanged and describe the relevant delta.

Diagram starters are editable examples, not inspected facts. Replace or remove
their generic labels. The Work Design application itself is the subject only
when that is the actual work. Use whichever sketch or note best explains the
system; no diagram format, node count or keyword gate establishes understanding.
The default canvas cards identify the project and prompt for current system,
target change and interactions. Their stable identities preserve saved positions
and connections. Existing finalized core-card text and diagrams remain historical
evidence; this guidance does not rewrite them or claim they were re-reviewed.

Before Finalize, review whether the note and diagram explain how the target
system works and which assumptions remain unverified. Snapshot and receipt
checks prove custody, not architectural correctness. The advisor asks for missing
evidence rather than claiming repository/runtime access it does not have. It
answers questions without edits and drafts only when explicitly asked. Existing
operator finalization, acceptance and canonical Apply remain separate actions.

## Runtime Modes

The server configuration selects one explicit mode:

- `disconnected-preview`: `OOS_BASE_URL` is absent. Existing fixture advice,
  local apply behavior, and visibly local receipts remain available.
- `live`: OOS is configured. Work Design reads canonical projection and sends
  advice and apply commands only through OOS. A configured failure is shown as
  unavailable and never falls back to fixture behavior.

## Server Configuration

Provide these values through the local or platform-owned runtime environment.
Do not expose them through `NEXT_PUBLIC_*` variables or commit concrete values.

| Variable | Required in live mode | Purpose |
| --- | --- | --- |
| `OOS_BASE_URL` | yes | OOS HTTP endpoint visible to the Console server. |
| `OOS_CALLER_SECRET` | yes | Caller-authentication secret delivered by the runtime owner. |
| `GOVERNANCE_CONSOLE_OPERATOR_ID` | yes | Stable operator attribution until authenticated Console identity is admitted. |
| `OOS_CALLER_ID` | no | Defaults to `governance-operations-console`. |
| `GOVERNANCE_CONSOLE_OPERATOR_HANDLE` | no | Optional bounded display handle. |

The browser calls only same-origin
`/api/delivery/work-design/{packageRef}` routes. Credentials and operator
attribution are assembled server-side.

## Live Behavior

1. Work Design derives one stable package identity from the selected Delivery
   record and reads its OOS projection before a canonical command.
2. Context and tree advice bind to the projected source revision. OOS returns
   bounded advice plus CGG and model-profile evidence for operator review.
3. The Console keeps accepted advisor evidence with the draft and supplies it
   to Apply without granting the model mutation authority.
4. Apply uses one stable acceptance identity and accepted time for same-session
   retries. The exact normalized tree produces the accepted-draft digest.
5. `apply-pending` blocks a second mutation while OOS reconciles. An already
   applied projection returns the durable application receipt without replaying
   the mutation.
6. Only a validated OOS apply result with matching draft digest, operator,
   target readback, and durable receipt is shown as applied.
7. A live apply records that receipt in the current Work Design session. It
   does not fabricate or project a fixture Refinement package as canonical
   backend state.
8. Advice or apply rejection refreshes source truth. A successful apply remains
   successful if only its follow-up projection refresh is temporarily
   unavailable because the returned receipt already proves the mutation.
9. Projection reads retain a 12-second deadline. Synchronous advice and apply
   commands have a bounded 180-second deadline; the existing advice provider
   permits 60 seconds and one retry, so a 12-second browser-server read budget
   cannot represent its completion. This does not change model limits or
   introduce automatic retries. Each explicit advice action has its own
   invocation identity, since OOS binds a fresh request time into the CGG
   projection. Accepted canonical apply retains its original stable identity.

## Current Boundary

### Evidence presentation

After Work Design leaves the active register, use Refinement's
`View Work Design Handoff` to read the canonical application and durable
receipt. The existing OOS projection supplies the exact receipt, application
time, draft digest, operator and canonical readback references. A handoff-bound
application is selected from owner history rather than silently replaced by a
different latest application. Missing or mismatched owner evidence stays
unavailable with no fixture fallback. This read does not replay apply.

Finalized brief and snapshot content has separate saved-work custody under the
[approved persistence design](durable-saved-work.md). The canonical receipt links
to the original Work Design screen in read-only mode for saved versions. Missing
historical browser originals must not hide a real canonical application, and an
apply receipt is not proof that they were uploaded. Disconnected preview retains
its explicitly local finalized-brief evidence view.

Current Move, progress, History and Apply Run Log use the same explicit runtime
mode. In live mode, only a validated OOS result or recovered canonical projection
supplies the durable receipt identity and application time. Configuration alone,
an unavailable projection, or a local receipt flag is not completion evidence.
History keeps the durable receipt visible even after a completed projection is
recovered. Saved draft/context content uses its own OOS acknowledgement and
retains import provenance separately from canonical application evidence.

The log is a read-only summary of returned evidence, not a streamed backend log.
The OOS application receipt proves canonical application and complete readback;
it does not attest that browser-local context snapshot files were uploaded.
Disconnected-preview receipts, projections and simulated attachment status stay
explicitly local. Suggestion-only advice does not imply activation of a separate
tool-enabled model profile or grant mutation authority.

Implemented:

- server-only OOS authentication and operator attribution
- strict source, advice, application, and receipt validation
- same-origin projection, advice, and apply routes
- version-bound advice and stable apply acceptance
- explicit disconnected preview and configured fail-closed behavior
- durable receipt readback across restart through OOS

Still separate:

- per-workflow operation eligibility beyond canonical inventory visibility
- authenticated human identity beyond configured operator attribution
- platform deployment and security acceptance

## Validation

Run:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/operation-runtime/work-design-live-adapter.test.mjs
npm run architecture:delivery
npm run check
```
