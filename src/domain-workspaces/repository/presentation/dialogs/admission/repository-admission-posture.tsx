"use client";

import { TerasStatusItem, TerasList, TerasDialog } from "@/teras";

import type { RepositoryWorkspaceRecord } from "../../../read-model/repository-workspace-read-model.ts";
import {
  repositoryAdmissionPostureDialogProjection,
  repositoryPostureGroupStateLabel,
  repositoryPostureItemStateLabel,
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
}: {
  group: RepositoryWorkspaceRecord["admissionPosture"][number] | null;
  onClose: () => void;
}) {
  const dialogProjection = repositoryAdmissionPostureDialogProjection(group);

  return (
    <TerasDialog
      contentOverflow="auto"
      height="content"
      width="standard"
      closeLabel={dialogProjection.closeLabel}
      description={dialogProjection.description}
      kicker={dialogProjection.kicker}
      onClose={onClose}
      open={Boolean(group)}
      title={dialogProjection.title}
    >
      {group ? (
        <TerasList>
          {group.items.map((item, index) => (
            <TerasStatusItem
              tone={item.tone}
              detail={`${item.value}: ${item.detail}`}
              index={String(index + 1).padStart(2, "0")}
              key={`${group.id}-${item.label}`}
              label={item.label}
              status={repositoryPostureItemStateLabel(item.state)}
              treatment="rail"
            />
          ))}
        </TerasList>
      ) : null}
    </TerasDialog>
  );
}
