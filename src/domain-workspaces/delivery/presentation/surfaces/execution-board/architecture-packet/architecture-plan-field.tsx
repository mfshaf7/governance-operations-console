"use client";
import { useState } from "react";
import { TerasActionButton, TerasActionRow, TerasContentTray, TerasEmptyState, TerasFieldGrid, TerasFieldStack, TerasInspectionSection, TerasMetadataList, TerasNoteField, TerasSelectField, TerasTechnicalDetails, TerasTextField, TerasTextListField } from "@/teras";
import { planFieldInitialValue, planFieldLabel, resolvePlanSchema, type PlanSchema } from "../../../../work-model/execution/architecture-form-model.ts";
import { technicalPlanEntryName } from "../../../../work-model/execution/technical-plan-preparation.ts";

export type PlanChoice = { label: string; value: string; workType?: string; parent?: string | null; repository?: string | null };
type PlanFieldProps = {
  schema: PlanSchema; value: unknown; onChange: (value: unknown) => void;
  name: string; path?: string; disabled: boolean; workItems: PlanChoice[]; repositories: PlanChoice[];
};
const isNote = (name: string) => /rationale|reason|summary|condition|description|boundary|outcome|evidence_requirement/.test(name) || ["session_binding", "execution_binding", "evidence", "acceptance", "resolution"].includes(name);
function fieldHelp(name: string) {
  if (name === "commit") return "The full 40-character commit identifier from verified source. The advisor cannot supply source evidence.";
  if (name === "uri") return "Copy the reference from the original evidence record; do not enter a description in its place.";
  if (name === "digest") return "Copy the SHA-256 fingerprint from that evidence record, including the sha256: prefix.";
  if (name === "base_ref") return "The source reference observed for this revision, such as refs/heads/main.";
  if (name === "id" || name.endsWith("_id") && !name.includes("work_item") && !name.includes("landing_unit")) return "Use a distinct identifier that other plan sections can reference.";
  if (["session_binding", "execution_binding"].includes(name)) return "Describe the binding and the boundary it enforces in plain language.";
  if (name === "evidence_requirement") return "Describe what must be reviewed; this is a requirement, not a claim that evidence exists.";
  return undefined;
}
export function ArchitecturePlanField({ schema: input, value, onChange, name, path = name, disabled, workItems, repositories }: PlanFieldProps) {
  const schema = resolvePlanSchema(input), label = planFieldLabel(name);
  const children = { disabled, workItems, repositories };
  const variants = schema.oneOf ?? schema.anyOf;
  if (variants) {
    const actual = variants.find(item => resolvePlanSchema(item).type !== "null") ?? variants[0];
    const nullable = variants.some(item => resolvePlanSchema(item).type === "null");
    if (nullable && actual.$ref?.endsWith("/workItemId") && workItems.length) {
      const current = typeof value === "string" ? value : value === null ? "none" : "";
      return <TerasSelectField label={label} disabled={disabled} value={current}
        options={[{value:"",label:"Choose…"},{value:"none",label:"None"},...workItems,...(current && current !== "none" && !workItems.some(item => item.value === current) ? [{value:current,label:`${current} · not loaded in this scope`}] : [])]}
        onValueChange={choice => onChange(choice === "none" ? null : choice)}/>;
    }
    return <TerasFieldStack spacing="compact">
      {nullable ? <TerasSelectField disabled={disabled} label={`${label}: applicability`} value={value === null ? "none" : "value"}
        options={[{ value: "value", label: "Specify a value" }, { value: "none", label: "None" }]}
        onValueChange={choice => onChange(choice === "none" ? null : planFieldInitialValue(actual))} /> : null}
      {value !== null || !nullable ? <ArchitecturePlanField {...children} schema={actual} value={value} onChange={onChange} name={name} path={path} /> : null}
    </TerasFieldStack>;
  }
  if (value !== null && value !== undefined && (
    schema.type === "array" && !Array.isArray(value) ||
    schema.type === "object" && (typeof value !== "object" || Array.isArray(value)) ||
    schema.type === "string" && typeof value !== "string" ||
    schema.type === "boolean" && typeof value !== "boolean"
  )) return <TerasEmptyState>{label} has a different data type from this field. The original input is retained; correct it in Technical data before editing here.</TerasEmptyState>;
  if (schema.type === "object") return <PlanObjectFields {...children} schema={schema} value={value} onChange={onChange} name={name} path={path}/>;
  if (schema.type === "array") return <PlanArrayFields {...children} schema={schema} value={value} onChange={onChange} name={name} path={path}/>;
  const workTypes = name === "work_item_type" ? [...new Set([...workItems.map(item => item.workType).filter((item): item is string => Boolean(item)), ...(typeof value === "string" && value ? [value] : [])])] : [];
  const choiceValues = schema.enum ?? (workTypes.length ? workTypes : schema.type === "boolean" ? [true, false] : schema.const !== undefined ? [schema.const] : null);
  if (choiceValues) return <TerasSelectField disabled={disabled} label={label} value={value === null || value === undefined ? "" : JSON.stringify(value)}
    options={[{ value: "", label: "Choose…" }, ...choiceValues.map(item => ({ value: JSON.stringify(item), label: typeof item === "boolean" ? item ? "Yes" : "No" : String(item).replaceAll("_", " ").replaceAll("-", " ") }))]}
    onValueChange={next => onChange(next ? JSON.parse(next) : null)} />;
  const ref = input.$ref?.split("/").at(-1);
  const choices = ref === "workItemId" ? workItems : ref === "repoName" ? repositories : null;
  if (choices?.length) {
    const current = typeof value === "string" ? value : "";
    return <TerasSelectField disabled={disabled} label={label} value={current}
      options={[{ value: "", label: "Choose…" }, ...choices,
        ...(current && !choices.some(item => item.value === current) ? [{ value: current, label: `${current} · not in the loaded choices` }] : [])]}
      onValueChange={onChange} />;
  }
  const text = value === null || value === undefined ? "" : String(value);
  if (isNote(name)) return <TerasNoteField disabled={disabled} label={label}
    minimumHeight="short" helper={fieldHelp(name)} value={text} onValueChange={onChange} />;
  return <TerasTextField disabled={disabled} label={label} helper={fieldHelp(name)} value={text} placeholder={ref === "workItemId" ? "work-item-123" : ref === "repoName" ? "Registered repository name" : undefined}
    onValueChange={next => onChange(["number", "integer"].includes(String(schema.type)) ? next.trim() ? Number(next) : null : next)} />;
}

