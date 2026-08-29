"use client";

import { useMemo, useState } from "react";

import {
  TerasActionButton,
  TerasDetailGrid,
  TerasFieldStack,
  TerasList,
  TerasMetadataList,
  TerasModalShell,
  TerasNoteField,
  TerasPanel,
  TerasPanelHeader,
  TerasSelectField,
  TerasStatusItem,
  TerasTextField,
  TerasTrayStack,
} from "@/teras";

import type { RepositoryCustodyClientError } from "../../../live-runtime/use-repository-custody-live-runtime.ts";
import type {
  RepositoryCustodyKind,
  RepositoryCustodyLinkIntent,
  RepositoryCustodyWorkflowResult,
} from "../../../live-runtime/repository-custody-live-types.ts";
import type { RepositoryWorkspaceRecord } from "../../../read-model/repository-workspace-read-model.ts";
import {
  repositoryCustodyChecks,
  repositoryCustodyProviderMetadata,
  repositoryCustodyResultMetadata,
  repositoryCustodyResultProjection,
} from "./repository-custody-view-model.ts";

type CustodyDraft = {
  approvalNote: string;
  custodyKind: RepositoryCustodyKind;
  workspaceOwnerRef: string;
};

export function RepositoryCustodyDialog({
  error,
  onClose,
  onLink,
  pending,
  repository,
  result,
}: {
  error?: RepositoryCustodyClientError;
  onClose: () => void;
  onLink: (intent: RepositoryCustodyLinkIntent) => Promise<void>;
  pending: boolean;
  repository: RepositoryWorkspaceRecord | null;
  result?: RepositoryCustodyWorkflowResult;
}) {
  const [draft, setDraft] = useState<CustodyDraft>(() => ({
    approvalNote: "",
    custodyKind: repository?.custody?.kind ?? "dedicated-owner-repo",
    workspaceOwnerRef:
      repository?.custody?.workspaceOwnerRef ??
      (repository ? `repo:${repository.name}` : ""),
  }));
  const [requestId, setRequestId] = useState(createRequestId);
  const [requestedAt, setRequestedAt] = useState(() => new Date().toISOString());
  const [changedAfterResult, setChangedAfterResult] = useState(false);
  const projection = repositoryCustodyResultProjection(result, error);
  const checks = useMemo(
    () =>
      repository
        ? repositoryCustodyChecks(
            repository,
            draft.workspaceOwnerRef,
            draft.approvalNote,
            result,
          )
        : [],
    [draft.approvalNote, draft.workspaceOwnerRef, repository, result],
  );

  if (!repository || !repository.providerIdentity) return null;

  const canSubmit =
    !pending &&
    draft.approvalNote.trim().length >= 12 &&
    Boolean(draft.workspaceOwnerRef.trim()) &&
    (result?.status !== "succeeded") &&
    (!result || result.retryable || changedAfterResult);
  const actionLabel = pending
    ? "Linking Repository"
    : result?.retryable
      ? "Retry Provider"
      : result
        ? "Apply Correction"
        : "Link Repository";

  function updateDraft(patch: Partial<CustodyDraft>) {
    if (result && !result.retryable && !changedAfterResult) {
      setRequestId(createRequestId());
      setRequestedAt(new Date().toISOString());
    }
    setChangedAfterResult(Boolean(result));
    setDraft((current) => ({ ...current, ...patch }));
  }

  async function submit() {
    if (!repository?.providerIdentity) return;
    const identity = repository.providerIdentity;
    await onLink({
      approvalNote: draft.approvalNote,
      custodyKind: draft.custodyKind,
      providerHost: identity.host,
      providerRepositoryId: identity.repositoryId,
      repositoryId: repository.id,
      repositoryName: identity.name,
      repositoryOwner: identity.owner,
      requestedAt,
      requestId,
      workspaceOwnerRef: draft.workspaceOwnerRef,
    }).catch(() => undefined);
    setChangedAfterResult(false);
  }

  return (
    <TerasModalShell
      bodyLayout="scroll"
      height="content"
      width="standard"
      description="Review one existing provider repository and request authoritative workspace custody through OOS."
      footer={
        <>
          <TerasActionButton emphasis="secondary" onClick={onClose}>
            Back to Register
          </TerasActionButton>
          <TerasActionButton
            data-repository-custody-link="true"
            disabled={!canSubmit}
            onClick={submit}
          >
            {result?.status === "succeeded" ? "Custody Linked" : actionLabel}
          </TerasActionButton>
        </>
      }
      kicker="Repository Custody"
      onClose={onClose}
      surfaceId="repository-custody-link"
      title="Link Existing Repository"
    >
      <TerasDetailGrid
        data-repository-custody-dialog="true"
        scrollGutter
        variant="balanced"
      >
        <TerasPanel frame="padded" fit="content" treatment="neutral">
          <TerasPanelHeader
            description="Immutable provider identity and the workspace owner to place under custody."
            kicker="Link Request"
            title={repository.name}
          />
          <TerasTrayStack spacing="loose" topOffset="section">
            <TerasMetadataList items={repositoryCustodyProviderMetadata(repository)} />
            <TerasFieldStack spacing="loose">
              <TerasSelectField
                aria-label="Custody kind"
                label="Custody kind"
                onValueChange={(value) =>
                  updateDraft({ custodyKind: value as RepositoryCustodyKind })
                }
                options={[
                  { label: "Dedicated owner repo", value: "dedicated-owner-repo" },
                  { label: "Shared owner repo", value: "shared-owner-repo" },
                  { label: "Incubation repo", value: "incubation-repo" },
                  { label: "External repo", value: "external-repo" },
                ]}
                value={draft.custodyKind}
              />
              <TerasTextField
                aria-label="Workspace owner reference"
                label="Workspace owner reference"
                onValueChange={(value) =>
                  updateDraft({ workspaceOwnerRef: value })
                }
                value={draft.workspaceOwnerRef}
              />
              <TerasNoteField
                aria-label="Link approval note"
                label="Approval note"
                onValueChange={(value) => updateDraft({ approvalNote: value })}
                placeholder="Record why this exact provider repository should be linked to the selected workspace owner."
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
            kicker="Custody Result"
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
              <TerasMetadataList items={repositoryCustodyResultMetadata(result)} />
            ) : null}
          </TerasTrayStack>
        </TerasPanel>
      </TerasDetailGrid>
    </TerasModalShell>
  );
}

function createRequestId() {
  return `repository-custody-request:console-${crypto.randomUUID()}`;
}
