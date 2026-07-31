import type { OperationResolvedSourceCustody } from "../../operation-contracts/source-custody.ts";

import type { DeliveryTone } from "./delivery-common.ts";

export type DeliveryIntakeSource = {
  accepted_source_id: string;
  consumed_at: string | null;
  consumed_by?: string | null;
  delivery_package_id: string | null;
  evidence_refs: string[];
  expected_backend_route: string;
  gate_summary: string;
  intake_status: DeliveryIntakeSourceStatus;
  owner: string;
  source_kind: "proposal" | "prototype";
  source_ref: string;
  source_custody: OperationResolvedSourceCustody;
  status_label: string;
  summary: string;
  title: string;
  tone: DeliveryTone;
  work_design_session_ref: string | null;
};

export type DeliveryIntakeSourceStatus =
  "consume_failed" | "consumed" | "needs_consume";
