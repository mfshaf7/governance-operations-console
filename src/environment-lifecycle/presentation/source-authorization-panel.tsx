"use client";
import { TerasActionButton, TerasActionRow, TerasFieldStack, TerasMetadataList, TerasPanel, TerasPanelHeader, TerasTechnicalDetails, TerasLoadingState, TerasContentTray } from "@/teras";
import type { SourceAuthorizationSelector } from "../live-runtime/source-authorization-contract.ts";
import { useSourceAuthorization, type ActiveSourceSession } from "../live-runtime/use-source-authorization.ts";
import { useEffect } from "react";

export function SourceAuthorizationPanel({ subject, sourceStartDigest, decision = null, onIntentChange, onRecoverDecision, boundIntentRef = null, activeSession = null, preparationAllowed = true, onContinueApprovedScope, continuePending = false, closureSessionId = null, onAccessClosed }: {
  subject: SourceAuthorizationSelector; sourceStartDigest: string | null; decision?: Record<string, unknown> | null; onIntentChange: (intentId: string | null) => void;
  onRecoverDecision?: (decision: Record<string, unknown>) => void;
  boundIntentRef?: string | null;
  activeSession?: ActiveSourceSession | null;
  preparationAllowed?: boolean;
  onContinueApprovedScope?: (intentId: string) => Promise<unknown>;
  continuePending?: boolean;
  closureSessionId?: string | null;
  onAccessClosed?: () => void;
}) {
  const runtime = useSourceAuthorization(subject, sourceStartDigest, decision, boundIntentRef, activeSession, closureSessionId), preparation = runtime.preparation, scope = preparation?.source_intent;
  useEffect(() => { onIntentChange(runtime.approvedIntent); }, [runtime.approvedIntent, onIntentChange]);
  const canPrepare = !closureSessionId && preparationAllowed && runtime.ready && (!preparation || preparation.authorization.state === "revoked");
  const state = preparation?.authorization.state;
  useEffect(() => { if (closureSessionId && state === "revoked") onAccessClosed?.(); }, [closureSessionId, state, onAccessClosed]);
  const states: Record<string, string> = { prepared: "Ready for approval", revoked: "Access closed", "revocation-requested": "Closing access", expired: "Access expired" };
  const status = runtime.error ? "Unavailable" : !runtime.ready ? "Loading" : state === "approved" ? preparation?.authorization.credential_receipt ? "Access active" : "Approval recorded" : states[state ?? ""] ?? "Not prepared";
  const waiting = continuePending ? "Continuing with approved access…" : runtime.pendingAction === "prepare" ? "Preparing access for review…" : runtime.pendingAction === "issue" ? "Approving repository access…" : runtime.pendingAction === "revoke" ? "Ending repository access…" : "Checking repository access…";
  return <TerasPanel spacing="normal" frame="padded" treatment="state" tone={runtime.error ? "danger" : "info"}>
    <TerasPanelHeader busy={runtime.pending || continuePending} busyLabel={waiting} kicker="Permissions" title={closureSessionId ? "Confirm repository access ended" : runtime.previousAccess ? "Previous repository access" : subject.kind === "repository-bootstrap" ? "Review setup access" : "Repository access"} description={closureSessionId ? "Check that the Console’s permission to use this repository has ended." : runtime.previousAccess
      ? state === "revoked" ? "The previous access is closed. Prepare and approve replacement access for the current session." : "Close the previous access before preparing replacement access for the current session."
      : "Review which repository and branch the Console can use for this work, and when that permission expires."} statusLabel={status} />
    <TerasFieldStack spacing="normal">
      {runtime.error ? <TerasContentTray role="alert" kicker={runtime.needsRefresh ? "Outcome not confirmed" : "Unable to load repository access"}
        description={runtime.needsRefresh ? "Check the original request to see whether it completed." : "Try loading the repository access status again."}
        actions={<TerasActionButton disabled={runtime.pending} emphasis="secondary" onClick={() => void runtime.refresh()}>
          {runtime.needsRefresh ? "Check original access request" : "Retry loading access"}
        </TerasActionButton>}>
        <TerasTechnicalDetails items={[{ label: "Access response", value: runtime.error }]} />
      </TerasContentTray> : null}
      {runtime.pending && !scope ? <TerasLoadingState label={waiting} skeleton="details" /> : null}
      {scope ? <TerasMetadataList items={[
        { label: "Repository", value: scope.repository }, { label: "Branch", value: scope.branch },
        { label: "Purpose", value: scope.purpose === "trusted-owner-bootstrap" ? "Repository setup files only" : "Work on the reviewed changes" },
        ...(scope.subject.kind === "repository-bootstrap" ? [
          { label: "Allowed files", value: scope.subject.allowed_paths.join(", ") },
          { label: "Workflow permission", value: scope.subject.workflow_write ? "Separately approved workflow write" : "Not requested" },
        ] : []),
        { label: "Reviewer", value: scope.human_reviewer_id }, { label: "Access expires", value: new Date(scope.expires_at).toLocaleString() },
        { label: "Access status", value: status },
      ]} /> : null}
      {scope ? <TerasTechnicalDetails items={[
        { label: "Fetched base", value: scope.fetched_base },
        { label: "Provider repository / installation", value: `${scope.repository_id} / ${scope.installation_id}` },
        { label: "Subject / accountable operator", value: `${scope.subject.kind === "prototype" ? scope.subject.prototype_id : scope.subject.kind === "repository-bootstrap" ? scope.subject.owner_repo : scope.subject.work_item_ref} / ${scope.operator_id}` },
        ...(scope.subject.kind === "repository-bootstrap" ? [{ label: "Trusted plan / template", value: `${scope.subject.plan_digest} / ${scope.subject.template_digest}` }] : []),
        { label: "Source-start binding", value: scope.source_start_digest },
        { label: "Landing Unit", value: scope.landing_unit_id },
        { label: "Expiry", value: scope.expires_at }, { label: "Exact scope digest", value: preparation.source_intent_digest },
        { label: "Credential receipt", value: preparation.authorization.credential_receipt?.receipt_digest ?? "Not confirmed" },
        { label: "Original service operation", value: runtime.operation ? `${runtime.operation.operation_id} / ${runtime.operation.state}` : "Not dispatched" },
        ...(runtime.operation ? [{ label: "Recorded next action", value: `${runtime.operation.next_action.authority} / ${runtime.operation.next_action.code}` }] : []),
        ...(runtime.operation?.provider_operation.failure ? [{ label: "Service failure", value: runtime.operation.provider_operation.failure.code }] : []),
        ...(runtime.operation?.provider_operation.failure?.retry_after ? [{ label: "Retry no earlier than", value: runtime.operation.provider_operation.failure.retry_after }] : []),
      ]} /> : null}
      <TerasActionRow>
        {runtime.candidates.filter(value => value.intent_id !== preparation?.intent_id && (value.start_decision === null || onRecoverDecision)).map(value => <TerasActionButton key={value.intent_id} disabled={runtime.pending} emphasis="secondary" onClick={() => { if (value.start_decision && onRecoverDecision) onRecoverDecision(value.start_decision); runtime.select(value); }}>Open access request · {new Date(value.created_at).toLocaleString()}</TerasActionButton>)}
        {canPrepare ? <TerasActionButton busy={runtime.pendingAction === "prepare"} disabled={runtime.pending} onClick={() => void runtime.prepare()}>{preparation ? "Show replacement access request" : "Show access request"}</TerasActionButton> : null}
        {!closureSessionId && !runtime.previousAccess && preparation?.authorization.state === "prepared" ? <TerasActionButton busy={runtime.pendingAction === "issue"} disabled={runtime.pending} onClick={() => void runtime.command("issue")}>Approve repository access</TerasActionButton> : null}
        {!closureSessionId && !runtime.previousAccess && preparation?.authorization.state === "approved" && !preparation.authorization.credential_receipt ? <TerasActionButton busy={runtime.pendingAction === "issue"} disabled={runtime.pending || Boolean(runtime.operation?.provider_operation.failure?.retry_after && Date.parse(runtime.operation.provider_operation.failure.retry_after) > Date.now())} onClick={() => void runtime.command("issue")}>Check access activation</TerasActionButton> : null}
        {runtime.approvedIntent && onContinueApprovedScope ? <TerasActionButton disabled={runtime.pending || continuePending} onClick={() => void onContinueApprovedScope(runtime.approvedIntent!)}>Continue with approved access</TerasActionButton> : null}
        {preparation && !["revoked", "revocation-requested"].includes(preparation.authorization.state) ? <TerasActionButton busy={runtime.pendingAction === "revoke"} disabled={runtime.pending} emphasis="secondary" onClick={() => void runtime.command("revoke")}>End repository access</TerasActionButton> : null}
        {preparation?.authorization.state === "revocation-requested" ? <TerasActionButton busy={runtime.pendingAction === "revoke"} disabled={runtime.pending} onClick={() => void runtime.command("revoke")}>Check access closure</TerasActionButton> : null}
        {!runtime.error && runtime.ready ? <TerasActionButton disabled={runtime.pending} emphasis="secondary" onClick={() => void runtime.refresh()}>Check access status</TerasActionButton> : null}
      </TerasActionRow>
    </TerasFieldStack>
  </TerasPanel>;
}
