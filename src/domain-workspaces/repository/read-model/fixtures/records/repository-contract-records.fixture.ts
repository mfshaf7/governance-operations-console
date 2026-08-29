import type { RepositoryWorkspaceRecord } from "../../../domain/repository-types.ts";
import {
  contractAdmittedRepositoryRecord,
  runtimeLane,
  securityBinding,
} from "../repository-fixture-builders.ts";

export const repositoryContractRecords: RepositoryWorkspaceRecord[] = [
  {
    ...contractAdmittedRepositoryRecord({
      boundary:
        "Durable Governance Operations Console product source and product-local validation.",
      catalogRefs: "component-contracts, review-coverage.",
      graphRole: "product-runtime-source",
      lastValidation: "product check / passing",
      mustNotOwn:
        "Workspace contracts, workflow authority, platform release authority, or security acceptance.",
      name: "governance-operations-console",
      nextAction:
        "Link the immutable GitHub repository identity to its existing workspace owner record.",
      owner: "Governance Operations Console",
      owns: "Durable Console source, product-local validation, operator documentation, and same-origin workflow adapters.",
      purpose:
        "Governed operator interface for workspace operations and evidence projection.",
      repoClass: "product-source",
      role: "operator-console",
      routeSource: "workspace-governance/contracts/repos.yaml",
      runtimeLane: runtimeLane(
        "dev-integration-required",
        "profile-managed",
        "Console workflow adapters use the admitted local dev-integration composition before governed runtime promotion.",
        "info",
        "accepted-idea-delivery",
      ),
      securityBinding: securityBinding(
        true,
        true,
        "review-coverage",
        "The graduated source and bounded OOS integrations have explicit Security Architecture review coverage.",
        "ok",
      ),
      validationPosture: "covered-by-owner-repo",
    }),
    custody: {
      kind: "dedicated-owner-repo",
      state: "unrecorded",
      workspaceOwnerRef: "repo:governance-operations-console",
    },
    providerIdentity: {
      host: "github.com",
      name: "governance-operations-console",
      owner: "mfshaf7",
      provider: "github",
      repositoryId: "1317781281",
    },
  },
  contractAdmittedRepositoryRecord({
    boundary:
      "WGCF runtime implementation for governance graph, validation planning, readiness evaluation, receipts, and ledger behavior.",
    catalogRefs: "contract-model, developer-integration.",
    graphRole: "wgcf-runtime-source",
    lastValidation: "devint API smoke / passing",
    mustNotOwn:
      "Canonical workspace contracts, workspace-root guidance, platform deployment authority, security standards, or ART truth.",
    name: "workspace-governance-control-fabric",
    nextAction:
      "Keep runtime contract consumption aligned with workspace-governance catalog truth.",
    owner: "WGCF",
    owns: "Governance graph runtime, validation planning, admission/readiness evaluation, receipts, ledger, API, worker, and CLI surfaces.",
    purpose:
      "Runtime implementation for Workspace Governance Control Fabric planning and evidence surfaces.",
    repoClass: "governance-runtime",
    role: "governance-runtime",
    routeSource: "openproject://work_packages/475",
    runtimeLane: runtimeLane(
      "dev-integration-required",
      "profile-active",
      "Active dev-integration profile exists for WGCF API and metadata-store proof; workspace-governance remains contract authority.",
      "info",
      "governance-control-fabric",
    ),
    securityBinding: securityBinding(
      false,
      true,
      "review-coverage",
      "WGCF runtime is security-review visible; runtime activation still follows platform/security controls.",
      "info",
    ),
    validationPosture: "runtime-consumer",
  }),
  contractAdmittedRepositoryRecord({
    boundary:
      "Shared platform structure, environment contracts, GitOps state, release governance, and product integration docs.",
    catalogRefs:
      "openproject-quality-check, openproject-projection-sync, devint-runner-read, devint-runner-lifecycle, kubernetes-runtime-read, kubernetes-runtime-mutation.",
    graphRole: "platform-authority-source",
    lastValidation: "platform contract check / passing",
    mustNotOwn:
      "Canonical Telegram source, canonical host bridge source, or security governance standards.",
    name: "platform-engineering",
    nextAction:
      "Keep platform runtime, dev-integration runner, and product integration contracts current.",
    owner: "Platform Engineering",
    owns: "Environment contracts, pinned source SHAs and digests, Argo-managed deployment state, shared platform docs, and product runbooks.",
    purpose:
      "Shared platform authority for runtime, release, and integration controls.",
    repoClass: "platform",
    role: "platform",
    routeSource: "workspace-governance/contracts/repos.yaml",
    runtimeLane: runtimeLane(
      "stage-direct",
      "platform-authority",
      "Platform runtime decisions belong to platform controls; Repository Control records only the repository admission posture.",
      "info",
    ),
    securityBinding: securityBinding(
      true,
      false,
      "binding-required",
      "Platform runtime and release controls require security binding evidence through the security-architecture path.",
      "warn",
    ),
    validationPosture: "profile-gated-external-owner",
  }),
  contractAdmittedRepositoryRecord({
    boundary:
      "Security standards, trust-boundary architecture, review methodology, findings, and product security overlays.",
    catalogRefs:
      "security-bindings, review-coverage, security-delta-reviews, security-evidence, security-change-record-lanes.",
    graphRole: "security-authority-source",
    lastValidation: "security review controls / passing",
    mustNotOwn:
      "Rollout implementation, product packaging, or operator runbooks.",
    name: "security-architecture",
    nextAction: "Keep security review posture and change-record lanes current.",
    owner: "Security Architecture",
    owns: "Trust-boundary architecture, security standards, review methodology, findings, assessments, and product security overlays.",
    purpose: "Workspace security authority and review evidence source.",
    repoClass: "security-governance",
    role: "security",
    routeSource: "workspace-governance/contracts/repos.yaml",
    runtimeLane: runtimeLane(
      "no-runtime",
      "not-required",
      "Security governance does not need a repo-specific runtime lane.",
      "muted",
    ),
    securityBinding: securityBinding(
      false,
      true,
      "authority-owner",
      "Security Architecture owns the security posture rather than requiring a separate repo-local binding.",
      "ok",
    ),
    validationPosture: "covered-by-owner-repo",
  }),
  contractAdmittedRepositoryRecord({
    boundary:
      "Active OpenClaw runtime composition and packaged host-control plugin distribution.",
    catalogRefs: "component-contracts, security-bindings, review-coverage.",
    graphRole: "product-runtime-source",
    lastValidation: "runtime composition smoke / passing",
    mustNotOwn:
      "Canonical Telegram source, canonical host bridge source, environment approval, or Argo deployment state.",
    name: "openclaw-runtime-distribution",
    nextAction:
      "Keep runtime distribution contracts aligned with platform promotion and security review evidence.",
    owner: "OpenClaw Runtime",
    owns: "Runtime composition, packaged runtime verification, host-control plugin package, and runtime-required templates.",
    purpose: "Active OpenClaw runtime distribution and composition source.",
    repoClass: "product-runtime",
    role: "runtime",
    routeSource: "workspace-governance/contracts/repos.yaml",
    runtimeLane: runtimeLane(
      "stage-direct",
      "platform-promotion-path",
      "Stage/prod promotion belongs to platform controls; Repository Control records repository admission only.",
      "info",
    ),
    securityBinding: securityBinding(
      true,
      false,
      "binding-required",
      "Runtime composition changes require security-binding and review-coverage evidence.",
      "warn",
    ),
    validationPosture: "covered-by-owner-repo",
  }),
  contractAdmittedRepositoryRecord({
    boundary:
      "Host-side policy enforcement, allowed roots, audit logging, export staging, and bridge runtime behavior.",
    catalogRefs: "component-contracts, security-bindings, review-coverage.",
    graphRole: "runtime-enforcement-source",
    lastValidation: "host bridge contract smoke / passing",
    mustNotOwn: "Telegram UX, environment promotion, or image composition.",
    name: "openclaw-host-bridge",
    nextAction:
      "Keep host enforcement interface contracts and security evidence current.",
    owner: "OpenClaw Host Bridge",
    owns: "Host policy enforcement, allowed roots, audit logging, export staging, host runtime attestation, and WSL/Windows bridge behavior.",
    purpose: "Canonical host enforcement and bridge runtime source.",
    repoClass: "runtime-enforcement",
    role: "host-enforcement",
    routeSource: "workspace-governance/contracts/repos.yaml",
    runtimeLane: runtimeLane(
      "stage-direct",
      "runtime-enforcement-path",
      "Host enforcement rollout belongs to platform/security controls; Repository Control records repo posture only.",
      "info",
    ),
    securityBinding: securityBinding(
      true,
      false,
      "binding-required",
      "Privileged host-control behavior requires security-binding and review-coverage evidence.",
      "warn",
    ),
    validationPosture: "interface-contract-backed",
  }),
  contractAdmittedRepositoryRecord({
    boundary:
      "Canonical Telegram behavior, routing, delivery approvals, media behavior, packaging, and tests.",
    catalogRefs: "component-contracts, security-bindings, review-coverage.",
    graphRole: "product-channel-source",
    lastValidation: "telegram contract smoke / passing",
    mustNotOwn: "Host enforcement, platform rollout, or security standards.",
    name: "openclaw-telegram-enhanced",
    nextAction:
      "Keep Telegram channel source aligned with runtime distribution and host bridge contracts.",
    owner: "OpenClaw Telegram",
    owns: "Telegram behavior, routing and approvals, staged media delivery behavior, packaging, and tests.",
    purpose: "Canonical Telegram channel behavior source for OpenClaw.",
    repoClass: "product-channel",
    role: "channel",
    routeSource: "workspace-governance/contracts/repos.yaml",
    runtimeLane: runtimeLane(
      "stage-direct",
      "product-channel-path",
      "Channel release and runtime wiring belong to platform controls; Repository Control records repo posture only.",
      "info",
    ),
    securityBinding: securityBinding(
      true,
      false,
      "binding-required",
      "Telegram routing and approval behavior requires security-binding and review-coverage evidence.",
      "warn",
    ),
    validationPosture: "interface-contract-backed",
  }),
];
