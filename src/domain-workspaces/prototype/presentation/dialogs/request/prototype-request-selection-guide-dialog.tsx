import {
  TerasStatusItem,
  TerasContentTray,
  TerasDialog,
  TerasList,
  TerasTrayStack,
} from "@/teras";

import { prototypeRequestSelectionGuideGroups } from "./prototype-request-selection-guide-model.ts";

export function PrototypeRequestSelectionGuideDialog({
  onClose,
  open,
}: {
  onClose: () => void;
  open: boolean;
}) {
  return (
    <TerasDialog
      contentOverflow="auto"
      height="content"
      closeLabel="Close request selection guide"
      description="Explains the selectable values in the Prototype Request form. Landing still records the final support rows."
      kicker="Prototype Request"
      onClose={onClose}
      open={open}
      width="standard"
      title="Selection Guide"
    >
      <TerasTrayStack spacing="loose">
        {prototypeRequestSelectionGuideGroups().map((group) => (
          <TerasContentTray
            description={group.detail}
            key={group.id}
            title={group.title}
          >
            <TerasList frame="contained">
              {group.options.map((option) => (
                <TerasStatusItem
                  tone="muted"
                  detail={option.detail}
                  key={option.value}
                  label={option.label}
                  status="option"
                />
              ))}
            </TerasList>
          </TerasContentTray>
        ))}
      </TerasTrayStack>
    </TerasDialog>
  );
}
