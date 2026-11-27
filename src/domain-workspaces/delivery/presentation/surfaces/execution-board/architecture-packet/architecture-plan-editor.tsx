"use client";
import { CircleHelp } from "lucide-react";
import { useId, useMemo, useState } from "react";
import {
  TerasPlanning,
  TerasActionButton,
  TerasActionRow,
  TerasDialog,
  TerasEmptyState,
  TerasFieldStack,
  TerasNoteField,
  TerasSelectField,
  TerasTextField,
  TerasContentTray,
  TerasLoadingState,
  TerasPanelHeader,
  TerasProgressStepSelector,
  TerasSectionEditorLayout,
  TerasStatusPill,
  TerasTechnicalDetails,
} from "@/teras";
import type { DeliveryReadModel } from "../../../../read-model/delivery-read-model.ts";
import type { ArchitecturePacketEditor } from "./architecture-packet-editor-model.ts";
import { architectureFormContract, planFieldLabel } from "../../../../work-model/execution/architecture-form-model.ts";
import { useRepositoryCatalogChoices } from "../../../../../../workspace-registry/live-runtime/use-repository-catalog-choices.ts";
import { isSourceRevision, readPlanFacts, TechnicalPlanSourceRevisions, type PlanSourceFacts } from "./technical-plan-source-facts.tsx";
import { isOptionalArchitectureSection, technicalPlanDefaultSection, technicalPlanSection, technicalPlanSetSection, technicalPlanWorkItems, technicalPlanChangeGroupName, technicalPlanWorkLabel } from "../../../../work-model/execution/technical-plan-model.ts";
import { technicalPlanEmptyAnswers, technicalPlanGroup, technicalPlanGroups, technicalPlanGroupState, technicalPlanInputState, technicalPlanRepositoryLookupFields, technicalPlanEntryName, technicalPlanVerificationCoverage, technicalPlanVerificationReaders } from "../../../../work-model/execution/technical-plan-preparation.ts";
import { ArchitecturePlanField, type PlanChangeConfirmation, type PlanChoice } from "./architecture-plan-field.tsx";
import { isTechnicalPlanChangeGroup, TechnicalPlanChangeGroups } from "./technical-plan-change-groups.tsx";
import { TechnicalPlanWorkTitle } from "./technical-plan-overview.tsx";

