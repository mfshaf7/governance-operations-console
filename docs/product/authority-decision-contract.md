# Authority Decision Contract

Status: accepted local-baseline architecture contract.

This contract replaces the proposed top-level Risk / Exception Operation
Workbench domain.

Architecture recommendation outcome:

- `replace` the generic Risk / Exception workspace
- `reuse` the authority that owns each control and canonical record
- `extend` the originating domain workflow with authority-aware request and
  receipt handling
- create no new decision service, canonical register, or console-owned
  business database

## Purpose

Some workflows encounter a control that the originating domain cannot approve,
waive, or reinterpret. The domain should still own the operator experience:
show the failed requirement, offer the normal repair, and identify the
authority that can make an exceptional decision when the control is explicitly
waivable.

The authority decision is returned as a structured receipt. The originating
workflow validates that receipt and decides whether its own action may
continue.

## Vocabulary

- `blocker`: a concrete condition preventing the next committed step; it stays
  with the affected domain or work item
- `risk`: uncertain or continuing exposure managed by its canonical risk owner
  and register
- `accepted risk`: an authority decision to retain known exposure under stated
  ownership and treatment
- `exception` or `waiver`: scoped and time-bounded permission to proceed
  despite a named control
- `workaround`: a bounded alternate path around a blocker; it remains part of
  the owning workflow
- `defer`: an owning-domain decision not to proceed now, with an explicit
  follow-up posture

Accepted risk and waiver are not synonyms. A risk can be accepted without
waiving a control, and a waiver can authorize a narrow deviation while risk
treatment remains active.

## Authority Map

| Concern | Canonical authority |
|---|---|
| Delivery work-item blocker | Delivery ART through the bounded OOS blocker workflow |
| Delivery ART or PI risk | Delivery ART `Risk` record with ROAM posture |
| Security finding, risk acceptance, or security waiver | Security Architecture |
| Workspace contract waiver | Workspace Governance |
| Platform runtime, release, or environment exception | Platform Engineering |
| Repository admission or custody repair | Repository owner or repository control plane |
| Domain-local validation, recovery, workaround, or defer | The originating domain |
| Technical execution failure, retry, or reconciliation | Orchestration through OOS |

WGCF may evaluate gates and project supplied decision references. It does not
accept risk, approve security posture, mutate Delivery ART, or become the
decision authority.

## Authority Decision Request

An authority decision request is prepared by the originating domain and
contains:

- stable request id
- requesting domain and subject reference
- subject version or source snapshot reference
- named authority and control reference
- decision kind: `waiver` or `accepted-risk`
- exact requested scope
- rationale
- evidence references
- requested owner
- requested review or expiry date
- rollback or containment reference when proceeding can create side effects

The request is not approval. Preparing it must not unlock the originating
workflow.

## Authority Decision Receipt

The deciding authority returns a receipt containing:

- stable decision id and request reference
- deciding authority and canonical source-record reference
- outcome: `approved`, `denied`, `revoked`, or `expired`
- decision kind
- approved scope and conditions
- accountable owner
- decision timestamp
- review date and expiry date when applicable
- evidence references
- risk treatment or compensating-control references when applicable
- rollback or containment reference when applicable

The originating domain must validate authority, subject, source version,
scope, outcome, and expiry before using the receipt. A stale, revoked, expired,
wrong-subject, or over-broad receipt does not authorize continuation.

## Workflow Rule

```text
originating domain detects failed requirement
  -> show normal repair in the originating domain
  -> determine whether the named authority permits an exceptional decision
  -> prepare an authority decision request when explicitly allowed
  -> authority records the canonical decision
  -> originating domain receives and validates the decision receipt
  -> originating domain continues or remains blocked
```

The operator should not leave the originating workflow merely to manage a
generic abnormal-state record. A request may link to the authority's primary
review surface, but status and the resulting receipt must return to the
originating domain.

## Lifecycle Transition Relationship

Lifecycle Transition Control may require an authority decision receipt before
authorization. It consumes that receipt and exposes its effect on the
transition. It does not own, duplicate, or reinterpret the decision.

## UI Rule

Each domain must:

- explain the failed requirement and normal repair
- show whether the control is waivable
- name the deciding authority
- expose request status and the resulting receipt when a request exists
- keep the domain action blocked until a valid receipt permits it

Do not add a generic Risk / Exception register, decision modal, or Operation
Workbench navigation entry.

## Persistence And Live Wiring

Before baseline approval, request and receipt scenarios remain structured
prototype fixtures or prototype-local simulation.

After baseline approval, each authority keeps its canonical storage and write
path. The console may compose read projections and dispatch admitted requests,
but it must not create a second durable source of truth.

## Future Overview Gate

A read-only governance review overview may be considered later only when real
cross-authority volume justifies centralized monitoring of pending decisions,
expiry, renewal, or overdue review.

Such an overview would aggregate and deep-link source-owned records. It would
not approve decisions, mutate canonical state, or become an Operation
Workbench domain by default.
