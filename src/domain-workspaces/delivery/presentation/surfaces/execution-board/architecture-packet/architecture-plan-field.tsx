"use client";
import { useState, type ReactNode } from "react";
import { TerasPlanning, TerasActionButton, TerasActionRow, TerasContentTray, TerasEmptyState, TerasFieldGrid, TerasFieldStack, TerasList, TerasMetadataList, TerasNoteField, TerasSegmentedControl, TerasSelectableRow, TerasSelectField, TerasTechnicalDetails, TerasTextField, TerasTextListField } from "@/teras";
import { planFieldInitialValue, planFieldLabel, resolvePlanSchema, type PlanSchema } from "../../../../work-model/execution/architecture-form-model.ts";
import { technicalPlanCaseEntry, technicalPlanEntryName, technicalPlanOptionLabels } from "../../../../work-model/execution/technical-plan-preparation.ts";
import { technicalPlanHasDraftInput } from "../../../../work-model/execution/technical-plan-model.ts";
import { isSourceRevision, sourceRevisionSummary, TechnicalPlanActivationEvidence, TechnicalPlanAuthorizationLookup, type PlanSourceFacts } from "./technical-plan-source-facts.tsx";
import { TechnicalPlanAddDialog, TechnicalPlanEntryPage, TechnicalPlanEntryRow, useTechnicalPlanEntryPage } from "./technical-plan-entry-page.tsx";
import { TechnicalPlanWorkPicker, TechnicalPlanWorkTitle } from "./technical-plan-overview.tsx";

