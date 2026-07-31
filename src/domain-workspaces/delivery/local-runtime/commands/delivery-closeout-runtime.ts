import { createLocalOperationRuntimeAdapter } from "../../../operation-runtime/local-operation-runtime-adapter.ts";
import {
  createOperationCommandPreconditions,
  createPrototypeLocalOperationCommand,
  operationRunCanReportSuccess,
} from "../../../operation-runtime/operation-runtime-invariants.ts";
import type {
  OperationCommandRunEnvelope,
  OperationReceiptEnvelope,
  OperationRuntimeSource,
} from "../../../operation-runtime/operation-runtime-types.ts";

import type { DeliveryPackageSummary } from "../../read-model/index.ts";
import type {
  DeliveryCloseoutCommand,
  DeliveryCloseoutReceipt,
} from "../../work-model/closeout/delivery-closeout-contracts.ts";
import {
  createDeliveryCloseoutReceipt,
  deliveryCloseoutBlockers,
} from "../../work-model/closeout/delivery-closeout-model.ts";
import { deliveryPackageSourceVersion } from "../transitions/transition-record.ts";

type DeliveryCloseoutRuntimeCommand = {
  closeout: DeliveryCloseoutCommand;
  deliveryPackage: DeliveryPackageSummary;
};

type DeliveryCloseoutRuntimeRun = {
  blockers: string[];
  summary: string;
};

const deliveryCloseoutRuntimeSource = {
  authority: "prototype-local",
  mode: "local",
  sourceOwner: "delivery-closeout",
} satisfies OperationRuntimeSource & { mode: "local" };

const deliveryCloseoutRuntime = createLocalOperationRuntimeAdapter<
  never,
  never,
  DeliveryCloseoutRuntimeCommand,
  DeliveryCloseoutRuntimeRun,
  DeliveryCloseoutReceipt
>({
  commandRunner(command) {
    const blockers = deliveryCloseoutBlockers({
      closeout: command.command.closeout,
      deliveryPackage: command.command.deliveryPackage,
    });
    const completed = blockers.length === 0;
    const summary = completed
      ? "Delivery closeout recorded through the prototype-local runtime."
      : blockers.join(" ");

    return {
      run: { blockers, summary },
      state: completed ? "completed" : "blocked",
      summary,
    };
  },
  receiptFactory({ command, run }) {
    if (run.state !== "completed") {
      return null;
    }

    const sourcePackageVersion = deliveryPackageSourceVersion(
      command.command.deliveryPackage,
    );
    const closeoutReceiptRef =
      `prototype-local://delivery/closeout/` +
      `${command.command.deliveryPackage.delivery_package_id}/${run.runId}`;
    const receipt = createDeliveryCloseoutReceipt({
      closeout: command.command.closeout,
      closeoutReceiptRef,
      closedAt: run.updatedAt,
      deliveryPackage: command.command.deliveryPackage,
      sourcePackageVersion,
    });

    return {
      durability: "prototype-local",
      receipt,
      receiptId: closeoutReceiptRef,
      recordedAt: run.updatedAt,
    };
  },
  runtimeSource: deliveryCloseoutRuntimeSource,
});

export async function submitDeliveryCloseoutCommand({
  closeout,
  deliveryPackage,
  submittedAt = new Date().toISOString(),
}: DeliveryCloseoutRuntimeCommand & {
  submittedAt?: string;
}): Promise<{
  receipt: OperationReceiptEnvelope<DeliveryCloseoutReceipt> | null;
  run: OperationCommandRunEnvelope<DeliveryCloseoutRuntimeRun>;
}> {
  const sourcePackageVersion = deliveryPackageSourceVersion(deliveryPackage);
  const run = await deliveryCloseoutRuntime.submitCommand(
    createPrototypeLocalOperationCommand({
      command: { closeout, deliveryPackage },
      commandName: "delivery.closeout.apply",
      preconditions: createOperationCommandPreconditions({
        dependencies: [
          {
            recordId: closeout.readiness.readinessRef,
            sourceOwner: "operator-orchestration-service",
            version: closeout.readiness.sourceVersion,
          },
        ],
        primary: {
          recordId: deliveryPackage.delivery_package_id,
          sourceOwner: "delivery-execution-package",
          version: sourcePackageVersion,
        },
      }),
      recordId: deliveryPackage.delivery_package_id,
      runtimeSource: deliveryCloseoutRuntimeSource,
      submittedAt,
    }),
  );
  const receipts = await deliveryCloseoutRuntime.listReceipts(
    deliveryPackage.delivery_package_id,
  );
  const receipt =
    receipts.find((candidate) => candidate.runId === run.runId) ?? null;

  if (
    run.state === "completed" &&
    !operationRunCanReportSuccess(run, receipt)
  ) {
    throw new Error(
      "Delivery closeout completed without matching receipt evidence.",
    );
  }

  return { receipt, run };
}

export function getDeliveryCloseoutRuntimeCapabilities() {
  return deliveryCloseoutRuntime.getCapabilities();
}

export function listDeliveryCloseoutRuntimeReceipts(recordId: string) {
  return deliveryCloseoutRuntime.listReceipts(recordId);
}