export function ArchitecturePlanEditor({ editor, model, disabled, navigationDisabled = false, onEdit, selectedSection, onSectionChange, confirmChange, approvedRuntimeResponsibilities }: {
  editor: ArchitecturePacketEditor; model: DeliveryReadModel; disabled: boolean;
  navigationDisabled?: boolean;
  approvedRuntimeResponsibilities?: unknown;
  selectedSection?: string; onSectionChange?: (section: string) => void;
  onEdit: (update: (value: ArchitecturePacketEditor) => ArchitecturePacketEditor) => void;
  confirmChange: (change: PlanChangeConfirmation) => void;
}) {
  const [localSection, setLocalSection] = useState<string>(technicalPlanDefaultSection);
  const [repairOpen, setRepairOpen] = useState(false);
  const [guidanceOpen, setGuidanceOpen] = useState(false);
  const [showOperationDetails, setShowOperationDetails] = useState(false);
  const [verificationDialog, setVerificationDialog] = useState<"coverage" | "settings" | null>(null);
  const section = selectedSection ?? localSection;
  const setSection = onSectionChange ?? setLocalSection;
  const sectionPanelId = useId();
  const sectionTitleId = `${sectionPanelId}-heading`;
  const live = model.source_truth === "OpenProject-backed OOS";
  const area = technicalPlanGroup(section);
  const [, sectionLabel, sectionDescription, sectionGuidance] = technicalPlanSection(section);
  const sectionState = technicalPlanInputState(editor, section);
  const repositoryLookupFields = technicalPlanRepositoryLookupFields(section);
  const [repositorySearchSection, setRepositorySearchSection] = useState<string | null>(null);
  const repositorySearch = repositorySearchSection === section;
  const repositories = useRepositoryCatalogChoices(live && repositoryLookupFields.length > 0 && repositorySearch);
  const workItems = useMemo(() => technicalPlanWorkItems(model, editor.deliveryId), [model, editor.deliveryId]);
  const parentById = new Map(workItems.flatMap(parent => parent.children.map(child => [child.id, parent] as const)));
  const choices = workItems.filter(item => item.legacy_work_package_id).map(item => {
    const parent = parentById.get(item.id);
    return { value: `work-item-${item.legacy_work_package_id}`, label: technicalPlanWorkLabel(item),
      workType: item.component_type, repository: item.owner_repo ?? null, parent: parent?.legacy_work_package_id ? `work-item-${parent.legacy_work_package_id}` : null,
      prerequisiteIds: (item.depends_on_work_package_ids ?? []).map(id => `work-item-${id}`),
    };
  });
  const planningAreas = technicalPlanGroups.map((group, index) => ({
    ...group,
    number: index + 1,
    state: technicalPlanGroupState(editor, group),
  }));
  const [group, key] = section.split(":") as ["architecture" | "conformance_plan" | "repo_revisions", string?];
  const field = group === "architecture" ? "architectureJson" : group === "conformance_plan" ? "conformanceJson" : "repoRevisionsJson";
  const schema = key ? architectureFormContract.properties[group].properties?.[key] ?? {} : architectureFormContract.properties[group];
  let parsed: unknown;
  let parseError = false;
  try {
    parsed = readStoredPlanPart(editor[field], group === "repo_revisions");
  } catch { parseError = true; }
  const value = key ? (parsed as Record<string, unknown> | undefined)?.[key] : parsed;
  let architecture: Record<string, unknown> = {}, verification: Record<string, unknown> = {};
  try { architecture = JSON.parse(editor.architectureJson) ?? {}; } catch {}
  try { verification = JSON.parse(editor.conformanceJson) ?? {}; } catch {}
  const changeGroups = Array.isArray(architecture.landing_units)
    ? architecture.landing_units.filter(isTechnicalPlanChangeGroup) : [];
  const planChoices = choices.filter(item => editor.coveredWorkItemIds.includes(item.value));
  const repositoryChoices = [...new Map([
    ...choices.flatMap(item => item.repository ? [{ value: item.repository, label: item.repository }] : []),
    ...(repositories.result?.options.map(item => ({ value: item.valueKey, label: item.label })) ?? []),
  ].map(item => [item.value, item])).values()];
  const titles = Object.fromEntries(choices.map(item => [item.value, item.label]));
  const groups: PlanChoice[] = changeGroups.filter(group => key !== "source_landing_graph" || group.source_backed)
    .map(group => ({ value: group.id, label: technicalPlanChangeGroupName(group, titles),
      repository: group.owner_repo, workItemIds: group.covered_work_item_ids, sourceBacked: group.source_backed === true }));
  const ownersByWork = new Map(Array.isArray(architecture.descendant_owner_map)
    ? architecture.descendant_owner_map.map(row => [row?.work_item_id, row?.owner_repo]) : []);
  const scopedChoices = planChoices.map(item => ({
    ...item, repository: ownersByWork.get(item.value) || item.repository,
  }));
  const scopedOwners = [...new Set(scopedChoices.flatMap(item => item.repository ? [item.repository] : []))];
  const scopeKey = editor.coveredWorkItemIds.slice().sort().join(",");
  const sourceRows = group === "repo_revisions" ? parsed : readStoredPins(editor.repoRevisionsJson);
  const source: PlanSourceFacts = {
    pins: Array.isArray(sourceRows) ? sourceRows.filter(isSourceRevision) : [],
    live: live && Boolean(scopeKey),
    read: input => readPlanFacts(editor.deliveryId, editor.coveredWorkItemIds, input),
  };
  const activationGates = Array.isArray(architecture.required_human_gates)
    ? architecture.required_human_gates.filter(gate => gate?.blocked_transition === "before_runtime_activation") : [];
  const sourceGraph = architecture.source_landing_graph as { edges?: unknown[] } | undefined;
  const operationOptions = [
    "architecture:lifecycle_state_model",
    "architecture:authorization_session_execution_model",
    "architecture:runtime_boundaries",
  ] as const;
  const visibleSections = area.sections.filter(candidate => {
    if (candidate === section) return true;
    if (area.id === "verification") return false;
    switch (candidate) {
      case "architecture:source_landing_graph":
        return changeGroups.filter(group => group.source_backed).length > 1 || Boolean(sourceGraph?.edges?.length);
      case "architecture:evidence_receipt_handoffs":
        return scopedOwners.length > 1 || Array.isArray(architecture.evidence_receipt_handoffs) && architecture.evidence_receipt_handoffs.length > 0;
      case "architecture:runtime_activation_chains":
        return activationGates.length > 0 || Array.isArray(architecture.runtime_activation_chains) && architecture.runtime_activation_chains.length > 0;
      case "architecture:lifecycle_state_model":
      case "architecture:authorization_session_execution_model":
      case "architecture:runtime_boundaries": {
        const option = candidate.split(":")[1];
        return showOperationDetails || Boolean(architecture[option]) ||
          isOptionalArchitectureSection(option) && Boolean(editor.inactiveArchitectureSections?.[option]);
      }
      default:
        return true;
    }
  });
  const hasSectionTabs = visibleSections.length > 1;
  const hasHiddenOperationOptions = area.id === "operation" &&
    operationOptions.some(option => !visibleSections.includes(option));
  const sections = visibleSections.map(value => {
    const state = technicalPlanInputState(editor, value);
    return { value, label: <span title={state}>{technicalPlanSection(value)[1]}<TerasPlanning.AccessibleText> · {state}</TerasPlanning.AccessibleText></span> };
  });
  const emptyAnswer = key === "runtime_activation_chains" && activationGates.length
    ? undefined : technicalPlanEmptyAnswers[section];
  const standardDimensions = (verification.protocol_applicability as { applies?: boolean } | undefined)?.applies === true
    ? architectureFormContract.requiredProtocolDimensions.map(value => ({ value, label: planFieldLabel(value) })) : [];
  const dimensionChoices = Array.isArray(verification.dimensions) ?
    verification.dimensions.flatMap(row => typeof row === "string" && row ? [{ value: row, label: standardDimensions.find(item => item.value === row)?.label ?? row }] :
      typeof row?.id === "string" && row.id ? [{ value: row.id, label: row.summary || row.id }] : []) : [];
  const refs = { landingUnitId: groups, dimension_ids: dimensionChoices, standardDimensions,
    emits_human_gate_ids: Array.isArray(architecture.required_human_gates)
      ? architecture.required_human_gates.flatMap((gate, index) => typeof gate?.gate_id === "string" && gate.gate_id
        ? [{ value: gate.gate_id, label: technicalPlanEntryName(gate, index, titles) }] : [])
      : [],
    activation_gate: activationGates.flatMap((gate, index) => typeof gate.gate_id === "string" && gate.gate_id ?
      [{ value: gate.gate_id, label: technicalPlanEntryName(gate, index, titles),
        changeGroupIds: Array.isArray(gate.affected_landing_unit_ids) ? gate.affected_landing_unit_ids : undefined }] : []) };
  function change(next: unknown) {
    onEdit(current => technicalPlanSetSection(current, section, next));
  }
  const groupEditor = !parseError && key === "landing_units" && (value == null ||
    Array.isArray(value) && value.length === changeGroups.length && new Set(groups.map(group => group.value)).size === changeGroups.length);
  const groupedWork = new Set(changeGroups.flatMap(group => group.covered_work_item_ids ?? []));
  const unassignedWork = planChoices.filter(item => !groupedWork.has(item.value)).length;
  const repositorySearchControl = live && repositoryLookupFields.length ? <TerasFieldStack spacing="compact">
    <TerasActionRow spacing="compact">
      <TerasActionButton emphasis="secondary" size="table-compact" disabled={disabled} aria-expanded={repositorySearch}
        onClick={() => setRepositorySearchSection(repositorySearch ? null : section)}>
        {repositorySearch ? "Close repository search" : "Search repository registry"}
      </TerasActionButton>
    </TerasActionRow>
    {repositorySearch ? <PlanRepositorySearch disabled={disabled} repositories={repositories} /> : null}
  </TerasFieldStack> : null;
  const verificationCoverage = key === "cases" ? technicalPlanVerificationCoverage(editor) : [];
  function verificationField(fieldKey: string) {
    return <ArchitecturePlanField schema={architectureFormContract.properties.conformance_plan.properties?.[fieldKey] ?? {}}
      name={fieldKey} value={verification[fieldKey]} disabled={disabled} references={refs} confirmChange={confirmChange}
      workItems={scopedChoices} repositories={repositoryChoices} onRepair={() => setRepairOpen(true)}
      onChange={next => onEdit(current => technicalPlanSetSection(current, `conformance_plan:${fieldKey}`, next))} />;
  }

  return <>
    <TerasSectionEditorLayout fill contentKey={section}
      navigation={<TerasPlanning.NavigationPanel treatment="neutral" frame="padded" density="compact" spacing="tight">
        <TerasPlanning.NavigationHeading kicker="Plan editor" title="Planning areas" />
        <TerasPlanning.NavigationSteps ariaLabel="Planning areas">
          {planningAreas.map(group => <TerasProgressStepSelector key={group.id} current={area.id === group.id}
            available={!navigationDisabled} density="compact" index={group.number} label={group.label} detail={disabled ? undefined : group.state} stateLabel={null}
            tone={area.id === group.id ? "warn" : "muted"}
            onSelect={() => setSection(group.id === "verification" ? "conformance_plan:cases" : group.sections[0])} />)}
        </TerasPlanning.NavigationSteps>
      </TerasPlanning.NavigationPanel>} selector={<TerasSelectField label="Planning area" disabled={navigationDisabled} value={area.id}
      options={planningAreas.map(group => ({ value: group.id, label: `${group.number}. ${group.label}` }))}
      onValueChange={id => setSection(id === "verification" ? "conformance_plan:cases" : technicalPlanGroups.find(group => group.id === id)!.sections[0])} />}
      sectionSelector={<TerasPlanning.SectionHeader>
        <TerasPanelHeader kicker={area.label} title={<span id={sectionTitleId}>{sectionLabel}</span>} actionsLayout="inline"
          description={sectionDescription}
          actions={<TerasActionRow spacing="compact">
            {groupEditor && (!planChoices.length || unassignedWork > 0) ? <TerasStatusPill tone="warn">
              {!planChoices.length ? "Select scope" : `${unassignedWork} unassigned`}
            </TerasStatusPill> : null}
            {disabled ? <TerasStatusPill tone="muted">Read-only</TerasStatusPill> :
              <TerasStatusPill tone={sectionState === "Needs attention" ? "warn" : "info"}>{sectionState}</TerasStatusPill>}
            {hasHiddenOperationOptions ? <TerasActionButton emphasis="secondary" size="table-compact"
              onClick={() => setShowOperationDetails(true)}>Show lifecycle and access options</TerasActionButton> : null}
            {area.id === "verification" && key !== "cases" ? <TerasActionButton emphasis="secondary" size="table-compact"
              onClick={() => setSection("conformance_plan:cases")}>Back to verification cases</TerasActionButton> : null}
            {sectionGuidance ? <TerasActionButton emphasis="secondary" size="table-compact"
              aria-label="Section guidance" title="Section guidance" onClick={() => setGuidanceOpen(true)}>
              <CircleHelp aria-hidden="true" size={14} />
            </TerasActionButton> : null}
          </TerasActionRow>} />
        {hasSectionTabs ? <TerasPlanning.SectionTabs ariaLabel="Plan sections" size="compact" layout="fill"
          tabPanelId={sectionPanelId} disabled={navigationDisabled} value={section} options={sections} onValueChange={setSection} /> : null}
      </TerasPlanning.SectionHeader>}>
      <TerasPlanning.SectionStack spacing="normal" role={hasSectionTabs ? "tabpanel" : "region"} id={sectionPanelId}
        aria-labelledby={hasSectionTabs ? `${sectionPanelId}-tab-${section}` : sectionTitleId}>
        <TerasPlanning.SectionFields role="region" aria-label="Section fields" fill scroll tabIndex={0}>
          <TerasFieldStack spacing="normal">
            {groupEditor ? <TechnicalPlanChangeGroups groups={changeGroups} work={planChoices} repositories={repositoryChoices}
              pins={source.pins} onOpenRevisions={() => setSection("repo_revisions")}
              disabled={disabled} onChange={change} repositorySearch={repositorySearchControl} confirmChange={confirmChange} /> : <>
              {section === "architecture:runtime_boundaries" && !parseError ? <TerasPlanning.FieldHint>
                <strong>Standard installation rules</strong> cover plan handling and evidence storage automatically.
              </TerasPlanning.FieldHint> : null}
              {section === "conformance_plan:protocol_applicability" && !parseError && verification.required !== true ?
                <TerasContentTray title="Include the verification required for approval"
                  description="This draft has no verification requirement recorded. Apply the Technical Plan requirement, then decide whether it also needs checks for system connections."
                  actions={<TerasActionButton emphasis="secondary" disabled={disabled} onClick={() => onEdit(current => ({
                    ...current, conformanceJson: JSON.stringify({ ...JSON.parse(current.conformanceJson), required: true }, null, 2),
                  }))}>Use required verification</TerasActionButton>} /> : null}
              {!parseError && key === "cases" ? <TerasActionRow spacing="compact">
                <TerasActionButton emphasis="secondary" size="table-compact" aria-haspopup="dialog"
                  onClick={() => setVerificationDialog("coverage")}>{technicalPlanVerificationReaders.coverage}</TerasActionButton>
                <TerasActionButton emphasis="secondary" size="table-compact" aria-haspopup="dialog"
                  onClick={() => setVerificationDialog("settings")}>{technicalPlanVerificationReaders.settings}</TerasActionButton>
              </TerasActionRow> : null}
              {parseError ? <TerasContentTray title="Saved draft needs repair"
                description="The form cannot open this saved portion of the draft. Its original contents are retained."
                actions={<TerasActionButton emphasis="secondary" disabled={disabled} onClick={() => setRepairOpen(true)}>Open draft repair</TerasActionButton>} /> :
                group === "repo_revisions" ?
                  <TechnicalPlanSourceRevisions key={scopeKey} source={source} repositories={scopedOwners} disabled={disabled}
                    onPins={(pins, replace) => onEdit(current => {
                      if (current.deliveryId !== editor.deliveryId || current.coveredWorkItemIds.slice().sort().join(",") !== scopeKey) return current;
                      const prior = readStoredPins(current.repoRevisionsJson);
                      if (!Array.isArray(prior)) return current;
                      const next = [...prior];
                      for (const pin of pins) {
                        const index = next.findIndex(row => row?.repo === pin.repo);
                        if (index === -1) next.push(pin);
                        else if (replace || !isSourceRevision(next[index])) next[index] = pin;
                      }
                      const revised = JSON.stringify(next, null, 2);
                      return revised === current.repoRevisionsJson ? current : { ...current, repoRevisionsJson: revised };
                    })}
                    manual={header => <ArchitecturePlanField schema={schema} value={value} name={group}
                      listHeader={header} disabled={disabled} confirmChange={confirmChange}
                      workItems={scopedChoices} repositories={scopedOwners.map(value => ({ value, label: value }))}
                      onChange={change} onRepair={() => setRepairOpen(true)} />} /> :
                <ArchitecturePlanField key={section} schema={schema} value={value}
                  name={key ?? group} disabled={disabled} confirmChange={confirmChange}
                  inactiveValue={group === "architecture" && isOptionalArchitectureSection(key) ? editor.inactiveArchitectureSections?.[key] : undefined}
                  workItems={["work_item_execution_plan", "required_human_gates", "evidence_receipt_handoffs", "cases", "work_item_dimension_applicability", "git_causality"].includes(key ?? "") ? scopedChoices : choices}
                  repositories={key === "runtime_activation_chains" ? scopedOwners.map(value => ({ value, label: value })) : repositoryChoices}
                  references={refs} onChange={change} onRepair={() => setRepairOpen(true)}
                  approvedRuntimeResponsibilities={key === "runtime_boundaries" ? approvedRuntimeResponsibilities : undefined}
                  repositorySearch={repositorySearchControl} repositoryLookupFields={repositoryLookupFields} source={source}
                  emptyAnswer={emptyAnswer}
                  emptyHelp={key === "evidence_receipt_handoffs" && new Set(groups.map(item => item.repository).filter(Boolean)).size < 2 ?
                    "A handoff needs change groups in two different repositories. Add the groups that will exchange evidence, and use only work that belongs in this plan." : undefined} />}
            </>}
          </TerasFieldStack>
        </TerasPlanning.SectionFields>
      </TerasPlanning.SectionStack>
    </TerasSectionEditorLayout>
    {verificationDialog && key === "cases" && !parseError ? <TerasDialog open onClose={() => setVerificationDialog(null)}
      kicker="Verification" title={technicalPlanVerificationReaders[verificationDialog]}
      width="large" height="content" contentOverflow="auto">
      <TerasPlanning.ChoiceFields spacing="normal">
        {verificationDialog === "coverage" ? <>
          <TerasFieldStack spacing="normal">
            {verificationCoverage.length ? <TerasContentTray title="Items missing a complete case"
              description={`${verificationCoverage.length} ${verificationCoverage.length === 1 ? "work item needs" : "work items need"} a complete success or failure case.`}>
              <TerasTechnicalDetails summary="See which cases are missing" items={verificationCoverage.map(item => ({
                label: <TechnicalPlanWorkTitle label={titles[item.id] ?? item.id.replace(/^work-item-/, "Work item #")} />,
                value: item.missing.map(kind => kind === "positive" ? "Success case" : "Failure case").join(" and "),
              }))} />
            </TerasContentTray> : null}
            {verificationField("dimensions")}
          </TerasFieldStack>
          <TerasContentTray title="Checks by work item" description="Choose which checks apply to each work item.">
            {verificationField("work_item_dimension_applicability")}
          </TerasContentTray>
        </> : <>
          <TerasContentTray title="System connections" description="Use these checks when the work changes how systems send commands, data, or results.">
            {verificationField("protocol_applicability")}
          </TerasContentTray>
          <TerasContentTray title="Git dependencies" description="Record the Git dependencies a check needs to prove.">
            {verificationField("git_causality")}
          </TerasContentTray>
        </>}
      </TerasPlanning.ChoiceFields>
    </TerasDialog> : null}
    {guidanceOpen && sectionGuidance ? <TerasDialog open kicker={area.label} title={sectionLabel} description={sectionGuidance}
      width="compact" height="content" contentOverflow="auto" onClose={() => setGuidanceOpen(false)} /> : null}
    {repairOpen ? <StoredDraftRepair key={field} value={editor[field]} expectsList={group === "repo_revisions"} disabled={disabled}
      onClose={() => setRepairOpen(false)} onUse={value => {
        onEdit(current => ({ ...current, [field]: value }));
        setRepairOpen(false);
      }} /> : null}
  </>;
}

