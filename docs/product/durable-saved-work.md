# Durable saved work and browser recovery

Operator-approved maintenance extends Work Design, Refinement and Orchestration
draft persistence while preserving their existing interfaces. Runtime qualification
requires exact paired source acceptance and normal Platform commissioning.

The primary operator procedure is
[OOS saved operator work](https://github.com/mfshaf7/operator-orchestration-service/blob/main/docs/operations/saved-operator-work.md).

## Product behavior

The original editors load their operator-bound server draft before local autosave
starts. The existing browser persistence adapter supplies the validated working
copy to each workflow. A shared coordinator coalesces saves and displays pending,
saving, acknowledged, failed, or conflicting state in existing Teras footer chrome.
Only a verified exact owner acknowledgement means **Saved to server**. Explicit
disconnected preview remains browser-only; owner failures never select it.

Work Design saves the current context board and note, named sessions, tree draft,
and finalized brief versions including diagram data. Refinement saves draft
metadata and progress; existing source/packet-revision guards still determine
whether values can be used. Orchestration saves inert definition input; saving
does not record qualification, request implementation or activate a definition.

Before normalization or replacement, legacy browser records are preserved under
their original key and separately by OOS in live editable mode. The originals
remain available through **Preserved browser records**. Supported records can be
restored as drafts; unsupported or malformed records can be downloaded for repair.
Restoration cannot remove newer finalized brief versions. Import time and current
operator identity do not attest original authorship or approval.

Different unacknowledged browser/server content requires an explicit choice.
Failed/uncertain saves retain local edits and retry the same save identity.
History uses the existing Work Design screen read-only, including server-backed
briefs and diagrams; restoration is disabled there and reads do not replay apply.
The canonical handoff receipt links to this screen while remaining separate proof.
Historical originals awaiting migration are explicitly labelled browser-only or
unavailable; opening read-only history never starts a background server save.

## Boundaries and validation

The same-origin BFF reuses current session authorization, source-envelope
verification and server-only OOS credentials. Operator input cannot supply its own
identity or owner configuration. Save requests are bounded and cross-site writes
denied. The backend uses the existing private OOS volume; no Console business
database or daemon is added. Formal WGCF artifact/readiness and canonical ART
decisions retain their existing boundaries.

Source tests cover hydration before autosave, exact fresh-profile recovery,
lost acknowledgements, unavailable owners, raw old keys, conflict choice and
readonly behavior. Exact-source runtime proof must additionally recover real
original diagrams, named sessions and final versions from an empty browser and
after service recovery. Missing historical originals stay missing; a new draft or
receipt cannot be presented as their recovery.

The recorded design changes the previous local-only persistence boundary in
[Delivery's domain contract](domain-contracts/delivery.md). It preserves the
accepted design profile and existing editor/controller ownership. Installation
packaging and whole-product off-machine disaster recovery remain separate work.
