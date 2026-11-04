import type { ReactNode } from "react";

import {
  TerasActionButton,
  TerasDetailGrid,
  TerasMetadataList,
  TerasPanel,
  TerasPanelHeader,
  TerasStatusPill,
  TerasTechnicalDetails,
  TerasTrayStack,
} from "@/teras";

import type { RepositoryWorkspaceRecord } from "../../../read-model/repository-workspace-read-model.ts";
import {
  repositoryRuntimeLaneStatusLabel,
  repositorySecurityBindingStatusLabel,
} from "../../shared/repository-display-model.ts";
import { repositoryPostureGroupStateLabel } from "../admission/repository-admission-view-model.ts";

// Both Review and Inspect retain their own action eligibility and owner routes.
// This composition displays the same record without adding a status authority.
export function RepositoryReviewContent({ repository, actions, onOpenGroup }: {
  repository: RepositoryWorkspaceRecord;
  actions: ReactNode;
  onOpenGroup: (id: string) => void;
}) {
  const sourceUrl = repositoryReviewSourceUrl(repository.githubUrl);
  const provider = repository.admissionPosture.find(group => group.id === "provider-state");
  const registrationUnknown = repository.blockers.some(blocker => blocker.id === "current-inventory-unavailable");
  const registration = registrationUnknown ? "Unknown"
    : repository.admissionState === "admitted" ? "Registered"
    : repository.admissionState === "retired" ? "Retired"
    : repository.admissionState === "blocked" ? "Needs attention" : "Not registered";
  const registrationDetail = registrationUnknown ? "Current workspace registration could not be verified."
    : repository.admissionState === "admitted" ? "Included in the managed workspace."
    : repository.admissionState === "retired" ? "The workspace record is retired. This does not establish whether GitHub is archived."
    : repository.admissionState === "blocked" ? "Review the recorded issues below before continuing."
    : "Not listed as an active workspace repository. Review registration if this source should join the workspace.";

  return <TerasTrayStack spacing="loose" data-repository-review-content="true">
    <TerasPanel frame="padded" fit="content" treatment="neutral" data-repository-identity-panel="true">
      <TerasPanelHeader kicker="Repository" title={repository.name} description={repository.purpose} />
      <TerasTrayStack topOffset="section">
        <TerasMetadataList items={[
          { label: "GitHub repository", tone: sourceUrl ? "info" : "muted", value: sourceUrl
            ? <a href={sourceUrl} target="_blank" rel="noopener noreferrer" title="Open repository in a new browser tab">
                <u>{sourceUrl.replace("https://github.com/", "")}</u> ↗
              </a>
            : "GitHub link unavailable" },
          { label: "Workspace repository", value: repository.owner },
        ]} />
      </TerasTrayStack>
    </TerasPanel>
    <TerasDetailGrid variant="balanced" scrollGutter>
      <TerasTrayStack spacing="loose" align="start">
        <TerasPanel frame="padded" fit="content" treatment="neutral">
          <TerasPanelHeader kicker="Current status" title="Workspace and GitHub" />
          <TerasTrayStack spacing="normal" topOffset="section">
            <TerasMetadataList shape="list" items={[
              { label: "Workspace registration", value: registration, detail: registrationDetail,
                tone: registrationUnknown ? "warn" : repository.admissionState === "admitted" ? "ok" : repository.tone },
              { label: "GitHub status", value: provider?.statusLabel ?? "Not checked", tone: provider?.tone ?? "info",
                detail: provider?.description ?? "Open History to check GitHub. Workspace registration does not confirm GitHub availability." },
            ]} />
            {repository.blockers.length > 0 ? <TerasMetadataList shape="list" items={repository.blockers.map(blocker => ({
              label: blocker.label,
              value: blocker.severity === "blocked" ? "Blocked" : "Review needed",
              detail: `${blocker.detail} Next: ${blocker.action} Responsible component: ${blocker.owner}.`,
              tone: blocker.severity === "blocked" ? "danger" : "warn",
            }))} /> : null}
          </TerasTrayStack>
        </TerasPanel>
      </TerasTrayStack>
      <TerasPanel frame="padded" fit="content" treatment="neutral">
        <TerasPanelHeader kicker="Repository actions" title="Manage repository" />
        <TerasTrayStack spacing="loose" topOffset="section">{actions}</TerasTrayStack>
      </TerasPanel>
    </TerasDetailGrid>
    <TerasTechnicalDetails summary="Recorded evidence and technical details" items={[
      ...repository.admissionPosture.map(group => ({
        label: group.title,
        value: <TerasStatusPill tone={group.tone}>{repositoryPostureGroupStateLabel(group)}</TerasStatusPill>,
        actions: <TerasActionButton size="table-compact" emphasis="secondary"
          aria-label={`Open ${group.title} posture details`} onClick={() => onOpenGroup(group.id)}>
          Inspect record
        </TerasActionButton>,
        detail: group.description,
      })),
      { label: "Repository type", value: repository.repoClass },
      { label: "Workspace lifecycle", value: repository.lifecycle },
      { label: "Runtime information", value: repositoryRuntimeLaneStatusLabel(repository.runtimeLane.status), detail: repository.runtimeLane.detail },
      { label: "Security information", value: repositorySecurityBindingStatusLabel(repository.securityBinding.status), detail: repository.securityBinding.detail },
      { label: "Record reference", value: repository.id },
      { label: "Recorded GitHub URL", value: repository.githubUrl },
      { label: "Recorded validation", value: repository.lastValidation },
      { label: "Source", value: repository.routeSource },
      ...repository.blockers.map(blocker => ({ label: `${blocker.label} source`, value: blocker.sourceRef })),
    ]} />
  </TerasTrayStack>;
}

function repositoryReviewSourceUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "github.com" && !url.port &&
      !url.username && !url.password && !url.search && !url.hash &&
      /^\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/.test(url.pathname) ? url.href : null;
  } catch { return null; }
}
