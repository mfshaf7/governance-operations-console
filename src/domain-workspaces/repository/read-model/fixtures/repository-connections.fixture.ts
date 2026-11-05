import type { RepositoryConnections } from "../../live-runtime/repository-connections.ts";
import type {RepositoryProviderLookup} from "../../live-runtime/repository-provider-lookup.ts";

export const repositoryLinkPreviewFixture: RepositoryProviderLookup = {
  schema_version: 1, provider: "github", provider_host: "github.com", provider_repository_id: "999999999",
  owner: "example-company", name: "sample-project", canonical_url: "https://github.com/example-company/sample-project",
  visibility: "private", provider_lifecycle_state: "active", observed_at: "2026-11-05T00:00:00Z",
};

// Form examples for explicitly disconnected preview only. These references
// carry no credential or provider authority and cannot authorize submission.
export const repositoryConnectionsFixture: RepositoryConnections = {
  schema_version: 1,
  default_connection_id: "github:example-company",
  connections: [
    { account: "example-company", account_type: "organization", account_id: "22" },
    { account: "example-personal", account_type: "personal", account_id: "11" },
  ].map(item => ({
    ...item,
    account_type: item.account_type as "organization" | "personal",
    id: `github:${item.account}`,
    capabilities: { metadata: false, provisioning: true, lifecycle: false },
    credential_bindings: { provisioning: {
      uri: `fixture://repository-connections/${item.account}/provisioning`,
      digest: `sha256:${"0".repeat(64)}`,
    } },
  })),
};
