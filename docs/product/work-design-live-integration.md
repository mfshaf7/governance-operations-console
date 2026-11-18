# Work Design Live Integration

## Purpose

This is the primary Console instruction surface for OOS-backed Delivery Work
Design advice, source projection, apply, and durable receipt readback. The
Console keeps local draft review and finalization separate from canonical Apply.

OOS owns source revision, bounded AI-advice admission, canonical application,
reconciliation, and durable receipts. The Console owns operator interaction,
draft presentation, same-origin routing, and strict response validation.

## Context Session: understand the system

### Multiple diagrams — approved preview batch

One Context Brief can contain ordered named diagrams. Use **Add diagram** for a
new view; **Diagram details** changes its name, type and architectural explanation,
duplicates it, reorders it or explicitly deletes it. Selecting a diagram is
navigation, including in read-only history. It does not accept, stale or finalize
the architectural content. Each view reuses the existing canvas and diagram tools.

The shared Context note explains the overall system. Individual descriptions
explain the scope, interactions, evidence and open questions of their view.
Save Session and Finalize Brief cover the complete diagram collection, rather
than just the visible canvas. Existing single-board records remain readable with
their original saved content and finalized fingerprints. No migration rewrites
historical finalized versions.

Finalized Brief displays one retained diagram at a time, headed **Diagram N of M**.
Hover over the image or focus it with the keyboard to show a translucent bottom
bar with the current diagram name and **Previous**/**Next** controls. Touch
layouts keep these controls visible. After switching views, the bar fades until
pointer movement or keyboard interaction reveals it again. Browsing does not edit
the brief. **View Snapshot** opens the
same selected view with zoom and diagram navigation. **Export Preview** retains
the complete collection. Legacy single-image evidence stays single-image;
missing historical content is not replaced with the current working canvas.
Long handoff notes show an excerpt followed by **Read full note** at the bottom
right. The full-note reader preserves the
complete original text and paragraph breaks in a read-only dialog.

Review Draft reuses this same retained-diagram preview and expanded viewer.
Each preview shows one diagram with the same navigation and zoom behavior;
it must not render the complete collection export as a tall thumbnail.
Browsing stays read-only, and Export Preview still includes the whole collection.

Apply feedback records actual browser submission and confirmed receipt events at
their observed times. While awaiting the backend, show Applying with the shared
loading indicator, prevent duplicate submission and keep the Apply view open.
The live checklist groups backend validation/update into one processing step;
the API does not stream intermediate stages. An interrupted or rejected response
does not establish rollback: Check Apply Status reads the original application
before another explicit submission. A confirmed receipt remains successful if
the subsequent summary refresh fails. Refresh the selected Delivery projection
after confirmation, including a package that has moved to Refinement. Retained
historical receipts do not fabricate detailed stage timestamps. Diagram retention
in saved Work Design is separate from uploading an ART attachment.

**Expand context note**, inside the note field’s upper-right corner, opens the
same current note in a large editor. Edits are
shared with the compact field; Done or Close returns without discarding them.
Save Session remains the explicit named checkpoint before finalization. A locked
or historical note opens read-only and retains the same character limit.

**Finalize Brief** uses the full brief review modal before confirmation, including
the current saved diagrams, complete note reader and pending finalization checks.
Opening or closing this review does not lock a version. Unsaved changes require
Save Session first. On reopening an earlier brief, review uses the newly saved
revision; the old finalized version and its snapshots remain immutable. After
confirmation the same modal shows the locked version and recorded checks.

Advisor edits bind to the selected diagram and its exact captured local draft.
The advisor receives the overall note, the selected view and an index of other
views; the index is not evidence of their contents. Selecting a different view
while a request is running prevents the old reply from changing the new view.
Question-only requests remain non-mutating. Final decisions stay explicit.

This batch is local source/preview work pending operator visual review and exact
backend/provider qualification; it is not a claim that live already runs it.

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
   Tree advice carries the selected item identity from the admitted context
   observations, alongside the same exact tree and source revision. The adapter
   continues to reject missing or invalid item identities before model dispatch.
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
9. Projection reads retain a 12-second deadline and canonical Apply retains
   180 seconds. The staged Context and Build Tree reasoning repair gives the
   provider 600 seconds, OOS 630 seconds, the Console server 690 seconds and
   the browser 720 seconds. Native server HTTP transport avoids an independent
   five-minute fetch header cutoff. This does not extend other advisors or
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

Context advice receives the selected
architectural view, its actual canvas and an index of other views. That index is
not treated as loaded diagram contents. Build Tree receives semantic multi-view
architecture, the finalized brief binding, actual draft tree and owner-defined
scaffold sections/field ownership. OOS supplies the corresponding Context or
Build Tree work guide. Architectural understanding, proposed work and missing
evidence remain distinct; a task checklist does not substitute for architecture.
CGG rejects shortened editable draft context before issuing a ready projection.
The existing source/session, transaction and explicit acceptance checks remain.

**Supporting diagrams** in the Context advisor let the operator
choose relevant other views explicitly as read-only knowledge. Only the active
view remains an editable board/name/description; supporting views cannot be
changed through their inclusion. Unselected views remain an index, not loaded
contents. Selection is request context, not a diagram edit or save. Current
source/scope fingerprints include supplied support so later changes invalidate
a stale proposal. The existing complete context budget refuses oversize input
without cutting a view. Read-only history navigation remains separate from edits.

The staged reasoning maintenance extends Work Design context to 64,000
characters and complete scope to 128,000, with a 32,000-token CGG budget. Other
advisor roles keep their existing bounds. Limits compose rather than promising
all maximum fields fit together; an oversized request is refused without
discarding architecture. Renderer-derived facts identify detail-displaying
cards, default CSS-pixel size and the initial visible area. The viewport sample
is explicitly historical, so panning or resizing alone does not invalidate an
otherwise matching draft proposal.

Both advisors show elapsed waiting and the ten-minute reasoning allowance.
**Stop waiting** aborts browser/server waiting, preserves the draft and original
unconfirmed conversation turn, and does not claim provider cancellation. Closing
the active surface stops waiting too. A timeout, reload or late reply cannot
apply stale edits or replay a provider request. Busy accounts and input-capacity
refusals remain distinct from offline connections. The Context and Build Tree
effort overrides are independently managed through existing Model Operations;
source defaults do not silently change unrelated routing.

Native Context and Build Tree requests use the shared complete-message
conversation validator: at most eight turns, each at most 12,000 characters.
The browser's bounded recent-message window and total context budgets still
apply. A supported retained message is forwarded intact; it is not reduced to
the shorter manual-prompt limit. Invalid conversation input requires reviewing
the supplied context and does not establish that the backend is offline.

The longer deadlines and work-guide changes remain pending paired activation
and detailed real-provider qualification. Isolated HTTP/browser tests verify
transport and editing behavior; they do not attest actual architecture quality.

Run:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/operation-runtime/work-design-live-adapter.test.mjs
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/operation-runtime/work-design-http-routes.test.mjs
npm run architecture:delivery
npm run check
```

## Advisor diagram tools

Ask for architecture in ordinary language. The selected diagram's current
renderer facts, resolved object sizes, supported operations and native template
example accompany the request. A template explains the editor; its generic
example labels are not project architecture or evidence. Questions produce no
edits. Other diagrams provide read-only context only when explicitly included.

Requested drafts can create and edit named trays, retain their actual member
identities, move a group, arrange selected objects and update existing connectors
without replacing their identities. Removing a frame preserves its cards;
deleting cards requires an explicit card-removal proposal. Removing a member
also updates group membership. Decorative frames and populated groups differ.
Sketch annotations remain human-authored. These operations affect the local
draft, never ART, source, runtime execution or final acceptance.

New text cards use the renderer's automatic height. An existing fixed height can
return to automatic sizing. A modest new diagram starts around the actual
visible center in board coordinates, accounting for zoom and scroll. Large
diagrams can extend and use the existing fit/navigation controls. An explicit
positioning request can retain authored coordinates. Established manual layouts
are preserved unless rearrangement was requested. Panning during reasoning does
not invalidate the architecture or grant permission to steal the operator's view.

This is coordinated maintenance with the existing native OOS/Platform reply
grammar. Historical completed replies retain compatibility. Owner validation,
preview application/rendering, exact-source Security acceptance and real-model
operating checks are distinct evidence; passing the schema alone does not prove
that an architecture diagram is useful.

When undo restores a legacy single canvas, a later manual diagram name or
explanation remains in its retained view document. The editor removes the
compatibility wrapper only if its original default metadata still applies.


Structured native advisor replies use a bounded 128,000-character compatibility
transport shared with OOS Work Design and ordinary draft advisors. This includes
both the human message and typed edits; it is not a larger message or per-field
allowance. Native messages stay limited to 12,000 characters. Selected-field,
read-only, unchanged-context and atomic tree/board validation still apply.
A reply that exceeds the aggregate bound is rejected without partial edits or
an automatic model retry. Finalized brief history remains unchanged by a tree
suggestion or its undo. This repair remains pending until composed activation.

The maintenance batch also contains the approved Refinement advisor repair:
current Catalog-backed choices, exact selected-set advice, typed related drafts,
canonical planning counterparts, review-needed AI values and pinned reviewed
source/packet identity. OOS and CGG use their separate owner maintenance units
`refinement-advisor-context-20261119`; this Console keeps the existing unit.
See [Refinement operations](refinement-catalog-live-integration.md) and the
[paired source review](https://github.com/mfshaf7/security-architecture/blob/main/docs/reviews/components/2026-11-19-refinement-advisor-context.md).
No publication or activation is implied by preview completion.
