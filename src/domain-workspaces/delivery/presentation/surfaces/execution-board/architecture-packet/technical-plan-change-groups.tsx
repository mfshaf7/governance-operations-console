"use client";

import { useState, type ReactNode } from "react";
import {
  TerasPlanning,
  TerasActionButton,
  TerasActionRow,
  TerasEmptyState,
  TerasFieldStack,
  TerasList,
  TerasFieldGrid,
  TerasPanelHeader,
  TerasSelectField,
  TerasTextField,
  TerasMetadataList,
} from "@/teras";
import { technicalPlanChangeGroupName } from "../../../../work-model/execution/technical-plan-model.ts";
import type { PlanChangeConfirmation, PlanChoice } from "./architecture-plan-field.tsx";
import { TechnicalPlanAddDialog, TechnicalPlanEntryPage, TechnicalPlanEntryRow, useTechnicalPlanEntryPage } from "./technical-plan-entry-page.tsx";
import { TechnicalPlanWorkPicker, TechnicalPlanWorkTitle } from "./technical-plan-overview.tsx";

export type TechnicalPlanChangeGroup = {
  id: string; owner_repo?: string; source_backed?: boolean | null; covered_work_item_ids?: string[];
};

export function isTechnicalPlanChangeGroup(value: unknown): value is TechnicalPlanChangeGroup {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const group = value as Partial<TechnicalPlanChangeGroup>;
  return typeof group.id === "string" && Boolean(group.id) &&
    (group.owner_repo === undefined || typeof group.owner_repo === "string") &&
    (group.source_backed == null || typeof group.source_backed === "boolean") &&
    (group.covered_work_item_ids === undefined || Array.isArray(group.covered_work_item_ids) &&
      group.covered_work_item_ids.every(id => typeof id === "string"));
}

