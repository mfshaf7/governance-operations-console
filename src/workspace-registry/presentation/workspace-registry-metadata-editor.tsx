"use client";

import { useState } from "react";
import { TerasActionButton, TerasActionRow, TerasContentTray, TerasSelectField, TerasFieldStack, TerasNoteField, TerasTextField, TerasTextListField } from "@/teras";

/** Edits only supplied fields; the full owner record is retained for submission. */
export function WorkspaceRegistryMetadataEditor({ value, disabled, repositories, onChange }: {
  value: string; disabled: boolean; repositories: readonly string[]; onChange: (value: string) => void;
}) {
  const [advanced, setAdvanced] = useState(false);
  let record: Record<string, unknown> | null = null;
  try { const parsed: unknown = JSON.parse(value); if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) record = parsed as Record<string, unknown>; } catch { /* Keep malformed advanced input available for correction. */ }
  const validation = record?.validation_behavior && typeof record.validation_behavior === "object" && !Array.isArray(record.validation_behavior)
    ? record.validation_behavior as Record<string, unknown> : null;
  function update(key: string, next: unknown) { if (record) onChange(JSON.stringify({ ...record, [key]: next }, null, 2)); }
  const ownerFields = [["platform_owner", "Platform repository"], ["runtime_owner", "Runtime repository"],
    ["security_owner", "Security repository"], ["owner_repo", "Responsible repository"]];
  const scalarFields = [["notes", "Purpose and boundary"], ["component_class", "Component type"]];
  const sourceOwners = Array.isArray(record?.source_owners) && record.source_owners.every(item => typeof item === "string") ? record.source_owners as string[] : null;
  const listFields = [["owns", "Responsibilities"], ["must_not_own", "Responsibility limits"]];
  return <TerasFieldStack spacing="compact">
    {ownerFields.map(([key, label]) => typeof record?.[key] === "string" ? <TerasSelectField key={key} label={label} disabled={disabled} value={record[key] as string}
      options={[...new Set([record[key] as string, ...repositories])].map(name => ({label:name,value:name}))} onValueChange={next => update(key, next)}/> : null)}
    {sourceOwners ? <TerasContentTray kicker="Source repositories">
      <TerasActionRow>{sourceOwners.map(name => <TerasActionButton key={name} aria-label={`Remove source repository ${name}`} emphasis="secondary" disabled={disabled} onClick={() => update("source_owners", sourceOwners.filter(item => item !== name))}>{name} ×</TerasActionButton>)}</TerasActionRow>
      <TerasSelectField label="Add source repository" disabled={disabled} value="" options={[{label:"Choose a repository",value:""},...repositories.filter(name => !sourceOwners.includes(name)).map(name => ({label:name,value:name}))]}
        onValueChange={name => {if(name) update("source_owners", [...sourceOwners,name]);}}/>
    </TerasContentTray> : null}
    {scalarFields.map(([key, label]) => typeof record?.[key] === "string" ? <TerasTextField key={key} label={label} disabled={disabled} value={record[key] as string} onValueChange={next => update(key, next)}/> : null)}
    {listFields.map(([key, label]) => Array.isArray(record?.[key]) && (record[key] as unknown[]).every(item => typeof item === "string") ? <TerasTextListField key={key} label={label} disabled={disabled} items={record[key] as string[]} itemLabel={index => `${label} ${index + 1}`} maxItems={Math.max(20, (record[key] as string[]).length)} onItemsChange={next => update(key, next)} visibleItems={2}/> : null)}
    {typeof validation?.notes === "string" ? <TerasNoteField label="Validation notes" disabled={disabled} minimumHeight="short" value={validation.notes} onValueChange={notes => update("validation_behavior", { ...validation, notes })}/> : null}
    <TerasActionButton emphasis="secondary" onClick={() => setAdvanced(current => !current)}>{advanced ? "Hide complete record" : "Edit complete record"}</TerasActionButton>
    {advanced ? <TerasNoteField density="compact" label="Complete record value (JSON)" disabled={disabled} minimumHeight="medium" spellCheck={false} value={value} onValueChange={onChange} placeholder="Preserve unchanged fields and posture; omit the managed record envelope."/> : null}
  </TerasFieldStack>;
}
