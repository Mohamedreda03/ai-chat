"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from "@/components/ai-elements/conversation";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";

export default function NewChatPage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (message: PromptInputMessage) => {
    const text = message.text?.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      });
      const conv = await res.json();
      router.push(`/chat/${conv.id}?q=${encodeURIComponent(text)}`);
    } catch {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-background">
      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="mx-auto w-full max-w-4xl px-4">
          <ConversationEmptyState
            icon={<Logo className="size-16 text-muted-foreground/30" />}
            title=""
            description=""
          />
        </ConversationContent>
      </Conversation>

      <div className="mx-auto w-full max-w-4xl px-4 pb-4">
        <PromptInput
          onSubmit={handleSubmit}
          inputGroupClassName="rounded-[50px]"
        >
          <PromptInputFooter className="items-center px-3 py-3">
            <PromptInputTools>
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger />
                <PromptInputActionMenuContent>
                  <PromptInputActionAddAttachments />
                </PromptInputActionMenuContent>
              </PromptInputActionMenu>
            </PromptInputTools>
            <PromptInputTextarea
              dir="auto"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="min-h-9 text-[17px]"
            />
            <PromptInputSubmit
              status={sending ? "submitted" : undefined}
              className="shrink-0 size-9 rounded-full"
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
