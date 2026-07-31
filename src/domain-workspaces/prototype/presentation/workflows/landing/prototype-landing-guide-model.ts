import type { PrototypeLandingSupportGuideGroup } from "./prototype-landing-types.ts";

export function prototypeLandingSupportGuideGroups(): PrototypeLandingSupportGuideGroup[] {
  return [
    {
      detail:
        "Support profile decides whether Landing generates rows or allows manual row-state editing.",
      id: "profile-mode",
      rows: [
        {
          detail:
            "Simple, interactive, local runtime, external dependency, and source review profiles generate locked support rows.",
          label: "Named profile",
          status: "generated",
          tone: "info",
        },
        {
          detail:
            "Custom support profile copies the row map into an editable draft so the operator can tune each support state.",
          label: "Custom profile",
          status: "editable",
          tone: "warn",
        },
        {
          detail:
            "Real mutable data and real-system mutation stay locked as blockers even when custom profile is selected.",
          label: "System blocker",
          status: "locked",
          tone: "danger",
        },
      ],
      title: "Profile behavior",
    },
    {
      detail:
        "Support state tells Landing what to prepare, skip, record as satisfied, leave open, or block.",
      id: "support-state",
      rows: [
        {
          detail:
            "Already satisfied by the current landing inputs or existing artifact. Landing records it; no new work is generated for that area.",
          label: "Ready",
          status: "satisfied",
          tone: "info",
        },
        {
          detail:
            "Required by the selected profile. Landing should prepare or track the related setup, checklist, or follow-up item.",
          label: "Needed",
          status: "prepare",
          tone: "info",
        },
        {
          detail:
            "The operator cannot decide yet. Landing records it as unresolved and should not create final setup for that area.",
          label: "Unknown",
          status: "open",
          tone: "info",
        },
        {
          detail:
            "Explicitly out of scope for this prototype landing. Landing should not set up or track that area.",
          label: "Not needed",
          status: "skip",
          tone: "muted",
        },
        {
          detail:
            "Required but cannot proceed without a fix or recovery path. Landing records a blocked result.",
          label: "Blocked",
          status: "blocks",
          tone: "danger",
        },
      ],
      title: "Support states",
    },
  ];
}
