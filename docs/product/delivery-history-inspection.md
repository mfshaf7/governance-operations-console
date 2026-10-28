# Inspecting completed Delivery work

Open **Delivery → History**, choose a retained package, then open its normal
Design Hub, Refinement Hub or Execution view.

History uses exactly the same workflow components and layout as active work.
Work Design retains its hub, full Context Board canvas, inline/structured Build
Tree editor, selected-item fields, Review Draft, Apply Draft, History and detail
dialogs. Refinement retains its hub, Metadata Workbench, field selection and
editor, advisor panel, Readiness Review, Apply Refinement and receipt views.
Execution retains its Control Board, Family Map, ART tree and selected details.
There is no separate historical inspection interface.

Completed and retired packages are locked. History also locks browsing of an
active package. Editing, diagram changes, AI requests, finalization, review
acceptance, apply and progression actions are disabled in the original controls.
Handlers enforce the same lock. Navigation, selection, expansion, tree modes,
detail inspection and evidence export remain available. Browsing does not
autosave local sessions, rewrite metadata decisions or capture new snapshots.

Opening a hub, review plan, finalized-brief inspection or History is navigation;
it does not accept a review or run Apply. The original snapshot viewer supports
zoom, fit, scrolling and fullscreen without modifying an artifact or saved session.

History content keeps its natural panel height. Full-height scroll dialogs honor
their declared scroll body on desktop, and the same history content scrolls inside
bounded Work Design and Refinement panels. Mouse wheel and keyboard scrolling must
reach the actual events and page controls; a programmatically clickable control
does not prove that clipped evidence is usable.

An existing saved local session is read without modifying it, preserving its
canvas, brief and tree when available. Without a saved draft, the existing owner
GET supplies current ART design branches to the normal Work Design editor.
Work Design supports Epic, Feature, User story and Risk branches; the complete
ART tree, including other record types, remains in Execution. Current source
context is distinguished from an original finalized board that was not retained.
No starter branches or invented historical decisions substitute for absent
records. Refinement uses its current owner packet and matching saved session,
with original receipts retaining their own evidence identity.

The selected finalized version, rather than a newer autosave, supplies the locked
canvas and Review Draft preview. Its board, decision, note, references and time
stay bound to that version when current package metadata changes. New local
finalizations retain the complete brief view and core-card labels in the existing
version record. Older versions disclose missing text/checks/core labels; current
metadata does not fill those historical fields. A rendered retained-board preview
is not an original PNG upload. If no board exists, Review Draft shows absence,
not a generated starter thumbnail. Every brief entry uses the same availability.

Refinement retains its normal hub, steps and History when no current authoring
packet can be built. Packet-dependent sections explain missing data; History
still reads original runs, receipts and item activity. Inspection never prepares
a new handoff or replays work.

Use the existing History and detail actions to inspect receipts. Execution's
**Original Owner Evidence** opens native Intake consumption, Work Design
applications, Refinement runs and closeout outcomes. IDs, actors, times, digests
and evidence references remain original. Unavailable owner reads stay explicit;
refresh never replays work. Current package posture does not prove every stage
ran. Catalog remains the independent live metadata register.

Work Design, Refinement and Execution history share the exact-item owner read.
Trails combine actual OpenProject creation/edits/comments with original workflow
receipts. Item activity has previous/next page controls and explicit totals and
coverage; receipt excerpts keep their own bounds. A legacy item may have backend
activity but no Console stage receipts. Partial owner evidence stays visible,
with observation time and refresh. Execution's loaded-history summary does not
claim to be a complete global log. Home retains declared Intake-activity coverage
without scanning every archive. Catalog remains independently live metadata.

This owner maintenance removes the separate inspection interface introduced in
PR142. It extends lock properties and handlers in existing components and adds
no workflow engine, snapshot store, ART scope or backend mutation authority.
Rollback reverts this Console correction and its exact composed source
acceptance through the existing commissioning procedure.
