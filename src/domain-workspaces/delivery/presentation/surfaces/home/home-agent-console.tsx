"use client";

import { useEffect, useMemo, useState } from "react";
import { GovernedAdvisorPanel, type AgentRuntimeIdentity } from "@/agent-console";
import { deliveryHomeAdvisorContext } from "./home-agent-model.ts";
import type { DeliveryReadModel } from "../../../read-model/index.ts";

const identity: AgentRuntimeIdentity = {
  runtimeId: "delivery-home-advisor", displayName: "Delivery advisor", ownerSurface: "Delivery Home",
  callerId: "governance-operations-console", sourceAuthority: "governance-operations-console",
  sourceRef: "console://delivery/home",
};

export function DeliveryHomeAgentConsole({ model }: { model: DeliveryReadModel }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 15_000); return () => clearInterval(timer); }, []);
  const context = useMemo(() => deliveryHomeAdvisorContext(model, now), [model, now]);
  return <GovernedAdvisorPanel title="Delivery advisor" identity={identity} context={context} />;
}
