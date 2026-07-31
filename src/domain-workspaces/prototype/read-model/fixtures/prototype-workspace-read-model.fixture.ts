import type { PrototypeWorkspaceReadModel } from "../../domain/prototype-types.ts";
import { prototypeBaselineApprovedRecords } from "./records/prototype-baseline-approved-records.fixture.ts";
import { prototypeCandidateRecords } from "./records/prototype-candidate-records.fixture.ts";
import { prototypeExploringRecords } from "./records/prototype-exploring-records.fixture.ts";
import { prototypeRetiredRecords } from "./records/prototype-retired-records.fixture.ts";

export const prototypeWorkspaceReadModel: PrototypeWorkspaceReadModel = {
  records: [
    ...prototypeCandidateRecords,
    ...prototypeExploringRecords,
    ...prototypeBaselineApprovedRecords,
    ...prototypeRetiredRecords,
  ],
  source: {
    lastRead: "2026-06-24 local prototype read",
    mutationGateway: "prototype-local commands only",
    project: "Workspace Prototype Studio",
    recordSystem: "registry-shaped prototype fixtures",
    registry: "prototypes.yaml contract shape",
  },
};
