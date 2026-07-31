import type { DeliveryCatalogValue } from "../../domain/delivery-types.ts";
import type { OperationOwnerRepoCatalogOption } from "../../../operation-contracts/owner-repository.ts";

export type DeliveryCatalogMutationMode = "add" | "edit" | "retire";

export type CatalogMutationDraft = {
  mode: DeliveryCatalogMutationMode;
  valueId: string | null;
};

export type CatalogMutationSubmit = {
  description: string;
  label: string;
  linkedRepository?: OperationOwnerRepoCatalogOption | null;
  parentCatalogValueKey?: string | null;
  planningWindowEndDate?: string;
  planningWindowStartDate?: string;
  valueKey: string;
};

export type CatalogLocalDraftReceipt = {
  actionLabel: string;
  linkedRepository?: OperationOwnerRepoCatalogOption | null;
  recordedAt: string;
  route: string;
  valueId: string;
};

export type CatalogDraftApplyResult = {
  catalogValues: DeliveryCatalogValue[];
  localDraftReceipt: CatalogLocalDraftReceipt;
  search: string;
  selectedValueId: string;
};
