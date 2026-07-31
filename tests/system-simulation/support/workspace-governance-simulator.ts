import { createHash } from "node:crypto";

import type {
  WorkspaceActiveInventoryDependencies,
  WorkspaceActiveInventoryRecord,
  WorkspaceEntrantPromotionCommand,
  WorkspacePromotionReceipt,
} from "../../../src/domain-workspaces/operation-contracts/workspace-governance/active-inventory.ts";
import {
  workspaceActiveRecordRef,
  workspaceClassificationCommandBlockers,
  workspaceIntakeEntryRef,
  workspaceIntakeRecordForClassification,
  workspacePromotionCommandBlockers,
} from "../../../src/domain-workspaces/operation-contracts/workspace-governance/contract-model.ts";
import type { WorkspaceEntrantKind } from "../../../src/domain-workspaces/operation-contracts/workspace-governance/entrant.ts";
import type {
  WorkspaceClassificationReceipt,
  WorkspaceEntrantClassificationCommand,
  WorkspaceIntakeEntry,
} from "../../../src/domain-workspaces/operation-contracts/workspace-governance/intake.ts";

type StoredClassification = {
  commandDigest: string;
  receipt: WorkspaceClassificationReceipt;
};

type StoredPromotion = {
  commandDigest: string;
  receipt: WorkspacePromotionReceipt;
};

type ActiveInventory = {
  component: Map<
    string,
    Extract<WorkspaceActiveInventoryRecord, { kind: "component" }>
  >;
  product: Map<
    string,
    Extract<WorkspaceActiveInventoryRecord, { kind: "product" }>
  >;
  repository: Map<
    string,
    Extract<WorkspaceActiveInventoryRecord, { kind: "repository" }>
  >;
};

type ActiveIdentitySets = {
  component: Set<string>;
  product: Set<string>;
  repository: Set<string>;
};

export type WorkspaceGovernanceSimulatorOptions = {
  activeComponentIds?: string[];
  activeProductIds?: string[];
  activeRepositoryIds?: string[];
};

