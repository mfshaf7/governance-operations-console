import type { RepositoryWorkspaceRecord } from "../../../domain/repository-types.ts";
import {
  postureGroup,
  postureItem,
  runtimeLane,
  securityBinding,
} from "../repository-fixture-builders.ts";

export const repositoryProposedRecords: RepositoryWorkspaceRecord[] = [
  {
    admissionPosture: [
      postureGroup(
        "intake",
        "Intake Decision",
        "Workspace Proposals",
        "Proposed repository request is captured, but not admitted into active governance yet.",
        "warn",
        [
          postureItem(
            "Decision",
            "proposed",
            "Workspace proposal exists before active contract admission.",
            "review",
            "warn",
          ),
          postureItem(
            "Physical repo",
            "created",
            "GitHub repository exists but owner and governance posture still need acceptance.",
            "clear",
            "ok",
          ),
          postureItem(
            "README.md",
            "needed",
            "Admitted repositories must carry a primary operator orientation surface.",
            "missing",
            "warn",
          ),
          postureItem(
            "AGENTS.md",
            "needed",
            "Admitted repositories must carry repo-local routing and review guidance.",
            "missing",
            "warn",
          ),
        ],
      ),
      postureGroup(
        "identity",
        "Repository Identity",
        "Ownership",
        "Owner and class still need durable acceptance before delivery execution.",
        "warn",
        [
          postureItem(
            "Repo class",
            "client-app",
            "Future client-facing product source.",
            "review",
            "warn",
          ),
          postureItem(
            "Owner scope",
            "pending",
            "Prototype Studio can incubate, but a durable product owner is not assigned.",
            "pending",
            "warn",
          ),
          postureItem(
            "Must not own",
            "pending",
            "Production release and security acceptance boundaries must be declared.",
            "pending",
            "warn",
          ),
        ],
      ),
      postureGroup(
        "validation",
        "Validation Behavior",
        "WGCF Graph",
        "Validation behavior is required before in-scope admission.",
        "warn",
        [
          postureItem(
            "Posture",
            "needed",
            "Declare whether validation is owner-repo covered, catalog-owned, or profile-gated.",
            "missing",
            "warn",
          ),
          postureItem(
            "Catalog refs",
            "needed",
            "Required for direct or admitted validation planning.",
            "missing",
            "warn",
          ),
          postureItem(
            "Context behavior",
            "needed",
            "Active governed surfaces must not silently omit context-behavior posture.",
            "missing",
            "warn",
          ),
        ],
      ),
      postureGroup(
        "repo-rules",
        "Repo Rule Posture",
        "Repo Rules",
        "Repo rule entry is not created yet.",
        "warn",
        [
          postureItem(
            "Repo rules",
            "not started",
            "Create workspace-governance repo-rule entry after admission.",
            "pending",
            "warn",
          ),
          postureItem(
            "Review controls",
            "not started",
            "CODEOWNERS, PR template, and validation workflow are still needed.",
            "pending",
            "warn",
          ),
        ],
      ),
    ],
    admissionState: "ready",
    blockers: [],
    boundary:
      "Future dashboard source is proposed only; Portfolio may hold the record, but source ownership must be assigned before execution.",
    githubUrl: "git@github.com:mfshaf7/client-insight-dashboard.git",
    id: "repo-client-insight-dashboard",
    lastValidation: "not run / admission ready",
    lifecycle: "proposed",
    name: "client-insight-dashboard",
    nextAction:
      "Review repository admission requirements, then prepare repo rules, validation behavior, and context-behavior posture.",
    owner: "Prototype Studio / pending product owner",
    purpose:
      "Future analytics dashboard repo request that still needs owner assignment before devint or delivery routing.",
    repoClass: "client-app",
    role: "client-app",
    routeSource: "workspace-proposals/mock-ready-for-repo-admission",
    runtimeLane: runtimeLane(
      "pending",
      "decision-needed",
      "Choose no-runtime, local-only, dev-integration-required, or stage-direct during admission.",
      "warn",
    ),
    securityBinding: securityBinding(
      false,
      false,
      "review-trigger-check-needed",
      "Client-visible or real-data use would trigger security review before admission.",
      "warn",
    ),
    tone: "ok",
  },
];
