# Repository to Proposal gate resolution

Repository Control owns this operator step. In live mode it lists canonical
accepted Proposals needing repository custody, including the Proposal supplied
by the existing cross-workspace entry intent. The operator provisions a real
repository if necessary, then selects a successful retained custody request,
reviews its provider identity and receipt, and records resolution notes.

Open **Proposal Gates** from the existing Repository action panel. Proposal's
repository-gate navigation opens the same focused gate dialog at its exact
request. The main Repository view retains the shared summary/action, register
and selected-record layout; it does not add a third overview panel. Closing an
unrecorded gate draft requires an explicit discard decision.

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
