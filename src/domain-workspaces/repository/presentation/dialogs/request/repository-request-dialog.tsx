"use client";

import {
  TerasActionButton, TerasContentTray, TerasFieldGrid, TerasFieldStack,
  TerasMetadataList, TerasModalShell, TerasNoteField, TerasPanel,
  TerasPanelHeader, TerasSelectableRow, TerasSelectField, TerasTextField,
  TerasTrayStack, TerasLoadingState,
} from "@/teras";
import type { RepositoryCustodyClientError } from "../../../live-runtime/use-repository-custody-live-runtime.ts";
import type { RepositoryCustodyWorkflowResult } from "../../../live-runtime/repository-custody-live-types.ts";
import type { RepositoryRequestDraft } from "../../../work-model/request/repository-request-model.ts";
import { repositoryProvisioningChecks, repositoryRequestHistoryLabel } from "./repository-request-view-model.ts";
import {isRepositoryUse} from "../../../domain/repository-use.ts";
import {RepositoryAssociationFields} from "../../shared/repository-association-fields.tsx";
import {RepositoryPageControls, type RepositoryPageControl} from "../../shared/repository-page-controls.tsx";
import { RepositoryRequestResult } from "./repository-request-result.tsx";
import { RepositoryDevelopmentScope } from "../../shared/repository-development-scope.tsx";
import type { RepositoryConnections } from "../../../live-runtime/repository-connections.ts";

