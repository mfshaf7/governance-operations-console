"use client";

import { useId, useMemo, useState } from "react";
import {
  TerasPlanning,
  TerasContentTray,
  TerasDialog,
  TerasEmptyState,
  TerasFieldStack,
  TerasList,
  TerasPanelHeader,
  TerasSelectableRow,
  TerasSelectField,
  TerasTechnicalDetails,
} from "@/teras";
import { ContextBoardSequenceView } from "../../../../product-adapters/context-board/index.ts";
import { technicalPlanSequence, technicalPlanSequenceApprovalTitles, technicalPlanSequenceLayout } from "../../../../work-model/execution/technical-plan-sequence.ts";
import { TechnicalPlanValue } from "./technical-plan-review.tsx";
import { TechnicalPlanWorkTitle } from "./technical-plan-overview.tsx";

const sequenceModes = [
  { value: "changes", label: "Changes & approvals" },
  { value: "work", label: "Work item dependencies" },
];

const sequenceReferenceViews = [
  { value: "map", label: "Dependency map" },
  { value: "browse", label: "Browse" },
  { value: "selected", label: "Selected item" },
] as const;

function relationLabel(value: string, outgoing: boolean) {
  if (value === "land before") return outgoing ? "Followed by" : "Land this change first";
  if (value === "complete before start") return outgoing ? "Unblocks start" : "Complete before starting";
  if (value === "complete before closeout") return outgoing ? "Unblocks closeout" : "Complete before closing";
  return `Approval · ${value}`;
}

