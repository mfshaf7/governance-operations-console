"use client";

import { useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import {
  TerasPlanning,
  TerasActionButton,
  TerasActionRow,
  TerasContentTray,
  TerasDocument,
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
import { technicalPlanChangeGroupName, technicalPlanDisplayLabel, technicalPlanOverviewFacts, technicalPlanSection, technicalPlanSectionValue, type TechnicalPlanDraft, type TechnicalPlanSection } from "../../../../work-model/execution/technical-plan-model.ts";
import { architectureFormContract, planFieldLabel } from "../../../../work-model/execution/architecture-form-model.ts";
import { architecturePacketInputFromEditor } from "./architecture-packet-editor-model.ts";
import { isAuthorizationRef, isSourceRevision, sourceRevisionSummary } from "./technical-plan-source-facts.tsx";
import { TechnicalPlanEntryPage, useTechnicalPlanEntryPage } from "./technical-plan-entry-page.tsx";
import { renderTechnicalPlanWorkReferences, TechnicalPlanWorkTitle } from "./technical-plan-overview.tsx";
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

const relatedReviewFields = [
  ["dimensions", "work_item_dimension_applicability"],
  ["protocol_applicability", "git_causality"],
  ["states", "transitions"],
  ["nodes", "edges"],
  ["start_after_work_item_ids", "close_after_work_item_ids"],
  ["allowed_capability_ids", "prohibited_capability_ids"],
  ["allowed", "prohibited"],
  ["rollback_units", "cleanup_obligations"],
  ["affected_landing_unit_ids", "evidence_prerequisite_work_item_ids"],
];
const wideReviewSections = new Set([
  "conformance_plan:cases", "verification-coverage", "verification-settings",
  "architecture:source_landing_graph", "architecture:rollback_cleanup_terminal_conditions",
  "architecture:lifecycle_state_model", "architecture:authorization_session_execution_model",
  "architecture:runtime_boundaries", "architecture:evidence_receipt_handoffs",
]);

const reviewSectionDescriptions: Partial<Record<TechnicalPlanSection, string>> = {
  "architecture:landing_units": "See which work items share a repository change and are reviewed together.",
  "architecture:required_human_gates": "Check when a person must approve the work and what evidence they need.",
  "architecture:contradictions_open_decisions": "See which questions are open and how resolved questions were answered.",
  "architecture:work_item_execution_plan": "See what must be finished before an item can start or close.",
  "architecture:source_landing_graph": "Check which repository changes must merge before others.",
  "architecture:evidence_receipt_handoffs": "See which changes depend on evidence from another repository.",
  "architecture:rollback_cleanup_terminal_conditions": "Check what to undo or clean up and how to confirm the work can close.",
  "architecture:lifecycle_state_model": "Check how the system moves between states and what permits each transition.",
  "architecture:authorization_session_execution_model": "Review the rules for opening a work session and carrying out changes.",
  "architecture:runtime_boundaries": "See which actions each component can perform while the system is running.",
  "architecture:runtime_activation_chains": "Check what needs to be enabled first and what confirms it is working.",
  "conformance_plan:cases": "Browse the success and failure checks planned for this work.",
};

const summaryReaders = {
  rationale: { title: "Plan rationale", description: "Read why this approach was chosen for the covered work." },
  scope: { title: "Covered work", description: "Confirm which work items this Technical Plan applies to." },
  decisions: { title: "Open decisions", description: "Review the choices that still need a decision." },
  recovery: {
    title: "Recovery plan",
    description: reviewSectionDescriptions["architecture:rollback_cleanup_terminal_conditions"],
  },
};

function reviewFieldLabel(key: string) {
  if (key === "nodes") return "Change groups";
  if (key === "gate_id") return "Approval ID";
  if (key === "allowed_capability_ids") return "Allowed actions";
  if (key === "prohibited_capability_ids") return "Prohibited actions";
  return technicalPlanDisplayLabel(key);
}

export function TechnicalPlanValue({ value, name = "Plan", titles = {}, fill = false, compact = false, review = false, field, entryTitle }: {
  value: unknown; name?: string; titles?: Record<string,string>; fill?: boolean; compact?: boolean;
  review?: boolean; field?: string; entryTitle?: string;
}) {
  if (value === null || value === undefined || value === "") return <TerasEmptyState>Not recorded</TerasEmptyState>;
  const readable = compact || review;
  if (Array.isArray(value)) {
    if (!value.length) return <TerasEmptyState>No entries recorded</TerasEmptyState>;
    if (value.every(item => item === null || typeof item !== "object")) {
      const capabilityIds = review && (field === "allowed_capability_ids" || field === "prohibited_capability_ids");
      const prose = review && ["rollback_units", "cleanup_obligations", "terminal_conditions"].includes(field ?? "");
      return <TerasList frame="contained" ariaLabel={name} scrollHeight={review && value.length > 8 ? "medium" : undefined}>
        {value.map((item, index) => <TerasPlanning.ReaderEntry role="listitem" key={index}>
          {capabilityIds && typeof item === "string" ? <div>
            <TerasPlanning.ItemTitle>{item.slice(item.lastIndexOf(".") + 1).replaceAll("-", " ").replace(/^./, first => first.toUpperCase())}</TerasPlanning.ItemTitle>
            <small>{item}</small>
          </div> : prose && typeof item === "string" ? <TerasDocument ariaLabel={name} content={item} renderText={renderTechnicalPlanWorkReferences} />
            : readable ? <TerasPlanning.ItemTitle>
            <TechnicalPlanWorkTitle label={reviewValueText(item, titles, undefined, true)} />
          </TerasPlanning.ItemTitle> : <span>{reviewValueText(item, titles)}</span>}
        </TerasPlanning.ReaderEntry>)}
      </TerasList>;
    }
    return <TechnicalPlanEntries value={value} name={name} titles={titles} fill={fill}
      compact={compact} review={review} rootReview={review && field === undefined} />;
  }
  if (review && isAuthorizationRef(value)) {
    const url = URL.canParse(value.uri) ? new URL(value.uri) : null;
    const canOpen = url?.protocol === "https:" && !url.username && !url.password;
    return <TerasFieldStack spacing="normal">
      {canOpen ? <TerasPlanning.FactsTray title="Authorization document"
        description="Read the document that grants authority for this work.">
        <a href={url.href} target="_blank" rel="noopener noreferrer">Open recorded document</a>
      </TerasPlanning.FactsTray> : null}
      <TerasTechnicalDetails summary="View exact reference"
        items={[{ label: "Document", value: value.uri }, { label: "SHA-256", value: value.digest }]} />
    </TerasFieldStack>;
  }
  if (typeof value !== "object") {
    const label = reviewValueText(value, titles, undefined, readable);
    return <p>{readable ? renderTechnicalPlanWorkReferences(label) : label}</p>;
  }
  const rows = Object.entries(value);
  if (!rows.length) return <TerasEmptyState>Not recorded</TerasEmptyState>;
  const handoff = review && name === "Evidence handoffs";
  const decision = review && (name === "Decisions" || name === "Open decisions");
  const handoffRoles = [
    { title: "Sending the evidence", description: "The change responsible for producing the evidence.",
      keys: ["producer", "producer_landing_unit_id", "producer_work_item_id"] },
    { title: "Receiving the evidence", description: "The change that needs the evidence before it can proceed.",
      keys: ["consumer", "consumer_landing_unit_id", "consumer_work_item_id"] },
  ];
  const facts: { key: string; label: string; value: string }[] = [];
  const text: { key: string; label: string; value: ReactNode }[] = [];
  const records: { key: string; label: string; item: object }[] = [];
  const technical: { label: string; value: string }[] = [];
  for (const [key, item] of rows) {
    const label = decision && key === "summary"
      ? "Decision" : review ? reviewFieldLabel(key) : technicalPlanDisplayLabel(key);
    if (item && typeof item === "object") {
      records.push({ key, label, item });
      continue;
    }
    const observed = decision && key === "status" && (item === "open" || item === "resolved")
      ? item === "open" ? "Open" : "Resolved" : reviewValueText(item, titles, key, readable);
    if (review && ["repo", "owner_repo", "work_item_id"].includes(key) && observed === entryTitle) continue;
    if (key === "id" || readable && key === "gate_id" || review && ["handoff_id", "chain_id"].includes(key)) {
      technical.push({ label, value: compact ? reviewValueText(item, {}) : observed });
    } else if (handoff && handoffRoles.some(role => role.keys.includes(key))) {
      facts.push({ key, label, value: observed });
    } else if (readable && (key === "work_item_id" || key === "authority_work_item_id")) {
      text.push({ key, label, value: <TerasPlanning.ItemTitle><TechnicalPlanWorkTitle label={observed} /></TerasPlanning.ItemTitle> });
    } else if (key === "expected_outcome" || readable && key === "evidence_requirement" || review && ["summary", "rationale", "session_binding", "execution_binding"].includes(key)
        || handoff && (key === "artifact" || key === "acceptance") || observed.length > 155 || observed.includes("\n")) {
      text.push({ key, label, value: observed });
    } else facts.push({ key, label, value: observed });
  }
  const pairedKeys = review ? relatedReviewFields.find(keys => records.filter(record => keys.includes(record.key)).length > 1) : undefined;
  const pairedRecords = pairedKeys?.flatMap(key => records.filter(record => key === record.key)) ?? [];
  const remainingRecords = pairedKeys ? records.filter(record => !pairedKeys.includes(record.key)) : records;
  const isCase = review && name === "Verification cases" && rows.some(([key]) => key === "expected_outcome");
  const caseFacts = ["polarity", "fidelity", "target_readiness", "evidence_owner_landing_unit_id"];
  const orderedFacts = isCase
    ? [...caseFacts.flatMap(key => facts.filter(fact => key === fact.key)), ...facts.filter(fact => !caseFacts.includes(fact.key))]
    : handoff ? facts.filter(fact => !handoffRoles.some(role => role.keys.includes(fact.key))) : facts;
  const displayFact = (fact: typeof facts[number]) => ({
    ...fact,
    value: readable ? renderTechnicalPlanWorkReferences(fact.value) : fact.value,
  });
  const factsView = orderedFacts.length ? <TerasPlanning.Metadata presentation={compact ? "relationships" : "review"} columns={3}
    items={orderedFacts.map(displayFact)} /> : null;
  const narrative = (item: typeof text[number]) => review && typeof item.value === "string"
    ? <TerasContentTray key={item.key} title={item.label}>
      <TerasDocument ariaLabel={item.label} content={item.value} renderText={renderTechnicalPlanWorkReferences} />
    </TerasContentTray>
    : <TerasContentTray key={item.key} title={item.label} description={item.value} descriptionFormat="lines" />;
  const recordPanel = ({ key, label, item }: typeof records[number]) => <TerasPlanning.FactsTray key={key} title={label}>
    <TechnicalPlanValue value={item} name={label} titles={titles} compact={compact} review={review} field={key} />
  </TerasPlanning.FactsTray>;
  const caseCoveredFields = ["applies_to_work_item_ids", "dimension_ids"];
  const accessFields = ["session_binding", "execution_binding"];
  const pairedNotes = review ? accessFields.flatMap(key => text.filter(item => key === item.key)) : [];
  const noteOrder = handoff ? ["artifact", "acceptance"] : decision ? ["summary", "resolution"] : [];
  const remainingNotes = review ? [
    ...noteOrder.flatMap(key => text.filter(item => key === item.key)),
    ...text.filter(item => !accessFields.includes(item.key) && !noteOrder.includes(item.key)),
  ] : text;
  const noDependencies = review && name === "Work dependencies" && records.length === 3 &&
    records.every(record => Array.isArray(record.item) && record.item.length === 0);

  return <TerasFieldStack spacing={compact ? "compact" : "normal"}>
    {isCase ? <TerasPlanning.ChoiceFields spacing="normal">
      <TerasContentTray title="What to verify" description="Check that this case covers the intended work and safeguards.">
        <TerasFieldStack spacing="normal">
          {records.filter(item => caseCoveredFields.includes(item.key)).map(recordPanel)}
        </TerasFieldStack>
      </TerasContentTray>
      <TerasContentTray title="How to verify" description="See where the check runs, when it must pass, and what result to expect.">
        <TerasFieldStack spacing="normal">
          {factsView}
          {text.map(narrative)}
          {records.filter(item => !caseCoveredFields.includes(item.key)).map(recordPanel)}
        </TerasFieldStack>
      </TerasContentTray>
    </TerasPlanning.ChoiceFields> : <>
      {handoff ? <TerasPlanning.ChoiceFields spacing="normal">
        {handoffRoles.map(role => {
          const items = role.keys.flatMap(key => facts.filter(fact => fact.key === key));
          return items.length ? <TerasPlanning.FactsTray key={role.title} title={role.title} description={role.description}>
            <TerasPlanning.Metadata shape="list" items={items.map(displayFact)} />
          </TerasPlanning.FactsTray> : null;
        })}
      </TerasPlanning.ChoiceFields> : null}
      {factsView}
      {remainingNotes.map(narrative)}
      {pairedNotes.length ? <TerasPlanning.ChoiceFields spacing="normal">{pairedNotes.map(narrative)}</TerasPlanning.ChoiceFields> : null}
      {noDependencies ? <TerasEmptyState>No prerequisites or linked approvals are recorded for this item.</TerasEmptyState> : <>
        {pairedRecords.length ? <TerasPlanning.ChoiceFields spacing="normal">{pairedRecords.map(recordPanel)}</TerasPlanning.ChoiceFields> : null}
        {remainingRecords.map(recordPanel)}
      </>}
    </>}
    {technical.length ? compact && technical.length === 1
      ? <TerasPlanning.RecordDetails role="group" aria-label="Record details">
        <p>Record details</p>
        <TerasMetadataList shape="list" items={technical} />
      </TerasPlanning.RecordDetails>
      : <TerasTechnicalDetails items={technical} summary="Record details" /> : null}
  </TerasFieldStack>;
}

function TechnicalPlanEntries({ value, name, titles, fill, compact, review, rootReview }: {
  value: unknown[]; name: string; titles: Record<string, string>; fill: boolean; compact: boolean; review: boolean; rootReview: boolean;
}) {
  const [search, setSearch] = useState("");
  const entries = value.map((entry, index) => {
    if (entry && typeof entry === "object" && "expected_outcome" in entry && "polarity" in entry)
      return technicalPlanCaseEntry(entry, index, titles);
    const label = technicalPlanEntryName(entry, index, titles);
    const decision = (name === "Decisions" || name === "Open decisions") &&
      typeof entry === "object" && entry !== null && "status" in entry ? entry.status : "";
    const detail = isSourceRevision(entry) ? sourceRevisionSummary(entry) :
      decision === "resolved" ? "Resolved" : decision === "open" ? "Open" : undefined;
    return { index, label, detail, searchText: [label, detail].join(" ") };
  });
  const page = useTechnicalPlanEntryPage(entries.map(entry => entry.index));
  const current = page.selected === null ? null : entries[page.selected];
  const entryType = review ? ({
    "Verification cases": "Verification case", "Evidence handoffs": "Evidence handoff",
    "Decisions": "Decision", "Open decisions": "Decision",
  } as Record<string, string>)[name] : undefined;
  if (current) return <TechnicalPlanEntryPage title={entryType ? `${entryType} ${current.index + 1}` : current.label}
    category={review ? "" : name} framed={rootReview} reviewRoot={rootReview} heading={page.heading} onBack={page.back}>
    <TechnicalPlanValue value={value[current.index]} name={name} titles={titles} compact={compact} review={review} entryTitle={current.label} />
  </TechnicalPlanEntryPage>;
  const visible = entries.filter(entry => entry.searchText.toLowerCase().includes(search.trim().toLowerCase()));
  return <TerasPlanning.ReaderList ref={page.browse} tabIndex={-1} fill={fill}>
    <TerasFieldStack spacing="compact" fill={fill && visible.length ? "last" : undefined}>
      {rootReview || value.length > 8 || search ? <TerasTextField label={`Find ${name.toLowerCase()}`} value={search} onValueChange={setSearch} /> : null}
      {visible.length ? <TerasList frame="contained" fit={fill ? "fill" : "content"} scrollHeight={fill ? undefined : "medium"} ariaLabel={name}>
        {visible.map(entry => <TerasPlanning.InspectionRow key={entry.index}
          label={<TerasPlanning.ItemTitle>{compact || review ? <TechnicalPlanWorkTitle label={entry.label} /> : entry.label}</TerasPlanning.ItemTitle>}
          detail={entry.detail ? <TerasPlanning.ItemDetail>
            {compact || review ? renderTechnicalPlanWorkReferences(entry.detail) : entry.detail}
          </TerasPlanning.ItemDetail> : undefined} status={<ChevronRight size={15} aria-hidden="true" />}
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
          <TerasPlanning.ItemTitle><TechnicalPlanWorkTitle label={titles[id] ?? id.replace("work-item-", "Work item #")} /></TerasPlanning.ItemTitle>
          {titles[id] && !titles[id].includes(id.replace("work-item-", "#")) ? <small>
            <TechnicalPlanWorkTitle label={id.replace("work-item-", "Work item #")} />
          </small> : null}
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
    "verification-coverage": {
      title: technicalPlanVerificationReaders.coverage,
      description: "See which behaviours are checked and which work items need each check.",
      keys: ["dimensions", "work_item_dimension_applicability"],
    },
    "verification-settings": {
      title: technicalPlanVerificationReaders.settings,
      description: "See whether the plan calls for extra checks on connections between systems or dependencies between Git changes.",
      keys: ["protocol_applicability", "git_causality"],
    },
  };
  const sectionKeys = group.id === "verification"
    ? ["conformance_plan:cases", "verification-coverage", "verification-settings"] : group.sections;
  const sections = sectionKeys.map(section => {
    if (section === "verification-coverage" || section === "verification-settings") {
      const { title, description, keys } = verificationSettings[section];
      const value = Object.fromEntries(keys.filter(key => verification[key] !== undefined).map(key => [key, verification[key]]));
      const available = Object.keys(value).length > 0;
      return { section, title, description, value, available, detail: available ? undefined : "Not recorded" };
    }
    const [sectionId, sectionTitle, sectionDescription] = technicalPlanSection(section);
    const title = section === "architecture:contradictions_open_decisions" ? "Decisions" : sectionTitle;
    const description = reviewSectionDescriptions[sectionId] ?? sectionDescription;
    try {
      const value = technicalPlanSectionValue(editor, section);
      const available = value != null && value !== "" && (!Array.isArray(value) || value.length > 0);
      return { section, title, description, value, available, detail: Array.isArray(value) && value.length
        ? `${value.length} ${value.length === 1 ? "entry" : "entries"}`
        : available ? undefined
          : section === "architecture:authorization_session_execution_model" && value === null ? "Standard installation rules"
          : section === "architecture:lifecycle_state_model" && value === null ? "No lifecycle changes"
          : section === "architecture:evidence_receipt_handoffs" && Array.isArray(value) ? "No handoff needed"
          : Array.isArray(value) ? "No entries recorded" : "Not recorded" };
    } catch { return { section, title, description, value: null, available: false, detail: "Could not read this section" }; }
  });
  const selection = typeof reader === "object" && reader ? sections.find(item => item.section === reader.section) : null;
  const { title: readerTitle, description: readerDescription } = selection ?? summaryReaders[typeof reader === "string" ? reader : "rationale"];
  const readerCount = reader === "scope" ? scope.length : reader === "decisions" ? decisions?.length : count(selection?.value);
  const fillReader = (readerCount ?? 0) > 8;
  const wideReader = reader === "recovery" || Boolean(selection && wideReviewSections.has(selection.section));

  return <TerasFieldStack spacing="normal">
    <TerasPanel treatment="neutral" frame="padded" density="compact" spacing="normal">
      <TerasPanelHeader kicker={sourceLabel} title="Plan summary" actionsLayout="inline"
        description="Check that the plan covers the intended work and includes the approvals and checks it needs."
        actions={editor.rationale.trim() ? <TerasActionButton emphasis="secondary" size="table-compact"
          onClick={() => setReader("rationale")}>Read plan rationale</TerasActionButton> : undefined} />
      <TerasPlanning.ReviewFacts columns={4} offset="none" aria-label="Plan review summary">
        <TerasStatItem label="Covered work" value={`${scope.length} selected`} />
        <TerasStatItem label="Groups that change source" value={facts.sourceGroups == null ? "To define" : `${facts.sourceGroups} groups`} />
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
    <TerasPlanning.ReviewSection title="Plan details" description="Choose a review area to see the details recorded for this plan.">
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
    <TerasPlanning.ReviewDialog open={reader !== null} onClose={() => setReader(null)} kicker="Review plan"
      title={readerTitle} description={readerDescription}
      closeLabel={reader === "rationale" ? "Close plan rationale" : "Close review details"}
      contentOverflow="auto" height={fillReader ? "fill" : "content"} width={wideReader ? "large" : "standard"}>
      {reader === "rationale" ? <TerasContentTray>
        <TerasDocument ariaLabel="Plan rationale" content={editor.rationale} renderText={renderTechnicalPlanWorkReferences} />
      </TerasContentTray> :
        reader === "scope" ? <CoveredWorkReader work={scope} titles={titles} fill={fillReader} /> :
        reader === "decisions" ? <TechnicalPlanValue value={decisions} name="Open decisions" titles={groupTitles} fill={fillReader} review /> :
        reader === "recovery" ? <TechnicalPlanValue value={recovery} titles={groupTitles} review /> :
        selection ? <TechnicalPlanValue value={selection.value} name={selection.title} titles={groupTitles} fill={fillReader} review /> : null}
    </TerasPlanning.ReviewDialog>
  </TerasFieldStack>;
}
