import {
  TerasActionButton,
  TerasRecordCellText,
  TerasRecordMetaText,
  TerasRecordTable,
  type TerasRecordTableColumn,
  TerasStatusPill,
} from "@/teras";

import {
  deliveryPackageRegisterPackageSummary,
  deliveryPackageRegisterStatusLabel,
  deliveryPackageRegisterStatusTone,
} from "./package-register-view-model.ts";
import type { DeliveryPackageRegisterPackage } from "./package-register-types.ts";

export function DeliveryPackageRegisterTable({
  rowOffset=0,
  history = false,
  onSelectPackage,
  onViewPackage,
  packages,
  selectedPackageId,
}: {
  rowOffset?:number;
  history?: boolean;
  onSelectPackage: (deliveryPackage: DeliveryPackageRegisterPackage) => void;
  onViewPackage: (deliveryPackage: DeliveryPackageRegisterPackage) => void;
  packages: DeliveryPackageRegisterPackage[];
  selectedPackageId: string | null;
}) {
  const registerColumns: Array<
    TerasRecordTableColumn<DeliveryPackageRegisterPackage>
  > = [
    {
      header: "No.",
      intent: "index",
      key: "index",
      render: (_deliveryPackage, index) => String(rowOffset + index + 1).padStart(2, "0"),
    },
    {
      header: "Package",
      intent: "primary",
      key: "package",
      render: (deliveryPackage) => (
        <TerasRecordCellText
          description={deliveryPackage.source_ref}
          title={deliveryPackage.display_name}
        />
      ),
    },
    {
      header: "Evidence",
      intent: "evidence",
      key: "evidence",
      render: (deliveryPackage) => {
        const evidence = deliveryPackageRegisterPackageSummary(deliveryPackage);
        return (
          <TerasRecordMetaText>
            <span title={evidence}>
              {evidence.length > 72 ? `${evidence.slice(0, 69).trimEnd()}…` : evidence}
            </span>
          </TerasRecordMetaText>
        );
      },
    },
    {
      header: history ? "Current Epic status" : "Status",
      intent: "status",
      key: "status",
      render: (deliveryPackage) => (
        <TerasStatusPill tone={history ? deliveryPackage.tone : deliveryPackageRegisterStatusTone(deliveryPackage)}>
          {history ? deliveryPackage.package_posture : deliveryPackageRegisterStatusLabel(deliveryPackage)}
        </TerasStatusPill>
      ),
    },
    {
      header: "Action",
      intent: "action",
      key: "action",
      render: (deliveryPackage) => (
        <TerasActionButton
          onClick={(event) => {
            event.stopPropagation();
            onViewPackage(deliveryPackage);
          }}
          emphasis="secondary"
        >
          View
        </TerasActionButton>
      ),
    },
  ];

  return (
    <TerasRecordTable
      ariaLabel="Delivery packages"
      columns={registerColumns}
      fill
      getRowId={(deliveryPackage) => deliveryPackage.delivery_package_id}
      onSelect={onSelectPackage}
      rows={packages}
      selectedRowId={selectedPackageId}
    />
  );
}
