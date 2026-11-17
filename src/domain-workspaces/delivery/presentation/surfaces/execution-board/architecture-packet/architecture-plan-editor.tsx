"use client";
import { useMemo, useState } from "react";
import { TerasActionButton, TerasActionRow, TerasEmptyState, TerasFieldStack, TerasSelectField, TerasTextField, TerasContentTray, TerasMetadataList, TerasNoteField, TerasPanelHeader, TerasLoadingState, TerasSectionEditorLayout, TerasSelectorRailList, TerasSurfaceNavButton } from "@/teras";
import type { DeliveryReadModel } from "../../../../read-model/delivery-read-model.ts";
import type { ArchitecturePacketEditor } from "./architecture-packet-editor-model.ts";
import { architectureFormContract, planFieldInitialValue } from "../../../../work-model/execution/architecture-form-model.ts";
import { useRepositoryCatalogChoices } from "../../../../../../workspace-registry/live-runtime/use-repository-catalog-choices.ts";
import { assertDeliveryWorkSessionSnapshot } from "../../../../live-runtime/delivery-work-session-live-contract.ts";
import { technicalPlanSections, technicalPlanSection, technicalPlanFillRecordedFacts, technicalPlanWorkItems } from "../../../../work-model/execution/technical-plan-model.ts";
import { technicalPlanGroup, technicalPlanGroups, technicalPlanGroupState, technicalPlanInputState, technicalPlanNeedsRepositories } from "../../../../work-model/execution/technical-plan-preparation.ts";
import { ArchitecturePlanField } from "./architecture-plan-field.tsx";

