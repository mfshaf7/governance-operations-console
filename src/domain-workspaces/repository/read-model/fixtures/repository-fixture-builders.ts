import { repositorySecurityBindingStatusLabel } from "../repository-workspace-labels.ts";
import type {
  RepositoryWorkspacePostureGroup,
  RepositoryWorkspacePostureItem,
  RepositoryWorkspacePostureItemState,
  RepositoryWorkspaceRecord,
  RepositoryWorkspaceRecordTone,
  RepositoryWorkspaceRuntimeLane,
  RepositoryWorkspaceRuntimeLaneStatus,
  RepositoryWorkspaceSecurityBinding,
  RepositoryWorkspaceSecurityBindingStatus,
} from "../../domain/repository-types.ts";

export function postureGroup(
  id: string,
  title: string,
  kicker: string,
  description: string,
  tone: RepositoryWorkspaceRecordTone,
  items: RepositoryWorkspacePostureItem[],
): RepositoryWorkspacePostureGroup {
  return { description, id, items, kicker, title, tone };
}

export function postureItem(
  label: string,
  value: string,
  detail: string,
  state: RepositoryWorkspacePostureItemState,
  tone: RepositoryWorkspaceRecordTone,
): RepositoryWorkspacePostureItem {
  return {
    detail,
    label,
    state,
    tone,
    value,
  };
}

export function contractAdmittedRepositoryRecord({
  boundary,
  catalogRefs,
  graphRole,
  lastValidation,
  mustNotOwn,
  name,
  nextAction,
  owner,
  owns,
  purpose,
  repoClass,
  role,
  routeSource,
  runtimeLane: runtimeLaneModel,
  securityBinding: securityBindingModel,
  validationPosture,
}: {
  boundary: string;
  catalogRefs: string;
  graphRole: string;
  lastValidation: string;
  mustNotOwn: string;
  name: string;
  nextAction: string;
  owner: string;
  owns: string;
  purpose: string;
  repoClass: string;
  role: string;
  routeSource: string;
  runtimeLane: RepositoryWorkspaceRuntimeLane;
  securityBinding: RepositoryWorkspaceSecurityBinding;
  validationPosture: string;
}): RepositoryWorkspaceRecord {
  return {
    admissionPosture: [
      postureGroup(
        "intake",
        "Intake Decision",
        "Active Repo",
        `${name} is active in workspace-governance/contracts/repos.yaml.`,
        "ok",
        [
          postureItem(
            "Decision",
            "admitted",
            "Active repo entry exists in contracts/repos.yaml.",
            "clear",
            "ok",
          ),
          postureItem(
            "README.md",
            "present",
            "Primary repo orientation surface exists.",
            "clear",
            "ok",
          ),
          postureItem(
            "AGENTS.md",
            "present",
            "Repo-local routing and review guidance exists.",
            "clear",
            "ok",
          ),
        ],
      ),
      postureGroup(
        "identity",
        "Repository Identity",
        "Ownership",
        `${owner} ownership and non-ownership boundaries are declared.`,
        "ok",
        [
          postureItem(
            "Repo class",
            repoClass,
            "Repository class comes from workspace-governance/contracts/repos.yaml.",
            "clear",
            "ok",
          ),
          postureItem("Owns", "declared", owns, "clear", "ok"),
          postureItem("Must not own", "declared", mustNotOwn, "clear", "ok"),
        ],
      ),
      postureGroup(
        "validation",
        "Validation Behavior",
        "WGCF Graph",
        "Validation posture is declared in the repository contract.",
        "ok",
        [
          postureItem(
            "Posture",
            validationPosture,
            "WGCF validation posture from repos.yaml.",
            "clear",
            "ok",
          ),
          postureItem(
            "Graph role",
            graphRole,
            "Governance graph role from repos.yaml.",
            "clear",
            "ok",
          ),
          postureItem("Catalog refs", "declared", catalogRefs, "clear", "ok"),
        ],
      ),
      postureGroup(
        "repo-rules",
        "Repo Rule Posture",
        "Repo Rules",
        "Repo-rule and review-control requirements are expected for active repos.",
        securityBindingModel.tone,
        [
          postureItem(
            "Repo rules",
            "present",
            `${name} repo-rule entry is present or covered by the repository contract.`,
            "clear",
            "ok",
          ),
          postureItem(
            "Review controls",
            "present",
            "CODEOWNERS, PR template, and validation workflow requirements are declared by repo rules.",
            "clear",
            "ok",
          ),
          postureItem(
            "Security binding",
            repositorySecurityBindingStatusLabel(securityBindingModel.status),
            securityBindingModel.detail,
            repositorySecurityBindingPostureState(securityBindingModel.status),
            securityBindingModel.tone,
          ),
        ],
      ),
    ],
    admissionState: "admitted",
    blockers: [],
    boundary,
    githubUrl: `git@github.com:mfshaf7/${name}.git`,
    id: `repo-${name}`,
    lastValidation,
    lifecycle: "active",
    name,
    nextAction,
    owner,
    purpose,
    repoClass,
    role,
    routeSource,
    runtimeLane: runtimeLaneModel,
    securityBinding: securityBindingModel,
    tone: "ok",
  };
}

function repositorySecurityBindingPostureState(
  status: RepositoryWorkspaceSecurityBindingStatus,
): RepositoryWorkspacePostureItemState {
  switch (status) {
    case "authority-owner":
    case "baseline-linked":
    case "review-coverage":
      return "clear";
    case "binding-required":
      return "missing";
    case "not-applicable":
      return "reference";
    case "not-evaluated":
      return "pending";
    case "review-trigger-check-needed":
      return "review";
  }
}

export function runtimeLane(
  decision: RepositoryWorkspaceRuntimeLane["decision"],
  status: RepositoryWorkspaceRuntimeLaneStatus,
  detail: string,
  tone: RepositoryWorkspaceRecordTone,
  profileRef?: string,
): RepositoryWorkspaceRuntimeLane {
  return {
    decision,
    detail,
    profileRef,
    runtimeOwner:
      decision === "dev-integration-required"
        ? "platform-engineering"
        : undefined,
    securityOwner:
      decision === "dev-integration-required"
        ? "security-architecture"
        : undefined,
    status,
    tone,
  };
}

export function securityBinding(
  required: boolean,
  subject: boolean,
  status: RepositoryWorkspaceSecurityBindingStatus,
  detail: string,
  tone: RepositoryWorkspaceRecordTone,
  reviewRef?: string,
): RepositoryWorkspaceSecurityBinding {
  return {
    detail,
    owner: required || subject ? "security-architecture" : undefined,
    required,
    reviewRef,
    status,
    subject,
    tone,
  };
}
