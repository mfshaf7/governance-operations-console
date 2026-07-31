import {
  TerasContentTray,
  TerasDialog,
  TerasReadoutField,
  TerasTrayStack,
} from "@/teras";

import type { DevIntegrationProfile } from "../../../model/dev-integration-profile";

function formatCollection(
  values: readonly string[],
  emptyLabel: string,
) {
  return values.length > 0 ? values.join(", ") : emptyLabel;
}

export function ProfileSupportDetailsDialog({
  onClose,
  open,
  profile,
}: {
  onClose: () => void;
  open: boolean;
  profile: DevIntegrationProfile;
}) {
  return (
    <TerasDialog
      contentOverflow="auto"
      height="content"
      closeLabel="Close profile support details"
      description="Repository, write, review, and persistence boundaries declared by this profile."
      kicker="Profile Support"
      onClose={onClose}
      open={open}
      title="Declared Support Details"
      width="standard"
    >
      <TerasTrayStack columns={2} spacing="normal">
        <TerasContentTray kicker="Participating Repositories">
          <TerasReadoutField
            fit="content"
            label="Repositories"
            value={formatCollection(
              profile.participatingRepos,
              "No participating repositories",
            )}
          />
        </TerasContentTray>
        <TerasContentTray kicker="Dependencies">
          <TerasReadoutField
            fit="content"
            label="Dependencies"
            value={formatCollection(
              profile.dependencies,
              "No dependencies",
            )}
          />
        </TerasContentTray>
        <TerasContentTray kicker="Expected Write Targets">
          <TerasReadoutField
            fit="content"
            label="Targets"
            value={formatCollection(
              profile.expectedWrites.targets,
              "No write targets",
            )}
          />
        </TerasContentTray>
        <TerasContentTray kicker="Security Triggers">
          <TerasReadoutField
            fit="content"
            label="Triggers"
            value={formatCollection(
              profile.securityTriggers,
              "No security triggers",
            )}
          />
        </TerasContentTray>
        <TerasContentTray kicker="Admission Evidence">
          <TerasReadoutField
            fit="content"
            label="References"
            value={formatCollection(
              profile.admissionRefs,
              "No admission evidence",
            )}
          />
        </TerasContentTray>
        {profile.persistence ? (
          <>
            <TerasContentTray kicker="Retained Data">
              <TerasReadoutField
                fit="content"
                label="Scope"
                value={profile.persistence.retainedDataScope}
              />
            </TerasContentTray>
            <TerasContentTray kicker="Storage Requirement">
              <TerasReadoutField
                fit="content"
                label="Storage"
                value={profile.persistence.storageRequirement}
              />
            </TerasContentTray>
            <TerasContentTray kicker="Suspend and Resume">
              <TerasReadoutField
                fit="content"
                label="Semantics"
                value={profile.persistence.suspendResumeSemantics}
              />
            </TerasContentTray>
            <TerasContentTray kicker="Reset Boundary">
              <TerasReadoutField
                fit="content"
                label="Semantics"
                value={profile.persistence.destructiveResetSemantics}
              />
            </TerasContentTray>
            <TerasContentTray kicker="Cutover Plan">
              <TerasReadoutField
                fit="content"
                label="Plan"
                value={profile.persistence.cutoverPlan}
              />
            </TerasContentTray>
            <TerasContentTray kicker="Persistence Reason">
              <TerasReadoutField
                fit="content"
                label="Justification"
                value={profile.persistence.justification}
              />
            </TerasContentTray>
          </>
        ) : null}
      </TerasTrayStack>
    </TerasDialog>
  );
}
