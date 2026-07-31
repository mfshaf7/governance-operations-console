import { createLocalOperationProjectionStore } from "../../../operation-runtime/local-operation-projection-store.ts";
import {
  acknowledgeProposalRepositoryRequestPacket,
  getProposalRepositoryGateResolutions,
  getProposalRepositoryRequestPacketProjections,
  subscribeProposalRepositoryRequestPacketProjections,
} from "../../../operation-integrations/proposal-repository-request-projection.ts";

import type { RepositoryWorkspaceRecord } from "../../domain/repository-types.ts";
import { repositoryRecordFromProposalRequestPacket } from "../../work-model/ingress/proposal-repository-request-packet.ts";

type RepositoryIngressState = {
  records: RepositoryWorkspaceRecord[];
};

const repositoryIngressStore = createLocalOperationProjectionStore<
  RepositoryIngressState,
  RepositoryWorkspaceRecord[]
>({
  initialState: { records: [] },
  projectSnapshot: (state) => state.records,
  runtimeSource: {
    authority: "prototype-local",
    mode: "local",
    sourceOwner: "repository-ingress",
  },
});

let repositoryIngressStarted = false;
let reconcilingRepositoryIngress = false;

export function getProposalRepositoryRequestRecords() {
  ensureRepositoryIngressStarted();
  reconcileRepositoryIngress();
  return repositoryIngressStore.getSnapshot();
}

export function subscribeProposalRepositoryRequestRecords(
  listener: () => void,
) {
  ensureRepositoryIngressStarted();
  return repositoryIngressStore.subscribe(listener);
}

export function reconcileRepositoryIngress() {
  if (reconcilingRepositoryIngress) {
    return;
  }

  reconcilingRepositoryIngress = true;

  try {
    const resolutions = new Map(
      Object.entries(getProposalRepositoryGateResolutions()),
    );

    for (const projection of getProposalRepositoryRequestPacketProjections()) {
      if (projection.custody.state !== "dispatched") {
        continue;
      }

      const receiptRef = `prototype-local://repository-ingress/receipts/${packetSlug(
        projection.packet.packetId,
      )}`;

      try {
        repositoryRecordFromProposalRequestPacket(projection, resolutions);
        acknowledgeProposalRepositoryRequestPacket({
          packetId: projection.packet.packetId,
          receiptRef,
          recordedAt: projection.packet.createdAt,
          state: "admitted",
        });
      } catch {
        acknowledgeProposalRepositoryRequestPacket({
          packetId: projection.packet.packetId,
          receiptRef,
          recordedAt: projection.packet.createdAt,
          state: "rejected",
        });
      }
    }

    const records = getProposalRepositoryRequestPacketProjections().map(
      (projection) =>
        repositoryRecordFromProposalRequestPacket(projection, resolutions),
    );
    const currentRecords = repositoryIngressStore.getState().records;

    if (JSON.stringify(currentRecords) !== JSON.stringify(records)) {
      repositoryIngressStore.setState({ records });
    }
  } finally {
    reconcilingRepositoryIngress = false;
  }
}

function ensureRepositoryIngressStarted() {
  if (repositoryIngressStarted) {
    return;
  }

  repositoryIngressStarted = true;
  subscribeProposalRepositoryRequestPacketProjections(
    reconcileRepositoryIngress,
  );
  reconcileRepositoryIngress();
}

function packetSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
