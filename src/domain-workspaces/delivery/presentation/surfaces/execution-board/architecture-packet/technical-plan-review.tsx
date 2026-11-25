"use client";

import { useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import {
  TerasPlanning,
  TerasActionButton,
  TerasActionRow,
  TerasContentTray,
  TerasDialog,
  TerasEmptyState,
  TerasFieldGrid,
  TerasFieldStack,
  TerasList,
  TerasMetadataList,
  TerasPanel,
  TerasPanelHeader,
  TerasSelectField,
  TerasStatItem,
  TerasStatusPill,
  TerasTechnicalDetails,
  TerasTextField,
} from "@/teras";
import { technicalPlanCaseEntry, technicalPlanGroups, technicalPlanEntryName, technicalPlanOptionLabels,
  technicalPlanVerificationReaders } from "../../../../work-model/execution/technical-plan-preparation.ts";
import { technicalPlanChangeGroupName, technicalPlanDisplayLabel, technicalPlanOverviewFacts, technicalPlanSection, technicalPlanSectionValue, type TechnicalPlanDraft } from "../../../../work-model/execution/technical-plan-model.ts";
import { architectureFormContract, planFieldLabel } from "../../../../work-model/execution/architecture-form-model.ts";
import { architecturePacketInputFromEditor } from "./architecture-packet-editor-model.ts";
import { isSourceRevision, sourceRevisionSummary } from "./technical-plan-source-facts.tsx";
import { TechnicalPlanEntryPage, useTechnicalPlanEntryPage } from "./technical-plan-entry-page.tsx";
import { TechnicalPlanWorkTitle } from "./technical-plan-overview.tsx";
const protocolCheckLabels = new Map(architectureFormContract.requiredProtocolDimensions.map(id => [id, planFieldLabel(id)]));

const reviewEnumFields = new Set([
  "polarity", "fidelity", "target_readiness", "blocked_transition", "source_activation_posture", "observed_posture",
]);

function reviewValueText(value: unknown, titles: Record<string, string>, key?: string, compact = false) {
  if (value === null || value === undefined || value === "") return "Not recorded";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  const text = String(value);
  if (key && reviewEnumFields.has(key)) return technicalPlanOptionLabels[text] ?? text;
  return titles[text] ?? protocolCheckLabels.get(text) ?? (compact ? text.replace(/^work-item-([1-9]\d*)$/, "Work item #$1") : text);
}

export function TechnicalPlanValue({ value, name = "Plan", titles = {}, fill = false, compact = false }: {
  value: unknown; name?: string; titles?: Record<string,string>; fill?: boolean; compact?: boolean;
}) {
  if (value === null || value === undefined || value === "") return <TerasEmptyState>Not recorded</TerasEmptyState>;
  if (Array.isArray(value)) {
    if (!value.length) return <TerasEmptyState>No entries recorded</TerasEmptyState>;
    if (value.every(item => item === null || typeof item !== "object")) return <TerasList frame="contained" ariaLabel={name}>
      {value.map((item, index) => <TerasPlanning.ReaderEntry role="listitem" key={index}>
        {compact ? <TerasPlanning.ItemTitle><TechnicalPlanWorkTitle label={reviewValueText(item, titles, undefined, true)} /></TerasPlanning.ItemTitle>
          : <span>{reviewValueText(item, titles)}</span>}
      </TerasPlanning.ReaderEntry>)}
    </TerasList>;
    return <TechnicalPlanEntries value={value} name={name} titles={titles} fill={fill} compact={compact} />;
  }
  if (typeof value !== "object") return <p>{reviewValueText(value, titles, undefined, compact)}</p>;
  const rows = Object.entries(value);
  if (!rows.length) return <TerasEmptyState>Not recorded</TerasEmptyState>;
  const facts = [], text = [], records = [], technical = [];
  for (const [key, item] of rows) {
    const label = technicalPlanDisplayLabel(key);
    if (item && typeof item === "object") {
      records.push({ key, label, item });
      continue;
    }
    const observed = reviewValueText(item, titles, key, compact);
    if (key === "id" || compact && key === "gate_id") {
      technical.push({ label, value: compact ? reviewValueText(item, {}) : observed });
    } else if (compact && (key === "work_item_id" || key === "authority_work_item_id")) {
      text.push({ key, label, value: <TerasPlanning.ItemTitle><TechnicalPlanWorkTitle label={observed} /></TerasPlanning.ItemTitle> });
    } else if (key === "expected_outcome" || compact && key === "evidence_requirement" || observed.length > 155 || observed.includes("\n")) {
      text.push({ key, label, value: observed });
    } else facts.push({ label, value: observed });
  }
  return <TerasFieldStack spacing={compact ? "compact" : "normal"}>
    {facts.length ? <TerasPlanning.Metadata presentation={compact ? "relationships" : "review"} columns={3} items={facts} /> : null}
    {text.map(item => <TerasContentTray key={item.key} title={item.label} description={item.value} descriptionFormat="lines" />)}
    {records.map(({ key, label, item }) => <TerasPlanning.FactsTray key={key} title={label}>
      <TechnicalPlanValue value={item} name={label} titles={titles} compact={compact} />
    </TerasPlanning.FactsTray>)}
    {technical.length ? compact && technical.length === 1
      ? <TerasPlanning.RecordDetails role="group" aria-label="Record details">
        <p>Record details</p>
        <TerasMetadataList shape="list" items={technical} />
      </TerasPlanning.RecordDetails>
      : <TerasTechnicalDetails items={technical} summary="Record details" /> : null}
  </TerasFieldStack>;
}

function TechnicalPlanEntries({ value, name, titles, fill, compact }: {
  value: unknown[]; name: string; titles: Record<string, string>; fill: boolean; compact: boolean;
}) {
  const [search, setSearch] = useState("");
  const entries = value.map((entry, index) => {
    if (entry && typeof entry === "object" && "expected_outcome" in entry && "polarity" in entry)
      return technicalPlanCaseEntry(entry, index, titles);
    const label = technicalPlanEntryName(entry, index, titles);
    const detail = isSourceRevision(entry) ? sourceRevisionSummary(entry) : undefined;
    return { index, label, detail, searchText: [label, detail].join(" ") };
  });
  const page = useTechnicalPlanEntryPage(entries.map(entry => entry.index));
  const current = page.selected === null ? null : entries[page.selected];
  if (current) return <TechnicalPlanEntryPage title={current.label} category={name} heading={page.heading} onBack={page.back}>
    <TechnicalPlanValue value={value[current.index]} titles={titles} compact={compact} />
  </TechnicalPlanEntryPage>;
  const visible = entries.filter(entry => entry.searchText.toLowerCase().includes(search.trim().toLowerCase()));
  return <TerasPlanning.ReaderList ref={page.browse} tabIndex={-1} fill={fill}>
    <TerasFieldStack spacing="compact" fill={fill && visible.length ? "last" : undefined}>
      {value.length > 8 || search ? <TerasTextField label={`Find ${name.toLowerCase()}`} value={search} onValueChange={setSearch} /> : null}
      {visible.length ? <TerasList frame="contained" fit={fill ? "fill" : "content"} scrollHeight={fill ? undefined : "medium"} ariaLabel={name}>
        {visible.map(entry => <TerasPlanning.InspectionRow key={entry.index}
          label={<TerasPlanning.ItemTitle>{compact ? <TechnicalPlanWorkTitle label={entry.label} /> : entry.label}</TerasPlanning.ItemTitle>}
          detail={entry.detail ? <TerasPlanning.ItemDetail>{entry.detail}</TerasPlanning.ItemDetail> : undefined} status={<ChevronRight size={15} aria-hidden="true" />}
          aria-pressed={undefined} data-plan-entry-key={entry.index} onSelect={() => page.open(entry.index)} />)}
      </TerasList> : <TerasEmptyState>No entries match this search.</TerasEmptyState>}
    </TerasFieldStack>
  </TerasPlanning.ReaderList>;
}

function CoveredWorkReader({ work, titles, fill }: { work: string[]; titles: Record<string, string>; fill: boolean }) {
  const [query, setQuery] = useState("");
  const visible = work.filter(id => `${id.replace("work-item-", "#")} ${titles[id] ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <TerasPlanning.ReaderList fill={fill}>
    <TerasFieldStack spacing="compact" fill={fill && visible.length ? "last" : undefined}>
      <TerasTextField label="Find covered work" placeholder="Work name or number" value={query} onValueChange={setQuery} />
      {visible.length ? <TerasList frame="contained" fit={fill ? "fill" : "content"} ariaLabel="Covered work">
        {visible.map(id => <TerasPlanning.ReaderEntry key={id} role="listitem" >
          <span>{titles[id] ?? id.replace("work-item-", "Work item #")}</span>
          {titles[id] && !titles[id].includes(id.replace("work-item-", "#")) ? <small>{id.replace("work-item-", "#")}</small> : null}
        </TerasPlanning.ReaderEntry>)}
      </TerasList> : <TerasEmptyState>No covered work matches this search.</TerasEmptyState>}
    </TerasFieldStack>
  </TerasPlanning.ReaderList>;
}

type ReviewReader = "rationale" | "scope" | "decisions" | "recovery" | { section: string };

export function TechnicalPlanReview({ editor, titles, sourceLabel, approval }: {
  editor: TechnicalPlanDraft; titles: Record<string, string>; sourceLabel: string; approval?: ReactNode;
}) {
  const [groupId, setGroupId] = useState<string>(technicalPlanGroups[0].id);
  const [reader, setReader] = useState<ReviewReader | null>(null);
  let architecture: Record<string, unknown>, verification: Record<string, unknown>;
  try {
    const input = architecturePacketInputFromEditor(editor, "draft");
    architecture = input.architecture;
    verification = input.conformance_plan;
  } catch {
    return <TerasEmptyState>Review the saved draft in Plan the changes to resolve the section that could not be opened.</TerasEmptyState>;
  }
  const scope = editor.coveredWorkItemIds.filter(Boolean);
  if (!scope.length && !editor.rationale.trim() && !Object.keys(architecture).some(key => key !== "descendant_owner_map"))
    return <TerasEmptyState>Choose scope and plan the changes to begin a review.</TerasEmptyState>;
  const count = (value: unknown) => Array.isArray(value) ? value.length : null;
  const facts = technicalPlanOverviewFacts(editor);
  const changes = Array.isArray(architecture.landing_units) ? architecture.landing_units : null;
  const decisions = Array.isArray(architecture.contradictions_open_decisions) ?
    architecture.contradictions_open_decisions.filter(decision => decision?.status === "open") : null;
  const recovery = architecture.rollback_cleanup_terminal_conditions;
  const group = technicalPlanGroups.find(item => item.id === groupId) ?? technicalPlanGroups[0];
  const groupTitles = changes?.reduce((labels, change) => {
    if (typeof change?.id === "string") labels[change.id] = technicalPlanChangeGroupName(change, titles);
    return labels;
  }, { ...titles }) ?? titles;

  const verificationSettings = {
    "verification-coverage": { title: technicalPlanVerificationReaders.coverage, keys: ["dimensions", "work_item_dimension_applicability"] },
    "verification-settings": { title: technicalPlanVerificationReaders.settings, keys: ["protocol_applicability", "git_causality"] },
  };
  const sectionKeys = group.id === "verification"
    ? ["conformance_plan:cases", "verification-coverage", "verification-settings"] : group.sections;
  const sections = sectionKeys.map(section => {
    if (section === "verification-coverage" || section === "verification-settings") {
      const { title, keys } = verificationSettings[section];
      const value = Object.fromEntries(keys.filter(key => verification[key] !== undefined).map(key => [key, verification[key]]));
      const available = Object.keys(value).length > 0;
      return { section, title, value, available, detail: available ? undefined : "Not recorded" };
    }
    const [, title] = technicalPlanSection(section);
    try {
      const value = technicalPlanSectionValue(editor, section);
      const available = value != null && value !== "" && (!Array.isArray(value) || value.length > 0);
      return { section, title, value, available, detail: Array.isArray(value) && value.length
        ? `${value.length} ${value.length === 1 ? "entry" : "entries"}`
        : available ? undefined
          : section === "architecture:authorization_session_execution_model" && value === null ? "Standard installation rules"
          : section === "architecture:lifecycle_state_model" && value === null ? "No lifecycle changes"
          : section === "architecture:evidence_receipt_handoffs" && Array.isArray(value) ? "No handoff needed"
          : Array.isArray(value) ? "No entries recorded" : "Not recorded" };
    } catch { return { section, title, value: null, available: false, detail: "Could not read this section" }; }
  });
  const selection = typeof reader === "object" && reader ? sections.find(item => item.section === reader.section) : null;
  const readerTitle = selection?.title ?? (reader === "scope" ? "Covered work" :
    reader === "decisions" ? "Open decisions" : reader === "recovery" ? "Recovery plan" : "Plan rationale");
  const readerCount = reader === "scope" ? scope.length : reader === "decisions" ? decisions?.length : count(selection?.value);
  const fillReader = (readerCount ?? 0) > 8;

  return <TerasFieldStack spacing="normal">
    <TerasPanel treatment="neutral" frame="padded" density="compact" spacing="normal">
      <TerasPanelHeader kicker={sourceLabel} title="Plan summary" actionsLayout="inline"
        actions={editor.rationale.trim() ? <TerasActionButton emphasis="secondary" size="table-compact"
          onClick={() => setReader("rationale")}>Read plan rationale</TerasActionButton> : undefined} />
      <TerasPlanning.ReviewFacts columns={4} offset="none" aria-label="Plan review summary">
        <TerasStatItem label="Covered work" value={`${scope.length} selected`} />
        <TerasStatItem label="Source changes" value={facts.sourceGroups == null ? "To define" : `${facts.sourceGroups} groups`} />
        <TerasStatItem label="Required approvals" value={count(architecture.required_human_gates) ?? "To define"} />
        <TerasStatItem label="Verification" value={verification.required === true ?
          facts.verificationCases == null ? "Checks to define" : `${facts.verificationCases} planned cases` :
          "Required for approval"} />
      </TerasPlanning.ReviewFacts>
      {scope.length ? <TerasActionRow spacing="compact">
        <TerasActionButton emphasis="secondary" size="table-compact" onClick={() => setReader("scope")}>View covered work</TerasActionButton>
      </TerasActionRow> : null}
    </TerasPanel>
    <TerasFieldGrid>
      <TerasPlanning.ReviewSection title="Open decisions" actions={decisions?.length ?
        <TerasStatusPill tone="warn">{decisions.length} open</TerasStatusPill> : undefined}
        description={decisions ? decisions.length ? "Inspect unresolved decisions before approving the plan." : "No open decisions in this version." : "Decision review pending."}>
        {decisions?.length ? <TerasActionRow>
          <TerasActionButton size="table-compact" emphasis="secondary" onClick={() => setReader("decisions")}>Show decision details</TerasActionButton>
        </TerasActionRow> : null}
      </TerasPlanning.ReviewSection>
      <TerasPlanning.ReviewSection title="If a change fails"
        description={recovery ? "Inspect what can be rolled back and what must be cleaned up." : "Recovery steps are still to be defined."}>
        {recovery ? <TerasActionRow>
          <TerasActionButton size="table-compact" emphasis="secondary" onClick={() => setReader("recovery")}>Show recovery details</TerasActionButton>
        </TerasActionRow> : null}
      </TerasPlanning.ReviewSection>
    </TerasFieldGrid>
    {approval}
    <TerasPlanning.ReviewSection title="Plan details">
      <TerasFieldStack spacing="normal">
        <TerasSelectField label="Review area" value={group.id} options={technicalPlanGroups.map(item => ({value:item.id,label:item.label}))} onValueChange={setGroupId} />
        <TerasList frame="contained" ariaLabel="Review sections">
          {sections.map(item => <TerasPlanning.InspectionRow key={item.section}
            aria-label={`${item.title} details`} aria-pressed={undefined}
            label={<TerasPlanning.ItemTitle>{item.title}</TerasPlanning.ItemTitle>}
            detail={item.detail ? <TerasPlanning.ItemDetail>{item.detail}</TerasPlanning.ItemDetail> : undefined}
            status={item.available ? <ChevronRight size={15} aria-hidden="true" /> : undefined}
            disabled={!item.available} onSelect={() => setReader({ section: item.section })} />)}
        </TerasList>
      </TerasFieldStack>
    </TerasPlanning.ReviewSection>
    <TerasDialog open={reader !== null} onClose={() => setReader(null)} kicker="Review plan"
      title={readerTitle}
      closeLabel={reader === "rationale" ? "Close plan rationale" : "Close review details"}
      contentOverflow="auto" height={fillReader ? "fill" : "content"} width="standard">
      {reader === "rationale" ? <TerasContentTray description={editor.rationale} descriptionFormat="lines" /> :
        reader === "scope" ? <CoveredWorkReader work={scope} titles={titles} fill={fillReader} /> :
        reader === "decisions" ? <TechnicalPlanValue value={decisions} name="Open decisions" titles={groupTitles} fill={fillReader} /> :
        reader === "recovery" ? <TechnicalPlanValue value={recovery} titles={groupTitles} /> :
        selection ? <TechnicalPlanValue value={selection.value} name={selection.title} titles={groupTitles} fill={fillReader} /> : null}
    </TerasDialog>
  </TerasFieldStack>;
}
