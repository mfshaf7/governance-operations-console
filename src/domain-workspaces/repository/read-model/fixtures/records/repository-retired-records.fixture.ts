import type { RepositoryWorkspaceRecord } from "../../../domain/repository-types.ts";
import {
  postureGroup,
  postureItem as repositoryPostureItem,
  runtimeLane,
  securityBinding,
} from "../repository-fixture-builders.ts";

function postureItem(
  label: string,
  value: string,
  detail: string,
  tone: "muted",
) {
  return repositoryPostureItem(label, value, detail, "retired", tone);
}

export const repositoryRetiredRecords: RepositoryWorkspaceRecord[] = [
  {
    admissionPosture: [
      postureGroup(
        "retirement",
        "Retirement Decision",
        "Retired Repo",
        "Repository is archival only and must not re-enter active routing.",
        "muted",
        [
          postureItem(
            "Decision",
            "retired",
            "Retired repository entry exists in workspace governance.",
            "muted",
          ),
          postureItem(
            "Active routing",
            "disabled",
            "No active work should route here.",
            "muted",
          ),
          postureItem(
            "Replacement path",
            "active distribution",
            "OpenClaw runtime work routes through active runtime-distribution and platform paths.",
            "muted",
          ),
        ],
      ),
    ],
    admissionState: "retired",
    blockers: [],
    boundary: "Retired archival stub; no active work should route here.",
    githubUrl: "git@github.com:mfshaf7/openclaw-isolated-deployment.git",
    id: "repo-openclaw-isolated-deployment",
    lastValidation: "retirement marker / present",
    lifecycle: "retired",
    name: "openclaw-isolated-deployment",
    nextAction:
      "Keep retired unless the retirement decision is explicitly reversed.",
    owner: "Platform Engineering",
    purpose:
      "Historical OpenClaw deployment path retained only for archival reference.",
    repoClass: "archive",
    role: "archive",
    routeSource: "workspace-governance retirement rule",
    runtimeLane: runtimeLane(
      "no-runtime",
      "retired",
      "Retired archival repository has no active runtime lane.",
      "muted",
    ),
    securityBinding: securityBinding(
      false,
      false,
      "not-applicable",
      "Retired archival route stays inspect-only.",
      "muted",
    ),
    tone: "muted",
  },
];
