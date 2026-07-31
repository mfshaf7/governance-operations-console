import type { RuntimeComponentObservation } from "../model/runtime-readiness-model";

const catalogSource = {
  alertEligible: false,
  environment: "dev-integration" as const,
  freshness: "unavailable" as const,
  observedAt: null,
  sourceAuthority: "Prototype component catalog",
  sourceMode: "unavailable" as const,
  sourceRef: "runtime-readiness.fixture",
  status: "unobserved",
  tone: "muted" as const,
};

export const runtimeReadinessFixture = {
  componentObservations: [
    {
      ...catalogSource,
      href: "http://127.0.0.1:32083/",
      id: "openproject",
      label: "OpenProject",
      surface: "127.0.0.1:32083",
    },
    {
      ...catalogSource,
      href: "http://127.0.0.1:32080/",
      id: "grafana",
      label: "Grafana",
      surface: "127.0.0.1:32080",
    },
    {
      ...catalogSource,
      href: null,
      id: "prometheus",
      label: "Prometheus",
      surface: "10.43.122.83:9090",
    },
    {
      ...catalogSource,
      href: null,
      id: "headlamp",
      label: "Headlamp",
      surface: "no declared route",
    },
    {
      ...catalogSource,
      href: null,
      id: "wgcf-api",
      label: "WGCF API",
      surface: "10.43.86.50:8080",
    },
    {
      ...catalogSource,
      href: null,
      id: "cgg-api",
      label: "CGG API",
      surface: "10.43.227.159:8080",
    },
    {
      ...catalogSource,
      href: null,
      id: "oos-api",
      label: "OOS API",
      surface: "10.43.201.23:8080",
    },
    {
      ...catalogSource,
      href: null,
      id: "devint-access",
      label: "Devint Access",
      surface: "profile runner only",
    },
    {
      ...catalogSource,
      href: "https://127.0.0.1:32082/",
      id: "argo-cd",
      label: "Argo CD",
      surface: "127.0.0.1:32082",
    },
    {
      ...catalogSource,
      href: "http://127.0.0.1:32200/ui/",
      id: "vault",
      label: "Vault",
      surface: "127.0.0.1:32200/ui",
    },
    {
      ...catalogSource,
      href: "http://10.43.47.111:9001/",
      id: "minio",
      label: "MinIO",
      surface: "10.43.47.111:9001",
    },
    {
      ...catalogSource,
      href: null,
      id: "openclaw-dashboard",
      label: "OpenClaw Dashboard",
      surface: "no declared route",
    },
  ],
} satisfies { componentObservations: RuntimeComponentObservation[] };
