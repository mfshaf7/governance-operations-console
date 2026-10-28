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

An existing saved local session is read without modifying it, preserving its
canvas, brief and tree when available. Without a saved draft, the existing owner
GET supplies current ART design branches to the normal Work Design editor.
Work Design supports Epic, Feature, User story and Risk branches; the complete
ART tree, including other record types, remains in Execution. Current source
context is distinguished from an original finalized board that was not retained.
No starter branches or invented historical decisions substitute for absent
records. Refinement uses its current owner packet and matching saved session,
with original receipts retaining their own evidence identity.

Use the existing History and detail actions to inspect receipts. Execution's
**Original Owner Evidence** opens native Intake consumption, Work Design
applications, Refinement runs and closeout outcomes. IDs, actors, times, digests
and evidence references remain original. Unavailable owner reads stay explicit;
refresh never replays work. Current package posture does not prove every stage
ran. Catalog remains the independent live metadata register.

This owner maintenance removes the separate inspection interface introduced in
PR142. It extends lock properties and handlers in existing components and adds
no workflow engine, snapshot store, ART scope or backend mutation authority.
Rollback reverts this Console correction and its exact composed source
acceptance through the existing commissioning procedure.
