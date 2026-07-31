"use client";

import type { ReactNode } from "react";

import {
  TerasActionButton,
  TerasActionRow,
  type TerasActionEmphasis,
} from "./teras-action";
import { TerasModalShell } from "./teras-modal-shell";
import { TerasContentRegion } from "./teras-content-layout";
import { TerasZone, TerasZoneLayout } from "./teras-zone-layout";
import {
  TerasPanel,
  TerasPanelHeader,
} from "./teras-panel";
import { TerasProgressStepList } from "./teras-progress-steps";
import { TerasSelectedPanel } from "./teras-selected";
import type { TerasTone } from "./teras-types";

export type TerasWizardStep = {
  available?: boolean;
  connectsToNext?: boolean;
  detail?: ReactNode;
  id: string;
  label: ReactNode;
  stateLabel?: ReactNode;
  tone?: TerasTone;
};

export type TerasWizardSubject = {
  detail?: ReactNode;
  eyebrow: string;
  title: ReactNode;
};

export type TerasWizardAction = {
  dataAction?: string;
  disabled?: boolean;
  emphasis?: TerasActionEmphasis;
  label: ReactNode;
  onClick: () => void;
  tone?: "accent" | "danger";
};

function terasWizardSubjectDescription(subject: TerasWizardSubject) {
  return subject.detail ?? null;
}

export function TerasWizardModal({
  activeStepId,
  children,
  description,
  footer,
  kicker = "Wizard",
  onClose,
  onStepSelect,
  statusLabel,
  statusTone = "info",
  steps,
  subject,
  support,
  surfaceId,
  title,
}: {
  activeStepId: string;
  children: ReactNode;
  description?: ReactNode;
  footer: ReactNode;
  kicker?: string;
  onClose: () => void;
  onStepSelect?: (stepId: string) => void;
  statusLabel?: ReactNode;
  statusTone?: TerasTone;
  steps: TerasWizardStep[];
  subject: TerasWizardSubject;
  support?: ReactNode;
  surfaceId: string;
  title: ReactNode;
}) {
  if (process.env.NODE_ENV !== "production" && steps.length > 3) {
    throw new Error(
      `${surfaceId} has ${steps.length} wizard steps. Teras wizards must stay to two active steps plus optional result; move review sections into panels or dialogs.`,
    );
  }

  return (
    <TerasModalShell
      bodyLayout="fill"
      description={description}
      footer={footer}
      kicker={kicker}
      modalAttributes={{ "data-teras-active-step": activeStepId }}
      onClose={onClose}
      height="fill"
      surfaceId={surfaceId}
      title={title}
      width="large"
    >
      <TerasZoneLayout
        data-support={support ? "true" : "false"}
        data-teras-wizard-shell="true"
        variant="main-support"
      >
        <TerasZone fit="fill" spacing="compact">
          <TerasSelectedPanel
            description={terasWizardSubjectDescription(subject)}
            kicker={subject.eyebrow}
            selected
            status={{
              label: statusLabel,
              tone: statusTone,
            }}
            title={subject.title}
            tone={statusTone}
            variant="compact"
          />
          <TerasProgressStepList
            activeStepId={activeStepId}
            ariaLabel="Wizard steps"
            onSelectStep={onStepSelect}
            steps={steps}
          />
          <TerasContentRegion
            data-teras-wizard-body="true"
            fill
            scroll={false}
          >
            {children}
          </TerasContentRegion>
        </TerasZone>
        {support ? (
          <TerasZone fit="fill">
            {support}
          </TerasZone>
        ) : null}
      </TerasZoneLayout>
    </TerasModalShell>
  );
}

export function TerasWizardPanel({
  actions,
  children,
  description,
  fit = "fill",
  kicker,
  title,
  tone,
  treatment = "neutral",
}: {
  actions?: ReactNode;
  children: ReactNode;
  description?: ReactNode;
  fit?: "content" | "fill";
  kicker: string;
  title: ReactNode;
} & (
  | {
      tone?: never;
      treatment?: "neutral";
    }
  | {
      tone: TerasTone;
      treatment: "rail" | "state";
    }
)) {
  const appearance =
    treatment === "neutral"
      ? ({ treatment: "neutral" } as const)
      : ({ tone: tone as TerasTone, treatment } as const);

  return (
    <TerasPanel
      {...appearance}
      fit={fit}
      layout={fit === "content" ? undefined : "header-body"}
      overflow={fit === "content" ? "visible" : "hidden"}
      spacing="normal"
    >
      <TerasPanelHeader
        actions={actions}
        actionsLayout={actions ? "inline" : undefined}
        description={description}
        kicker={kicker}
        title={title}
      />
      {fit === "content" ? (
        children
      ) : (
        <TerasContentRegion fill scroll>
          {children}
        </TerasContentRegion>
      )}
    </TerasPanel>
  );
}

export function TerasWizardFooter({
  apply,
  back,
  finish,
  next,
}: {
  apply?: TerasWizardAction;
  back?: TerasWizardAction;
  finish?: TerasWizardAction;
  next?: TerasWizardAction;
}) {
  return (
    <TerasActionRow
      data-teras-wizard-footer="true"
      fill
      spacing="none"
    >
      {back ? <TerasWizardFooterButton action={back} fallbackEmphasis="secondary" /> : null}
      {next ? <TerasWizardFooterButton action={next} /> : null}
      {apply ? <TerasWizardFooterButton action={apply} /> : null}
      {finish ? <TerasWizardFooterButton action={finish} /> : null}
    </TerasActionRow>
  );
}

function TerasWizardFooterButton({
  action,
  fallbackEmphasis = "primary",
}: {
  action: TerasWizardAction;
  fallbackEmphasis?: TerasActionEmphasis;
}) {
  const tone = action.tone === "danger" ? "danger" : "accent";

  return (
    <TerasActionButton
      data-teras-wizard-action={
        action.dataAction ??
        (typeof action.label === "string" ? action.label : undefined)
      }
      disabled={action.disabled}
      onClick={action.onClick}
      tone={tone}
      emphasis={action.emphasis ?? fallbackEmphasis}
    >
      {action.label}
    </TerasActionButton>
  );
}