export type PlanChoice = { label: string; value: string; workType?: string; parent?: string | null; repository?: string | null; workItemIds?: string[]; changeGroupIds?: string[]; sourceBacked?: boolean; prerequisiteIds?: string[] };
export type PlanChangeConfirmation = {
  title: string; description: string; actionLabel: string; apply: () => void;
};
type PlanFieldProps = {
  schema: PlanSchema; value: unknown; onChange: (value: unknown) => void;
  name: string; path?: string; disabled: boolean; workItems: PlanChoice[]; repositories: PlanChoice[];
  inactiveValue?: Record<string, unknown>;
  confirmChange: (change: PlanChangeConfirmation) => void;
  references?: Record<string, PlanChoice[]>; onRepair: () => void;
  emptyAnswer?: string; emptyHelp?: string; repositorySearch?: ReactNode; repositoryLookupFields?: readonly string[]; source?: PlanSourceFacts;
  listHeader?: { title: ReactNode; actions: ReactNode; description: string; kicker: string };
};
const isNote = (name: string) => /rationale|reason|summary|condition|description|boundary|outcome|evidence_requirement/.test(name) || ["session_binding", "execution_binding", "evidence", "acceptance", "resolution"].includes(name);
const entryIdentity: Record<string, string> = {
  cases: "id", required_human_gates: "gate_id", evidence_receipt_handoffs: "handoff_id",
  runtime_activation_chains: "chain_id", contradictions_open_decisions: "id", claims: "id",
};
const addEntryLabels: Readonly<Record<string, string | undefined>> = {
  landing_units: "Add change group",
  edges: "Add merge dependency",
  required_human_gates: "Add required approval",
  runtime_activation_chains: "Add runtime activation step",
  states: "Add state",
  transitions: "Add state transition",
  authority_refs: "Add authorization record",
  evidence_receipt_handoffs: "Add evidence handoff",
  runtime_boundaries: "Add runtime responsibility",
  allowed_capability_ids: "Add allowed action",
  prohibited_capability_ids: "Add prohibited action",
  rollback_units: "Add rollback step",
  cleanup_obligations: "Add cleanup step",
  terminal_conditions: "Add completion condition",
  contradictions_open_decisions: "Add open decision",
  work_item_dimension_applicability: "Add checks for a work item",
  claims: "Add Git dependency to verify",
  cases: "Add verification case",
  repo_revisions: "Add source revision",
};
const fieldHelp: Readonly<Record<string, string | undefined>> = {
  commit: "Enter the full 40-character ID from the verified repository revision.",
  uri: "Copy the reference from the original authorization or decision record.",
  digest: "Copy the SHA-256 from the same record, including the sha256: prefix.",
  base_ref: "Use the recorded source reference, for example refs/heads/main.",
  session_binding: "For example, only a signed-in maintainer can open a session for the selected work item.",
  execution_binding: "For example, only the reviewer can approve the exact change prepared in that session.",
  evidence_requirement: "Describe what the approver should see, such as the compatibility report for the selected revision.",
  evidence_owner_landing_unit_id: "Choose the group responsible for producing this check’s evidence.",
  expected_outcome: "For example, a user without access sees a refusal and the file stays unchanged.",
  target_readiness: "Choose when the result is needed to proceed.",
  integration_point: "For example, before the receiving group merges its change.",
  artifact: "Name the result to pass, such as the API compatibility report.",
  acceptance: "Describe the conditions the receiving group will check before relying on it.",
  source_activation_posture: "Check the exact source revision to see whether it already permits activation.",
  observed_value: "Copy the actual value from the source file. Use the text or boolean field that matches it.",
  polarity: "Choose whether this checks a successful action or an action that should fail.",
  fidelity: "Choose the environment that can prove this check, such as a real Git repository for source order.",
  blocked_transition: "Choose the stage that must wait for the approval.",
  dimensions: "Use a short behaviour or safeguard, such as Saving sends one request. Keep established verification IDs when the protocol requires them.",
  allowed_capability_ids: "Use capability IDs from the component’s contract, such as delivery-art.persist-canonical-artifacts for the evidence store.",
  prohibited_capability_ids: "Use the contract IDs of actions this component must never perform.",
};
export function ArchitecturePlanField({ schema: input, value, onChange, name, path = name, disabled, workItems, repositories, references = {}, onRepair, emptyAnswer, emptyHelp, repositorySearch, repositoryLookupFields, source, listHeader, inactiveValue, confirmChange }: PlanFieldProps) {
  const schema = resolvePlanSchema(input);
  const label = path === "protocol_applicability.applies" ? "Do the extra connection checks apply?" :
    path === "git_causality.applies" ? "Does verification depend on a Git change?" : planFieldLabel(name);
  const noteLabel = path === "protocol_applicability.rationale" ? "Reason for connection checks"
    : path === "git_causality.rationale" ? "Reason for Git checks" : label;
  const children = { disabled, workItems, repositories, references, onRepair, repositorySearch, repositoryLookupFields, source, confirmChange };
  const variants = schema.oneOf ?? schema.anyOf;
  if (variants) {
    const boolean = variants.find(item => resolvePlanSchema(item).type === "boolean");
    const string = variants.find(item => resolvePlanSchema(item).type === "string");
    if (boolean && string) return <PlanBooleanOrTextField {...children} schema={input}
      value={value} onChange={onChange} name={name} path={path} />;
    const actual = variants.find(item => resolvePlanSchema(item).type !== "null") ?? variants[0];
    const nullable = variants.some(item => resolvePlanSchema(item).type === "null");
    if (nullable && actual.$ref?.endsWith("/workItemId") && workItems.length) {
      const current = typeof value === "string" ? value : value === null ? "none" : "";
      return <TerasSelectField label={label} disabled={disabled} value={current}
        options={[{value:"",label:"Choose…"},{value:"none",label:"None"},...workItems,...(current && current !== "none" && !workItems.some(item => item.value === current) ? [{value:current,label:`${current} · not loaded in this scope`}] : [])]}
        onValueChange={choice => onChange(choice === "none" ? null : choice)}/>;
    }
    const specialApplicability = name === "lifecycle_state_model"
      ? { title: "Does this work change the lifecycle?", none: "No lifecycle changes", specify: "Plan lifecycle changes" }
      : name === "authorization_session_execution_model"
        ? { title: "Does this work need additional access rules?", none: "Use standard installation access", specify: "Plan additional access rules" }
        : null;
    return <TerasPlanning.Applicability spacing="compact" emphasized={name === "lifecycle_state_model"}
      data-plan-object-section={specialApplicability ? true : undefined}>
      {nullable ? <TerasSelectField disabled={disabled} label={specialApplicability?.title ?? `${label} applicability`} value={value === null ? "none" : "value"}
        options={[{ value: "value", label: specialApplicability?.specify ?? "Specify a value" }, { value: "none", label: specialApplicability?.none ?? "None" }]}
        helper={value === null && inactiveValue
          ? `Previous details are kept in this draft. Select ${specialApplicability?.specify ?? "Specify a value"} to restore them.`
          : undefined}
        onValueChange={choice => {
          if (choice === "none" && value !== null) onChange(null);
          if (choice === "value" && value === null) onChange(inactiveValue ?? planFieldInitialValue(actual));
        }} /> : null}
      {value !== null || !nullable ? <ArchitecturePlanField {...children} schema={actual} value={value} onChange={onChange} name={name} path={path} /> : null}
    </TerasPlanning.Applicability>;
  }
  if (value !== null && value !== undefined && (
    schema.type === "array" && !Array.isArray(value) ||
    schema.type === "object" && (typeof value !== "object" || Array.isArray(value)) ||
    schema.type === "string" && typeof value !== "string" ||
    schema.type === "boolean" && typeof value !== "boolean"
  )) return <TerasContentTray title={`${label} needs repair`}
    description="The saved value cannot be edited in this field. Its original contents are retained."
    actions={<TerasActionButton emphasis="secondary" disabled={disabled} onClick={onRepair}>Open draft repair</TerasActionButton>} />;
  if (schema.type === "object") return <PlanObjectFields {...children} schema={schema} value={value} onChange={onChange} name={name} path={path}/>;
  if (schema.type === "array") return <PlanArrayFields {...children} schema={schema} value={value} onChange={onChange} name={name} path={path} emptyAnswer={emptyAnswer} emptyHelp={emptyHelp} listHeader={listHeader}/>;
  const workTypes = name === "work_item_type" ? [...new Set([...workItems.map(item => item.workType).filter((item): item is string => Boolean(item)), ...(typeof value === "string" && value ? [value] : [])])] : [];
  const choiceValues = schema.enum ?? (workTypes.length ? workTypes : schema.type === "boolean" ? [true, false] : schema.const !== undefined ? [schema.const] : null);
  if (choiceValues) return <TerasSelectField disabled={disabled} label={label} helper={fieldHelp[name]} value={value === null || value === undefined ? "" : JSON.stringify(value)}
    options={[{ value: "", label: "Choose…" }, ...choiceValues.map(item => ({ value: JSON.stringify(item), label: typeof item === "boolean" ? item ? "Yes" : "No" : technicalPlanOptionLabels[String(item)] ?? String(item).replaceAll("_", " ").replaceAll("-", " ") }))]}
    onValueChange={next => onChange(next ? JSON.parse(next) : null)} />;
  const ref = input.$ref?.split("/").at(-1);
  const specific = name === "gate_id" && path.startsWith("runtime_activation_chains.") ? references.activation_gate :
    (name === "from" || name === "to") && path.startsWith("lifecycle_state_model.") ? references.transitionStates : undefined;
  const choices = specific ?? (ref === "workItemId" ? workItems : ref === "repoName" ? repositories : ref ? references[ref] : undefined);
  if (specific || choices?.length || ref === "landingUnitId" || ref === "repoName" || ref === "workItemId") {
    const current = typeof value === "string" ? value : "";
    const available = choices ?? [];
    const selector = <TerasSelectField disabled={disabled} label={label} helper={fieldHelp[name]} value={current}
      options={[{ value: "", label: available.length ? "Choose…" : "No choices available" }, ...available,
        ...(current && !available.some(item => item.value === current) ? [{ value: current, label: `${current} · not in the loaded choices` }] : [])]}
      onValueChange={onChange} />;
    return ref === "repoName" && repositoryLookupFields?.includes(name) && repositorySearch ?
      <TerasFieldStack spacing="compact">{selector}{repositorySearch}</TerasFieldStack> : selector;
  }
  const text = value === null || value === undefined ? "" : String(value);
  if (isNote(name)) {
    const minimumHeight = path.startsWith("authorization_session_execution_model.")
      ? "tall" : name === "rationale" ? "medium" : "short";
    return <TerasNoteField autoGrow disabled={disabled} label={noteLabel} minimumHeight={minimumHeight}
      helper={fieldHelp[name]} value={text} onValueChange={onChange} />;
  }
  return <TerasTextField disabled={disabled} label={label} helper={fieldHelp[name]} value={text} placeholder={ref === "workItemId" ? "work-item-123" : ref === "repoName" ? "Registered repository name" : undefined}
    onValueChange={next => onChange(["number", "integer"].includes(String(schema.type)) ? next.trim() ? Number(next) : null : next)} />;
}

