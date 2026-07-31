import {
  acknowledgeProposalPrototypeEntryPacket,
  getProposalPrototypeEntryPacketProjections,
  subscribeProposalPrototypeEntryPacketProjections,
} from "../../operation-integrations/proposal-prototype-entry-projection.ts";

import { prototypeRecordFromEntryPacket } from "../work-model/entry/prototype-entry-packet.ts";

let prototypeEntryRuntimeStarted = false;
let reconcilingPrototypeEntries = false;
let cachedSourcePacketProjections =
  getProposalPrototypeEntryPacketProjections();
let cachedAdmittedPacketProjections = admittedPrototypeEntryPacketProjections(
  cachedSourcePacketProjections,
);

export function getPrototypeEntryPacketProjections() {
  ensurePrototypeEntryRuntimeStarted();
  reconcilePrototypeEntryPackets();

  const sourcePacketProjections = getProposalPrototypeEntryPacketProjections();

  if (sourcePacketProjections !== cachedSourcePacketProjections) {
    cachedSourcePacketProjections = sourcePacketProjections;
    cachedAdmittedPacketProjections = admittedPrototypeEntryPacketProjections(
      sourcePacketProjections,
    );
  }

  return cachedAdmittedPacketProjections;
}

export function subscribePrototypeEntryPacketProjections(listener: () => void) {
  ensurePrototypeEntryRuntimeStarted();
  return subscribeProposalPrototypeEntryPacketProjections(listener);
}

export function reconcilePrototypeEntryPackets() {
  if (reconcilingPrototypeEntries) {
    return;
  }

  reconcilingPrototypeEntries = true;

  try {
    getProposalPrototypeEntryPacketProjections().forEach(
      (projection, index) => {
        if (projection.custody.state !== "dispatched") {
          return;
        }

        const receiptRef = `prototype-local://prototype-entry/receipts/${packetSlug(
          projection.packet.packetId,
        )}`;

        try {
          prototypeRecordFromEntryPacket(projection, index);
          acknowledgeProposalPrototypeEntryPacket({
            packetId: projection.packet.packetId,
            receiptRef,
            recordedAt: projection.packet.createdAt,
            state: "admitted",
          });
        } catch {
          acknowledgeProposalPrototypeEntryPacket({
            packetId: projection.packet.packetId,
            receiptRef,
            recordedAt: projection.packet.createdAt,
            state: "rejected",
          });
        }
      },
    );
  } finally {
    reconcilingPrototypeEntries = false;
  }
}

function ensurePrototypeEntryRuntimeStarted() {
  if (prototypeEntryRuntimeStarted) {
    return;
  }

  prototypeEntryRuntimeStarted = true;
  subscribeProposalPrototypeEntryPacketProjections(
    reconcilePrototypeEntryPackets,
  );
}

function packetSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function admittedPrototypeEntryPacketProjections(
  projections: ReturnType<typeof getProposalPrototypeEntryPacketProjections>,
) {
  return projections.filter(
    (projection) => projection.custody.state === "admitted",
  );
}
