import type {
  OperationCommandEnvelope,
  OperationCommandRunEvent,
  OperationCommandRunEnvelope,
  OperationDraftEnvelope,
  OperationProjectionListener,
  OperationReceiptEnvelope,
  OperationRuntimePort,
  OperationRuntimeSource,
} from "./operation-runtime-types.ts";

export class OperationRuntimeUnavailableError extends Error {
  constructor(sourceOwner: string) {
    super(`${sourceOwner} live runtime adapter is not wired.`);
    this.name = "OperationRuntimeUnavailableError";
  }
}

export function createUnavailableLiveOperationRuntimeAdapter<
  TProjection,
  TDraft,
  TCommand,
  TRun,
  TReceipt,
>(
  runtimeSource: OperationRuntimeSource & { mode: "live" },
): OperationRuntimePort<TProjection, TDraft, TCommand, TRun, TReceipt> {
  return {
    async cancelCommand(): Promise<OperationCommandRunEnvelope<TRun> | null> {
      throw new OperationRuntimeUnavailableError(runtimeSource.sourceOwner);
    },
    getCapabilities() {
      return {
        canCancel: false,
        canInspectRawLogs: false,
        canRefresh: false,
        canRetry: false,
        canSubmit: false,
        canSubscribe: false,
        mode: "live" as const,
      };
    },
    getRuntimeSource() {
      return runtimeSource;
    },
    async readProjection() {
      throw new OperationRuntimeUnavailableError(runtimeSource.sourceOwner);
    },
    async refreshProjection() {
      throw new OperationRuntimeUnavailableError(runtimeSource.sourceOwner);
    },
    subscribeProjection(
      _recordId: string,
      _listener: OperationProjectionListener<TProjection>,
    ) {
      return () => {};
    },
    async loadDraft(): Promise<OperationDraftEnvelope<TDraft> | null> {
      throw new OperationRuntimeUnavailableError(runtimeSource.sourceOwner);
    },
    async saveDraft(): Promise<OperationDraftEnvelope<TDraft>> {
      throw new OperationRuntimeUnavailableError(runtimeSource.sourceOwner);
    },
    async discardDraft(): Promise<void> {
      throw new OperationRuntimeUnavailableError(runtimeSource.sourceOwner);
    },
    async submitCommand(
      _command: OperationCommandEnvelope<TCommand>,
    ): Promise<OperationCommandRunEnvelope<TRun>> {
      throw new OperationRuntimeUnavailableError(runtimeSource.sourceOwner);
    },
    async getCommandRun(): Promise<OperationCommandRunEnvelope<TRun> | null> {
      throw new OperationRuntimeUnavailableError(runtimeSource.sourceOwner);
    },
    async listCommandEvents(): Promise<readonly OperationCommandRunEvent[]> {
      throw new OperationRuntimeUnavailableError(runtimeSource.sourceOwner);
    },
    async listReceipts(): Promise<Array<OperationReceiptEnvelope<TReceipt>>> {
      throw new OperationRuntimeUnavailableError(runtimeSource.sourceOwner);
    },
    async getReceipt(): Promise<OperationReceiptEnvelope<TReceipt> | null> {
      throw new OperationRuntimeUnavailableError(runtimeSource.sourceOwner);
    },
  };
}
