# Prototype Preview Runtime live integration

## Operator outcome

When configured, the existing Preview Runtime surface reads and operates the
Workspace Prototype Studio owner command. The Console no longer treats its
prototype-local simulation as runtime truth. It renders the exact Studio
profile, source revision, loopback state, proof, and digest-bound receipts.

This integration preserves the accepted Preview Runtime tabs, panels, command
log, profile guard, and stop guard. It changes the authority behind them; it is
post-baseline maintenance rather than a visual redesign.

## Authority and transport

Workspace Prototype Studio owns the profile, process lifecycle, safe
projection, proof, and receipts. The Console server invokes only the fixed
`scripts/prototype_preview.py` owner entrypoint with argument arrays and no
shell. The browser can request only `start`, `restart`, or `stop`, and can read
status or proof through same-origin routes. It cannot supply an executable,
owner path, state path, profile path, source revision, or environment value.

Configure the Console server with all three non-secret values:

- `GOVERNANCE_CONSOLE_PROTOTYPE_PREVIEW_OWNER_REPO_ROOT`: absolute path to the
  reviewed Workspace Prototype Studio checkout
- `GOVERNANCE_CONSOLE_PROTOTYPE_PREVIEW_SOURCE_REVISION`: exact 40-character
  reviewed Studio revision
- `GOVERNANCE_CONSOLE_PROTOTYPE_PREVIEW_STATE_ROOT`: absolute operator-private
  runtime-state root outside the Studio repository

Partial or contradictory configuration is invalid. Completely absent
configuration leaves the existing disconnected preview explicit and does not
invoke an owner command.

## Operator workflow

1. Open a Prototype and choose **Preview Runtime**.
2. Confirm the Profile tab says **Studio-owned** and shows the exact owner
   source revision. The owner profile is read-only in the Console.
3. Use **Start Preview**, **Restart Preview**, or the guarded **Stop Preview**
   action. Each mutation binds the currently displayed profile digest, source
   digest, source revision, runtime state, and instance identity. Studio
   rechecks that binding while holding the owner mutation lock.
4. Refresh proof only while the owner projection is running. The Console
   accepts proof only when it binds the same projection and latest receipt.
5. Review source-projected receipts in the existing command log.

If the owner state changes after review, the command returns
`prototype_preview_expected_state_stale`; refresh before retrying. Owner
timeout, malformed output, digest mismatch, wrong source revision, non-loopback
endpoint, public ingress, external network, mutable boundary, real data, false
receipt, or maturity overclaim fails closed without fixture fallback.

Studio also rejects a dirty checkout or served file outside reviewed Git
custody. The Console validates that the owner receipt contains the exact state
binding it submitted and that `before_state` still matches the reviewed state.

## Security and maturity boundary

The subprocess inherits only a bounded non-secret environment and runs the
exact configured Studio revision. Owner paths, state paths, process ids, and
private diagnostics never enter browser responses or runtime capability
projection.

This source integration does not grant Platform readiness, stage, production,
public or client exposure, or security acceptance. OOS must still enforce
`gate:preview-runtime-operating-acceptance` against the exact Studio and Console
revisions before accepting operating-ready evidence.

## Validation

Run:

```bash
python3 scripts/validate_repository.py
npm run check
npm audit --omit=dev
```

The operation-runtime suite covers exact command construction, stale-state
denial, output validation, receipt digest verification, proof binding,
configuration failure, bounded errors, and visible owner projection.
