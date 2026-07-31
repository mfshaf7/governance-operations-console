"use client";

import { useMemo } from "react";

import {
  TerasActionButton,
  TerasActionRow,
  TerasRecordCellText,
  TerasRecordMetricText,
  TerasRecordStatusStack,
  TerasRecordTable,
  TerasStatusPill,
  type TerasRecordTableColumn,
} from "@/teras";
import type {
  DeliveryCatalogItem,
  DeliveryCatalogValue,
} from "../../../read-model/index.ts";

import {
  catalogLifecycleLabel,
  catalogLifecycleTone,
  catalogRetirementTableActionLabel,
  catalogValueMutationDisabledReason,
  parentTargetPiValueKey,
  planningWindowForTargetPi,
  targetPiCatalogId,
} from "./catalog-view-model.ts";

export function CatalogValuesTable({
  activeCatalog,
  canEdit,
  canRetire,
  catalogValues,
  onEdit,
  onRetire,
  onSelect,
  rows,
  selectedRowId,
}: {
  activeCatalog: DeliveryCatalogItem | null;
  canEdit: (value: DeliveryCatalogValue) => boolean;
  canRetire: (value: DeliveryCatalogValue) => boolean;
  catalogValues: DeliveryCatalogValue[];
  onEdit: (value: DeliveryCatalogValue) => void;
  onRetire: (value: DeliveryCatalogValue) => void;
  onSelect: (value: DeliveryCatalogValue) => void;
  rows: DeliveryCatalogValue[];
  selectedRowId: string | null;
}) {
  const columns = useMemo(
    () =>
      catalogColumns({
        activeCatalog,
        canEdit,
        canRetire,
        catalogValues,
        onEdit,
        onRetire,
      }),
    [activeCatalog, canEdit, canRetire, catalogValues, onEdit, onRetire],
  );

  return (
    <TerasRecordTable
      columns={columns}
      density="compact"
      fill
      getRowId={(value) => value.catalog_value_id}
      onSelect={onSelect}
      profile="value-matrix"
      rows={rows}
      selectedRowId={selectedRowId}
    />
  );
}

function catalogColumns({
  activeCatalog,
  canEdit,
  canRetire,
  catalogValues,
  onEdit,
  onRetire,
}: {
  activeCatalog: DeliveryCatalogItem | null;
  canEdit: (value: DeliveryCatalogValue) => boolean;
  canRetire: (value: DeliveryCatalogValue) => boolean;
  catalogValues: DeliveryCatalogValue[];
  onEdit: (value: DeliveryCatalogValue) => void;
  onRetire: (value: DeliveryCatalogValue) => void;
}): Array<TerasRecordTableColumn<DeliveryCatalogValue>> {
  return [
    {
      header: "Current Value",
      intent: "primary",
      key: "value",
      render: (value) => {
        const meta = catalogCurrentValueMeta(value, catalogValues);

        return (
          <TerasRecordCellText
            description={value.description}
            meta={meta}
            title={value.label}
            variant="value-stack"
          />
        );
      },
    },
    {
      header: "Status",
      intent: "status",
      key: "status",
      render: (value) => (
        <TerasRecordStatusStack
          meta={value.last_projected_at ? "projected" : "local draft"}
          status={
            <TerasStatusPill tone={catalogLifecycleTone(value.lifecycle_state)}>
              {catalogLifecycleLabel(value.lifecycle_state)}
            </TerasStatusPill>
          }
        />
      ),
    },
    {
      align: "center",
      header: "Used By",
      intent: "metric",
      key: "usage",
      render: (value) => (
        <TerasRecordMetricText label="records" value={value.usage_count} />
      ),
    },
    {
      header: "Action",
      intent: "action",
      key: "action",
      render: (value) => {
        const editAvailable = canEdit(value);
        const retireAvailable = canRetire(value);

        return (
          <TerasActionRow spacing="none">
            <TerasActionButton
              disabled={!editAvailable}
              onClick={(event) => {
                event.stopPropagation();
                onEdit(value);
              }}
              size="table-compact"
              title={
                editAvailable
                  ? undefined
                  : catalogValueMutationDisabledReason(
                      activeCatalog,
                      value,
                      "edit",
                    )
              }
              emphasis="secondary"
            >
              Edit
            </TerasActionButton>
            <TerasActionButton
              disabled={!retireAvailable}
              onClick={(event) => {
                event.stopPropagation();
                onRetire(value);
              }}
              size="table-compact"
              title={
                retireAvailable
                  ? undefined
                  : catalogValueMutationDisabledReason(
                      activeCatalog,
                      value,
                      "retire",
                    )
              }
              emphasis="secondary"
            >
              {catalogRetirementTableActionLabel(activeCatalog, value)}
            </TerasActionButton>
          </TerasActionRow>
        );
      },
    },
  ];
}

function catalogCurrentValueMeta(
  value: DeliveryCatalogValue,
  values: DeliveryCatalogValue[],
) {
  const parentTargetPi = parentTargetPiValueKey(value);

  if (parentTargetPi) {
    return `Target PI: ${parentTargetPi}`;
  }

  if (value.catalog_item_id === targetPiCatalogId) {
    if (value.value_key === "Program-wide") {
      return "Program-wide placement";
    }

    const planningWindow = planningWindowForTargetPi(values, value.value_key);

    if (planningWindow.startDate && planningWindow.endDate) {
      return `Planning window: ${planningWindow.startDate} to ${planningWindow.endDate}`;
    }

    return "Planning window pending";
  }

  if (value.value_key === value.label) {
    return null;
  }

  return value.value_key;
}
