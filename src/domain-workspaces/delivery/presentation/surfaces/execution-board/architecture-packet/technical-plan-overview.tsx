"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import {
  TerasPlanning,
  TerasActionButton,
  TerasActionRow,
  TerasContentTray,
  TerasEmptyState,
  TerasFieldStack,
  TerasList,
  TerasLoadingState,
  TerasPanelHeader,
  TerasSelectableRow,
  TerasStatusPill,
  TerasTechnicalDetails,
  TerasTextField,
} from "@/teras";
import type { DeliveryArtNode } from "../../../../domain/delivery-execution.ts";
import {
  technicalPlanWorkLabel, technicalPlanWorkReference, type TechnicalPlanDraft,
} from "../../../../work-model/execution/technical-plan-model.ts";

const scopeLimit = 50;
const workId = (item: DeliveryArtNode) => `work-item-${item.legacy_work_package_id}`;

// Plan entries can include more than one reference, for example a merge dependency.
const workReference = /(\b(?:Epic|Feature|User story|Defect|Risk|PI Objective|Milestone|Task|Work item) #\d+)(?= - |$)/;

export function TechnicalPlanWorkTitle({ label }: { label: string }) {
  return label.split(workReference).map((part, index) => index % 2
    ? <TerasPlanning.WorkReference key={index} >{part}</TerasPlanning.WorkReference>
    : part);
}

type WorkOption = { label: string; value: string; repository?: string | null };

export function TechnicalPlanWorkPicker({ label, items, selected, disabled, itemDisabled, fill, onToggle }: {
  label: string;
  items: readonly WorkOption[];
  selected: ReadonlySet<string>;
  disabled: boolean;
  itemDisabled?: (item: WorkOption) => boolean;
  fill?: boolean;
  onToggle: (workId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedOnly, setSelectedOnly] = useState(false);
  const search = query.trim().toLowerCase();
  const showFilters = items.length > 8 || Boolean(query) || selectedOnly;
  const visibleItems = items.filter(item =>
    (!selectedOnly || selected.has(item.value)) &&
    (!search || `${item.label} ${item.repository ?? ""}`.toLowerCase().includes(search)));

  return <TerasPlanning.WorkPicker spacing="compact" role="group" aria-label={label}>
    {showFilters ? <TerasPlanning.SearchRow>
      <TerasTextField label="Find work" placeholder="Title or number" value={query} onValueChange={setQuery} />
      <TerasPlanning.FilterAction emphasis="secondary" aria-pressed={selectedOnly}
        onClick={() => setSelectedOnly(value => !value)}>Selected only</TerasPlanning.FilterAction>
    </TerasPlanning.SearchRow> : null}
    {visibleItems.length ? <TerasList ariaLabel={label} frame="contained"
      fit={fill ? "fill" : "content"} scrollHeight={fill ? undefined : "medium"}>
      {visibleItems.map(item => <TerasSelectableRow key={item.value}
        label={<TerasPlanning.ItemTitle><TechnicalPlanWorkTitle label={item.label} /></TerasPlanning.ItemTitle>}
        detail={<TerasPlanning.ItemDetail>Repository: {item.repository || "Not recorded"}</TerasPlanning.ItemDetail>}
        selected={selected.has(item.value)} disabled={disabled || itemDisabled?.(item)}
        onSelect={() => onToggle(item.value)} />)}
    </TerasList> : <TerasEmptyState>No work matches this view.</TerasEmptyState>}
  </TerasPlanning.WorkPicker>;
}

function scopeGroups(nodes: DeliveryArtNode[]) {
  const parents = new Map(nodes.flatMap(parent => parent.children.map(child => [child.id, parent] as const)));
  const groups = new Map<string, { title: string; reference?: string; items: DeliveryArtNode[] }>();
  for (const item of nodes) {
    if (!item.legacy_work_package_id) continue;
    let feature: DeliveryArtNode | undefined = item;
    while (feature && feature.component_type !== "Feature") feature = parents.get(feature.id);
    const key = feature?.id ?? "package";
    const group = groups.get(key) ?? {
      title: feature?.title ?? "Package-level work",
      reference: feature?.legacy_work_package_id ? technicalPlanWorkReference(feature) : undefined,
      items: [],
    };
    group.items.push(item);
    groups.set(key, group);
  }
  return [...groups.entries()];
}

export function TechnicalPlanScope({
  plan, nodes, editable, loading, workTitle, workReason, guidance, onScopeChange, onRationaleChange,
}: {
  plan: TechnicalPlanDraft; nodes: DeliveryArtNode[]; editable: boolean; loading: boolean;
  workTitle?: string; workReason?: string; guidance?: ReactNode;
  onScopeChange: (ids: string[]) => void; onRationaleChange: (value: string) => void;
}) {
  const groups = useMemo(() => scopeGroups(nodes), [nodes]);
  const parents = useMemo(() => new Map(nodes.flatMap(parent => parent.children.map(child => [child.id, parent] as const))), [nodes]);
  const present = useMemo(() => new Set(nodes.filter(node => node.legacy_work_package_id).map(workId)), [nodes]);
  const selected = new Set(plan.coveredWorkItemIds);
  const [query, setQuery] = useState("");
  const [selectedOnly, setSelectedOnly] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const search = query.trim().toLowerCase();
  const unavailable = plan.coveredWorkItemIds.filter(id => !present.has(id));
  const visibleGroups = groups.map(([key, group]) => {
    const label = group.reference ? `${group.reference} - ${group.title}` : group.title;
    const visible = group.items.filter(item => (!selectedOnly || selected.has(workId(item))) &&
      (!search || `${label} ${technicalPlanWorkLabel(item)}`.toLowerCase().includes(search)));
    return { key, group, label, visible };
  }).filter(({ visible }) => visible.length > 0);

  function toggle(ids: string[], include: boolean) {
    const next = include ? [...new Set([...selected, ...ids])] : [...selected].filter(id => !ids.includes(id));
    if (next.length <= scopeLimit) onScopeChange(next);
  }

  return <TerasPlanning.ScopeStack spacing="normal">
    {workTitle ? <TerasContentTray kicker="Opened from a work item" title={workTitle} description={workReason} /> : null}
    <TerasPlanning.ScopeColumns>
      <TerasPlanning.WorkTreePanel treatment="neutral" frame="padded" density="compact" spacing="normal">
        <TerasPanelHeader kicker="Package tree" title="Work to include"
          description="Choose the work items this plan covers. Expand a feature to see its items."
          statusLabel={`${selected.size} in scope`} />
        <TerasPlanning.SearchRow>
          <TerasTextField label="Find work to include" placeholder="Search titles or item numbers" value={query} onValueChange={setQuery} />
          <TerasPlanning.FilterAction emphasis="secondary" aria-pressed={selectedOnly}
            onClick={() => setSelectedOnly(value => !value)}>Included only</TerasPlanning.FilterAction>
        </TerasPlanning.SearchRow>
        {loading ? <TerasLoadingState inline label="Reading the recorded plan…" /> :
          <TerasPlanning.WorkTree role="region" aria-label="Package work by Feature" scroll tabIndex={0}>
            {visibleGroups.map(({ key, group, label, visible }) => {
              const count = group.items.filter(item => selected.has(workId(item))).length;
              const visibleIds = visible.map(workId);
              const allIncluded = visibleIds.every(id => selected.has(id));
              const additions = visibleIds.filter(id => !selected.has(id)).length;
              const open = expanded[key] ?? (key === "package" || groups.length === 1);
              return <TerasPlanning.WorkGroup key={key} open={Boolean(search) || open}>
                <summary onClick={event => {
                  event.preventDefault();
                  if (!search) setExpanded(current => ({ ...current, [key]: !open }));
                }}>
                  <ChevronRight size={15} aria-hidden="true" />
                  <span>{group.reference ? <><TerasPlanning.WorkReference>{group.reference}</TerasPlanning.WorkReference>{" - "}</> : null}{group.title}</span>
                  <small>{count} of {group.items.length}<TerasPlanning.AccessibleText> included</TerasPlanning.AccessibleText></small>
                </summary>
                <TerasFieldStack spacing="compact">
                  {editable && visible.length > 1 ? <TerasActionRow>
                    <TerasActionButton emphasis="secondary" size="table-compact"
                      disabled={!allIncluded && selected.size + additions > scopeLimit}
                      onClick={() => toggle(visibleIds, !allIncluded)}>
                      {allIncluded ? "Remove shown items" : "Include shown items"}
                    </TerasActionButton>
                  </TerasActionRow> : null}
                  <TerasList frame="contained" ariaLabel={label}>
                    {visible.map(item => {
                      const parent = parents.get(item.id);
                      const parentRef = parent?.legacy_work_package_id && technicalPlanWorkReference(parent);
                      const repository = item.owner_repo ? `Repository: ${item.owner_repo}` : selected.has(workId(item)) ? "Repository missing in Delivery" : "";
                      const detail = [repository, parentRef && (search || parentRef !== group.reference) ? `Parent: ${parentRef}` : ""].filter(Boolean).join(" · ");
                      return <TerasSelectableRow key={item.id}
                        label={<TerasPlanning.ItemTitle>
                          <TerasPlanning.WorkReference>{technicalPlanWorkReference(item)}</TerasPlanning.WorkReference>{" - "}{item.title}
                        </TerasPlanning.ItemTitle>}
                        detail={detail ? <TerasPlanning.ItemDetail>{detail}</TerasPlanning.ItemDetail> : undefined}
                        selected={selected.has(workId(item))}
                        disabled={!editable || selected.size >= scopeLimit && !selected.has(workId(item))}
                        onSelect={() => toggle([workId(item)], !selected.has(workId(item)))} />;
                    })}
                  </TerasList>
                </TerasFieldStack>
              </TerasPlanning.WorkGroup>;
            })}
            {!visibleGroups.length ? <TerasEmptyState>No work matches this view.</TerasEmptyState> : null}
          </TerasPlanning.WorkTree>}
        {selected.size >= scopeLimit ? <TerasStatusPill tone="info">50 items in scope · plan limit reached</TerasStatusPill> : null}
        {unavailable.length ? <TerasTechnicalDetails summary={`${unavailable.length} saved items unavailable in the package tree`} items={[]}>
          <TerasFieldStack spacing="compact">{unavailable.map(id => <TerasContentTray key={id}
            title={<TerasPlanning.WorkReference>{id.replace("work-item-", "Work item #")}</TerasPlanning.WorkReference>}
            actions={editable ? <TerasActionButton emphasis="secondary" size="table-compact" onClick={() => toggle([id], false)}>Remove from scope</TerasActionButton> : undefined} />)}</TerasFieldStack>
        </TerasTechnicalDetails> : null}
      </TerasPlanning.WorkTreePanel>
      <TerasPlanning.ApproachPanel treatment="neutral" frame="padded" density="compact" spacing="normal" overflow="auto">
        <TerasPanelHeader kicker="Approach" title="Why plan this work?"
          description="Describe what this plan coordinates and its limits." />
        <TerasPlanning.ApproachNote label="Plan summary and justification" value={plan.rationale} disabled={!editable}
          fill placeholder="For example, release the contact service before enabling the form so submissions reach the inbox."
          onValueChange={onRationaleChange} />
        {guidance}
      </TerasPlanning.ApproachPanel>
    </TerasPlanning.ScopeColumns>
  </TerasPlanning.ScopeStack>;
}
