"use client";

import {
  TerasActionButton,
  TerasDetailGrid,
  TerasFieldGrid,
  TerasFieldStack,
  TerasList,
  TerasMetadataList,
  TerasModalShell,
  TerasNoteField,
  TerasPanel,
  TerasPanelHeader,
  TerasSelectableRow,
  TerasSelectField,
  TerasStatusItem,
  TerasTextField,
  TerasTrayStack,
} from "@/teras";

import type { RepositoryCustodyClientError } from "../../../live-runtime/use-repository-custody-live-runtime.ts";
import type { RepositoryCustodyWorkflowResult } from "../../../live-runtime/repository-custody-live-types.ts";
import type { RepositoryRequestDraft } from "../../../work-model/request/repository-request-model.ts";
import {
  repositoryProvisioningChecks,
  repositoryProvisioningResultMetadata,
  repositoryProvisioningResultProjection,
  repositoryRequestBoundaryMetadata,
} from "./repository-request-view-model.ts";

export function RepositoryRequestDialog({
  canSubmit,
  draft,
  error,
  onClose,
  onSubmit,
  onUpdateDraft,
  open,
  pending,
  result,
}: {
  canSubmit: boolean;
  draft: RepositoryRequestDraft;
  error?: RepositoryCustodyClientError;
  onClose: () => void;
  onSubmit: () => Promise<void>;
  onUpdateDraft: <TKey extends keyof RepositoryRequestDraft>(
    field: TKey,
    value: RepositoryRequestDraft[TKey],
  ) => void;
  open: boolean;
  pending: boolean;
  result?: RepositoryCustodyWorkflowResult;
}) {
  if (!open) return null;

  const projection = repositoryProvisioningResultProjection(result, error);
  const checks = repositoryProvisioningChecks(draft, result);
  const actionLabel = pending
    ? "Provisioning Repository"
    : result?.status === "applying"
      ? "Check Result"
      : result?.retryable
        ? "Retry Provisioning"
        : result
          ? "Apply Correction"
          : "Provision Repository";

  return (
    <TerasModalShell
      bodyLayout="scroll"
      height="content"
      width="standard"
      description="Review one organization repository request and run the governed OOS provisioning workflow."
      footer={
        <>
          <TerasActionButton onClick={onClose} emphasis="secondary">
            Back to Register
          </TerasActionButton>
          <TerasActionButton
            data-repository-request-submit="true"
            disabled={!canSubmit}
            onClick={() => void onSubmit().catch(() => undefined)}
          >
            {result?.status === "succeeded" ? "Repository Provisioned" : actionLabel}
          </TerasActionButton>
        </>
      }
      kicker="Repository Provisioning"
      onClose={onClose}
      surfaceId="repository-request"
      title="Provision New Repository"
    >
      <TerasDetailGrid
        data-repository-request-draft="true"
        scrollGutter
        variant="balanced"
      >
        <TerasPanel frame="padded" fit="content" treatment="neutral">
          <TerasPanelHeader
            description="Name the organization repository, its workspace custody, and the accountable approval."
            kicker="Provisioning Request"
            title="Repository definition"
          />
          <TerasTrayStack spacing="loose" topOffset="section">
            <TerasFieldStack spacing="loose">
              <TerasFieldGrid spacing="loose">
                <TerasTextField
                  aria-label="GitHub organization"
                  label="GitHub organization"
                  onValueChange={(value) => onUpdateDraft("ownerDomain", value)}
                  placeholder="mfshaf7-workspace"
                  value={draft.ownerDomain}
                />
                <TerasTextField
                  aria-label="Repository name"
                  label="Repository name"
                  onValueChange={(value) => onUpdateDraft("name", value)}
                  placeholder="workspace-client-dashboard"
                  value={draft.name}
                />
              </TerasFieldGrid>
              <TerasNoteField
                aria-label="Repository purpose"
                label="Repository purpose"
                onValueChange={(value) => onUpdateDraft("purpose", value)}
                placeholder="Describe the repository purpose and durable owner boundary."
                value={draft.purpose}
              />
              <TerasFieldGrid spacing="loose">
                <TerasTextField
                  aria-label="Workspace owner reference"
                  label="Workspace owner reference"
                  onValueChange={(value) =>
                    onUpdateDraft("workspaceOwnerRef", value)
                  }
                  placeholder="repo:workspace-client-dashboard"
                  value={draft.workspaceOwnerRef}
                />
                <TerasSelectField
                  aria-label="Custody kind"
                  label="Custody kind"
                  onValueChange={(value) =>
                    onUpdateDraft(
                      "custodyKind",
                      value as RepositoryRequestDraft["custodyKind"],
                    )
                  }
                  options={[
                    {
                      label: "Dedicated owner repo",
                      value: "dedicated-owner-repo",
                    },
                    { label: "Shared owner repo", value: "shared-owner-repo" },
                    { label: "Incubation repo", value: "incubation-repo" },
                    { label: "External repo", value: "external-repo" },
                  ]}
                  value={draft.custodyKind}
                />
              </TerasFieldGrid>
              <TerasSelectField
                aria-label="Repository visibility"
                label="Repository visibility"
                onValueChange={(value) =>
                  onUpdateDraft(
                    "visibility",
                    value as RepositoryRequestDraft["visibility"],
                  )
                }
                options={[
                  { label: "Private", value: "private" },
                  { label: "Internal", value: "internal" },
                  { label: "Public", value: "public" },
                ]}
                value={draft.visibility}
              />
              <TerasMetadataList items={repositoryRequestBoundaryMetadata()} />
              <TerasSelectableRow
                ariaLabel="Confirm provider baseline review"
                detail="README initialized, Issues enabled, squash-only merge, and branch deletion after merge."
                label="Provider baseline reviewed"
                onSelect={() =>
                  onUpdateDraft("templateReviewed", !draft.templateReviewed)
                }
                selected={draft.templateReviewed}
                status={draft.templateReviewed ? "Confirmed" : "Required"}
                tone={draft.templateReviewed ? "ok" : "warn"}
              />
              <TerasNoteField
                aria-label="Provisioning approval note"
                label="Approval note"
                onValueChange={(value) => onUpdateDraft("approvalNote", value)}
                placeholder="Record why this exact repository and provider baseline are approved for creation."
                value={draft.approvalNote}
              />
            </TerasFieldStack>
          </TerasTrayStack>
        </TerasPanel>

        <TerasPanel
          frame="padded"
          fit="content"
          tone={projection.tone}
          treatment="rail"
        >
          <TerasPanelHeader
            actionsLayout="inline"
            description={projection.description}
            kicker="Provisioning Result"
            statusLabel={pending ? "Running" : projection.statusLabel}
            statusTone={pending ? "warn" : projection.tone}
            title={projection.title}
          />
          <TerasTrayStack spacing="loose" topOffset="section">
            <TerasList>
              {checks.map((check, index) => (
                <TerasStatusItem
                  detail={check.detail}
                  index={String(index + 1).padStart(2, "0")}
                  key={check.label}
                  label={check.label}
                  status={check.status}
                  tone={check.tone}
                />
              ))}
            </TerasList>
            {result ? (
              <TerasMetadataList items={repositoryProvisioningResultMetadata(result)} />
            ) : null}
          </TerasTrayStack>
        </TerasPanel>
      </TerasDetailGrid>
    </TerasModalShell>
  );
}
