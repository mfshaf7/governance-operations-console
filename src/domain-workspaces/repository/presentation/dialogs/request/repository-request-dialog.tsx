"use client";

import {
  TerasActionButton, TerasContentTray, TerasFieldGrid, TerasFieldStack,
  TerasMetadataList, TerasModalShell, TerasNoteField, TerasPanel,
  TerasPanelHeader, TerasSelectableRow, TerasSelectField, TerasTextField,
  TerasTrayStack,
} from "@/teras";
import type { RepositoryCustodyClientError } from "../../../live-runtime/use-repository-custody-live-runtime.ts";
import type { RepositoryCustodyWorkflowResult } from "../../../live-runtime/repository-custody-live-types.ts";
import type { RepositoryRequestDraft } from "../../../work-model/request/repository-request-model.ts";
import { repositoryProvisioningChecks, repositoryRequestHistoryLabel } from "./repository-request-view-model.ts";
import { RepositoryRequestResult } from "./repository-request-result.tsx";

export function RepositoryRequestDialog({
  canSubmit, correction = false, resume = false, retainedRequests = [],
  selectedRequestId = "new", onSelectRetained, draft, error, onClose,
  onSubmit, onUpdateDraft, open, pending, result, proposalId, proposalTitle,
}: {
  canSubmit: boolean;
  proposalId?: string | null;
  proposalTitle?: string;
  correction?: boolean;
  resume?: boolean;
  retainedRequests?: readonly RepositoryCustodyWorkflowResult[];
  selectedRequestId?: string;
  onSelectRetained?: (requestId: string) => void;
  draft: RepositoryRequestDraft;
  error?: RepositoryCustodyClientError;
  onClose: () => void;
  onSubmit: () => Promise<void>;
  onUpdateDraft: <TKey extends keyof RepositoryRequestDraft>(field: TKey, value: RepositoryRequestDraft[TKey]) => void;
  open: boolean;
  pending: boolean;
  result?: RepositoryCustodyWorkflowResult;
}) {
  if (!open) return null;
  const completed = result?.status === "succeeded";
  const showApproval = !completed && !resume && (!result || correction);
  const missing = repositoryProvisioningChecks(draft, result, resume)
    .filter(check => check.status === "required").map(check => check.label);
  const actionLabel = resume ? "Resume original request" : correction
    ? "Apply reviewed correction" : "Create repository";

  return <TerasModalShell busy={pending} busyLabel={resume ? "Checking the original request…" : "Recording repository request…"}
    bodyLayout="scroll" height="content" width="standard"
    kicker={result ? "Repository request" : "New repository"}
    title={result ? "Repository request" : "Create a repository"}
    description={result
      ? "Inspect the original request and its recorded result."
      : "Choose the repository details, review ownership and approve creation."}
    surfaceId="repository-request" onClose={onClose}
    footer={<>
      <TerasActionButton emphasis="secondary" onClick={onClose}>{completed ? "Close" : "Back to Repository"}</TerasActionButton>
      {!completed && (!result || correction || resume) ? <TerasActionButton
        busy={pending} data-repository-request-submit="true" disabled={!canSubmit}
        onClick={() => void onSubmit().catch(() => undefined)}>{actionLabel}</TerasActionButton> : null}
    </>}>
    <TerasFieldStack spacing="loose" data-repository-request-draft="true">
      {proposalId ? <TerasContentTray kicker="Requested by Proposal" title={proposalTitle ?? proposalId}
        description="This new repository will be associated with this request. Existing repository reuse is selected in Proposal instead." /> : null}
      {retainedRequests.length && onSelectRetained ? <TerasSelectField
        label="Repository request" ariaLabel="Repository request" disabled={pending}
        value={selectedRequestId} onValueChange={onSelectRetained}
        options={[...(!proposalId || !retainedRequests.some(item => item.status === "succeeded" || item.status === "applying" || item.retryable ||
            Boolean(item.provider_operation.provider_repository_id)) ? [{ label: "New repository request", value: "new" }] : []),
          ...retainedRequests.map(item => ({ label: repositoryRequestHistoryLabel(item), value: item.request.request_id }))]}
      /> : null}

      {result || error ? <RepositoryRequestResult result={result} error={error} /> : null}

      {result ? <TerasPanel frame="padded" treatment="neutral" fit="content">
        <TerasPanelHeader kicker="Original request" title={`${result.request.target.owner}/${result.request.target.name}`}
          description={result.request.action === "provision-new" ? result.request.provisioning.description : undefined} />
        <TerasTrayStack topOffset="section" spacing="normal">
          <TerasMetadataList items={[
            { label: "Requested workspace owner", value: result.request.requested_custody.workspace_owner_ref },
            ...(result.request.action === "provision-new" ? [{ label: "Requested visibility", value: result.request.provisioning.visibility }] : []),
          ]} />
          {resume ? <TerasContentTray description="Continue this same request using its retained approval. A new repository request will not be created." /> : null}
          {correction ? <TerasContentTray description="Review a correction to this existing repository. Its original request and failed result remain recorded." /> : null}
        </TerasTrayStack>
      </TerasPanel> : <>
        <TerasPanel frame="padded" treatment="neutral" fit="content">
          <TerasPanelHeader kicker="Repository" title="Repository details"
            description="The repository will be created in the GitHub organization you specify." />
          <TerasTrayStack spacing="loose" topOffset="section">
            <TerasFieldGrid spacing="loose">
              <TerasTextField label="GitHub organization" aria-label="GitHub organization" required
                value={draft.ownerDomain} disabled={pending} placeholder="your-organization"
                onValueChange={value => onUpdateDraft("ownerDomain", value)} />
              <TerasTextField label="Repository name" aria-label="Repository name" required
                value={draft.name} disabled={pending} placeholder="client-dashboard"
                onValueChange={value => onUpdateDraft("name", value)} />
            </TerasFieldGrid>
            <TerasNoteField label="Repository purpose" aria-label="Repository purpose" minimumHeight="short"
              required maxLength={350} disabled={pending} value={draft.purpose}
              placeholder="Describe what this repository will contain."
              onValueChange={value => onUpdateDraft("purpose", value)} />
            <TerasSelectField label="Repository visibility" ariaLabel="Repository visibility"
              value={draft.visibility} disabled={pending} onValueChange={value => onUpdateDraft("visibility", value)}
              options={[{ label: "Private", value: "private" }, { label: "Internal", value: "internal" }, { label: "Public", value: "public" }]}
              helper="Private limits access to authorized collaborators. Organization policy and account permissions determine available visibility." />
          </TerasTrayStack>
        </TerasPanel>
        <TerasPanel frame="padded" treatment="neutral" fit="content">
          <TerasPanelHeader kicker="Workspace ownership" title="Who is responsible?"
            description="The owner reference follows the repository name. Change it when another workspace owner is responsible." />
          <TerasTrayStack spacing="loose" topOffset="section">
            <TerasFieldGrid spacing="loose">
              <TerasTextField label="Workspace owner reference" aria-label="Workspace owner reference" required
                value={draft.workspaceOwnerRef} disabled={pending} placeholder="repo:client-dashboard"
                onValueChange={value => onUpdateDraft("workspaceOwnerRef", value)} />
              <TerasSelectField label="Ownership type" ariaLabel="Ownership type" value={draft.custodyKind}
                disabled={pending} onValueChange={value => onUpdateDraft("custodyKind", value)}
                options={[{ label: "Dedicated owner repository", value: "dedicated-owner-repo" },
                  { label: "Shared owner repository", value: "shared-owner-repo" },
                  { label: "Incubation repository", value: "incubation-repo" },
                  { label: "External repository", value: "external-repo" }]} />
            </TerasFieldGrid>
            <TerasContentTray kicker="Workspace registration"
              description="Creation does not add the repository to managed workspace inventory. After creation, review registration if the repository needs workspace governance and delivery workflows." />
          </TerasTrayStack>
        </TerasPanel>
      </>}

      {showApproval ? <TerasPanel frame="padded" treatment="neutral" fit="content">
        <TerasPanelHeader kicker="Approval" title={correction ? "Approve this correction" : "Review and approve"}
          description="Confirm the repository defaults and record why this request is approved." />
        <TerasTrayStack topOffset="section" spacing="loose">
          <TerasSelectableRow ariaLabel="Confirm provider baseline review" label="I reviewed the repository defaults"
            detail="Initialize a README, enable Issues, allow squash merges only and delete merged branches."
            selected={draft.templateReviewed} status={draft.templateReviewed ? "Reviewed" : "Review needed"}
            tone={draft.templateReviewed ? "ok" : "warn"}
            onSelect={() => { if (!pending) onUpdateDraft("templateReviewed", !draft.templateReviewed); }} />
          <TerasNoteField label="Approval note" aria-label="Provisioning approval note" minimumHeight="short" required
            minLength={12} disabled={pending} value={draft.approvalNote}
            placeholder="Explain why this repository and these settings are approved (at least 12 characters)."
            onValueChange={value => onUpdateDraft("approvalNote", value)} />
          {!pending ? <TerasContentTray kicker={missing.length ? "Still needed" : "Ready for submission"}
            description={missing.length ? missing.join(" · ") : "Review the details above, then submit this exact request."} /> : null}
        </TerasTrayStack>
      </TerasPanel> : null}
    </TerasFieldStack>
  </TerasModalShell>;
}
