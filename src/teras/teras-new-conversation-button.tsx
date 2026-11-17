"use client";

import { MessageSquarePlus } from "lucide-react";
import { TerasActionButton } from "./teras-action";

export function TerasNewConversationButton({ disabled, onClick }: {
  disabled: boolean;
  onClick: () => void;
}) {
  return <TerasActionButton emphasis="secondary" size="table-compact"
    aria-label="New conversation" title="New conversation"
    disabled={disabled} onClick={onClick}>
    <MessageSquarePlus size={14} aria-hidden="true" />
  </TerasActionButton>;
}