function PlanObjectFields({schema,value,onChange,path, ...props}: PlanFieldProps) {
  const [editDetails, setEditDetails] = useState(false);
  const record = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const entries = Object.entries(schema.properties ?? {});
  const knownKeys = schema.properties?.work_item_type ? ["work_item_type", "parent_work_item_id", "owner_repo"].filter(key => key in record && key in (schema.properties ?? {})) : [];
  const visible = entries.filter(([key]) => schema.required?.includes(key) || key in record);
  const scalar = ([key,child]:[string,PlanSchema]) => {
    const resolved = resolvePlanSchema(child);
    const variants = resolved.oneOf ?? resolved.anyOf;
    const actual = variants?.find(item => resolvePlanSchema(item).type !== "null");
    return (actual ? !["array","object"].includes(String(resolvePlanSchema(actual).type)) : !["array","object"].includes(String(resolved.type))) && !isNote(key);
  };
  function field(key: string, child: PlanSchema) {
    const required = schema.required?.includes(key);
    return <TerasFieldStack key={key} spacing="compact">
      <ArchitecturePlanField {...props} schema={child} name={key} path={`${path}.${key}`} value={record[key]} onChange={next => {
        const observed = key === "work_item_id" && schema.properties?.work_item_type ? props.workItems.find(item => item.value === next) : null;
        onChange({ ...record, [key]: next, ...(observed ? {
          work_item_type: observed.workType, parent_work_item_id: observed.parent ?? null,
          ...(schema.properties?.owner_repo ? { owner_repo: observed.repository ?? "" } : {}),
        } : {}) });
      }}/>
      {!required ? <TerasActionRow spacing="compact"><TerasActionButton emphasis="secondary" disabled={props.disabled} onClick={() => {
        const next = { ...record }; delete next[key]; onChange(next);
      }}>Remove {planFieldLabel(key)}</TerasActionButton></TerasActionRow> : null}
    </TerasFieldStack>;
  }
  const shown = visible.filter(([key]) => editDetails || !knownKeys.includes(key));
  const optional = entries.filter(([key]) => !schema.required?.includes(key) && !(key in record));
  return <TerasFieldStack spacing="normal">
    {knownKeys.length ? <TerasFieldStack spacing="compact">
      {!editDetails ? <TerasMetadataList shape="line" treatment="chip" wrap items={knownKeys.map(key => ({label:planFieldLabel(key),value:record[key] === null ? "None" : props.workItems.find(item => item.value === record[key])?.label ?? String(record[key] || "Not entered")}))}/> : null}
      <TerasActionRow spacing="compact"><TerasActionButton emphasis="secondary" disabled={props.disabled} onClick={() => setEditDetails(!editDetails)}>{editDetails ? "Close Work Details" : "Edit Work Details"}</TerasActionButton></TerasActionRow>
    </TerasFieldStack> : null}
    {shown.some(scalar) ? <TerasFieldGrid spacing="normal">{shown.filter(scalar).map(([key,child]) => field(key,child))}</TerasFieldGrid> : null}
    {shown.filter(entry => !scalar(entry)).map(([key,child]) => {
      const resolved = resolvePlanSchema(child);
      return ["array","object"].includes(String(resolved.type)) || resolved.oneOf || resolved.anyOf
        ? <TerasContentTray key={key} title={resolved.type === "array" && resolvePlanSchema(resolved.items ?? {}).type === "string" && !["workItemId","repoName"].some(ref => resolved.items?.$ref?.endsWith(`/${ref}`)) && !isNote(key) ? undefined : planFieldLabel(key)}>{field(key,child)}</TerasContentTray> : field(key,child);
    })}
    {optional.length ? <TerasTechnicalDetails summary="Optional fields" items={[]}><TerasActionRow spacing="compact">
      {optional.map(([key,child]) => <TerasActionButton key={key} emphasis="secondary" disabled={props.disabled} onClick={() => onChange({...record,[key]:planFieldInitialValue(child)})}>Add {planFieldLabel(key)}</TerasActionButton>)}
    </TerasActionRow></TerasTechnicalDetails> : null}
  </TerasFieldStack>;
}

