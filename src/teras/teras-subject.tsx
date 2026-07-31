"use client";

import type { ReactNode } from "react";

import styles from "./teras-patterns.module.css";
import { TerasMetadataList, type TerasMetadataItem } from "./teras-metadata";
import type { TerasSubjectSummary } from "./teras-types";
import { cx } from "./teras-utils";

type TerasSubjectCardFact = {
  label: ReactNode;
  value: ReactNode;
};

export function TerasSectionTitle({
  className,
  detail,
  kicker,
  title,
}: {
  className?: string;
  detail?: ReactNode;
  kicker: ReactNode;
  title: ReactNode;
}) {
  return (
    <div className={className} data-teras-section-title="true">
      <span>{kicker}</span>
      <strong>{title}</strong>
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}

export function TerasInspectionSection({
  children,
  className,
  title,
}: {
  children: ReactNode;
  className?: string;
  title: ReactNode;
}) {
  return (
    <section className={cx(styles.terasInspectionSection, className)}>
      <p className={styles.terasInspectionSectionTitle}>{title}</p>
      {children}
    </section>
  );
}

export function TerasSubjectCard({
  actions,
  className,
  description,
  facts,
  kicker,
  title,
}: {
  actions?: ReactNode;
  className?: string;
  description?: ReactNode;
  facts?: TerasSubjectCardFact[];
  kicker: ReactNode;
  title: ReactNode;
}) {
  return (
    <div
      className={cx(styles.terasSubjectCard, className)}
      data-has-actions={actions ? "true" : undefined}
      data-teras-subject-card="true"
    >
      <span>{kicker}</span>
      <strong>{title}</strong>
      {description ? <p>{description}</p> : null}
      {actions ? (
        <div className={styles.terasSubjectCardActions}>{actions}</div>
      ) : null}
      {facts?.map((fact, index) => (
        <div key={typeof fact.label === "string" ? fact.label : index}>
          <small>{fact.label}</small>
          <b>{fact.value}</b>
        </div>
      ))}
    </div>
  );
}

export function TerasSubjectHero({
  actionDetail,
  actionLabel,
  onAction,
  subject,
}: {
  actionDetail: ReactNode;
  actionLabel: ReactNode;
  onAction: () => void;
  subject: TerasSubjectSummary & {
    meta?: TerasMetadataItem[];
  };
}) {
  return (
    <div className={styles.terasSubjectHero}>
      <div>
        {subject.eyebrow ? <span>{subject.eyebrow}</span> : null}
        <strong>{subject.title}</strong>
        {subject.detail ? <small>{subject.detail}</small> : null}
        {subject.meta?.length ? (
          <TerasMetadataList
            className={styles.terasSubjectHeroMeta}
            items={subject.meta}
            shape="line"
            treatment="chip"
            wrap
          />
        ) : null}
      </div>
      <button
        className={styles.terasSubjectHeroAction}
        onClick={onAction}
        type="button"
      >
        <span>{actionLabel}</span>
        <small>{actionDetail}</small>
      </button>
    </div>
  );
}
