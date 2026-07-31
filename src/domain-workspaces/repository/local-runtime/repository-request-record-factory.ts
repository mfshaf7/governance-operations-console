import type { RepositoryWorkspaceRecord } from "../read-model/repository-workspace-read-model.ts";
import type { RepositoryRequestDraft } from "../work-model/request/repository-request-model.ts";

export function repositoryRecordFromRequestDraft(
  draft: RepositoryRequestDraft,
  localRecordIndex: number,
): RepositoryWorkspaceRecord {
  const name = draft.name.trim();
  const ownerDomain = draft.ownerDomain.trim();
  const repoClass = draft.repoClass.trim();
  const purpose = draft.purpose.trim();
  const id = `repo-local-request-${String(localRecordIndex + 1).padStart(3, "0")}`;

  return {
    blockers: [],
    boundary: purpose,
    admissionPosture: [
      {
        description:
          "Operator captured a repository request in this prototype session.",
        id: "intake",
        items: [
          {
            detail: "Prototype-local request record exists in the register.",
            label: "Request draft",
            state: "clear",
            tone: "ok" as const,
            value: "captured",
          },
          {
            detail: "Owner domain was supplied by the operator.",
            label: "Owner decision",
            state: "review",
            tone: "warn" as const,
            value: "pending review",
          },
          {
            detail:
              "Repository creation and GitHub mutation remain outside this prototype.",
            label: "GitHub repo",
            state: "missing",
            tone: "warn" as const,
            value: "not created",
          },
        ],
        kicker: "Request",
        title: "Repository Request",
        tone: "warn" as const,
      },
      {
        description:
          "Admission review still needs repo-rule, validation, runtime-lane, and security-binding decisions.",
        id: "admission",
        items: [
          {
            detail: "Future workspace-governance repo-rule entry.",
            label: "Repo rules",
            state: "pending",
            tone: "warn" as const,
            value: "not started",
          },
          {
            detail: "Future validation catalog or WGCF coverage entry.",
            label: "Validation behavior",
            state: "pending",
            tone: "warn" as const,
            value: "not started",
          },
          {
            detail: "Runtime lane must be selected outside Repository Control.",
            label: "Runtime lane",
            state: "ready",
            tone: "warn" as const,
            value: "decision needed",
          },
          {
            detail: "Security trigger check must happen during admission.",
            label: "Security binding",
            state: "review",
            tone: "warn" as const,
            value: "review needed",
          },
        ],
        kicker: "Admission",
        title: "Admission Requirements",
        tone: "warn" as const,
      },
    ],
    admissionState: "ready",
    githubUrl: `repo-request://${name}`,
    id,
    lastValidation: "not run / request draft",
    lifecycle: "proposed",
    name,
    nextAction:
      "Inspect the request, confirm owner and security triggers, then review admission.",
    owner: ownerDomain,
    purpose,
    repoClass,
    role: repoClass,
    routeSource: "console / repository request draft",
    runtimeLane: {
      decision: "pending",
      detail: "Runtime lane decision belongs to admission review.",
      status: "decision-needed",
      tone: "warn" as const,
    },
    securityBinding: {
      detail:
        "Security binding is evaluated during repository admission when the route, data class, and runtime lane are known.",
      required: false,
      status: "review-trigger-check-needed",
      subject: false,
      tone: "warn" as const,
    },
    tone: "ok",
  };
}
