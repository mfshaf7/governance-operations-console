"use client";

import { TerasStatusItem, TerasList, TerasDialog, TerasMetadataList, TerasTechnicalDetails, TerasTrayStack, TerasContentTray } from "@/teras";

import type { RepositoryWorkspaceRecord } from "../../../read-model/repository-workspace-read-model.ts";
import {
  repositoryAdmissionPostureDialogProjection,
  repositoryPostureGroupStateLabel,
} from "./repository-admission-view-model.ts";

export function RepositoryAdmissionPostureList({
  activeGroupId,
  groups,
  onOpenGroup,
}: {
  activeGroupId: string | null;
  groups: RepositoryWorkspaceRecord["admissionPosture"];
  onOpenGroup: (groupId: string) => void;
}) {
  return (
    <TerasList>
      {groups.map((group, index) => (
        <TerasStatusItem
          ariaLabel={`Open ${group.title} posture details`}
          tone={group.tone}
          detail={group.description}
          index={String(index + 1).padStart(2, "0")}
          key={group.id}
          label={group.title}
          onSelect={() => onOpenGroup(group.id)}
          selected={activeGroupId === group.id}
          status={repositoryPostureGroupStateLabel(group)}
          treatment="rail"
        />
      ))}
    </TerasList>
  );
}

export function RepositoryAdmissionPostureDialog({
  group,
  onClose,
  repositoryName,
}: {
  group: RepositoryWorkspaceRecord["admissionPosture"][number] | null;
  onClose: () => void;
  repositoryName?: string;
}) {
  const dialogProjection = repositoryAdmissionPostureDialogProjection(group);

  return (
    <TerasDialog
      contentOverflow="auto"
      height="content"
      width="standard"
      closeLabel={dialogProjection.closeLabel}
      description={repositoryName ? `${repositoryName} · ${dialogProjection.description}` : dialogProjection.description}
      kicker={dialogProjection.kicker}
      onClose={onClose}
      open={Boolean(group)}
      title={dialogProjection.title}
    >
      {group ? (
        <TerasTrayStack spacing="loose">
          <TerasMetadataList shape="list" items={dialogProjection.facts} />
          {dialogProjection.scope ? <TerasContentTray kicker="What this means" description={dialogProjection.scope} /> : null}
          <TerasTechnicalDetails summary="Technical details" items={dialogProjection.technicalFacts} />
        </TerasTrayStack>
      ) : null}
    </TerasDialog>
  );
}