export class WorkspaceGovernanceSimulator {
  readonly #active: ActiveInventory = {
    component: new Map(),
    product: new Map(),
    repository: new Map(),
  };

  readonly #activeIdentities: ActiveIdentitySets;
  readonly #classifications = new Map<string, StoredClassification>();
  readonly #intake = new Map<string, WorkspaceIntakeEntry>();
  readonly #promotions = new Map<string, StoredPromotion>();
  readonly #activeInventoryVersions: Record<WorkspaceEntrantKind, string>;
  #intakeRegisterVersion: string;

  constructor({
    activeComponentIds = [],
    activeProductIds = [],
    activeRepositoryIds = [],
  }: WorkspaceGovernanceSimulatorOptions = {}) {
    this.#activeIdentities = {
      component: new Set(activeComponentIds),
      product: new Set(activeProductIds),
      repository: new Set(activeRepositoryIds),
    };
    this.#intakeRegisterVersion = intakeRegisterVersion(this.#intake);
    this.#activeInventoryVersions = {
      component: activeInventoryVersion(
        "component",
        this.#active,
        this.#activeIdentities,
      ),
      product: activeInventoryVersion(
        "product",
        this.#active,
        this.#activeIdentities,
      ),
      repository: activeInventoryVersion(
        "repository",
        this.#active,
        this.#activeIdentities,
      ),
    };
  }

  classify(
    command: WorkspaceEntrantClassificationCommand,
  ): WorkspaceClassificationReceipt {
    const blockers = workspaceClassificationCommandBlockers(command);

    if (blockers.length > 0) {
      throw new Error(blockers.join(" "));
    }

    const commandDigest = structuredDigest(command);
    const replay = this.#classifications.get(command.idempotencyKey);

    if (replay) {
      if (replay.commandDigest !== commandDigest) {
        throw new Error(
          "Workspace classification idempotency key cannot be reused with different input.",
        );
      }
      return replay.receipt;
    }

    if (
      command.expectedIntakeRegisterVersion !== this.#intakeRegisterVersion
    ) {
      throw new Error(
        "Workspace classification rejected a stale intake-register version.",
      );
    }
    if (
      this.#activeIdentities[command.candidate.entrantKind].has(
        command.candidate.canonicalKey,
      )
    ) {
      throw new Error(
        `Workspace entrant is already active at ${activeRefForCandidate(
          command.candidate.entrantKind,
          command.candidate.canonicalKey,
        )}.`,
      );
    }

    const entryRef = workspaceIntakeEntryRef(command.candidate);
    const prior = this.#intake.get(entryRef) ?? null;

    if (
      prior &&
      prior.candidate.candidateRef !== command.candidate.candidateRef
    ) {
      throw new Error(
        "Workspace intake identity conflicts with another candidate.",
      );
    }

    const contractRecord = workspaceIntakeRecordForClassification(command);
    const version = `intake-${structuredDigest({
      candidate: command.candidate,
      contractRecord,
    }).slice(0, 16)}`;
    const entry: WorkspaceIntakeEntry = {
      candidate: structuredClone(command.candidate),
      contractRecord,
      entryRef,
      operatorRef: command.operatorRef,
      version,
    };

    this.#intake.set(entryRef, entry);
    this.#intakeRegisterVersion = intakeRegisterVersion(this.#intake);

    const receipt: WorkspaceClassificationReceipt = {
      candidateRef: command.candidate.candidateRef,
      canonicalIntakeEntryRef: entryRef,
      correlationRef: command.candidate.correlationRef,
      decision: command.decision,
      definitionId: "workspace.entrant.classify",
      definitionVersion: 1,
      idempotencyKey: command.idempotencyKey,
      intakeEntryVersion: version,
      intakeRegisterVersion: this.#intakeRegisterVersion,
      operatorRef: command.operatorRef,
      priorDecision: prior?.contractRecord.value.status ?? null,
      receiptRef:
        `workspace-governance://receipts/intake/` +
        receiptSlug(command.requestId),
      recordedAt: command.decidedAt,
      requestId: command.requestId,
    };

    this.#classifications.set(command.idempotencyKey, {
      commandDigest,
      receipt,
    });
    return receipt;
  }

  promote(command: WorkspaceEntrantPromotionCommand): WorkspacePromotionReceipt {
    const blockers = workspacePromotionCommandBlockers({
      command,
      dependencies: this.dependencies(),
    });

    if (blockers.length > 0) {
      throw new Error(blockers.join(" "));
    }

    const commandDigest = structuredDigest(command);
    const replay = this.#promotions.get(command.idempotencyKey);

    if (replay) {
      if (replay.commandDigest !== commandDigest) {
        throw new Error(
          "Workspace promotion idempotency key cannot be reused with different input.",
        );
      }
      return replay.receipt;
    }

    if (
      command.expectedIntakeRegisterVersion !== this.#intakeRegisterVersion
    ) {
      throw new Error(
        "Workspace promotion rejected a stale intake-register version.",
      );
    }
    if (
      command.expectedActiveInventoryVersion !==
      this.#activeInventoryVersions[command.activeRecord.kind]
    ) {
      throw new Error(
        "Workspace promotion rejected a stale active-inventory version.",
      );
    }

    const entry = this.#intake.get(command.intakeEntryRef);

    if (!entry) {
      throw new Error("Workspace promotion requires a current intake entry.");
    }
    if (entry.version !== command.intakeEntryVersion) {
      throw new Error("Workspace promotion rejected a stale intake version.");
    }
    if (entry.contractRecord.value.status !== "admitted") {
      throw new Error(
        "Only an admitted Workspace Intake entry can enter active inventory.",
      );
    }
    if (entry.candidate.entrantKind !== command.activeRecord.kind) {
      throw new Error(
        "Workspace promotion entrant kind does not match the intake entry.",
      );
    }
    if (entry.contractRecord.id !== command.activeRecord.id) {
      throw new Error(
        "Workspace promotion active identity does not match the intake entry.",
      );
    }
    if (entry.candidate.correlationRef !== command.correlationRef) {
      throw new Error(
        "Workspace promotion correlation does not match the intake entry.",
      );
    }
    if (
      command.activeRecordDigest !== activeRecordDigest(command.activeRecord)
    ) {
      throw new Error("Workspace promotion active record digest is stale.");
    }
    if (
      this.#activeIdentities[command.activeRecord.kind].has(
        command.activeRecord.id,
      )
    ) {
      throw new Error(
        "Workspace promotion cannot create a duplicate active identity.",
      );
    }

    this.#intake.delete(entry.entryRef);
    storeActiveRecord(this.#active, command.activeRecord);
    this.#activeIdentities[command.activeRecord.kind].add(
      command.activeRecord.id,
    );
    this.#intakeRegisterVersion = intakeRegisterVersion(this.#intake);
    this.#activeInventoryVersions[command.activeRecord.kind] =
      activeInventoryVersion(
        command.activeRecord.kind,
        this.#active,
        this.#activeIdentities,
      );

    const receipt: WorkspacePromotionReceipt = {
      activeInventoryVersion:
        this.#activeInventoryVersions[command.activeRecord.kind],
      activeRecordRef: workspaceActiveRecordRef(command.activeRecord),
      correlationRef: command.correlationRef,
      definitionId: "workspace.entrant.promote",
      definitionVersion: 1,
      idempotencyKey: command.idempotencyKey,
      intakeEntryRef: entry.entryRef,
      intakeEntryVersion: entry.version,
      intakeRegisterVersion: this.#intakeRegisterVersion,
      operatorRef: command.operatorRef,
      receiptRef:
        `workspace-governance://receipts/promotion/` +
        receiptSlug(command.requestId),
      recordedAt: command.decidedAt,
      requestId: command.requestId,
      result: "promoted",
    };

    this.#promotions.set(command.idempotencyKey, { commandDigest, receipt });
    return receipt;
  }

  getActiveInventoryVersion(kind: WorkspaceEntrantKind) {
    return this.#activeInventoryVersions[kind];
  }

  getActiveRecord<TKind extends WorkspaceEntrantKind>(
    kind: TKind,
    id: string,
  ): Extract<WorkspaceActiveInventoryRecord, { kind: TKind }> | null {
    return (
      (this.#active[kind].get(id) as
        | Extract<WorkspaceActiveInventoryRecord, { kind: TKind }>
        | undefined) ?? null
    );
  }

  getIntakeEntry(entryRef: string) {
    return this.#intake.get(entryRef) ?? null;
  }

  getIntakeRegisterVersion() {
    return this.#intakeRegisterVersion;
  }

  snapshot() {
    return {
      active: {
        components: Array.from(this.#active.component.values()),
        products: Array.from(this.#active.product.values()),
        repositories: Array.from(this.#active.repository.values()),
      },
      intake: Array.from(this.#intake.values()),
      versions: {
        activeInventory: { ...this.#activeInventoryVersions },
        intakeRegister: this.#intakeRegisterVersion,
      },
    };
  }

  private dependencies(): WorkspaceActiveInventoryDependencies {
    return {
      activeComponentIds: [...this.#activeIdentities.component].sort(),
      activeProductIds: [...this.#activeIdentities.product].sort(),
      activeRepositoryIds: [...this.#activeIdentities.repository].sort(),
    };
  }
}

export function activeRecordDigest(record: WorkspaceActiveInventoryRecord) {
  return structuredDigest(record);
}

function storeActiveRecord(
  active: ActiveInventory,
  record: WorkspaceActiveInventoryRecord,
) {
  switch (record.kind) {
    case "repository":
      active.repository.set(record.id, structuredClone(record));
      break;
    case "product":
      active.product.set(record.id, structuredClone(record));
      break;
    case "component":
      active.component.set(record.id, structuredClone(record));
      break;
  }
}

function intakeRegisterVersion(intake: Map<string, WorkspaceIntakeEntry>) {
  return `simulation-intake-${structuredDigest(
    Array.from(intake.entries()).sort(([left], [right]) =>
      left.localeCompare(right),
    ),
  ).slice(0, 16)}`;
}

function activeInventoryVersion(
  kind: WorkspaceEntrantKind,
  active: ActiveInventory,
  identities: ActiveIdentitySets,
) {
  let records: Array<[string, WorkspaceActiveInventoryRecord]>;

  switch (kind) {
    case "component":
      records = Array.from(active.component.entries());
      break;
    case "product":
      records = Array.from(active.product.entries());
      break;
    case "repository":
      records = Array.from(active.repository.entries());
      break;
  }

  records.sort(([left], [right]) => left.localeCompare(right));

  return `simulation-${kind}-${structuredDigest({
    identities: [...identities[kind]].sort(),
    records,
  }).slice(0, 16)}`;
}

function activeRefForCandidate(kind: WorkspaceEntrantKind, id: string) {
  const group =
    kind === "repository"
      ? "repos"
      : kind === "product"
        ? "products"
        : "components";
  return `workspace-governance://${group}/${receiptSlug(id)}`;
}

function receiptSlug(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug) {
    throw new Error("Workspace simulation identity cannot be empty.");
  }
  return slug;
}

function structuredDigest(value: unknown) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
