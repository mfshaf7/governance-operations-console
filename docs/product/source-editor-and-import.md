# Source editor and import

Status: source implementation for Epic 1323; combined Security acceptance and
operating commissioning remain separate from source merge.

The operator can edit text in the Console or import files edited in VS Code.
Prototype app/design and ordinary Delivery use the same source workspace.
Saving retains a private OOS draft. Acceptance of the saved digest and Gary
source delivery remain explicit, separate actions. Optional model generation
uses the configured task model and effort; manual authoring needs no model.

## Surface and ownership

This is post-baseline implementation within the existing Console design
profile. The source workspace uses the existing full-viewport Teras modal,
panels, lists, fields, actions and unsaved-close guard. Teras adds a neutral,
lazy-mounted CodeMirror text/diff field with keyboard search, selection and
undo. It owns no workflow, source authority or domain read model.

`console-integration/source-authoring` owns the shared bounded text contract,
import preparation, local editor controller and same-origin workspace view.
Domain adapters select the actual retained Prototype request or Delivery work
session and validate its owner responses. OOS remains the private draft,
revision, provenance, source-execution and acknowledgement authority. The
browser cannot choose credentials, repository coordinates, caller identity,
owner policy or evidence. Preview and Delivery owner preparations remain
inspect-only.

The workspace shows the source tree, selected file, original text/diff, local
dirty state, retained draft revision/digest and operator/model provenance.
Opening files does not send their bytes to Agent context or a model. Unsaved
buffers live only in component memory, with a browser-unload and close guard.
Save, failed save and uncertain acknowledgement preserve those buffers. Retry
uses the original immutable command; a stale acknowledgement cannot replace a
newer draft. Cold reload restores the original owner-retained objective and
checks its digest, so an amendment needs no reconstructed or retyped objective.
Reload/discard is explicit. Applying, uncertain apply and completed
source are read-only and use the existing recovery/delivery controls.

## Operator procedure

1. Select the actual source request or Delivery work session and prepare its
   scoped source worktree through the existing controls.
2. Choose **Edit or import source**. Select a readable text file, add a path,
   or choose files/a folder from the computer. Specify the target folder when
   importing. Folder import removes the selected outer folder before mapping.
3. Review each mapped path and the visible import exclusions. Import only the
   selected supported files. Missing files never become deletions. Delete is
   an explicit action on an existing file and can be undone before save.
4. Review the diff and commit message, then **Save private draft**. Save does
   not invoke a model, commit source, publish a PR or grant acceptance.
5. Review the saved text/diff and choose **Mark saved digest inspected**.
   Close the editor and use the
   domain's separate exact-digest acceptance and Gary delivery controls.
6. If a save response is uncertain, retry that original save before making a
   different one. A conflict requires current owner readback and explicit
   reconciliation; it never discards local edits automatically.

## Supported input

Use regular UTF-8 text, preserving the BOM and line endings. Source reads are
bounded to 48 files / 256 KiB, with 64 KiB per file and a 5,000-path tree.
Drafts allow at most 64 operations / 512 KiB changed text. The real executor's
serialized apply envelope must also fit 1 MiB. Unsafe paths, credentials,
dependency/build folders, binary/invalid text, oversized inputs and unreadable
source are reported and excluded or rejected. No archive extraction, arbitrary
directory mount, execution of uploaded source or browser persistence exists.
These bounds do not qualify private client data or arbitrary project formats.

## Validation

Paired semantic/API tests cover domain binding, exact revisions/digests,
acknowledgement replay, raw-byte preservation, exclusions and non-destructive
import. A real Git fixture proves before/after source causality. Browser proof
covers both domains, keyboard editing, import, conflicts, close guards and
read-only states. Final commissioning additionally uses a real LittleList
source change through the Console and the normal Gary review/merge lifecycle.

## Source assistant maintenance preview

The editor now groups **Files**, **Editor/diff** and **AI assistant** in the
same workspace. File selection, imports, private saving and exact saved-draft
review retain their existing owner APIs. The fixed footer keeps saving separate
from assistant proposals. Access setup and source delivery stay in the calling
Prototype/Delivery workflow, rather than occupying the code editor.

Choose the files the assistant may see. Opening a file sends no model request;
**Ask / explain** sends the selected current text for an answer, while
**Propose edits** permits a reviewable proposal. Context includes selected
unsaved buffers and bounded conversation, labelled as operator input. Existing files must be selected before the assistant can replace their contents.
The assistant can also propose new files inside the approved source scope; the
owner proves their absence before presenting the proposal. Existing
source budgets and owner path exclusions remain visible constraints.