function PlanBooleanOrTextField(props: PlanFieldProps) {
  const [chosenType, setChosenType] = useState<"boolean" | "string" | "">("");
  const { value, onChange, schema: input, disabled } = props;
  const schema = resolvePlanSchema(input);
  const variants = schema.oneOf ?? schema.anyOf ?? [];
  const type = typeof value === "boolean" ? "boolean" : typeof value === "string" ? "string" : chosenType;
  const field = variants.find(variant => resolvePlanSchema(variant).type === type);

  return <TerasFieldStack spacing="compact">
    <TerasSelectField label="Source value type" disabled={disabled} value={type}
      options={[{ value: "", label: "Choose…" }, { value: "boolean", label: "Boolean (true or false)" }, { value: "string", label: "Text" }]}
      onValueChange={next => {
        if (next === type) return;
        const apply = () => {
          setChosenType(next);
          onChange(next === "string" ? "" : null);
        };
        if (typeof value === "boolean" || typeof value === "string" && value.trim()) props.confirmChange({
          title: "Replace the source value?", description: "Changing the type clears the value currently entered. You can read the source again from its pinned revision.",
          actionLabel: "Change value type", apply,
        });
        else apply();
      }} />
    {field ? <ArchitecturePlanField {...props} schema={field} /> : null}
  </TerasFieldStack>;
}

