"use client";

import type { ReactNode } from "react";
import { deliveryFieldDisplayLabel } from "../../../../../read-model/terms/copy.ts";
import { refinementFieldHelp } from "../../view-model/refinement-workbench-model.ts";

import {
  TerasActionRow,
  TerasContentTray,
  TerasNoteField,
  TerasSelectableRow,
  TerasUtilityButton,
  TerasSelectField,
  TerasStatusPill,
  TerasTextField,
} from "@/teras";
import type { TerasTone } from "@/teras";
import type {
  DeliveryRefinementDraftField,
  DeliveryTone,
} from "../../../../../read-model/index.ts";
import { refinementMetadataValueSelectOptions } from "../../view-model/refinement-metadata-model.ts";

const editorFieldProps = {
  autoCapitalize: "off",
  autoCorrect: "off",
  spellCheck: false,
} as const;

export function MetadataEditorHeaderActions({
  collapsed,
  onToggleCollapsed,
  statusLabel,
  statusTone,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  statusLabel?: ReactNode;
  statusTone: TerasTone;
}) {
  return (
    <TerasActionRow spacing="none">
      {statusLabel ? (
        <TerasStatusPill size="compact" tone={statusTone}>
          {statusLabel}
        </TerasStatusPill>
      ) : null}
      <TerasUtilityButton
        aria-expanded={!collapsed}
        onClick={onToggleCollapsed}
      >
        {collapsed ? "Expand" : "Collapse"}
      </TerasUtilityButton>
    </TerasActionRow>
  );
}

export function MetadataFieldSelectorButton({
  detail,
  label,
  onSelect,
  selected,
  status,
  tone,
}: {
  detail: string;
  label: string;
  onSelect: () => void;
  selected: boolean;
  status: string;
  tone: DeliveryTone;
}) {
  return (
    <TerasSelectableRow
      ariaLabel={`Select ${label}`}
      detail={detail}
      label={label}
      onSelect={onSelect}
      selected={selected}
      status={status}
      tone={tone}
    />
  );
}

export function MetadataValueControl({
  blocked,
  draftValue,
  field,
  onUpdateMetadataDraftValue,
}: {
  blocked: boolean;
  draftValue: string;
  field: DeliveryRefinementDraftField;
  onUpdateMetadataDraftValue: (value: string) => void;
}) {
  const label = deliveryFieldDisplayLabel(field.label);
  const helper = refinementFieldHelp(field);
  if (field.field_kind === "generated") {
    return (
      <TerasContentTray
        description="Generated from Work Design and plan/apply source. Reopen the source tree when this shape is wrong."
        kicker="Generated value · read-only"
        title={draftValue}
      />
    );
  }

  if (field.field_kind === "select") {
    return (
      <TerasSelectField
        ariaLabel={label}
        disabled={blocked || !field.allowed_values?.length}
        helper={!field.allowed_values?.length ? "The connected source supplied no available choices for this field and selection." : helper}
        label={label}
        onValueChange={onUpdateMetadataDraftValue}
        options={refinementMetadataValueSelectOptions({ draftValue, field })}
        value={draftValue}
      />
    );
  }

  if (field.field_kind === "number") {
    return (
      <TerasTextField
        {...editorFieldProps}
        aria-label={label}
        helper={helper}
        disabled={blocked}
        inputMode="numeric"
        label={label}
        min={0}
        step={(field.numeric_type ?? (["planned_business_value", "actual_business_value"].includes(field.backend_field) ? "integer" : "decimal")) === "integer" ? 1 : "any"}
        onValueChange={onUpdateMetadataDraftValue}
        type="number"
        value={draftValue}
      />
    );
  }

  if (field.field_kind === "short_text") {
    return (
      <TerasTextField
        {...editorFieldProps}
        aria-label={label}
        helper={helper}
        disabled={blocked}
        label={label}
        maxLength={field.value_limit}
        onValueChange={onUpdateMetadataDraftValue}
        type={field.route_binding.payload_key === "risk_review_date" ? "date" : "text"}
        value={draftValue}
      />
    );
  }

  return (
    <TerasNoteField
      {...editorFieldProps}
      aria-label={label}
      helper={helper}
      disabled={blocked}
      label={label}
      maxLength={field.value_limit}
      onValueChange={onUpdateMetadataDraftValue}
      value={draftValue}
    />
  );
}
