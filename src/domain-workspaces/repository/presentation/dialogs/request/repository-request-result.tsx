import { TerasMetadataList, TerasPanel, TerasPanelHeader, TerasTechnicalDetails, TerasTrayStack } from "@/teras";
import type { RepositoryCustodyClientError } from "../../../live-runtime/use-repository-custody-live-runtime.ts";
import type { RepositoryCustodyWorkflowResult } from "../../../live-runtime/repository-custody-live-types.ts";
import { repositoryProvisioningResultMetadata, repositoryProvisioningResultProjection } from "./repository-request-view-model.ts";

export function RepositoryRequestResult({ result, error }: {
  result?: RepositoryCustodyWorkflowResult;
  error?: RepositoryCustodyClientError;
}) {
  const projection = repositoryProvisioningResultProjection(result, error);
  const completed = result?.status === "succeeded";
  return <TerasPanel frame="padded" treatment="rail" tone={projection.tone} fit="content">
    <TerasPanelHeader kicker="Recorded result" title={completed ? "Repository created" : projection.title}
      description={completed ? "Repository creation was verified and its receipt was recorded." : projection.description}
      statusLabel={completed ? "Completed" : projection.statusLabel} statusTone={projection.tone} />
    {result ? <TerasTrayStack topOffset="section" spacing="loose">
      <TerasMetadataList items={[
        { label: "Repository", value: result.provider_readback?.canonical_url ?? `${result.request.target.owner}/${result.request.target.name}` },
        ...(result.receipt ? [{ label: "Recorded", value: new Date(result.receipt.completed_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) }] : []),
      ]} />
      <TerasTechnicalDetails summary="Request and receipt references" items={repositoryProvisioningResultMetadata(result)} />
    </TerasTrayStack> : null}
  </TerasPanel>;
}
