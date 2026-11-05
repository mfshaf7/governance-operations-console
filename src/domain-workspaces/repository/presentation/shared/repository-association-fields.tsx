"use client";
import {TerasFieldStack, TerasSelectField, TerasTechnicalDetails, TerasTextField} from "@/teras";
import {repositoryWorkspaceName, repositoryWorkspaceReferenceHelp} from "../../domain/repository-workspace-reference.ts";
import type {RepositoryCustodyKind} from "../../live-runtime/repository-custody-live-types.ts";
import {isRepositoryUse, repositoryUseOptions, type RepositoryUse} from "../../domain/repository-use.ts";

const descriptions: Record<RepositoryUse, string> = {
  "dedicated-owner-repo": "For one app, tool or documentation project with its own repository. Choose this for a typical new project.",
  "shared-owner-repo": "For several projects or components maintained together in one repository, usually in separate folders. This records intended use; it does not create folders or configure builds.",
};
export function RepositoryAssociationFields({kind, reference, onKindChange, onReferenceChange, disabled = false, referenceLabel = "Workspace repository"}: {
  kind: RepositoryCustodyKind; reference: string; onKindChange: (kind: RepositoryUse) => void;
  onReferenceChange: (value: string) => void; disabled?: boolean; referenceLabel?: string;
}) {
  const invalid = Boolean(reference.trim()) && !repositoryWorkspaceName(reference);
  return <TerasFieldStack spacing="normal">
    <TerasSelectField label="Repository use" ariaLabel={referenceLabel.startsWith("Attachment") ? "Attachment repository use" : "Repository use"}
      value={isRepositoryUse(kind) ? kind : ""} disabled={disabled} onValueChange={value => { if (isRepositoryUse(value)) onKindChange(value); }}
      helper={isRepositoryUse(kind) ? descriptions[kind] : "Choose Dedicated or Shared for this new request. Earlier recorded classifications remain unchanged in history."}
      options={repositoryUseOptions} />
    <TerasTechnicalDetails summary="Workspace technical details" items={[{
      label: "Internal workspace identifier",
      value: <TerasTextField label={referenceLabel} labelVisibility="hidden" aria-label={referenceLabel}
        required aria-invalid={invalid} value={reference} disabled={disabled}
        placeholder="Generated from the account and repository name" onValueChange={onReferenceChange} />,
      detail: invalid ? repositoryWorkspaceReferenceHelp : "Generated automatically. The repo: prefix identifies a repository record inside the system; it is not part of the GitHub name or URL. Edit only to use a specific workspace identifier.",
    }]} />
  </TerasFieldStack>;
}