export function TechnicalPlanChangeGroups({ groups, work, repositories, pins, onOpenRevisions, disabled, onChange, repositorySearch, confirmChange }: {
  groups: TechnicalPlanChangeGroup[]; work: PlanChoice[]; repositories: PlanChoice[];
  pins: ReadonlyArray<{ repo: string; base_ref: string; commit: string }>; onOpenRevisions: () => void;
  disabled: boolean; onChange: (value: TechnicalPlanChangeGroup[]) => void; repositorySearch?: ReactNode;
  confirmChange: (change: PlanChangeConfirmation) => void;
}) {
  const page = useTechnicalPlanEntryPage(groups.map(group => group.id));
  const [filter, setFilter] = useState("");
  const [pendingGroup, setPendingGroup] = useState<TechnicalPlanChangeGroup | null>(null);
  const titles = Object.fromEntries(work.map(item => [item.value, item.label]));
  const assigned = new Set(groups.flatMap(group => group.covered_work_item_ids ?? []));
  const visibleGroups = groups.filter(group => `${technicalPlanChangeGroupName(group, titles)} ${group.owner_repo ?? ""}`.toLowerCase().includes(filter.trim().toLowerCase()));
  const active = pendingGroup ?? groups.find(group => group.id === page.selected);
  const pin = pins.find(revision => revision.repo === active?.owner_repo);
  const inGroup = new Set(active?.covered_work_item_ids ?? []);
  const available = work.filter(item => !assigned.has(item.value) || inGroup.has(item.value));

  function update(next: TechnicalPlanChangeGroup) {
    if (pendingGroup) setPendingGroup(next);
    else onChange(groups.map(group => group.id === next.id ? next : group));
  }

  function add() {
    // Use a fresh stable identifier. The displayed name comes from the covered work.
    const id = `change-${crypto.randomUUID()}`;
    setPendingGroup({ id, owner_repo: "", source_backed: null, covered_work_item_ids: [] });
  }

  function selectWork(workId: string) {
    if (!active) return;
    const ids = inGroup.has(workId) ? [...inGroup].filter(id => id !== workId) : [...inGroup, workId];
    const known = [...new Set(work.filter(candidate => ids.includes(candidate.value)).flatMap(candidate => candidate.repository ? [candidate.repository] : []))];
    update({ ...active, covered_work_item_ids: ids, owner_repo: known.length === 1 ? known[0] : active.owner_repo });
  }

  const groupRepositories = new Set(work.filter(item => inGroup.has(item.value) && item.repository).map(item => item.repository));
  const repositoryChoices = [...new Map([
    ...repositories,
    ...work.flatMap(item => item.repository ? [{ value: item.repository, label: item.repository }] : []),
    ...(active?.owner_repo ? [{ value: active.owner_repo, label: active.owner_repo }] : []),
  ].map(choice => [choice.value, choice])).values()];

  const groupFields = active ? <TerasFieldStack spacing="normal">
    <TerasFieldGrid spacing="compact">
      <TerasSelectField label="Changes repository files" disabled={disabled} value={active.source_backed == null ? "" : String(active.source_backed)}
        options={[{ value: "", label: "Choose…" }, { value: "true", label: "Yes" }, { value: "false", label: "No" }]}
        onValueChange={value => update({ ...active, source_backed: value === "" ? null : value === "true" })} />
      <TerasSelectField label="Repository" disabled={disabled || groupRepositories.size === 1} value={active.owner_repo ?? ""}
        options={[{ value: "", label: "Choose a repository" }, ...repositoryChoices]}
        onValueChange={value => update({ ...active, owner_repo: value })} />
    </TerasFieldGrid>
    {groupRepositories.size === 0 ? repositorySearch : null}
    {groupRepositories.size > 1 ? <TerasEmptyState>Split these items by repository before reviewing the plan.</TerasEmptyState> : null}
    <TerasPanelHeader kicker="" title="Work in this group"
      description="Choose work that will be reviewed and rolled back together." />
    {available.length ? <TechnicalPlanWorkPicker label="Choose work for this change group" items={available}
      selected={inGroup} disabled={disabled} onToggle={selectWork}
      itemDisabled={item => !inGroup.has(item.value) && Boolean(item.repository && groupRepositories.size > 0 && !groupRepositories.has(item.repository))} />
      : <TerasEmptyState>{work.length
        ? "All work is assigned to other groups. Remove it from its current group to move it here."
        : "Include work in Choose scope before adding it to a group."}</TerasEmptyState>}
    {[...inGroup].filter(id => !work.some(item => item.value === id)).map(id => <TerasActionButton key={id}
      emphasis="secondary" size="table-compact" disabled={disabled}
      onClick={() => update({ ...active, covered_work_item_ids: [...inGroup].filter(item => item !== id) })}>
      Remove out-of-scope {id.replace("work-item-", "item #")}
    </TerasActionButton>)}
  </TerasFieldStack> : null;
  if (active && !pendingGroup) return <TechnicalPlanEntryPage title={technicalPlanChangeGroupName(active, titles)}
    category="Change group" framed heading={page.heading} onBack={page.back}>
    <TerasFieldStack spacing="normal">
      {groupFields}
      {active.owner_repo && active.source_backed ? <TerasMetadataList items={[{
        label: "Recorded source revision",
        value: pin ? `${pin.base_ref.replace(/^origin\//, "")} · ${pin.commit.slice(0, 12)}` : "No revision pinned",
      }]} /> : null}
      <TerasActionRow spacing="compact">
        {active.owner_repo && active.source_backed ? <TerasActionButton emphasis="secondary" size="table-compact"
          onClick={onOpenRevisions}>Open source revisions</TerasActionButton> : null}
        <TerasActionButton disabled={disabled} emphasis="secondary" size="table-compact"
          onClick={() => confirmChange({
            title: "Remove this change group?", description: "The group's work assignments will be cleared. Review any sequence links or approvals that refer to the group.",
            actionLabel: "Remove change group",
            apply: () => { onChange(groups.filter(group => group.id !== active.id)); page.back(true); },
          })}>Remove change group</TerasActionButton>
      </TerasActionRow>
    </TerasFieldStack>
  </TechnicalPlanEntryPage>;
  return <div ref={page.browse} tabIndex={-1} data-plan-list-fill={visibleGroups.length > 0 || undefined}>
    <TerasFieldStack spacing="compact" aria-label="Change group browser">
      <TerasPlanning.SearchRow>
        <TerasTextField label="Find a group" placeholder="Work or repo" value={filter}
          disabled={!groups.length && !filter} onValueChange={setFilter} />
        <TerasPlanning.FilterAction emphasis="secondary"
          disabled={disabled || groups.length >= 100} onClick={add}>Add group</TerasPlanning.FilterAction>
      </TerasPlanning.SearchRow>
      {visibleGroups.length ? <TerasList ariaLabel="Change groups" frame="contained" fit="fill">
        {visibleGroups.map(group => {
          const count = group.covered_work_item_ids?.length ?? 0;
          return <TechnicalPlanEntryRow key={group.id} entryKey={group.id}
            label={<TechnicalPlanWorkTitle label={technicalPlanChangeGroupName(group, titles)} />}
            detail={`Repository: ${group.owner_repo || "To confirm"} · ${count} ${count === 1 ? "item" : "items"}`}
            onOpen={() => page.open(group.id)} />;
        })}
      </TerasList> : <TerasEmptyState>{groups.length ? "No change groups match this search." : "Add a group for work that will be reviewed and rolled back together."}</TerasEmptyState>}
    </TerasFieldStack>
    {pendingGroup ? <TechnicalPlanAddDialog title="Add change group" onClose={() => setPendingGroup(null)}
      disabled={disabled || groups.length >= 100 || !pendingGroup.owner_repo && pendingGroup.source_backed == null && !inGroup.size}
      onAdd={() => {
        onChange([...groups, pendingGroup]);
        setPendingGroup(null);
      }}>
      {groupFields}
    </TechnicalPlanAddDialog> : null}
  </div>;
}