Review each proposed file in the diff before **Apply to draft** or
**Reject proposal**. Applying edits changes local buffers only. Later edits to selected files,
saves or changed owner revisions block stale proposals. Unrelated edits and a
changed commit summary are preserved without invalidating the proposal. Follow-up revision uses
an unapplied proposal only while that original local snapshot is unchanged.
Undo refuses to overwrite later work. Saved drafts retain operator review;
model/context evidence remains with the owner assistance request and does not
attest subsequently edited bytes.

The assistant uses the actual workflow's source permission profile and the
configured source-generation model/effort unless an explicit assistance route
is selected in Model Operations. It has no tools, source acceptance, execution,
publication or approval authority. Owner/CGG/provider failures retain local
buffers; original retries preserve request identity. **Stop waiting** stops the
browser wait and does not claim cancellation of provider execution.

This approved extension remains an unpublished maintenance preview. An explicit
local UI review sample uses simulated files/replies and cannot qualify the live
model path. Normal live assistance still requires the coordinated owner and
Platform changes, fresh exact-source Security acceptance and commissioning.

### Source explorer refinement

The shared source workspace shows expandable folders and compact file rows for
all paths returned within the existing owner scope. Search reveals matching
ancestor folders; it does not silently stop after 100 files. Partial owner trees
remain explicitly labelled and cannot prove new paths absent. Folder navigation
supports arrow keys, Home and End; file checkboxes select explicit AI context.

**New file** and **New folder** start in the selected folder. Folder creation
adds a visible empty `.gitkeep` file through the normal local buffer and private
draft save path, because Git does not retain empty directories. The form explains
this before creation. Existing files/folders, unsafe/out-of-scope paths and a
file used as an ancestor are rejected. Creation does not publish source.

The Files and assistant columns have bounded desktop widths so the editor uses
the remaining space. **Hide AI assistant** expands the editor without losing
the conversation or unsent prompt. The standard compact layout remains in use
at smaller viewports. This refinement remains unpublished for operator review.

### Source workspace grouping preview

Reuse the existing inner content trays to separate file browsing, import tools
and private-draft details. The editor has a full-width framed toolbar: view
selection and file actions remain distinct groups. The AI panel frames its
conversation area, included-file disclosure and request composer; proposal
decisions remain separate from sending another request. Preserve the current
three main panels, independent scroll areas and fixed save footer. Grouping
changes no source, save, AI or publication authority and remain in preview.

### Application preview in the editor

For a connected UI project, the centre panel offers **Preview** and **Split view**
alongside Edit text and Review diff. Split view places code beside the app when
space permits and stacks them at compact widths. Hide AI assistant for more
space. Switching these views retains the mounted editor, cursor and undo history.

The app is the existing Studio Preview Runtime, not execution of editor buffers.
Its source revision and app digest are available in Preview source details.
Unapplied source operations show a draft notice even after private saving.
**Refresh preview** reads status and reloads the app; it does not save, apply,
build, restart or publish source. **Open in browser** opens the confirmed
running loopback endpoint in a separate tab.

Prototype source sessions select their exact prototype's existing runtime.
Delivery source sessions currently expose no preview binding; they retain
Edit/Diff until an authoritative binding exists. The shared view never infers
a running app from repository files or invents a Delivery runtime. The current
Studio runtime serves static UI projects; framework compilation is not added
by this view.

Embedding is an explicit reviewed profile choice. In the existing Preview
profile source-preparation form, **Embedded editor preview → Allow this
Console** includes the current Console's exact loopback origin in the owner
plan. Browser-only is the default. Review, source delivery and runtime
activation remain separate normal steps; this choice does not start an app.
A running profile without this origin permits Open in browser, while explaining
why embedded viewing is unavailable.

Preview reads are lazy, bounded, aborted on departure and polled only while
visible. Loading and slow-frame states retain source buffers. Owner failures,
wrong project/version responses, stopped runtimes and stale runtimes remove
the embedded app and explain the required existing recovery path. Iframe load
completion is a browser event, not proof of project business health.
The app remains on its own loopback origin, with sandbox, referrer and browser
permission restrictions; the Console does not proxy app contents or expose
its credentials. The native profile remains default-deny for framing unless
its exact ancestor allowlist was opted in.

This extension is unpublished review source. The isolated task-list review
page exercises the actual Studio static runtime, with simulated source/AI
actions. It does not prove real Delivery runtime wiring, private draft
application, Security acceptance or live commissioning.
