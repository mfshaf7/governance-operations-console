"use client";
import { TerasActionButton, TerasActionRow, TerasFieldStack, TerasMetadataList, TerasPanel, TerasPanelHeader } from "@/teras";
import type { SourceAuthorizationSelector } from "../live-runtime/source-authorization-contract.ts";
import { useSourceAuthorization } from "../live-runtime/use-source-authorization.ts";
import { useEffect } from "react";

export function SourceAuthorizationPanel({ subject, sourceStartDigest, decision = null, onIntentChange, onRecoverDecision, boundIntentRef = null, preparationAllowed = true }: {
  subject: SourceAuthorizationSelector; sourceStartDigest: string | null; decision?: Record<string, unknown> | null; onIntentChange: (intentId: string | null) => void;
  onRecoverDecision?: (decision: Record<string, unknown>) => void;
  boundIntentRef?: string | null;
  preparationAllowed?: boolean;
}) {
  const runtime = useSourceAuthorization(subject, sourceStartDigest, decision, boundIntentRef), preparation = runtime.preparation, scope = preparation?.source_intent;
  useEffect(() => { onIntentChange(preparation?.authorization.state === "approved" ? preparation.intent_id : null); }, [preparation, onIntentChange]);
  const canPrepare = preparationAllowed && (!preparation || preparation.authorization.state === "revoked");
  return <TerasPanel frame="padded" treatment="state" tone={runtime.error ? "danger" : "info"}>
    <TerasPanelHeader kicker="Source Authorization" title="Review the exact ordinary-source scope" description={runtime.error ?? "Approval permits bounded source actions and renewal only until this expiry. Terminal close revokes this scope. The browser and model never receive a token."} statusLabel={preparation?.authorization.state ?? "Not prepared"} />
    <TerasFieldStack spacing="normal">
      {scope ? <TerasMetadataList items={[
        { label: "Repository", value: scope.repository }, { label: "Branch / fetched base", value: `${scope.branch} / ${scope.fetched_base}` },
        { label: "Provider repository / installation", value: `${scope.repository_id} / ${scope.installation_id}` },
        { label: "Subject / accountable operator", value: `${scope.subject.kind === "prototype" ? scope.subject.prototype_id : scope.subject.work_item_ref} / ${scope.operator_id}` },
        { label: "Source-start binding", value: scope.source_start_digest },
        { label: "Landing Unit", value: scope.landing_unit_id }, { label: "Human reviewer", value: scope.human_reviewer_id },
        { label: "Expiry", value: scope.expires_at }, { label: "Exact scope digest", value: preparation.source_intent_digest },
        { label: "Credential receipt", value: preparation.authorization.credential_receipt?.receipt_digest ?? "Not confirmed" },
        { label: "Original owner operation", value: runtime.operation ? `${runtime.operation.operation_id} / ${runtime.operation.state}` : "Not dispatched" },
        ...(runtime.operation ? [{ label: "Owner next action", value: `${runtime.operation.next_action.authority} / ${runtime.operation.next_action.code}` }] : []),
        ...(runtime.operation?.provider_operation.failure ? [{ label: "Owner failure", value: runtime.operation.provider_operation.failure.code }] : []),
        ...(runtime.operation?.provider_operation.failure?.retry_after ? [{ label: "Retry no earlier than", value: runtime.operation.provider_operation.failure.retry_after }] : []),
      ]} /> : null}
      <TerasActionRow>
        {onRecoverDecision ? runtime.candidates.filter(value => value.start_decision !== null).map(value => <TerasActionButton key={value.intent_id} disabled={runtime.pending} emphasis="secondary" onClick={() => { if (value.start_decision) { onRecoverDecision(value.start_decision); runtime.select(value); } }}>Recover original {value.source_intent.landing_unit_id} / {value.source_intent.branch} / {value.authorization.state}</TerasActionButton>) : null}
        {canPrepare ? <TerasActionButton disabled={runtime.pending} onClick={() => void runtime.prepare()}>{preparation ? "Prepare explicit successor scope" : "Prepare source scope"}</TerasActionButton> : null}
        {preparation?.authorization.state === "prepared" ? <TerasActionButton disabled={runtime.pending} onClick={() => void runtime.command("issue")}>Approve this exact scope and issue source access</TerasActionButton> : null}
        {preparation?.authorization.state === "approved" && !preparation.authorization.credential_receipt ? <TerasActionButton disabled={runtime.pending || Boolean(runtime.operation?.provider_operation.failure?.retry_after && Date.parse(runtime.operation.provider_operation.failure.retry_after) > Date.now())} onClick={() => void runtime.command("issue")}>Reconcile original source issuance</TerasActionButton> : null}
        {preparation && !["revoked", "revocation-requested"].includes(preparation.authorization.state) ? <TerasActionButton disabled={runtime.pending} emphasis="secondary" onClick={() => void runtime.command("revoke")}>Stop and revoke this exact scope</TerasActionButton> : null}
        {preparation?.authorization.state === "revocation-requested" ? <TerasActionButton disabled={runtime.pending} onClick={() => void runtime.command("revoke")}>Reconcile owned revocation</TerasActionButton> : null}
        <TerasActionButton disabled={runtime.pending} emphasis="secondary" onClick={() => void runtime.refresh()}>Refresh source authority</TerasActionButton>
      </TerasActionRow>
    </TerasFieldStack>
  </TerasPanel>;
}
