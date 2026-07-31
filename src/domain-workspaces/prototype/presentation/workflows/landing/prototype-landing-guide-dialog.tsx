import {
  TerasStatusItem,
  TerasContentTray,
  TerasDialog,
  TerasList,
  TerasTrayStack,
} from "@/teras";

import { prototypeLandingSupportGuideGroups } from "./prototype-landing-view-model.ts";

export function PrototypeLandingGuideDialog({
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
      closeLabel="Close support guide"
      description="Explains how Landing uses support profiles and support states."
      kicker="Landing Profile"
      onClose={onClose}
      open={open}
      width="standard"
      title="Support Guide"
    >
      <TerasTrayStack spacing="loose">
        {prototypeLandingSupportGuideGroups().map((group) => (
          <TerasContentTray
            description={group.detail}
            key={group.id}
            kicker={group.title}
          >
            <TerasList frame="contained">
              {group.rows.map((row) => (
                <TerasStatusItem
                  tone={row.tone}
                  detail={row.detail}
                  key={`${group.id}-${row.label}`}
                  label={row.label}
                  status={row.status}
                />
              ))}
            </TerasList>
          </TerasContentTray>
        ))}
      </TerasTrayStack>
    </TerasDialog>
  );
}
