"use client";

import type { ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";

import styles from "./teras-patterns.module.css";
import { TerasActionButton } from "./teras-action";
import { TerasLabeledGroup } from "./teras-labeled-group";
import { TerasTextField } from "./teras-text-field";

export type TerasTextListVisibleItems = 2 | 3 | 4;

export type TerasTextListFieldProps = {
  addLabel?: string;
  description?: ReactNode;
  disabled?: boolean;
  emptyLabel?: string;
  itemLabel: (index: number) => string;
  items: string[];
  label: ReactNode;
  maxItems?: number;
  maxLength?: number;
  minItems?: number;
  onItemsChange: (items: string[]) => void;
  placeholder?: string;
  readOnly?: boolean;
  visibleItems?: TerasTextListVisibleItems;
};

export function TerasTextListField({
  addLabel = "Add item",
  description,
  disabled = false,
  emptyLabel = "No items added.",
  itemLabel,
  items,
  label,
  maxItems = 6,
  maxLength,
  minItems = 0,
  onItemsChange,
  placeholder,
  readOnly = false,
  visibleItems = 3,
}: TerasTextListFieldProps) {
  if (minItems < 0 || maxItems < minItems) {
    throw new Error(
      "TerasTextListField requires 0 <= minItems <= maxItems.",
    );
  }

  const locked = disabled || readOnly;
  const canAdd = !locked && items.length < maxItems;
  const canRemove = !locked && items.length > minItems;

  function updateItem(index: number, value: string) {
    onItemsChange(
      items.map((item, itemIndex) => (itemIndex === index ? value : item)),
    );
  }

  function removeItem(index: number) {
    if (!canRemove) {
      return;
    }

    onItemsChange(items.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <TerasLabeledGroup
      actions={
        !readOnly ? (
          <TerasActionButton
            aria-label={addLabel}
            disabled={!canAdd}
            onClick={() => onItemsChange([...items, ""])}
            size="table-compact"
            title={addLabel}
            tone="warn"
            treatment="tonal"
          >
            <Plus aria-hidden="true" size={13} />
            <span>{addLabel}</span>
          </TerasActionButton>
        ) : undefined
      }
      description={description}
      label={label}
      spacing="compact"
    >
      <div
        className={styles.terasTextListFieldItems}
        data-scroll={items.length > visibleItems ? "true" : "false"}
        data-visible-items={visibleItems}
      >
        {items.length > 0 ? (
          items.map((item, index) => (
            <div className={styles.terasTextListFieldRow} key={index}>
              <TerasTextField
                aria-label={itemLabel(index)}
                density="compact"
                disabled={disabled}
                label={itemLabel(index)}
                labelVisibility="hidden"
                maxLength={maxLength}
                onValueChange={(value) => updateItem(index, value)}
                placeholder={placeholder}
                readOnly={readOnly}
                value={item}
              />
              {!readOnly ? (
                <TerasActionButton
                  aria-label={`Remove ${itemLabel(index)}`}
                  className={styles.terasTextListFieldRemoveButton}
                  disabled={!canRemove}
                  onClick={() => removeItem(index)}
                  size="table-compact"
                  title={`Remove ${itemLabel(index)}`}
                  tone="muted"
                  treatment="tonal"
                >
                  <Trash2 aria-hidden="true" size={13} />
                </TerasActionButton>
              ) : null}
            </div>
          ))
        ) : (
          <p className={styles.terasTextListFieldEmpty}>{emptyLabel}</p>
        )}
      </div>
    </TerasLabeledGroup>
  );
}
