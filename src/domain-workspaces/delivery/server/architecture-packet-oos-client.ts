import {
  assertArchitecturePacketArtifact,
  assertArchitecturePacketCurrentResult,
  assertArchitecturePacketDraftInput,
  assertArchitecturePacketDraftResult,
  assertArchitecturePacketPersistResult,
} from "../live-runtime/architecture-packet-live-contract.ts";
import type {
  ArchitecturePacketArtifact,
  ArchitecturePacketCurrentResult,
  ArchitecturePacketDraftInput,
  ArchitecturePacketDraftResult,
  ArchitecturePacketPersistResult,
} from "../live-runtime/architecture-packet-live-types.ts";
import {
  deliveryOosConfigured,
  deliveryOosRequest,
  resolveDeliveryOosConfig,
} from "./delivery-oos-client.ts";

type ArchitecturePacketClientOptions = {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
};

const architecturePacketTimeoutMs = 75_000;

export function architecturePacketOosConfigured(
  env: NodeJS.ProcessEnv = process.env,
) {
  return deliveryOosConfigured(env);
}

export async function draftArchitecturePacket(
  input: ArchitecturePacketDraftInput,
  options: ArchitecturePacketClientOptions = {},
): Promise<ArchitecturePacketDraftResult> {
  const checked = assertArchitecturePacketDraftInput(input);
  const config = resolveDeliveryOosConfig(options.env);
  const value = await deliveryOosRequest(
    config,
    "/v1/delivery-art/architecture-packets/draft",
    {
      body: JSON.stringify({ input: checked }),
      headers: { "x-oos-operator-id": config.operatorId },
      method: "POST",
    },
    options.fetchImpl,
    architecturePacketTimeoutMs,
  );
  const result = assertArchitecturePacketDraftResult(value);
  assertArtifactBinding(result.architecture_packet, checked.delivery_id);
  if (result.architecture_packet.operator.id !== config.operatorId) {
    throw new Error("OOS returned an Architecture Packet for a different operator.");
  }
  return result;
}

export async function persistArchitecturePacket(
  artifact: ArchitecturePacketArtifact,
  options: ArchitecturePacketClientOptions = {},
): Promise<ArchitecturePacketPersistResult> {
  const config = resolveDeliveryOosConfig(options.env);
  const checked = assertArchitecturePacketArtifact(artifact, {
    custodyState: "local-draft",
    decisionStatus: "architecture-ready",
    operatorId: config.operatorId,
    schemaVersion: 6,
  });
  const value = await deliveryOosRequest(
    config,
    "/v1/delivery-art/architecture-packets/persist",
    {
      body: JSON.stringify({ artifact: checked }),
      headers: { "x-oos-operator-id": config.operatorId },
      method: "POST",
    },
    options.fetchImpl,
    architecturePacketTimeoutMs,
  );
  const result = assertArchitecturePacketPersistResult(value);
  assertArtifactBinding(result.artifact, checked.delivery_id);
  if (result.artifact.artifact_id !== checked.artifact_id) {
    throw new Error("OOS persisted a different Architecture Packet identity.");
  }
  if (
    result.artifact.operator.id !== config.operatorId ||
    result.artifact.integrity.content_digest !== checked.integrity.content_digest
  ) {
    throw new Error("OOS persisted a different Architecture Packet binding.");
  }
  return result;
}

export async function readCurrentArchitecturePacket(
  deliveryId: string,
  options: ArchitecturePacketClientOptions = {},
): Promise<ArchitecturePacketCurrentResult> {
  if (!/^delivery-[1-9][0-9]*$/.test(deliveryId)) {
    throw new Error("Architecture Packet Delivery identity is invalid.");
  }
  const config = resolveDeliveryOosConfig(options.env);
  const value = await deliveryOosRequest(
    config,
    "/v1/delivery-art/architecture-packets/current",
    {
      body: JSON.stringify({ delivery_id: deliveryId }),
      headers: { "x-oos-operator-id": config.operatorId },
      method: "POST",
    },
    options.fetchImpl,
    architecturePacketTimeoutMs,
  );
  const result = assertArchitecturePacketCurrentResult(value);
  assertArtifactBinding(result.artifact, deliveryId);
  return result;
}

function assertArtifactBinding(
  artifact: ArchitecturePacketArtifact,
  deliveryId: string,
) {
  if (artifact.delivery_id !== deliveryId) {
    throw new Error("OOS returned an Architecture Packet for a different Delivery initiative.");
  }
}
