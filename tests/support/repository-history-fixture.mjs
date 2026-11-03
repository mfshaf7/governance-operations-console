// Isolated protocol examples only; never a fallback for an owner read.
export function providerLookupFor(result, state = 'active') {
  const readback = result.provider_readback;
  return { schema_version: 1, provider: 'github', provider_host: 'github.com',
    provider_repository_id: readback.repository_identity.provider_repository_id,
    owner: readback.canonical_owner, name: readback.canonical_name, canonical_url: readback.canonical_url,
    visibility: readback.visibility, provider_lifecycle_state: state, observed_at: '2026-06-21T11:00:00Z' };
}
export function lifecycleAuditFor(result, state = 'active') {
  return { artifact_type: 'repository_lifecycle_audit', audit_id: `repository-lifecycle-audit:github:${result.provider_readback.repository_identity.provider_repository_id}`,
    current_state: { custody_state: 'provisioned', custody_version: 'recorded-custody-v1', provider_lifecycle_state: state,
      provider_version: 'recorded-provider-v1', workspace_owner_ref: result.request.requested_custody.workspace_owner_ref, workspace_record_state: 'active' },
    history: [], impact_summary: { blocker_disposition: null, blocking_finding_count: 0, finding_count: 0, latest_assessment_ref: null },
    integrity: { algorithm: 'sha256', canonicalization: 'RFC8785', content_digest: `sha256:${'a'.repeat(64)}` },
    latest_terminal_receipt_ref: null, mutation: false, projected_at: '2026-06-20T08:00:00Z',
    repository_identity: result.provider_readback.repository_identity, schema_version: 1, source_authority: 'operator-orchestration-service' };
}