function PlanArrayFields({schema,value,onChange,name,path,...props}: PlanFieldProps) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const values = Array.isArray(value) ? value : [], label = planFieldLabel(name);
  const titles = Object.fromEntries(props.workItems.map(item => [item.value,item.label]));
  const itemSchema = resolvePlanSchema(schema.items ?? {}), ref = schema.items?.$ref?.split("/").at(-1);
  if (itemSchema.type === "string" && !isNote(name) && !["workItemId", "repoName"].includes(ref ?? "") && values.every((item): item is string => typeof item === "string"))
    return <TerasTextListField label={label} items={values} itemLabel={index => `${label} ${index + 1}`} addLabel={`Add ${label}`}
      maxItems={100} minItems={0} disabled={props.disabled} emptyLabel="No entries added." onItemsChange={onChange}/>;
  return <TerasFieldStack spacing="normal">
    {!values.length ? <small>No entries. Add one if this section applies; validation checks whether an empty list is allowed for this section.</small> : null}
    {values.map((item,index) => <TerasContentTray key={index} data-plan-entry-path={`${path}.${index}`} title={technicalPlanEntryName(item,index,titles)} kicker={`Entry ${index + 1}`}
      actions={<TerasActionButton emphasis="secondary" onClick={() => setExpanded(expanded === index ? null : index)}>{expanded === index ? "Close Entry" : "Edit Entry"} {index + 1}</TerasActionButton>}>
      {expanded === index ? <TerasFieldStack spacing="normal">
        <ArchitecturePlanField {...props} schema={schema.items ?? {}} name={name} path={`${path}.${index}`} value={item}
          onChange={next => onChange(values.map((current,at) => at === index ? next : current))}/>
        <TerasActionRow><TerasActionButton emphasis="secondary" disabled={props.disabled} onClick={() => {onChange(values.filter((_,at) => at !== index));setExpanded(null);}}>Remove Entry {index + 1}</TerasActionButton></TerasActionRow>
      </TerasFieldStack> : null}
    </TerasContentTray>)}
    <TerasActionRow spacing="compact"><TerasActionButton emphasis="secondary" disabled={props.disabled || values.length >= 100}
      onClick={() => {onChange([...values,planFieldInitialValue(schema.items ?? {})]);setExpanded(values.length);}}>Add {label}</TerasActionButton></TerasActionRow>
  </TerasFieldStack>;
}