export function TechnicalPlanSequenceView({ architecture, titles, sourceLabel }: {
  architecture: unknown; titles: Record<string, string>; sourceLabel: string;
}) {
  const [mode, setMode] = useState<"changes" | "work">("changes");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [browseGroupId, setBrowseGroupId] = useState("source");
  const [focusHistory, setFocusHistory] = useState<{ id: string; query: string; groupId: string }[]>([]);
  const [full, setFull] = useState(false);
  const [referenceView, setReferenceView] = useState<typeof sequenceReferenceViews[number]["value"]>("map");
  const browsePanelId = useId();
  const result = useMemo(() => {
    try {
      const plan = technicalPlanSequence(architecture, mode, titles);
      return { plan, layout: technicalPlanSequenceLayout(plan), error: null };
    } catch (error) {
      return { plan: null, layout: null, error: error instanceof Error ? error.message : "The sequence could not be displayed." };
    }
  }, [architecture, mode, titles]);

  const { plan, layout } = result;
  if (!plan || !layout) return <TerasEmptyState>{result.error}</TerasEmptyState>;
  const nodes = new Map(plan.nodes.map(node => [node.id, node]));
  const detailTitles = { ...titles, ...technicalPlanSequenceApprovalTitles(architecture, titles),
    ...Object.fromEntries(plan.nodes.map(node => [node.id, node.title])) };
  const changes = plan.nodes.filter(node => node.kind === "change" && node.facts.source_backed === true)
    .sort((left, right) => (layout.positions.get(left.id)?.x ?? 0) - (layout.positions.get(right.id)?.x ?? 0));
  const groups = (mode === "work" ? [{ id: "work", label: "Work items", title: "Work items", items: plan.nodes }] : [
    { id: "source", label: "Source changes", title: layout.cyclic ? "Source changes" : "Source changes in dependency order", items: changes },
    { id: "approvals", label: "Approvals", title: "Approvals", items: plan.nodes.filter(node => node.kind === "approval") },
    { id: "other", label: "Other groups", title: "Other change groups", items: plan.nodes.filter(node => node.kind === "change" && node.facts.source_backed !== true) },
  ]).filter(group => group.items.length);
  const matchingItems = (items: typeof plan.nodes, value: string) => {
    const search = value.trim().toLowerCase();
    return items.filter(node => `${node.title} ${node.detail}`.toLowerCase().includes(search));
  };
  const visibleGroups = groups.map(group => ({ ...group, items: matchingItems(group.items, query) }));
  const browseGroup = visibleGroups.find(group => group.id === browseGroupId) ?? visibleGroups[0];
  const showTabs = visibleGroups.length > 1;
  const list = visibleGroups.flatMap(group => group.items);
  const selected = list.find(node => node.id === selectedId) ?? list[0];
  const incoming = selected ? plan.edges.filter(edge => edge.to === selected.id) : [];
  const outgoing = selected ? plan.edges.filter(edge => edge.from === selected.id) : [];
  const focusIds = new Set(selected ? [selected.id, ...incoming.map(edge => edge.from), ...outgoing.map(edge => edge.to)] : []);
  const focusedPlan = { nodes: plan.nodes.filter(node => focusIds.has(node.id)), edges: [...incoming, ...outgoing], issues: [] };

  function selectItem(id: string, clearSearch = false) {
    if (selected && selected.id !== id) {
      setFocusHistory(history => [...history, { id: selected.id, query, groupId: browseGroup?.id ?? browseGroupId }]);
    }
    if (clearSearch) setQuery("");
    setSelectedId(id);
    const group = groups.find(group => group.items.some(item => item.id === id));
    if (group) setBrowseGroupId(group.id);
  }

  function restoreFocus() {
    const previous = focusHistory.at(-1);
    if (!previous) return;
    setFocusHistory(history => history.slice(0, -1));
    setSelectedId(previous.id);
    setQuery(previous.query);
    setBrowseGroupId(previous.groupId);
  }

  function searchItems(value: string) {
    setQuery(value);
    if (!value.trim() || groups.some(group => group.id === browseGroup?.id && matchingItems(group.items, value).length)) return;
    const match = groups.find(group => matchingItems(group.items, value).length);
    if (match) setBrowseGroupId(match.id);
  }

  function renderRelations(edges: typeof incoming, outbound = false) {
    return <TerasPlanning.Relationships>{edges.map((edge, index) => {
      const targetId = outbound ? edge.to : edge.from;
      const related = nodes.get(targetId);
      return <li key={index}>
        {related ? <TerasSelectableRow
          label={<TerasPlanning.ItemTitle><TechnicalPlanWorkTitle label={related.title} /></TerasPlanning.ItemTitle>}
          detail={<TerasPlanning.ItemDetail>{relationLabel(edge.label, outbound)}</TerasPlanning.ItemDetail>}
          onSelect={() => selectItem(related.id, true)} /> :
          <span>{relationLabel(edge.label, outbound)} · {titles[targetId] ?? "Item not available in this view"}</span>}
      </li>;
    })}</TerasPlanning.Relationships>;
  }

  return <TerasPlanning.Sequence aria-label="Implementation sequence" role="group" data-reference-view={referenceView}>
    <TerasPlanning.ReferenceTabs ariaLabel="Sequence panels"
      size="compact" options={sequenceReferenceViews} value={referenceView} onValueChange={setReferenceView} />
    <TerasPlanning.MapPanel treatment="neutral" frame="padded" density="compact"
      spacing="compact" layout="header-body" aria-label="Generated dependency diagram" data-reference-panel={referenceView === "map"}>
      <TerasPlanning.MapHeader>
        <TerasPlanning.MapHeading kicker="Dependency map" title="Implementation sequence"
          description={mode === "work" ? "See when work can start or close." : "See change order and required approvals."} />
        <TerasPlanning.MapFilters role="group" aria-label="Sequence view and focus">
          <TerasSelectField label="Sequence view" value={mode} options={sequenceModes}
            onValueChange={value => {
              setMode(value === "work" ? "work" : "changes");
              setSelectedId(null);
              setBrowseGroupId("source");
              setFocusHistory([]);
              setQuery("");
            }} />
          <TerasSelectField label="Diagram focus" value={selected?.id ?? ""} disabled={!list.length}
            options={list.length ? list.map(node => ({
              value: node.id,
              label: node.title,
              content: <TerasPlanning.FocusLabel><TechnicalPlanWorkTitle label={node.title} /></TerasPlanning.FocusLabel>,
            })) : [{ value: "", label: "No matching items" }]}
            onValueChange={selectItem} />
        </TerasPlanning.MapFilters>
        <TerasPlanning.MapAction emphasis="secondary" size="table-compact" disabled={!plan.nodes.length}
          onClick={() => setFull(true)}>Open full map</TerasPlanning.MapAction>
      </TerasPlanning.MapHeader>
      <TerasPlanning.ReferenceRegion  fill scroll role="region" aria-label="Sequence content" tabIndex={0}>
        <TerasFieldStack spacing="normal">
          {layout.cyclic ? <TerasEmptyState>This plan has a circular dependency. Review the linked items before approval.</TerasEmptyState> : null}
          {plan.issues.length ? <TerasTechnicalDetails summary={`${plan.issues.length} sequence issues`}
            items={plan.issues.map((value, index) => ({ label: `Issue ${index + 1}`, value }))} /> : null}
          {selected ? <ContextBoardSequenceView key={mode} fit="embedded"
              plan={focusedPlan} sourceLabel={sourceLabel} selectedId={selected.id}
              onSelectNode={id => selectItem(id, true)} onBack={focusHistory.length ? restoreFocus : undefined} />
            : <TerasEmptyState>{plan.nodes.length ? "No items match this search." : "Add change groups in Work & Changes or dependencies in Sequence & Handoffs."}</TerasEmptyState>}
        </TerasFieldStack>
      </TerasPlanning.ReferenceRegion>
    </TerasPlanning.MapPanel>
    <TerasPlanning.SequenceBrowse treatment="neutral" frame="padded" density="compact"
      spacing="compact" fit="fill" layout={showTabs ? "header-toolbar-body" : "header-body"}
      aria-label="Browse sequence" data-reference-panel={referenceView === "browse"}>
      <TerasPlanning.SequenceHeading kicker="Browse" title="Sequence items"
        description="Select an item to focus." actionsLayout="inline"
        actions={<TerasPlanning.SequenceSearch label="Find in sequence" labelVisibility="hidden" density="compact"
          placeholder="Find an item" value={query} onValueChange={searchItems} />} />
      {showTabs ? <TerasPlanning.SequenceTabs ariaLabel="Browse categories" layout="fill" size="compact"
        tabPanelId={browsePanelId} value={browseGroup.id}
        options={visibleGroups.map(group => ({ value: group.id, label: group.label }))} onValueChange={setBrowseGroupId} /> : null}
      <TerasPlanning.ReferenceRegion key={browseGroup?.id}  fill scroll role="region" aria-label="Sequence items" tabIndex={0}>
        <TerasFieldStack spacing="compact" role={showTabs ? "tabpanel" : undefined} id={showTabs ? browsePanelId : undefined}
          aria-labelledby={showTabs ? `${browsePanelId}-tab-${browseGroup.id}` : undefined}>
          {browseGroup?.items.length ? <TerasList ariaLabel={browseGroup.title} frame="contained">
            {browseGroup.items.map((node, index) => <TerasSelectableRow key={`${node.id}:${index}`}
              label={<TerasPlanning.ItemTitle><TechnicalPlanWorkTitle label={node.title} /></TerasPlanning.ItemTitle>}
              detail={<TerasPlanning.ItemDetail>{node.detail}</TerasPlanning.ItemDetail>}
              selected={selected?.id === node.id} onSelect={() => selectItem(node.id)} />)}
          </TerasList> : <TerasEmptyState>{plan.nodes.length ? "No matching items in this category." : "No items in this sequence."}</TerasEmptyState>}
        </TerasFieldStack>
      </TerasPlanning.ReferenceRegion>
    </TerasPlanning.SequenceBrowse>
    <TerasPlanning.SequenceSelection treatment="neutral" frame="padded" density="compact"
      spacing="compact" fit="fill" layout="header-body" aria-label="Selected sequence item" data-reference-panel={referenceView === "selected"}>
      <TerasPlanning.SequenceHeading kicker="Selected item" title="Direct connections"
        description="See prerequisites and next steps." />
      <TerasPlanning.ReferenceRegion  fill scroll role="region" aria-label="Direct connections" tabIndex={0}>
        {selected ? <TerasFieldStack spacing="normal">
          <TerasPlanning.FocusedFlow role="list" aria-label="Focused dependency diagram" >
            <li><TerasContentTray title="Before this work" description={incoming.length ? undefined : "No direct prerequisites recorded."}>
              {incoming.length ? renderRelations(incoming) : null}
            </TerasContentTray></li>
            <li>
              <TerasPlanning.FocusCard frame="padded" density="compact" spacing="compact" treatment="rail" tone="info">
                <TerasPanelHeader kicker="In focus" title={<TechnicalPlanWorkTitle label={selected.title} />}
                  description={selected.detail} />
              </TerasPlanning.FocusCard>
            </li>
            <li><TerasContentTray title="What this unblocks" description={outgoing.length ? undefined : "No direct dependents recorded."}>
              {outgoing.length ? renderRelations(outgoing, true) : null}
            </TerasContentTray></li>
          </TerasPlanning.FocusedFlow>
          <TerasTechnicalDetails summary="Selected element details" items={[]}>
            <TechnicalPlanValue value={selected.facts} titles={detailTitles} compact />
          </TerasTechnicalDetails>
        </TerasFieldStack> : <TerasEmptyState>Choose an item from Browse to see its connections.</TerasEmptyState>}
      </TerasPlanning.ReferenceRegion>
    </TerasPlanning.SequenceSelection>
    <TerasDialog open={full} onClose={() => setFull(false)} title="Full dependency map" kicker={sourceLabel}
      description="Read left to right. Select a node to highlight its direct connections."
      width="wide" height="fill" contentOverflow="hidden">
      {full ? <ContextBoardSequenceView key={mode} fit="workspace" initialScale={1}
        plan={plan} sourceLabel={sourceLabel}
        renderTitle={node => <TechnicalPlanWorkTitle label={node.title} />}
        renderDetails={node => <TechnicalPlanValue value={node.facts} titles={detailTitles} compact />} /> : null}
    </TerasDialog>
  </TerasPlanning.Sequence>;
}
