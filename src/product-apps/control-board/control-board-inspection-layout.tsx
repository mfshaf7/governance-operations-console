import type { ReactNode } from "react";
import { ArrowLeft, ChevronRight, X } from "lucide-react";
import { TerasActionRow, TerasContentTray, TerasMetadataList, TerasSelectField, TerasUtilityButton, type TerasSelectFieldProps } from "@/teras";
import styles from "./control-board.module.css";

export function ControlBoardCanvasNavigation({ label, priorLevel, disabled, onBack, children }: {
  label: string;
  priorLevel?: string;
  disabled?: boolean;
  onBack?: () => void;
  children?: ReactNode;
}) {
  return <TerasActionRow className={styles.controlBoardCanvasActionRow} spacing="tight" role="navigation" aria-label={label}>
    {priorLevel && onBack && <TerasUtilityButton variant="subtle" className={styles.controlBoardCanvasBack} aria-label={`Back to ${priorLevel}`}
      disabled={disabled} onClick={onBack}>
      <ArrowLeft size={14} aria-hidden="true" />
      <span>{priorLevel}</span>
    </TerasUtilityButton>}
    {children}
  </TerasActionRow>;
}

export function ControlBoardCanvasField({ filter = false, children }: { filter?: boolean; children: ReactNode }) {
  return <div className={filter ? styles.controlBoardFeatureFilter : styles.controlBoardScopeField}>{children}</div>;
}

export function ControlBoardHeaderSelect<Value extends string>(props: TerasSelectFieldProps<Value>) {
  return <TerasSelectField {...props} className={styles.controlBoardHeaderSelect} />;
}

export function ControlBoardCardDisclosure() {
  return <ChevronRight className={styles.controlBoardCardChevron} size={16} aria-hidden="true" />;
}

export function ControlBoardInspectorHeader({ onClose, closeLabel, children }: {
  onClose?: () => void;
  closeLabel: string;
  children: ReactNode;
}) {
  return <div className={styles.controlBoardItemHeader} data-dismissable={Boolean(onClose)}>
    {children}
    {onClose && <TerasUtilityButton className={styles.controlBoardItemClose} variant="subtle"
      aria-label={closeLabel} onClick={onClose}>
      <X aria-hidden="true" size={15} />
    </TerasUtilityButton>}
  </div>;
}

export function ControlBoardInspectorActions({ children }: { children: ReactNode }) {
  return <TerasContentTray className={styles.controlBoardPackageActions}>{children}</TerasContentTray>;
}

export function ControlBoardHighlightedMetadata({ items }: Pick<Parameters<typeof TerasMetadataList>[0], "items">) {
  return <TerasMetadataList accent="rail" className={styles.controlBoardTargetPI} columns={1} items={items} />;
}

export function ControlBoardKickerStatus({ title, status }: { title: ReactNode; status: ReactNode }) {
  return <span className={styles.controlBoardKickerStatus}>{title}{status}</span>;
}