export function RepositoryRequestDialog({
  canSubmit, onContinueOnboarding, preview = false, correction = false, resume = false, retainedRequests = [],
  selectedRequestId = "new", onSelectRetained, draft, error, onClose,
  onSubmit, onUpdateDraft, open, pending, result, proposalId, proposalTitle,
  connections, connectionsLoading = false, connectionsError, onRetryConnections, historyPage,
}: {
  canSubmit: boolean;
  onContinueOnboarding?: () => void;
  preview?: boolean;
  historyPage?: RepositoryPageControl;
  connections?: RepositoryConnections | null;
  connectionsLoading?: boolean;
  connectionsError?: string | null;
  onRetryConnections?: () => void;
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
  const destinations = connections?.connections.filter(item => item.capabilities.provisioning) ?? [];
  const selectedDestination = destinations.find(item => item.account.toLowerCase() === draft.ownerDomain.toLowerCase());
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
      : "Choose the repository details, review workspace association and approve creation."}
    surfaceId="repository-request" onClose={onClose}
    footer={<>
      {completed && onContinueOnboarding ? <TerasActionButton onClick={onContinueOnboarding}>Continue onboarding in Registry</TerasActionButton> : null}
      <TerasActionButton emphasis="secondary" onClick={onClose}>{completed ? "Close" : "Back to Repository"}</TerasActionButton>
      {!completed && (!result || correction || resume) ? <TerasActionButton
        busy={pending} data-repository-request-submit="true" disabled={preview || !canSubmit || (!resume && !isRepositoryUse(draft.custodyKind))}
        onClick={() => void onSubmit().catch(() => undefined)}>{actionLabel}</TerasActionButton> : null}
    </>}>
    <TerasFieldStack spacing="loose" data-repository-request-draft="true">
      {preview ? <TerasContentTray kicker="Preview only"
        description="These are sample GitHub accounts. You can edit this form; repository creation is disabled." /> : null}
      {proposalId ? <TerasContentTray kicker="Requested by Proposal" title={proposalTitle ?? proposalId}
        description="This new repository will be associated with this request. Existing repository reuse is selected in Proposal instead." /> : null}
      {retainedRequests.length && onSelectRetained ? <TerasSelectField
        label="Repository request" ariaLabel="Repository request" disabled={pending}
        value={selectedRequestId} onValueChange={onSelectRetained}
        options={[...(!proposalId || !retainedRequests.some(item => item.status === "succeeded" || item.status === "applying" || item.retryable ||
            Boolean(item.provider_operation.provider_repository_id)) ? [{ label: "New repository request", value: "new" }] : []),
          ...retainedRequests.map(item => ({ label: repositoryRequestHistoryLabel(item), value: item.request.request_id }))]}
      /> : null}
      {!preview ? <RepositoryPageControls page={historyPage} label="requests" /> : null}

      {result || error ? <RepositoryRequestResult result={result} error={error} /> : null}

      {result ? <TerasPanel frame="padded" treatment="neutral" fit="content">
        <TerasPanelHeader kicker="Original request" title={`${result.request.target.owner}/${result.request.target.name}`}
          description={result.request.action === "provision-new" ? result.request.provisioning.description : undefined} />
        <TerasTrayStack topOffset="section" spacing="normal">
          <TerasMetadataList items={[
            { label: "Requested workspace repository", value: result.request.requested_custody.workspace_owner_ref },
            ...(result.request.action === "provision-new" ? [{ label: "Requested visibility", value: result.request.provisioning.visibility }] : []),
          ]} />
          {resume ? <TerasContentTray description="Continue this same request using its retained approval. A new repository request will not be created." /> : null}
          {correction ? <TerasContentTray description="Review a correction to this existing repository. Its original request and failed result remain recorded." /> : null}
        </TerasTrayStack>
      </TerasPanel> : <>
        <TerasPanel frame="padded" treatment="neutral" fit="content">
          <TerasPanelHeader kicker="Repository" title="Repository details"
            description="Choose a connected GitHub account for this repository." />
          <TerasTrayStack spacing="loose" topOffset="section">
            <TerasFieldGrid spacing="loose">
              {connectionsLoading ? <TerasLoadingState inline label="Loading GitHub accounts…" /> : destinations.length === 1 ? <TerasTextField label="Create under" aria-label="Create under"
                value={`${destinations[0].account} · ${destinations[0].account_type === "personal" ? "Personal" : "Organization"}`} readOnly onValueChange={() => undefined} />
                : <TerasSelectField label="Create under" ariaLabel="Create under"
                  value={selectedDestination?.account ?? ""} disabled={pending || connectionsLoading || !destinations.length}
                  options={[{label: connectionsLoading ? "Loading GitHub accounts…" : "Choose a GitHub account", value: ""},
                    ...destinations.map(item => ({label: `${item.account} · ${item.account_type === "personal" ? "Personal" : "Organization"}`, value: item.account}))]}
                  onValueChange={value => { onUpdateDraft("ownerDomain", value); onUpdateDraft("templateReviewed", false); }} />}
              <TerasTextField label="Repository name" aria-label="Repository name" required
                value={draft.name} disabled={pending} placeholder="client-dashboard"
                onValueChange={value => onUpdateDraft("name", value)} />
            </TerasFieldGrid>
            <TerasNoteField label="Repository purpose" aria-label="Repository purpose" minimumHeight="short"
              required maxLength={350} disabled={pending} value={draft.purpose}
              placeholder="Describe what this repository will contain."
              onValueChange={value => onUpdateDraft("purpose", value)} />
            <TerasSelectField label="Repository visibility" ariaLabel="Repository visibility"
              value={draft.visibility} disabled={pending} onValueChange={value => onUpdateDraft("visibility", value as RepositoryRequestDraft["visibility"])}
              options={[{ label: "Private", value: "private" }, ...(selectedDestination?.account_type === "organization" || draft.visibility === "internal" ? [{ label: selectedDestination?.account_type === "personal" ? "Internal — organization only" : "Internal", value: "internal" }] : []), { label: "Public", value: "public" }]}
              helper={selectedDestination?.account_type === "personal" && draft.visibility === "internal" ? "Choose Private or Public for this personal account." : "Private limits access to authorized collaborators. Organization policy and account permissions determine available visibility."} />
            {connectionsError || !connectionsLoading && !destinations.length ? <TerasContentTray kicker="GitHub connection needed"
              description={connectionsError ?? "Connect a personal account or organization with repository creation access before submitting."}>
              {connectionsError && onRetryConnections ? <TerasActionButton emphasis="secondary" onClick={onRetryConnections}>Retry connection</TerasActionButton> : null}
            </TerasContentTray> : null}
            <RepositoryDevelopmentScope visibility={draft.visibility} />
          </TerasTrayStack>
        </TerasPanel>
        <TerasPanel frame="padded" treatment="neutral" fit="content">
          <TerasPanelHeader kicker="Workspace" title="Repository use"
            description="Choose how the source will be maintained. This choice does not move the project into Prototype or Delivery." />
          <TerasTrayStack spacing="loose" topOffset="section">
            <RepositoryAssociationFields kind={draft.custodyKind} reference={draft.workspaceOwnerRef} disabled={pending}
              onKindChange={value => onUpdateDraft("custodyKind", value)} onReferenceChange={value => onUpdateDraft("workspaceOwnerRef", value)} />
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
          {!pending ? <TerasContentTray kicker={preview ? "Preview only" : missing.length ? "Still needed" : "Ready for submission"}
            description={preview ? "Repository creation is disabled in this disconnected preview." : missing.length ? missing.join(" · ") : "Review the details above, then submit this exact request."} /> : null}
        </TerasTrayStack>
      </TerasPanel> : null}
    </TerasFieldStack>
  </TerasModalShell>;
}
