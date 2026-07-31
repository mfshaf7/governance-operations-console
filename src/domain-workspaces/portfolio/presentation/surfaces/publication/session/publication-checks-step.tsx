import {
  TerasStatusItem,
  TerasList,
  TerasStatusPill,
  TerasWizardPanel,
} from "@/teras";
import type { ProductPortfolioScenarioProjection } from "../../../../read-model/types/product-portfolio-fixture-types.ts";
import { productPublicationRequirementCounts } from "../publication-view-model.ts";
import { productPublicationRequirementRows } from "./publication-session-view-model.ts";

export function ProductPublicationChecksStep({
  record,
}: {
  record: ProductPortfolioScenarioProjection;
}) {
  const counts = productPublicationRequirementCounts(
    record.projection.requirements,
  );
  const rows = productPublicationRequirementRows(record);
  const clear = counts.satisfied === counts.total;

  return (
    <TerasWizardPanel
      actions={
        <TerasStatusPill tone={clear ? "ok" : "warn"}>
          {counts.satisfied}/{counts.total} clear
        </TerasStatusPill>
      }
      description="Review the source-backed publication requirements before choosing an outcome."
      kicker="Publication Work"
      title="Source Checks"
    >
      <TerasList frame="contained">
        {rows.map((row, index) => (
          <TerasStatusItem
            tone={row.tone}
            detail={row.detail}
            index={String(index + 1).padStart(2, "0")}
            key={row.id}
            label={row.label}
            status={row.status}
          />
        ))}
      </TerasList>
    </TerasWizardPanel>
  );
}
