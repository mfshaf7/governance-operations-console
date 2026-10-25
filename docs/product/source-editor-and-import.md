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
