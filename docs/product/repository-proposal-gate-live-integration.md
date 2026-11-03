# Repository to Proposal gate resolution

Repository Control owns this operator step. In live mode it lists canonical
accepted Proposals needing repository custody, including the Proposal supplied
by the existing cross-workspace entry intent. The operator provisions a real
repository for the request if necessary, then reviews its successful retained result,
reviews its provider identity and receipt, and records resolution notes.

Open **Repository Control → Requests**. Select a requirement and choose
**Review request**, then choose **Create new** or **Already created**. Create
through the approved form, or verify and approve attachment of an already-created
repository. After success, review the associated repository, add **Confirmation
notes**, then choose **Confirm repository**. A selector appears only when several
matching results need review. Proposal Handoff and Console
attention open the same confirmation dialog at its exact request. Use
**Resolved history** to inspect completed requirements. **Repositories** retains
the shared summary/action, register and selected-record layout. Closing an
unrecorded confirmation draft requires an explicit discard decision.

The same-origin server supplies caller/operator attribution and a deterministic
resolution identity. OOS checks the exact source version and retained custody
receipt, updates canonical Proposal custody without rewriting Disposition, and
returns an immutable typed resolution. Refresh Proposal to continue Handoff.
Neither gate resolution nor provisioning performs Workspace Intake or admission.

Loading, offline, stale, empty, pending, error, recovery, and resolved states
must remain explicit. Live failures never use local packet or fixture fallback.
Browser reload reconstructs requests and outcomes from canonical owner reads.
An interrupted acknowledgement retains exact recovery inputs; retries cannot
silently bind a different source version or provider receipt.

This is post-baseline maintenance of the existing Repository Control surface,
using the existing Teras panels, fields, status semantics and buttons. The
empty-register branch must retain its dialog stack so first-time provisioning
works before any Repository record exists.

Landing Unit Decision: `child_isolated_landing_unit` for the Console owner,
review and rollback boundary; dependent on the OOS Repository-resolution
contract. This is acceptance-exposed maintenance under #1275 / #1298, not a
new ART child. Exact runtime consumers require refreshed Security acceptance
and Platform commissioning after the source batch lands. Source tests alone
are not operating evidence.

Validation: owner semantic tests and full checks, focused component/browser
proof for an empty register, pending request, successful resolution, reload,
interruption/retry, stale source and denied evidence. Final acceptance still
requires the real to-do application journey.


### Repository request navigation (2026-11-03)

Repository Control separates **Requests** from **Repositories**. Requests reads
canonical Proposal repository requirements, not provisioning receipt history.
Its attention count includes unresolved requirements and interrupted confirmation;
resolved requests remain inspectable in history and do not contribute to attention.
Loading, unavailable or stale source counts are unknown, never a successful zero.
Retained unavailable metadata is read-only. Exact attention/Handoff links open the
requested Proposal requirement; a missing target never silently selects another.
The existing reviewed OOS confirmation binds the exact Proposal version and verified
custody receipt. The Console does not auto-resolve requirements or change Disposition.


### Request fulfilment

Proposal decides whether to reuse existing work's repository or request a
repository for new work. The latter can be fulfilled in two reviewed ways:

- **Create new** opens the existing approved provisioning form, with the
  originating request filled automatically.
- **Already created** selects a known repository or accepts its GitHub root URL.
  A read-only OOS lookup resolves the immutable provider ID; the user never needs
  to find or type that ID. The operator confirms it was created for this request,
  reviews ownership, and approves the existing custody-link workflow. That
  workflow independently rereads provider identity and produces an attachment
  receipt; lookup metadata alone is not custody or request fulfilment.

Both paths bind the exact request through immutable `correlation.correlation_id`.
Standalone creation and unrelated receipts cannot directly confirm a request.
An explicit reviewed attachment records a new association and receipt; it does
not rewrite the original standalone or historical receipt. Provisioning
corrections keep `causation_id` for the failed creation and preserve their origin.

The form shows one method's fields at a time and preserves an attachment draft
when switching methods. After success, the verified repository is shown for
confirmation; a selector is needed only for multiple matching results. Final
Proposal confirmation remains explicit. Interrupted historical confirmation
keeps its exact original inputs and cannot silently select another repository.

OOS rejects fresh confirmation with an unbound or foreign receipt. The live
Proposal existing-owner selector uses current active Inventory with no fixture
fallback. Disconnected-preview fixtures retain their explicit scope.

Ingress inspection covers canonical Proposal API decisions and their adapter
origins, standalone creation, existing linkage, and Prototype/Delivery resolved
custody consumers. Only Proposal's decision currently feeds the live pending
requirement queue. Downstream custody consumption is not a separate creator.
