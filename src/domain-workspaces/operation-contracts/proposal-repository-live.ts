export type ProposalRepositoryResolutionRecord = Readonly<{
  resolution_id: string;
  custody_request_id: string;
  receipt_ref: string;
  proposal_id: string;
  source_version: string;
  repository_request_ref: string;
  resolved_owner: string;
  resolved_repo_ref: string;
  recorded_at: string;
  notes: string;
  custody_receipt_ref: Readonly<{ uri: string; digest: string }>;
}>;

export type ProposalRepositoryResolutionIntent = Readonly<{
  proposalId: string;
  recordRef: string;
  recordVersion: string;
  custodyRequestId: string;
  custodyReceiptRef: Readonly<{ uri: string; digest: string }>;
  notes: string;
}>;

export type ProposalRepositoryGateRequest = Readonly<{
  proposalId: string;
  title: string;
  recordRef: string;
  recordVersion: string;
  resolution: ProposalRepositoryResolutionRecord | null;
  recovery: ProposalRepositoryResolutionRecord | null;
}>;