function PlanObjectFields({ schema, value, onChange, path, ...props }: PlanFieldProps) {
  const record = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const approval = props.name === "required_human_gates";
  const activation = props.name === "runtime_activation_chains";
  const boundWorkRow = ["work_item_execution_plan", "work_item_dimension_applicability"].includes(props.name) &&
    props.workItems.some(item => item.value === record.work_item_id);
  const approvalWork = approval ? props.workItems.find(item => item.value === record.authority_work_item_id) : undefined;
  const approvalOwner = approvalWork?.repository;
  const handoff = props.name === "evidence_receipt_handoffs";
  const isDecision = props.name === "contradictions_open_decisions";
  const isSourceVerification = path === "git_causality";
  const lifecycle = path === "lifecycle_state_model";
  const sectionObject = path === props.name;

  const entries = Object.entries(schema.properties ?? {}).filter(([key]) =>
    !(path === "source_landing_graph" && key === "nodes"));
  const identity = entryIdentity[props.name];
  const visible = entries.filter(([key]) => (schema.required?.includes(key) || key in record) && !(key === identity && record[key]));
  const optionForGroup = (value: unknown) => props.references?.landingUnitId?.find(item => item.value === value);
  const groupWork = (group: PlanChoice | undefined) => props.workItems.filter(item => group?.workItemIds?.includes(item.value));
  const references: PlanFieldProps["references"] = path === "lifecycle_state_model" ? { ...props.references, transitionStates: Array.isArray(record.states) ?
    [...new Set(record.states.filter((state): state is string => typeof state === "string" && Boolean(state.trim())))].map(state => ({ value: state, label: state })) : [] }
    : props.references;
  const scalar = ([key, child]: [string, PlanSchema]) => {
    const resolved = resolvePlanSchema(child);
    const variants = resolved.oneOf ?? resolved.anyOf;
    const actual = variants?.find(item => resolvePlanSchema(item).type !== "null");
    return (actual ? !["array", "object"].includes(String(resolvePlanSchema(actual).type)) :
      !["array", "object"].includes(String(resolved.type))) && !isNote(key);
  };

  function updateField(key: string, next: unknown) {
    if (next === record[key]) return;
    const updated = { ...record, [key]: next };
    if (key === "work_item_id" && schema.properties?.work_item_type) {
      const observed = props.workItems.find(item => item.value === next);
      if (observed) {
        updated.work_item_type = observed.workType;
        updated.parent_work_item_id = observed.parent ?? null;
        if (schema.properties.owner_repo) updated.owner_repo = observed.repository ?? "";
      }
    }
    if (approval && key === "authority_work_item_id") {
      updated.authority_owner_repo = props.workItems.find(item => item.value === next)?.repository ?? "";
    }
    if (handoff && (key === "producer_landing_unit_id" || key === "consumer_landing_unit_id")) {
      const selected = optionForGroup(next);
      const side = key.startsWith("producer") ? "producer" : "consumer";
      const workKey = side + "_work_item_id";
      const items = groupWork(selected);
      updated[side] = selected?.repository ?? "";
      if (!items.some(item => item.value === record[workKey])) {
        updated[workKey] = items.length === 1 ? items[0].value : "";
      }
    }
    if (activation && key === "gate_id") {
      const gate = props.references?.activation_gate?.find(item => item.value === next);
      updated.commissioning_landing_unit_ids = gate?.changeGroupIds ?? [];
    }
    if (key === "status" && isDecision) {
      if (next === "open") updated.resolution = null;
      if (next === "resolved" && typeof record.resolution !== "string") updated.resolution = "";
      if (next === "open" && typeof record.resolution === "string" && record.resolution.trim()) {
        props.confirmChange({ title: "Reopen this decision?", description: "Reopening clears the written resolution from the draft.",
          actionLabel: "Reopen and clear resolution", apply: () => onChange(updated) });
        return;
      }
    }
    if (isSourceVerification && updated.applies === false && !hasSavedEntries(record.claims)) updated.claims = [];
    onChange(updated);
  }

  function field(key: string, child: PlanSchema) {
    if (approval && key === "authority_owner_repo") {
      const label = approvalOwner || "Repository missing from the work details";
      return <TerasPlanning.Metadata key={key} shape="list" items={[{ label: planFieldLabel(key), value: label }]} />;
    }
    if (props.name === "work_item_execution_plan" && key === "emits_human_gate_ids") {
      const choices = references?.emits_human_gate_ids ?? [];
      const approvals = Array.isArray(record[key]) ? record[key] : [];
      return <TerasTechnicalDetails key={key} summary={`Linked approvals · ${approvals.length}`}
        items={approvals.map((id, index) => ({
          label: `Approval ${index + 1}`,
          value: <TechnicalPlanWorkTitle label={choices.find(choice => choice.value === id)?.label ?? "Approval details unavailable"} />,
        }))} />;
    }
    if (activation && key === "commissioning_landing_unit_ids") {
      const choices = references?.landingUnitId ?? [];
      const entries = Array.isArray(record[key]) ? record[key] : [];
      return <TerasPlanning.Metadata key={key} shape="list" items={[{ label: planFieldLabel(key),
        value: entries.length ? entries.map(id => choices.find(choice => choice.value === id)?.label ?? id).join(", ") : "None recorded" }]} />;
    }
    if (activation && key === "source_activation_evidence" && props.source) {
      const evidence = record[key] && typeof record[key] === "object" && !Array.isArray(record[key])
        ? record[key] as Record<string, unknown> : {};
      const pin = props.source.pins.find(item => item.repo === record.source_owner_repo);
      return <TechnicalPlanActivationEvidence key={`${record.source_owner_repo}:${pin?.commit ?? ""}`} source={props.source}
        owner={record.source_owner_repo} evidence={evidence} disabled={props.disabled}
        onRead={fact => onChange({ ...record, source_activation_evidence: fact, source_activation_posture: fact.observed_posture })}
        manual={<TerasFieldStack spacing="normal">
          {field("source_activation_posture", schema.properties!.source_activation_posture)}
          <ArchitecturePlanField {...props} source={undefined} schema={child} name={key}
            path={`${path}.${key}`} value={record[key]} onChange={next => updateField(key, next)} />
        </TerasFieldStack>} />;
    }
    const required = schema.required?.includes(key) ||
      (key === "source_activation_landing_unit_id" && record.source_activation_posture === "owner-source-change-required");
    const stageRequiresSource = record.blocked_transition === "before_source_merge" || record.blocked_transition === "before_runtime_activation";
    const fieldReferences = approval && key === "affected_landing_unit_ids" && stageRequiresSource
      ? { ...references, affected_landing_unit_ids: (references?.landingUnitId ?? []).filter(item => item.sourceBacked) } : references;
    const workItems = handoff && (key === "producer_work_item_id" || key === "consumer_work_item_id")
      ? groupWork(optionForGroup(record[key.replace("_work_item_id", "_landing_unit_id")]))
      : props.workItems;
    const evidenceChoices = approval && key === "evidence_prerequisite_work_item_ids"
      ? { ...fieldReferences, [key]: workItems.filter(item => approvalWork?.prerequisiteIds?.includes(item.value)) }
      : fieldReferences;
    const resolved = resolvePlanSchema(child);
    const input = isDecision && key === "resolution" && record.status === "resolved" ?
      (resolved.oneOf ?? resolved.anyOf)?.find(item => resolvePlanSchema(item).type === "string") ?? child : child;
    return <TerasFieldStack key={key} spacing="compact">
      <ArchitecturePlanField {...props} schema={input} name={key} path={`${path}.${key}`} value={record[key]}
        references={evidenceChoices} workItems={workItems} onChange={next => updateField(key, next)}
        emptyHelp={key === "evidence_prerequisite_work_item_ids"
          ? approvalWork ? "No recorded dependencies in this plan for the selected approval item." : "Choose the approval work item first."
          : undefined} />
      {!required ? <TerasActionRow spacing="compact"><TerasActionButton emphasis="secondary" disabled={props.disabled} onClick={() => {
        const apply = () => {
          const next = { ...record };
          delete next[key];
          onChange(next);
        };
        if (technicalPlanHasDraftInput(record[key])) props.confirmChange({
          title: `Remove ${planFieldLabel(key).toLowerCase()}?`,
          description: "This clears the recorded value from the draft.", actionLabel: "Remove value", apply,
        });
        else apply();
      }}>Remove {planFieldLabel(key)}</TerasActionButton></TerasActionRow> : null}
    </TerasFieldStack>;
  }

  const needsSourceChange = activation && record.source_activation_posture === "owner-source-change-required";
  if (path === "source_landing_graph" && schema.properties?.edges) {
    return field("edges", schema.properties.edges);
  }

  const supplementalFacts = visible.filter(([key]) => approval && key === "authority_owner_repo" ||
    props.name === "work_item_execution_plan" && key === "emits_human_gate_ids" && hasSavedEntries(record[key]) ||
    activation && key === "commissioning_landing_unit_ids" && hasSavedEntries(record[key]));
  const optional = entries.filter(([key]) => !schema.required?.includes(key) && !(key in record) &&
    !(activation && key === "source_activation_landing_unit_id"));
  if (handoff) {
    function handoffSide(side: "producer" | "consumer", title: string) {
      const groupKey = side + "_landing_unit_id";
      const workKey = side + "_work_item_id";
      const group = optionForGroup(record[groupKey]);
      const recorded = group?.repository && group.repository === record[side] ? group.repository : null;
      return <TerasContentTray title={title}>
        <TerasFieldGrid spacing="normal">{field(groupKey, schema.properties![groupKey])}{field(workKey, schema.properties![workKey])}</TerasFieldGrid>
        {recorded ? <TerasPlanning.Metadata shape="list" items={[{ label: planFieldLabel(side), value: recorded }]} /> :
          group || record[side] ? field(side, schema.properties![side]) : null}
      </TerasContentTray>;
    }
    return <TerasFieldStack spacing="normal">
      <TerasPlanning.PairedFields spacing="normal">
        {handoffSide("producer", "Sending the evidence")}
        {handoffSide("consumer", "Receiving the evidence")}
      </TerasPlanning.PairedFields>
      <TerasContentTray title="Evidence and acceptance"><TerasFieldStack spacing="normal">
        {["artifact", "integration_point", "acceptance"].map(key => field(key, schema.properties![key]))}
      </TerasFieldStack></TerasContentTray>
    </TerasFieldStack>;
  }

  const shown = visible.filter(([key]) =>
    !(boundWorkRow && key === "work_item_id") && !supplementalFacts.some(([fact]) => fact === key) &&
    !(props.name === "work_item_execution_plan" && key === "emits_human_gate_ids") &&
    !(activation && key === "commissioning_landing_unit_ids") &&
    !(activation && props.source && key === "source_activation_posture") &&
    !(isDecision && key === "resolution" && record.status === "open" && (record.resolution === null || record.resolution === undefined)) &&
    !(isSourceVerification && key === "claims" && record.applies !== true && !hasSavedEntries(record.claims)));
  const authorizationNotes = props.name === "authorization_session_execution_model" ?
    shown.filter(([key]) => key === "session_binding" || key === "execution_binding") : [];
  const simpleFields = shown.filter(scalar);
  const otherFields = shown.filter(entry => !scalar(entry) && !authorizationNotes.includes(entry));
  function usesChoiceList([key, child]: [string, PlanSchema]) {
    const fieldSchema = resolvePlanSchema(child);
    const itemRef = fieldSchema.items?.$ref?.split("/").at(-1);
    return fieldSchema.type === "array" && (itemRef === "workItemId" || itemRef === "repoName" ||
      Boolean(references?.[key] || itemRef && references?.[itemRef]));
  }
  const pairedFields = otherFields.filter(([key]) =>
    props.name === "runtime_boundaries" && ["allowed_capability_ids", "prohibited_capability_ids", "allowed", "prohibited"].includes(key) ||
    path === "rollback_cleanup_terminal_conditions" && ["rollback_units", "cleanup_obligations"].includes(key));
  const choiceFields = otherFields.filter(usesChoiceList).slice(0, 2);

  function framedField([key, child]: [string, PlanSchema]) {
    const resolved = resolvePlanSchema(child);
    return (activation && key === "source_activation_evidence") || (key === "authority_refs" && props.source) ? field(key, child) :
      ["array", "object"].includes(String(resolved.type)) || resolved.oneOf || resolved.anyOf
      ? <TerasContentTray key={key} title={resolved.type === "array" && resolvePlanSchema(resolved.items ?? {}).type === "string" &&
        !usesChoiceList([key, child]) && !isNote(key) ? undefined : planFieldLabel(key)}>
        {field(key, child)}
      </TerasContentTray> : field(key, child);
  }

  if (lifecycle && schema.properties?.states && schema.properties.transitions) {
    return <TerasPlanning.RecordStack spacing="normal"  data-plan-object-section>
      <TerasPlanning.LifecycleColumns spacing="normal">
        <TerasPlanning.LifecycleStates fit="fill">
          {field("states", schema.properties.states)}
        </TerasPlanning.LifecycleStates>
        <TerasPlanning.LifecycleTransitions title="Transitions" fit="fill">
          {field("transitions", schema.properties.transitions)}
        </TerasPlanning.LifecycleTransitions>
      </TerasPlanning.LifecycleColumns>
    </TerasPlanning.RecordStack>;
  }

  if (props.name === "work_item_execution_plan") {
    const starts = Array.isArray(record.start_after_work_item_ids) ? record.start_after_work_item_ids as string[] : [];
    const closes = Array.isArray(record.close_after_work_item_ids) ? record.close_after_work_item_ids as string[] : [];
    const links = [...new Set([...starts, ...closes])];
    return <TerasFieldStack spacing="normal">
      <TerasPlanning.FieldHint>Choose when each dependency recorded in Delivery must be satisfied.</TerasPlanning.FieldHint>
      {links.length ? <TerasList frame="contained" ariaLabel="Dependency timing">
        {links.map(id => {
          const item = props.workItems.find(work => work.value === id);
          const label = item?.label ?? id.replace(/^work-item-/, "Work item #");
          return <TerasContentTray key={id} title={<TechnicalPlanWorkTitle label={label} />}>
            <TerasSegmentedControl ariaLabel={`Timing for ${label}`} layout="fill" size="compact" disabled={props.disabled}
              value={closes.includes(id) ? "close" : "start"} options={[
                { value: "start", label: "Before start" },
                { value: "close", label: "Before close" },
              ]} onValueChange={phase => onChange({
                ...record, start_after_work_item_ids: phase === "start" ? [...starts.filter(ref => ref !== id), id] : starts.filter(ref => ref !== id),
                close_after_work_item_ids: phase === "close" ? [...closes.filter(ref => ref !== id), id] : closes.filter(ref => ref !== id),
              })} />
          </TerasContentTray>;
        })}
      </TerasList> : <TerasEmptyState>No recorded dependencies for this item within the plan.</TerasEmptyState>}
      {schema.properties?.emits_human_gate_ids ? field("emits_human_gate_ids", schema.properties.emits_human_gate_ids) : null}
    </TerasFieldStack>;
  }
  if (props.name === "descendant_owner_map") {
    const work = props.workItems.find(item => item.value === record.work_item_id);
    if (!work) return <TerasEmptyState>Delivery details are unavailable for this work item. Reload Delivery and reopen the plan.</TerasEmptyState>;
    const parent = props.workItems.find(item => item.value === work.parent);
    const parentLabel = parent ? `${parent.label}${record.parent_work_item_id ? "" : " · Outside this plan"}` : "None";
    return <TerasFieldStack spacing="normal">
      <TerasPlanning.Metadata items={[
        { label: "Work type", value: work.workType || "Not recorded in Delivery" },
        { label: "Parent work item", value: parentLabel },
        { label: "Repository", value: work.repository || "Not assigned in Delivery" },
      ]} />
      <small>To correct a detail, update this work item in Delivery and reopen the plan.</small>
    </TerasFieldStack>;
  }
  return <TerasFieldStack spacing="normal" data-plan-object-section={sectionObject || undefined}>
    {needsSourceChange && !("source_activation_landing_unit_id" in record) ?
      field("source_activation_landing_unit_id", schema.properties!.source_activation_landing_unit_id) : null}
    {activation && record.source_activation_posture === "source-ready" && "source_activation_landing_unit_id" in record ?
      <TerasEmptyState>Remove the source activation group below if the recorded source already allows activation.</TerasEmptyState> : null}
    {isSourceVerification && record.applies === false && hasSavedEntries(record.claims) ?
      <TerasEmptyState>Remove the existing source claims or select Yes if a claim still needs to be verified.</TerasEmptyState> : null}
    {simpleFields.length > 1 ? <TerasFieldGrid spacing="normal">{simpleFields.map(([key, child]) => field(key, child))}</TerasFieldGrid>
      : simpleFields.map(([key, child]) => field(key, child))}
    {supplementalFacts.map(([key, child]) => field(key, child))}
    {choiceFields.length === 2 ? <TerasPlanning.ChoiceFields spacing="normal">
      {choiceFields.map(framedField)}
    </TerasPlanning.ChoiceFields> : null}
    {pairedFields.length === 2 ? <TerasPlanning.PairedFields spacing="normal">
      {pairedFields.map(framedField)}
    </TerasPlanning.PairedFields> : null}
    {authorizationNotes.length ? <>
      {otherFields.filter(([key]) => key === "summary").map(framedField)}
      <TerasPlanning.AuthorizationNotes spacing="normal">{authorizationNotes.map(framedField)}</TerasPlanning.AuthorizationNotes>
      {otherFields.filter(([key]) => key !== "summary").map(framedField)}
    </> : otherFields.filter(entry => (choiceFields.length !== 2 || !choiceFields.includes(entry)) &&
      (pairedFields.length !== 2 || !pairedFields.includes(entry))).map(framedField)}
    {optional.length ? <TerasTechnicalDetails summary="Optional fields" items={[]}><TerasActionRow spacing="compact">
      {optional.map(([key, child]) => <TerasActionButton key={key} emphasis="secondary" disabled={props.disabled}
        onClick={() => onChange({ ...record, [key]: planFieldInitialValue(child) })}>Add {planFieldLabel(key)}</TerasActionButton>)}
    </TerasActionRow></TerasTechnicalDetails> : null}
  </TerasFieldStack>;
}

