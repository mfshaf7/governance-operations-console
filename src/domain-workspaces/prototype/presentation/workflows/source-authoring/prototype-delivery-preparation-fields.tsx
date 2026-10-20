"use client";
import { TerasFieldStack, TerasNoteField, TerasSelectField, TerasTextField, TerasTextListField } from "@/teras";
import type { PrototypeDeliveryPreparation } from "../../../live-runtime/prototype-source-types.ts";

export function emptyPrototypeDeliveryPreparation(): PrototypeDeliveryPreparation {
  return { kind: "delivery-packet", work: { title: "", objective: "", included_scope: [""], excluded_scope: [], remaining_work: [""] },
    custody: { classification: "new-repo-required", repository_mode: "new", repository_gate_state: "resolved", owner: "", source_ref: "", rationale: "" },
    evidence_refs: [""], rationale: "", decision_ref: "" };
}
export function PrototypeDeliveryPreparationFields({ value, onChange, disabled }: {
  value: PrototypeDeliveryPreparation; onChange: (value: PrototypeDeliveryPreparation) => void; disabled: boolean;
}) {
  const work = value.work, custody = value.custody;
  function classification(selected: PrototypeDeliveryPreparation["custody"]["classification"]) {
    const base = { owner: custody.owner, rationale: custody.rationale };
    onChange({ ...value, custody: selected === "existing-repo" || selected === "new-repo-required"
      ? { ...base, classification: selected, repository_mode: selected === "existing-repo" ? "existing" : "new", repository_gate_state: "resolved", source_ref: custody.source_ref ?? "" }
      : { ...base, classification: selected, repository_mode: "not-required", repository_gate_state: "not-required", source_ref: null } });
  }
  return <TerasFieldStack spacing="normal">
    <TerasTextField disabled={disabled} label="Delivery title" value={work.title} maxLength={10000} onValueChange={title => onChange({ ...value, work: { ...work, title } })} />
    <TerasNoteField disabled={disabled} label="Delivery objective" value={work.objective} minimumHeight="short" maxLength={10000} onValueChange={objective => onChange({ ...value, work: { ...work, objective } })} />
    {(["included_scope", "excluded_scope", "remaining_work"] as const).map(key => <TerasTextListField key={key} disabled={disabled}
      label={{ included_scope: "Included scope", excluded_scope: "Excluded scope", remaining_work: "Remaining Delivery work" }[key]}
      items={work[key]} maxItems={200} maxLength={10000} minItems={key === "excluded_scope" ? 0 : 1}
      itemLabel={index => `${key} ${index + 1}`} onItemsChange={items => onChange({ ...value, work: { ...work, [key]: items } })} />)}
    <TerasSelectField disabled={disabled} label="Resolved custody intent (not repository admission)" value={custody.classification} onValueChange={classification} options={[
      { value: "new-repo-required", label: "Provisioned new repository" }, { value: "existing-repo", label: "Existing source owner" },
      { value: "platform-internal", label: "Platform-internal, no repository required" }, { value: "non-source-work", label: "Non-source work, no repository required" },
    ]} helper="Use the actual resolved custody. Packet preparation does not provision a repository, admit an owner or prove provider access." />
    <TerasTextField disabled={disabled} label="Resolved owner" value={custody.owner} maxLength={512} onValueChange={owner => onChange({ ...value, custody: { ...custody, owner } })} />
    {custody.source_ref !== null ? <TerasTextField disabled={disabled} label="Resolved source reference" value={custody.source_ref} maxLength={512} onValueChange={source_ref => {
      if (custody.source_ref !== null) onChange({ ...value, custody: { ...custody, source_ref } });
    }} /> : null}
    <TerasNoteField disabled={disabled} label="Custody rationale" value={custody.rationale} minimumHeight="short" maxLength={10000} onValueChange={rationale => onChange({ ...value, custody: { ...custody, rationale } })} />
    <TerasTextListField disabled={disabled} label="Existing evidence references" items={value.evidence_refs} maxItems={200} minItems={1} maxLength={512}
      itemLabel={index => `Evidence ${index + 1}`} onItemsChange={evidence_refs => onChange({ ...value, evidence_refs })} />
    <TerasNoteField disabled={disabled} label="Delivery handoff rationale" value={value.rationale} minimumHeight="short" maxLength={10000} onValueChange={rationale => onChange({ ...value, rationale })} />
    <TerasTextField disabled={disabled} label="Operator decision record reference" value={value.decision_ref} maxLength={512} onValueChange={decision_ref => onChange({ ...value, decision_ref })} />
  </TerasFieldStack>;
}
