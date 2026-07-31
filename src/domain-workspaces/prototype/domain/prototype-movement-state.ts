import type { OperationTone } from "../../operation-contracts/operation-state.ts";

import type { PrototypeMovementRequestState } from "./prototype-types.ts";

export function prototypeMovementRequestStateTone(
  state: PrototypeMovementRequestState,
): OperationTone {
  switch (state) {
    case "returned":
    case "draft-ready":
      return "warn";
    case "receipt-projected":
      return "ok";
    case "request-recorded":
      return "info";
    case "not-prepared":
      return "muted";
  }
}

export function prototypeMovementStateLabel(
  state: PrototypeMovementRequestState,
) {
  switch (state) {
    case "draft-ready":
      return "Draft ready";
    case "not-prepared":
      return "Not prepared";
    case "receipt-projected":
      return "Receipt recorded";
    case "request-recorded":
      return "Request recorded";
    case "returned":
      return "Returned";
  }
}