function hasSavedEntries(value: unknown) {
  return Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null;
}

function PlanArrayFields({ schema, value, onChange, name, path = name, emptyAnswer, emptyHelp, listHeader, ...props }: PlanFieldProps) {
  const [query, setQuery] = useState("");
  const [pendingEntry, setPendingEntry] = useState<{ value: unknown; edited: boolean } | null>(null);
  const values = Array.isArray(value) ? value : [], label = planFieldLabel(name);
  const titles = Object.fromEntries([...props.workItems, ...(props.references?.landingUnitId ?? [])].map(item => [item.value, item.label]));
  const itemSchema = resolvePlanSchema(schema.items ?? {}), ref = schema.items?.$ref?.split("/").at(-1);
  const referenced = props.references?.[name] ?? (ref === "workItemId" ? props.workItems : ref === "repoName" ? props.repositories : ref ? props.references?.[ref] : undefined);
  const entries = values.map((item, index) => {
    if (name === "cases") return technicalPlanCaseEntry(item, index, titles);
    const label = technicalPlanEntryName(item, index, titles);
    return { index, label, detail: undefined, searchText: label };
  });
  const page = useTechnicalPlanEntryPage(entries.map(item => item.index));
  const current = page.selected === null ? null : entries[page.selected];
  const addLabel = addEntryLabels[name] ?? `Add ${label}`;

  const standardDimensions = name === "dimensions" ? props.references?.standardDimensions : undefined;
  if (standardDimensions?.length && values.every((item): item is string => typeof item === "string")) {
    const standard = new Set(standardDimensions.map(item => item.value));
    return <TerasFieldStack spacing="normal">
      <TerasContentTray title="Standard connection checks"
        description="These checks are included when system connection checks apply. Assign them to the work they cover.">
        <TerasMetadataList items={standardDimensions.map(item => ({ label: null, value: item.label }))} />
      </TerasContentTray>
      <TerasContentTray title="Additional checks" description="Add checks that are specific to this plan.">
        <TerasTextListField label="Plan-specific checks" items={values.filter(item => !standard.has(item))}
          itemLabel={index => `Additional check ${index + 1}`} addLabel="Add a check" maxItems={100} minItems={0}
          disabled={props.disabled} emptyLabel="No additional checks."
          onItemsChange={items => onChange([...standard, ...items])} />
      </TerasContentTray>
    </TerasFieldStack>;
  }
  if (itemSchema.type === "string" && referenced && values.every(item => typeof item === "string")) {
    const picked = new Set(values);
    const known = new Set(referenced.map(item => item.value));
    const toggle = (id: string) => onChange(picked.has(id)
      ? values.filter(value => value !== id) : [...values, id]);
    return <TerasFieldStack spacing="compact">
      {referenced.length ? ref === "workItemId" ?
        <TechnicalPlanWorkPicker label={label} items={referenced} selected={picked} disabled={props.disabled}
          onToggle={toggle} /> :
        <TerasList ariaLabel={label} frame="contained" scrollHeight="medium">
          {referenced.map(item => <TerasSelectableRow key={item.value}
            label={<TerasPlanning.ItemTitle><TechnicalPlanWorkTitle label={item.label} /></TerasPlanning.ItemTitle>}
            selected={picked.has(item.value)} disabled={props.disabled} onSelect={() => toggle(item.value)} />)}
        </TerasList> : <TerasEmptyState>{emptyHelp ?? "Add the referenced entries to this plan first."}</TerasEmptyState>}
      {values.filter(id => !known.has(id)).map(id => {
        const selectedGroup = name === "affected_landing_unit_ids" ? props.references?.landingUnitId?.find(group => group.value === id) : undefined;
        const remove = () => onChange(values.filter(value => value !== id));
        if (name === "evidence_prerequisite_work_item_ids") return <TerasContentTray key={id}
          title={<TechnicalPlanWorkTitle label={props.workItems.find(item => item.value === id)?.label ?? id.replace(/^work-item-/, "Work item #")} />}
          description="Delivery has no matching dependency for this approval. Record the required link in Delivery or remove this evidence requirement."
          actions={<TerasActionButton emphasis="secondary" size="table-compact" disabled={props.disabled}
            onClick={remove}>Remove evidence requirement</TerasActionButton>} />;
        return selectedGroup ? <TerasContentTray key={id} title={selectedGroup.label}
          description="This group does not change source files. Choose a source-changing group for this approval stage."
          actions={<TerasActionButton emphasis="secondary" size="table-compact" disabled={props.disabled}
            onClick={remove}>Remove from approval</TerasActionButton>} /> : <TerasActionRow key={id}>
          <TerasActionButton emphasis="secondary" disabled={props.disabled} onClick={remove}>{id ? `Remove unavailable reference ${id}` : "Remove blank reference"}</TerasActionButton>
        </TerasActionRow>;
      })}
    </TerasFieldStack>;
  }
  if (itemSchema.type === "string" && !isNote(name) && !["workItemId", "repoName"].includes(ref ?? "") && values.every((item): item is string => typeof item === "string"))
    return <TerasTextListField label={label} items={values} itemLabel={index => `${label} ${index + 1}`} addLabel={addLabel}
      description={fieldHelp[name]} maxItems={100} minItems={0} disabled={props.disabled}
      fit={path === "lifecycle_state_model.states" ? "fill" : "content"}
      multiline={path.startsWith("rollback_cleanup_terminal_conditions.")} emptyLabel={schema.minItems ? "Add an entry to continue." : "No entries added."}
      onItemsChange={items => {
        const remove = values.find((_, index) => index >= items.length || values[index] !== items[index]);
        if (items.length < values.length && remove?.trim()) props.confirmChange({
          title: `Remove an entry from ${label.toLowerCase()}?`, description: "This clears the saved text for that entry from the draft.",
          actionLabel: "Remove entry", apply: () => onChange(items),
        });
        else onChange(items);
      }} />;
  const fields = Object.entries(itemSchema.properties ?? {});
  const compactForm = fields.length <= 2 &&
    fields.every(([key, input]) => !isNote(key) && !["object", "array"].includes(String(resolvePlanSchema(input).type)));

  function beginAdd() {
    const initial = planFieldInitialValue(schema.items ?? {});
    const identity = entryIdentity[name];
    const entry = identity && initial && typeof initial === "object" && !Array.isArray(initial) && identity in initial
      ? { ...initial, [identity]: `${name.replaceAll("_", "-")}-${crypto.randomUUID()}` }
      : initial;
    setPendingEntry({ value: entry, edited: false });
  }

  const recordedDependencies = name === "work_item_execution_plan";
  const visible = entries.filter(item => item.searchText.toLowerCase().includes(query.trim().toLowerCase()) &&
    (!recordedDependencies || ["start_after_work_item_ids", "close_after_work_item_ids", "emits_human_gate_ids"].some(key =>
      Array.isArray(values[item.index]?.[key]) && values[item.index][key].length > 0)));
  const fillList = path === name || path === "source_landing_graph.edges" || path === "lifecycle_state_model.transitions";
  const recordedNone = emptyAnswer && Array.isArray(value) && value.length === 0;
  const recordedWorkFacts = name === "descendant_owner_map" || recordedDependencies;
  const perWork = name === "work_item_dimension_applicability";
  const allWorkRecorded = recordedWorkFacts || perWork && props.workItems.length > 0 &&
    props.workItems.every(item => values.some(row => row?.work_item_id === item.value));
  const selectedRecordedWork = recordedWorkFacts || perWork && current &&
    props.workItems.some(item => item.value === values[current.index]?.work_item_id);
  const emptyText = recordedDependencies ? "No dependencies to schedule. Add or change dependency links on the work item in Delivery."
    : recordedWorkFacts ? "Choose work to include. Its responsibilities are filled from Delivery."
    : recordedNone ? `${emptyAnswer} · recorded in this draft` : emptyHelp ??
    (schema.minItems && schema.minItems > 1 ? `Add at least ${schema.minItems} entries.` :
      schema.minItems ? "Add an entry to complete this section." : "No entries added.");
  if (current) return <TechnicalPlanEntryPage title={current.label} category={label} framed heading={page.heading} onBack={page.back}
    entryPath={`${path}.${current.index}`}>
    <TerasFieldStack spacing="normal">
      <ArchitecturePlanField {...props} schema={schema.items ?? {}} name={name} path={`${path}.${current.index}`} value={values[current.index]}
        onChange={next => onChange(values.map((item, index) => index === current.index ? next : item))} />
      {!selectedRecordedWork ? <TerasActionRow>
        <TerasActionButton emphasis="secondary" disabled={props.disabled} onClick={() => props.confirmChange({
          title: "Remove this entry?", description: `${current.label} will be removed from the draft.`, actionLabel: "Remove entry",
          apply: () => { onChange(values.filter((_, index) => index !== current.index)); page.back(true); },
        })}>Remove entry</TerasActionButton>
      </TerasActionRow> : null}
    </TerasFieldStack>
  </TechnicalPlanEntryPage>;
  const authorizationSource = name === "authority_refs" ? props.source : undefined;
  const actionsInHeader = Boolean(authorizationSource || listHeader);
  const addButtons = <>
    {!allWorkRecorded ? <TerasPlanning.FilterAction emphasis="secondary" size={listHeader || name === "authority_refs" ? "table-compact" : "default"}
      disabled={props.disabled || values.length >= 100}
      aligned={!actionsInHeader} onClick={beginAdd}>{addLabel}</TerasPlanning.FilterAction> : null}
    {emptyAnswer && !values.length && !recordedNone ?
      <TerasActionButton emphasis="secondary" disabled={props.disabled} onClick={() => onChange([])}>{emptyAnswer}</TerasActionButton> : null}
  </>;
  const addActions = !allWorkRecorded || emptyAnswer && !values.length && !recordedNone ?
    <TerasActionRow spacing="compact">{addButtons}</TerasActionRow> : null;
  const search = <TerasTextField label={`Find ${label.toLowerCase()}`} value={query}
    disabled={!values.length && !query} onValueChange={setQuery} />;
  const browse = <div ref={page.browse} tabIndex={-1} data-plan-list-fill={fillList && visible.length > 0 || undefined}>
    <TerasFieldStack spacing="compact">
      {listHeader ? <TerasPlanning.SourceHeading kicker={listHeader.kicker} title={listHeader.title}
        description={listHeader.description} actionsLayout="inline"
        actions={<TerasActionRow spacing="compact">{listHeader.actions}{addButtons}</TerasActionRow>} /> : null}
      {actionsInHeader || !addActions ? search : <TerasPlanning.SearchRow>{search}{addActions}</TerasPlanning.SearchRow>}
      {visible.length ? <TerasList ariaLabel={label} frame="contained" fit={fillList ? "fill" : "content"}
        scrollHeight={fillList ? undefined : "medium"}>
        {visible.map(item => {
          const value = values[item.index];
          const revision = listHeader && name === "repo_revisions" && isSourceRevision(value) ? value : null;
          return <TechnicalPlanEntryRow key={item.index} entryKey={item.index}
            label={<TechnicalPlanWorkTitle label={item.label} />}
            detail={revision ? <span title={revision.commit}>
              {sourceRevisionSummary(revision)}
            </span> : item.detail}
            onOpen={() => page.open(item.index)} />;
        })}
      </TerasList> : <TerasEmptyState>{values.length && (!recordedDependencies || query.trim()) ? "No entries match this search." : emptyText}</TerasEmptyState>}
      {authorizationSource ? <>
        <TechnicalPlanAuthorizationLookup source={authorizationSource} disabled={props.disabled}
          onAdd={ref => {
            if (values.some(row => row?.uri === ref.uri && row?.digest === ref.digest)) return false;
            onChange([...values, ref]);
            return true;
          }} />
      </> : null}
    </TerasFieldStack>
    {pendingEntry ? <TechnicalPlanAddDialog title={addLabel} width={compactForm ? "compact" : "standard"}
      disabled={props.disabled || values.length >= 100 || !pendingEntry.edited}
      onClose={() => setPendingEntry(null)} onAdd={() => {
        onChange([...values, pendingEntry.value]);
        setPendingEntry(null);
      }}>
      <TerasFieldStack spacing="normal">
        <ArchitecturePlanField {...props} schema={schema.items ?? {}} name={name} path={`${path}.new`}
          value={pendingEntry.value} onChange={next => setPendingEntry({ value: next, edited: true })} />
        </TerasFieldStack>
    </TechnicalPlanAddDialog> : null}
  </div>;
  return authorizationSource ? <TerasPlanning.FactsTray title={label} actions={addActions}>
    {browse}
  </TerasPlanning.FactsTray> : browse;
}
