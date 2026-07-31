"use client";

import type { FormEvent } from "react";
import { useState } from "react";

import { TerasAdvisorPanel } from "@/teras";

import {
  deliveryHomeAgentResponse,
  type DeliveryHomeAgentTranscriptLine,
  type DeliveryHomeViewModel,
} from "./home-view-model.ts";

export function DeliveryHomeAgentConsole({
  viewModel,
}: {
  viewModel: DeliveryHomeViewModel;
}) {
  const [homeAgentPrompt, setHomeAgentPrompt] = useState("");
  const [homeAgentTurns, setHomeAgentTurns] = useState<
    DeliveryHomeAgentTranscriptLine[]
  >([]);
  const homeAgentTranscript = [
    ...viewModel.agentConsole.transcript,
    ...homeAgentTurns,
  ];

  function submitHomeAgentPrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const prompt = homeAgentPrompt.trim();
    if (!prompt) {
      return;
    }

    const turnId = Date.now();
    setHomeAgentTurns((current) => [
      ...current,
      {
        id: `delivery-home-agent-operator-${turnId}`,
        role: "operator",
        text: prompt,
      },
      {
        id: `delivery-home-agent-response-${turnId}`,
        role: "advisor",
        text: deliveryHomeAgentResponse({ prompt, viewModel }),
      },
    ]);
    setHomeAgentPrompt("");
  }

  return (
    <TerasAdvisorPanel
      density="compact"
      fill
      profileLabel={viewModel.agentConsole.profileLabel}
      prompt={{
        ariaLabel: "Delivery Home agent prompt",
        onChange: setHomeAgentPrompt,
        onSubmit: submitHomeAgentPrompt,
        placeholder: "Ask about Delivery Home...",
        rows: 1,
        value: homeAgentPrompt,
      }}
      statusLabel={viewModel.agentConsole.statusLabel}
      statusTitle={viewModel.agentConsole.statusTitle}
      statusTone={viewModel.agentConsole.statusTone}
      transcript={homeAgentTranscript}
    />
  );
}
