# Inspecting completed Delivery work

Open **Delivery → History**, then choose a package in the normal Work Design,
Refinement or Execution interface. History includes all retained packages;
badges describe their current ART posture, not proof that each stage ran.

Work Design and Refinement retain their package register, filters, selected
details, workflow hub and section navigation. Execution retains its Control
Board, Family Map, full ART tree and package details. Expand the tree to read
the complete retained hierarchy and descriptions. These inspection paths are
read-only, including when the selected package is still active.

Work Design's Context Session, Build Tree, Review Draft, Apply Draft and History
remain individually inspectable. The original history owner retained
application receipts and accepted-draft digests, not the original canvas,
finalized brief body or accepted draft tree. Missing snapshots are stated
explicitly. The complete current canonical ART tree is labelled as current;
it is not represented as the earlier accepted draft. Browser-local drafts and
starter content are never substituted for historical records.

Refinement's Metadata Workbench, Readiness Review and Apply Refinement inspect
the current owner packet with its source revision, field values, item-scoped
values, gates, targets and routes. The packet is labelled as current, separately
from original run history and receipts. It does not claim to reproduce past
operator decisions. An unavailable current packet does not hide original
history, and an unavailable history owner does not erase the ART tree.

Use **View History** in a hub or **Original Owner Evidence** in Execution to
inspect native Intake consumption, Work Design applications, Refinement runs
and closeout receipts. Each retains its original identity, actor, time,
digest and evidence references. **Refresh owner history** retries the read;
it does not replay work. Owner failures, absent records and bounded coverage
remain explicit and independent.

History never mounts authoring, advisor, apply, work-start or architecture
preparation controllers. Switch to **Current** to perform active work using
the existing owner-authorized workflows. Catalog remains the independent live
metadata register; the package-history selector does not archive Catalog.

Completed inventory rows are summaries. The full tree comes from the existing
package-specific owner GET only when inspecting Build Tree or selecting an
Execution package. Its package, root and child references must match before
display. Owner failure stays explicit; a summary row never becomes an empty
historical hierarchy. No global tree scan or per-package background preparation
is introduced.

This maintenance extends existing Console readers and UI products. It adds no
ART item, backend mutation route, historical snapshot store or completion
authority. Its rollback is the Console source revert and corresponding exact
source acceptance through the existing commissioning procedure.