export function ArchitecturePlanEditor({ editor, model, disabled, onEdit, selectedSection, onSectionChange, packageLocked = false }: {
  editor: ArchitecturePacketEditor; model: DeliveryReadModel; disabled: boolean;
  selectedSection?: string; onSectionChange?: (section: string) => void; packageLocked?: boolean;
  onEdit: (update: (value: ArchitecturePacketEditor) => ArchitecturePacketEditor) => void;
}) {
  const [localSection, setLocalSection] = useState("architecture:descendant_owner_map"), [reading, setReading] = useState(false), [notice, setNotice] = useState<string | null>(null);
  const section = selectedSection ?? localSection;
  const setSection = onSectionChange ?? setLocalSection;
  const live = model.source_truth === "OpenProject-backed OOS";
  const area = technicalPlanGroup(section);
  const needsRepositories = technicalPlanNeedsRepositories(section);
  const [repositorySearch, setRepositorySearch] = useState(false);
  const repositories = useRepositoryCatalogChoices(live && needsRepositories && repositorySearch);
  const [scopeEditor, setScopeEditor] = useState<"scope" | "summary" | null>(null);
  const workItems = useMemo(() => technicalPlanWorkItems(model, editor.deliveryId), [model, editor.deliveryId]);
  const parentById = new Map(workItems.flatMap(parent => parent.children.map(child => [child.id, parent] as const)));
  const choices = workItems.filter(item => item.legacy_work_package_id).map(item => {
    const parent = parentById.get(item.id);
    return { value: `work-item-${item.legacy_work_package_id}`, label: `${item.component_type} ${item.legacy_work_package_id} · ${item.title}`,
      workType: item.component_type, repository: item.owner_repo ?? null, parent: parent?.legacy_work_package_id ? `work-item-${parent.legacy_work_package_id}` : null };
  });
  const sections = technicalPlanSections.filter(([value]) => area.sections.some(key => key === value)).map(([value,label])=>({value,label: `${label} · ${technicalPlanInputState(editor, value)}`}));
  const [group, key] = section.split(":") as ["architecture" | "conformance_plan" | "repo_revisions", string?];
  const field = group === "architecture" ? "architectureJson" : group === "conformance_plan" ? "conformanceJson" : "repoRevisionsJson";
  const schema = key ? architectureFormContract.properties[group].properties?.[key] ?? {} : architectureFormContract.properties[group];
  let parsed: unknown; let parseError: string | null = null;
  try { parsed = JSON.parse(editor[field]);
    if (group === "repo_revisions" ? !Array.isArray(parsed) : !parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw Error("shape");
  } catch { parseError = "This section needs a valid " + (group === "repo_revisions" ? "list" : "object") + " in Technical data. Your original input is retained."; }
  const value = key ? (parsed as Record<string, unknown> | undefined)?.[key] : parsed;
  function change(next: unknown) {
    onEdit(current => {
      const source = JSON.parse(current[field]);
      return { ...current, [field]: JSON.stringify(key ? { ...source, [key]: next } : next, null, 2) };
    });
  }
  async function readSourceRevision() {
    const target = editor.coveredWorkItemIds.find(item => /^work-item-[1-9][0-9]*$/.test(item));
    if (!target) { setNotice("Choose a covered work item first."); return; }
    setReading(true); setNotice(null);
    try {
      const response = await fetch(`/api/delivery/execution/${target.replace("work-item-", "")}/work-session`, { cache: "no-store", signal: AbortSignal.timeout(30_000) });
      const snapshot = assertDeliveryWorkSessionSnapshot(await response.json());
      if (!response.ok || snapshot.mode !== "live" || snapshot.projection?.work_item_id !== target || snapshot.projection.delivery_id !== editor.deliveryId) throw Error("The source session could not be verified for this work item.");
      const source = snapshot.projection.configured_path?.source as { owner_repo?: { name?: unknown }; base?: { fetched_commit?: unknown; ref?: unknown } } | undefined;
      const repo = source?.owner_repo?.name, commit = source?.base?.fetched_commit, base = source?.base?.ref;
      if (typeof repo !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(repo) || typeof commit !== "string" || !/^[0-9a-f]{40}$/.test(commit) || typeof base !== "string" || !base.trim()) throw Error("No verified repository revision is available from this work session. Reuse the current approved plan or enter a revision you have independently verified; no commit has been guessed.");
      onEdit(current => {
        if (current.deliveryId !== editor.deliveryId || !current.coveredWorkItemIds.includes(target)) return current;
        const rows: { repo: string; base_ref: string; commit: string }[] = JSON.parse(current.repoRevisionsJson);
        return { ...current, repoRevisionsJson: JSON.stringify([...rows.filter(row => row.repo !== repo), { repo, base_ref: base, commit }], null, 2) };
      });
      setNotice(`Loaded the observed ${repo} revision for review. No source action was started.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Source revision is unavailable."); }
    finally { setReading(false); }
  }
  return <TerasFieldStack spacing="normal">
    <TerasContentTray title="Scope & Justification"
      actions={<TerasActionRow spacing="compact">
        <TerasActionButton emphasis="secondary" disabled={disabled} onClick={() => setScopeEditor(scopeEditor === "scope" ? null : "scope")}>{scopeEditor === "scope" ? "Close Scope" : "Edit Scope"}</TerasActionButton>
        <TerasActionButton emphasis="secondary" disabled={disabled} onClick={() => setScopeEditor(scopeEditor === "summary" ? null : "summary")}>{scopeEditor === "summary" ? "Close Summary" : "Edit Summary"}</TerasActionButton>
      </TerasActionRow>}>
      <TerasFieldStack spacing="normal">
        <TerasMetadataList shape="line" treatment="chip" wrap items={[
          {label:"Covered work",value:editor.coveredWorkItemIds.filter(Boolean).map(id => choices.find(choice => choice.value === id)?.label ?? id).join(" · ") || "Choose work using Edit Scope"},
          {label:"Justification",value:editor.rationale.trim() ? "Draft entered" : "Not entered"},
        ]}/>
        {scopeEditor === "summary" ? <TerasNoteField label="Plan summary and justification" disabled={disabled} value={editor.rationale} minimumHeight="short"
          placeholder="Explain the design decision and material limitations. At least 20 characters." onValueChange={rationale => onEdit(current => ({...current,rationale}))}/> : null}
        {scopeEditor === "scope" ? <TerasFieldStack spacing="normal">
          <TerasSelectField label="Delivery package" disabled={disabled || packageLocked} value={editor.deliveryId} options={[
            { value: "", label: "Choose a package" }, ...model.packages.map(item => ({ value: `delivery-${item.legacy_epic_id}`, label: `Epic ${item.legacy_epic_id} · ${item.display_name}` })),
          ]} onValueChange={deliveryId => onEdit(current => ({ ...current, deliveryId, coveredWorkItemIds: [""] }))} />
          {editor.coveredWorkItemIds.map((id, index) => <TerasFieldStack key={index} spacing="compact">
            <TerasSelectField disabled={disabled} label={`Covered work item ${index + 1}`} value={id}
              options={[{ value: "", label: "Choose work included in this plan" }, ...choices, ...(id && !choices.some(choice => choice.value === id) ? [{ value: id, label: `${id} · not loaded in this scope` }] : [])]}
              onValueChange={next => onEdit(current => technicalPlanFillRecordedFacts({ ...current, coveredWorkItemIds: current.coveredWorkItemIds.map((value, at) => at === index ? next : value) }, model))} />
            {editor.coveredWorkItemIds.length > 1 ? <TerasActionButton emphasis="secondary" disabled={disabled} onClick={() => onEdit(current => ({ ...current, coveredWorkItemIds: current.coveredWorkItemIds.filter((_, at) => at !== index) }))}>Remove work item {index + 1}</TerasActionButton> : null}
          </TerasFieldStack>)}
          <TerasActionRow><TerasActionButton emphasis="secondary" disabled={disabled || editor.coveredWorkItemIds.length >= 50} onClick={() => onEdit(current => ({ ...current, coveredWorkItemIds: [...current.coveredWorkItemIds, ""] }))}>Add covered work</TerasActionButton></TerasActionRow>
        </TerasFieldStack> : null}
      </TerasFieldStack>
    </TerasContentTray>
    <TerasSectionEditorLayout navigation={<TerasSelectorRailList aria-label="Planning areas">
      {technicalPlanGroups.map(group => <TerasSurfaceNavButton key={group.id} layout="stacked" current={area.id === group.id} disabled={disabled}
        title={group.label} kicker={technicalPlanGroupState(editor, group)} onClick={() => setSection(group.sections[0])}/>)}
    </TerasSelectorRailList>} selector={<TerasSelectField label="Planning area" disabled={disabled} value={area.id}
      options={technicalPlanGroups.map(group => ({value:group.id,label:group.label}))} onValueChange={id => setSection(technicalPlanGroups.find(group => group.id === id)!.sections[0])}/>}
      sectionSelector={<TerasSelectField label="Plan section" disabled={disabled} value={section} options={sections} onValueChange={setSection}/>} >
      <TerasFieldStack spacing="normal">
        {area.id === "verification" ? <TerasSelectField label="Verification required" helper="An explicit plan decision. The owner checks its consistency with the applicable verification rules." disabled={disabled || Boolean(parseError)}
          value={typeof (parsed as Record<string,unknown> | undefined)?.required === "boolean" ? String((parsed as Record<string,unknown>).required) : ""}
          options={[{value:"",label:"Choose…"},{value:"true",label:"Yes"},{value:"false",label:"No"}]}
          onValueChange={value => onEdit(current => ({...current,conformanceJson:JSON.stringify({...JSON.parse(current.conformanceJson),required:value === "" ? null : value === "true"},null,2)}))}/> : null}
        <TerasContentTray kicker={`${area.label} · ${technicalPlanInputState(editor, section)}`} title={technicalPlanSection(section)[1]} description={technicalPlanSection(section)[2]}>
        {parseError ? <TerasEmptyState>{parseError}</TerasEmptyState> : <ArchitecturePlanField key={section} schema={schema} value={value ?? planFieldInitialValue(schema)}
          name={key ?? group} disabled={disabled || reading} workItems={choices} repositories={repositories.result?.options.map(item => ({ value: item.valueKey, label: item.label })) ?? []} onChange={change} />}
        {live && needsRepositories ? <TerasFieldStack spacing="compact">
          <TerasActionRow spacing="compact"><TerasActionButton emphasis="secondary" disabled={disabled} onClick={() => setRepositorySearch(!repositorySearch)}>{repositorySearch ? "Close Repository Search" : "Find a Repository"}</TerasActionButton></TerasActionRow>
          {repositorySearch ? <PlanRepositorySearch disabled={disabled} repositories={repositories}/> : null}
        </TerasFieldStack> : null}
        {group === "repo_revisions" ? <TerasActionButton emphasis="secondary" disabled={disabled || reading || !live} busy={reading} onClick={() => void readSourceRevision()}>Read available source revision</TerasActionButton> : null}
        {notice ? <TerasEmptyState>{notice}</TerasEmptyState> : null}
        </TerasContentTray>
      </TerasFieldStack>
    </TerasSectionEditorLayout>
    <small>Empty, Draft and Needs attention describe local input only. Validate Plan checks the work’s requirements.</small>
  </TerasFieldStack>;
}

function PlanRepositorySearch({disabled,repositories}: {disabled:boolean;repositories:ReturnType<typeof useRepositoryCatalogChoices>}) {
  return <TerasFieldStack spacing="compact">
    <TerasTextField label="Find registered repository" disabled={disabled} value={repositories.query} placeholder="Search repositories by name" onValueChange={repositories.onQueryChange}/>
    {repositories.loading ? <TerasLoadingState inline label="Finding registered repositories…"/> : null}
    {repositories.error ? <TerasEmptyState>{repositories.error} Repository names remain editable; registration is still checked by the service.<TerasActionButton emphasis="secondary" onClick={() => repositories.refresh()}>Retry Repository Search</TerasActionButton></TerasEmptyState> : null}
  </TerasFieldStack>;
}