function readStoredPlanPart(value: string, expectsList: boolean): unknown {
  const parsed: unknown = JSON.parse(value);
  if (expectsList ? !Array.isArray(parsed) : parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(expectsList ? "The stored content must be a list." : "The stored content must be an object.");
  }
  return parsed;
}

function StoredDraftRepair({ value, expectsList, disabled, onClose, onUse }: {
  value: string; expectsList: boolean; disabled: boolean; onClose: () => void; onUse: (value: string) => void;
}) {
  const [replacement, setReplacement] = useState(value);
  const [error, setError] = useState<string | null>(null);
  function useReplacement() {
    try {
      readStoredPlanPart(replacement, expectsList);
      onUse(replacement);
    } catch (failure) {
      setError(failure instanceof SyntaxError ? "The repaired text must be valid JSON." :
        failure instanceof Error ? failure.message : "The repaired content could not be read.");
    }
  }
  return <TerasDialog open onClose={onClose} kicker="Advanced repair" title="Recover saved draft"
    description="The original draft stays in place until you apply repaired content."
    width="large" height="content" contentOverflow="auto"
    actions={<TerasActionButton disabled={disabled || value === replacement} onClick={useReplacement}>Use repaired content</TerasActionButton>}>
    <TerasFieldStack spacing="normal">
      <TerasNoteField label="Stored draft content" value={replacement} disabled={disabled} onValueChange={text => {
        setReplacement(text);
        setError(null);
      }} />
      {error ? <TerasEmptyState>{error}</TerasEmptyState> : null}
    </TerasFieldStack>
  </TerasDialog>;
}

function PlanRepositorySearch({disabled,repositories}: {disabled:boolean;repositories:ReturnType<typeof useRepositoryCatalogChoices>}) {
  return <TerasFieldStack spacing="compact">
    <TerasTextField label="Find registered repository" disabled={disabled} value={repositories.query} placeholder="Search repositories by name" onValueChange={repositories.onQueryChange}/>
    {repositories.loading ? <TerasLoadingState inline label="Finding registered repositories…"/> : null}
    {repositories.error ? <TerasEmptyState>{repositories.error} Repository names remain editable; registration is still checked by the service.<TerasActionButton emphasis="secondary" onClick={() => repositories.refresh()}>Retry Repository Search</TerasActionButton></TerasEmptyState> : null}
  </TerasFieldStack>;
}

function readStoredPins(value: string) {
  try { return readStoredPlanPart(value, true); }
  catch { return null; }
}
