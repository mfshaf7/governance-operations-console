import {
  TerasContentTray,
  TerasList,
  TerasSelectableRow,
} from "@/teras";

export function ProfileRequestSelectionList<TValue extends string>({
  ariaLabel,
  label,
  onChange,
  options,
  values,
}: {
  ariaLabel: string;
  label: string;
  onChange: (values: readonly TValue[]) => void;
  options: readonly Readonly<{
    detail?: string;
    label: string;
    value: TValue;
  }>[];
  values: readonly TValue[];
}) {
  function toggle(value: TValue) {
    onChange(
      values.includes(value)
        ? values.filter((candidate) => candidate !== value)
        : [...values, value],
    );
  }

  return (
    <TerasContentTray kicker={label}>
      <TerasList ariaLabel={ariaLabel} columns={2}>
        {options.map((option) => {
          const selected = values.includes(option.value);

          return (
            <TerasSelectableRow
              ariaLabel={`${selected ? "Remove" : "Add"} ${option.label}`}
              detail={option.detail}
              key={option.value}
              label={option.label}
              onSelect={() => toggle(option.value)}
              selected={selected}
              status={selected ? "Selected" : undefined}
              tone={selected ? "ok" : "muted"}
            />
          );
        })}
      </TerasList>
    </TerasContentTray>
  );
}
