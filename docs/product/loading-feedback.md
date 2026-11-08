# Console loading feedback

Status: operator-requested maintenance in the unpublished third UI batch;
visual review and batch publication remain separate.

Use the same Teras waiting treatment wherever an operator waits for requested
data or an asynchronous action. It follows the existing dark Console design:
three quiet amber bars, neutral skeleton rows, concise task text and no new
panel chrome or overlay that blocks unrelated work.

## Choose the state from the request

| Situation | Presentation |
| --- | --- |
| First read, no result yet | `TerasLoadingState` with skeleton rows or details; reserve space instead of showing an empty result. |
| Reading more detail or opening an editor | Local loading state in that component; keep navigation available. |
| Refresh or pagination with retained content | Keep rows, selection and drafts visible; use inline feedback or the active button's `busy` state. |
| Submitting, preparing or recovering a request | Explicit shell/header `busy` and a task label; preserve existing duplicate-submission, close and original-request guards. |
| Owner read or command fails | End loading, retain usable content as its existing stale/error state permits, and show the actual error and recovery control. |
| Awaiting approval, review or another actor | Existing workflow status and next action; this is not an in-flight browser read. |
| Confirmed empty result | The existing empty state, after the initial read settles. |

The indicator is indeterminate. Skeleton shapes are visual placeholders, not
record counts. Never invent a percentage, expected completion time or successful
result. After eight seconds of uninterrupted waiting, the mounted component says
“Still waiting for a response.” It does not retry, submit, cancel, time out or
change the owner's state. An existing request timeout can finish sooner.

The visible task label is announced through a polite status region; skeletons
and the decorative signal are hidden from assistive technology. Reduced-motion
preferences make the signal static and disable skeleton sweeps. Animation uses
only transform and opacity. There is no new network polling, fetch interceptor,
loading provider, event ledger or asynchronous authority in Teras.

## Adoption

| Surface | First reads and nested waiting components |
| --- | --- |
| Primary Console | Workspace Pulse metric/mood cards, Governance Activity, AI activity/history, priorities, account identity/details, resource samples and component observations. |
| Proposal | Register/details and proposal capture submission/error. |
| Repository | Register/details, request, custody, lifecycle, intake, owner setup and receipt history. |
| Model Operations | Purpose profiles/details, Models & routing, provider connections, registrations, profile requests/history and local runtime inspection. |
| Prototype | Register/details, Preview Runtime, Landing, baseline/candidate promotion, movement, closure and source authoring. |
| Delivery | Workspace opening, retained Work Design, owner histories, complete work tree, closeout readiness, catalog/linking, architecture packet, execution session, source realization, completion and reviewed tree changes. |
| Portfolio | Product register, publication product/source preparation and submission, listing changes. |
| Orchestration | Workspace opening, explicit refresh, run start/recovery and run control. |
| Lifecycle Transitions | Initial owner handoff read. |
| Workspace Registry | Inventory opening/refresh, source setup, intake/classification, promotion, lifecycle changes and original-request journal. |
| Dev Integration | Profile opening/refresh, profile runtime/handoff actions, profile requests and original-request history. |
| Governed Releases | Product opening/refresh, native request/recovery and original-operation history. |
| Shared tools | Saved-work hydration/save, source workspace/text reads, local file import, code-editor module loading, snapshot decode/error, advisors and Agent Console requests. |

Surfaces bind their own booleans and source modes. Do not infer loading from
technical labels, arbitrary text or all disabled controls: a disabled action
may require approval or source recovery rather than a wait. Cancellable requests
keep their existing Cancel control.

Workspace Pulse uses the shared decorative indicator inside its existing cards.
While any initial source read is pending, cards use compact loading text rather
than full coverage paragraphs. Known partial counts and blocker/status labels
remain visible; they do not end the pending presentation. Source coverage keeps
its partial ratio while saying "Reading sources…", including when one source
responds immediately. Source failures stay explicit even while other reads are
pending. Inspectors retain full explanations, and settled cards retain their
original wording. Indicators stop when their reads settle, including failure.
A failed prerequisite read must settle its status rather than wait for a
follow-up lookup that will never start.

## Local validation

`tests/browser/loading-feedback.spec.mjs` delays browser GETs against an isolated
preview. It walks all eleven workspaces at both supported desktop sizes and
checks visible feedback, completion/failure transitions, retained release rows,
reduced motion, long waits and absence of unintended writes. Transport fixtures
qualify presentation and never stand in for live owner operating evidence.

`tests/browser/workspace-pulse-loading.spec.mjs` checks pending, known partial
results, source failures and settled states at both desktop sizes. It also checks
reduced motion and compares every loaded card's description with the original
read model, so loading work cannot silently rewrite normal status explanations.

Retain the existing semantic, type, architecture and affected workflow browser
checks. New asynchronous components must adopt this same pattern when added.

Loading visibility alone is insufficient: the outer work surface and its content
must keep their accepted dimensions while the source changes. Model Operations
uses the existing filling single-region `TerasContentFrame` around its page
stack. `tests/browser/model-opening-layout.spec.mjs` samples every visible frame
during opening, delayed reads, ready/error results and page switches. Loading
placeholders must not determine the width of the surrounding workspace.

The same full-width frame surrounds the Prototype Dashboard, including retired
records with shorter historical content. `tests/support/filled-surface-layout.mjs`
samples fixed filling workspaces during the existing primary, workflow and
dashboard browser walkthroughs. It retains observations across page navigation.
Content-sized dialogs are intentionally excluded from that fill invariant.
