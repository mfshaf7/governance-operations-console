import type {
  PrototypeDeliveryApplicationResult,
  PrototypeDeliveryPacket,
} from "../domain/prototype-delivery.ts";

export type PrototypeDeliveryApplicationRequest = {
  decisionRef: string;
  packet: PrototypeDeliveryPacket;
};

export type PrototypeDeliveryApplicationProjection = {
  packet: PrototypeDeliveryPacket;
  result: PrototypeDeliveryApplicationResult;
};

export type PrototypeDeliveryLiveApiError = {
  code: string;
  error: string;
  mode: "live";
  status: "offline";
};

export type {
  PrototypeDeliveryApplicationResult,
  PrototypeDeliveryPacket,
};
