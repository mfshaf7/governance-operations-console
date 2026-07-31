import { deliveryAttentionSource } from "../../domain-workspaces/delivery";
import { orchestrationAttentionSource } from "../../domain-workspaces/orchestration";
import { portfolioAttentionSource } from "../../domain-workspaces/portfolio";
import { proposalAttentionSource } from "../../domain-workspaces/proposal";
import { prototypeAttentionSource } from "../../domain-workspaces/prototype";
import { repositoryAttentionSource } from "../../domain-workspaces/repository";
import {
  devIntegrationAttentionSource,
  governedReleaseAttentionSource,
} from "../../environment-lifecycle";
import { lifecycleTransitionAttentionSource } from "../../lifecycle-transitions";

export const commandCenterAttentionSources = [
  proposalAttentionSource,
  repositoryAttentionSource,
  deliveryAttentionSource,
  prototypeAttentionSource,
  portfolioAttentionSource,
  orchestrationAttentionSource,
  lifecycleTransitionAttentionSource,
  devIntegrationAttentionSource,
  governedReleaseAttentionSource,
] as const;
