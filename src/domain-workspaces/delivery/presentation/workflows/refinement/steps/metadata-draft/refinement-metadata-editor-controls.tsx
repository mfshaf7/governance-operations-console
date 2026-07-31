"use client";

import type { ReactNode } from "react";

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
  if (field.field_kind === "generated") {
    return (
      <TerasContentTray
        description="Generated from Work Design and plan/apply source. Reopen the source tree when this shape is wrong."
        kicker="Workbench Value"
        title={draftValue}
      />
    );
  }

  if (field.field_kind === "select") {
    return (
      <TerasSelectField
        ariaLabel="Workbench Value"
        disabled={blocked}
        helper="Controlled field. Values must come from the backend-backed option list before live apply."
        label="Workbench Value"
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
        aria-label="Workbench Value"
        disabled={blocked}
        inputMode="numeric"
        label="Workbench Value"
        min={0}
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
        aria-label="Workbench Value"
        disabled={blocked}
        label="Workbench Value"
        maxLength={field.value_limit}
        onValueChange={onUpdateMetadataDraftValue}
        value={draftValue}
      />
    );
  }

  return (
    <TerasNoteField
      {...editorFieldProps}
      aria-label="Workbench Value"
      disabled={blocked}
      label="Workbench Value"
      maxLength={field.value_limit}
      onValueChange={onUpdateMetadataDraftValue}
      value={draftValue}
    />
  );
}
