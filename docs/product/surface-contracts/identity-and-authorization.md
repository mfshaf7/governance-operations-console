# Operator Account, Identity, And Authorization

Status: accepted local-baseline cross-surface contract.

## Purpose

The Console needs one stable account surface where an operator can:

- manage Console-local profile preferences
- inspect current roles and named authority
- find the correct access-request route
- inspect authentication and session posture
- reach account, sign-in, and session commands when their owning adapters exist

The surface does not become an identity provider or authorization engine. A
visible name, role, synthetic fixture, browser state, or local preference never
grants authority.

## Ownership

Console Shell owns:

- the typed account snapshot consumed by Console presentation
- fail-closed projection of identity trust and freshness
- the always-visible compact `Operator Account` card
- the `Operator Account` center and its Profile, Access, and
  Security & Sessions views
- page-lifetime profile preferences while live identity wiring is unavailable
- dirty-state and discard protection for unsaved profile changes
- explicit capability posture for commands whose adapters do not exist

The future federated identity and platform access plane owns:

- authentication and account switching
- session issuance, expiry, refresh, revocation, and sign-out
- group-to-role and named-authority mapping
- access-request admission and approval
- authorization decisions and enforcement
- identity-provider and policy evidence

Security Architecture owns the trust-boundary and review posture. Domain
systems continue to own their business approvals and action eligibility.

## Read Models

The Console consumes two versioned structures:

### `console-operator-identity/v1`

- principal reference, display name, and actor kind
- environment, roles, and named-authority labels
- session mode, authentication state, reference, and source-issued times
- source authority, mode, freshness, observed time, and reference

Source modes are `live`, `source-projected`, `synthetic`, and `unavailable`.
Freshness is independent and uses `current`, `stale`, `unverified`, or
`unavailable`.

### `console-operator-account/v1`

- the immutable identity snapshot
- editable Console presentation preferences:
  - display name
  - IANA time zone
  - locale
  - 12-hour or 24-hour clock format
- capability posture and owner for:
  - profile update
  - access request
  - authentication management
  - account switching
  - sign-out
  - session revocation

Profile preferences and identity claims are separate. Editing the visible
display name or clock format does not mutate principal, role, authority, or
session truth.

## Trust Projection

The current source is structured synthetic data. It displays
`PROTOTYPE LOCAL` and `Not authenticated`; it is never trusted for live
authorization.

A projection is verified only when all of these source-issued facts exist:

- source mode is `live`
- freshness is `current`
- authentication state is `authenticated`
- principal, source, and session references are present
- authenticated, expiry, and observed timestamps are valid

Synthetic, source-projected, stale, expired, incomplete, or unavailable input
fails closed. Client time may format source values but cannot issue or repair
session truth.

## Operator Surfaces

### Command Card

The command bar keeps one compact pale `Operator Account` card with:

- profile display name
- bounded role and named-authority summary
- environment
- explicit source posture
- one whole-card route into the account center

The layout must remain visible beside the fixed Console navigation and Agent
Runtime docks. It must not fabricate a login timestamp.

### Account Center

The account center uses the shared Console dialog, tabs, fields, panels,
checklists, metadata, tags, buttons, and two-zone layout. It does not adopt
Teras styling.

`Profile` provides:

- editable display name
- time zone, locale, and time-format selectors
- save and reset actions
- clear local-only scope
- close protection while a draft is dirty

Saved profile changes are real page-lifetime prototype state. They immediately
update the card and command clock. They are not durable account changes.

`Access` provides:

- current environment and enforcement posture
- current roles and named authority
- access-request capability and owner
- a small route to source identity details

The access-request button remains unavailable until an admitted owner workflow
and adapter exist. The Console must not invent role options or claim a request
was submitted.

`Security & Sessions` provides:

- authentication state and adapter posture
- current session mode, reference, authentication time, and expiry
- positions for manage-authentication, switch-account, sign-out, and
  revoke-session commands

Those commands remain disabled while their adapters are unavailable. The
surface must not simulate authentication success, sign-out, MFA, account
switching, or session revocation.

### Identity Details

Source references and schema facts live in a small separate info dialog. They
do not dominate the account center and the dialog has no footer action.

## Command Boundary

| Command | Current behavior | Live owner |
| --- | --- | --- |
| Save profile | Page-lifetime prototype-local update | Future Console profile adapter |
| Reset profile draft | Local draft reset | Console Shell |
| Request access | Unavailable | Federated identity and platform access |
| Manage authentication | Unavailable | Federated identity provider |
| Switch account | Unavailable | Federated identity provider |
| Sign out | Unavailable | Federated session owner |
| Revoke session | Unavailable | Federated session owner |

The Console owns no identity database, credential store, token cache, browser
authorization authority, or alternate authentication service.

## Post-Baseline Wiring

Live Integration and Deployment replaces synthetic account and identity sources through server-side
adapters while preserving the account and identity boundaries. The browser
receives display-safe posture and references only; it does not receive raw
tokens, credentials, secret claims, or policy internals.

Live Integration and Deployment must define:

- federated identity provider and platform owner
- server session and profile-preference contracts
- group-to-role and named-authority mapping
- access-request workflow and approval authority
- expiry, refresh, revocation, stale, and unavailable behavior
- server-side authorization checks for every mutable command family
- actor, session, correlation, and approval identity in receipts and audit
- security delta review and operating evidence

## Validation

Focused proof must cover:

- synthetic identity never becomes trusted
- complete live/current source evidence can project verified posture
- stale, expired, incomplete, and unavailable evidence fail closed
- profile normalization rejects invalid display names
- local profile save updates the card and clock
- unsaved profile changes trigger a discard guard
- unavailable access and security commands cannot report success
- the account card does not overlap the right dock at supported viewports
- account and nested info dialogs use full-screen backdrop, focus containment,
  focus restoration, and background scroll containment

Security references:

- `security-architecture/docs/architecture/domains/identity-and-access.md`
- `security-architecture/docs/standards/identity-and-access.md`
- `security-architecture/docs/adr/0001-federated-human-access.md`
