"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FileUIPart } from "ai";
import { Logo } from "@/components/logo";
import { ModelControl } from "@/components/features/model-control";
import { usePersistedModel } from "@/hooks/use-persisted-model";

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
  PromptInputHeader,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input";
import {
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from "@/components/ai-elements/attachments";

// Shows attached files above the textarea
const AttachmentHeader = () => {
  const attachments = usePromptInputAttachments();
  if (attachments.files.length === 0) return null;
  return (
    <PromptInputHeader>
      <Attachments variant="inline">
        {attachments.files.map((f) => (
          <Attachment
            key={f.id}
            data={f}
            onRemove={() => attachments.remove(f.id)}
          >
            <AttachmentPreview />
            <AttachmentRemove />
          </Attachment>
        ))}
      </Attachments>
    </PromptInputHeader>
  );
};

export default function NewChatPage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const { selectedModel, setSelectedModel } = usePersistedModel();

  const handleSubmit = async (message: PromptInputMessage) => {
    const text = message.text?.trim() ?? "";
    const hasFiles = (message.files?.length ?? 0) > 0;
    if ((!text && !hasFiles) || sending || !selectedModel) return;
    setSending(true);
    try {
      // Upload files to server first so their URLs survive the navigation
      let uploadedFiles: FileUIPart[] = [];
      if (message.files?.length) {
        uploadedFiles = await Promise.all(
          message.files.map(async (file) => {
            if (file.url.startsWith("/uploads/")) return file;
            try {
              const blob = await fetch(file.url).then((r) => r.blob());
              const form = new FormData();
              form.append(
                "file",
                new File([blob], file.filename ?? "file", {
                  type: file.mediaType,
                }),
              );
              const res = await fetch("/api/upload", {
                method: "POST",
                body: form,
              });
              if (!res.ok) return file;
              const data = (await res.json()) as {
                url: string;
                filename: string;
                mediaType: string;
              };
              return {
                type: "file" as const,
                url: data.url,
                filename: data.filename,
                mediaType: data.mediaType,
              };
            } catch {
              return file;
            }
          }),
        );
      }

      const res = await fetch("/api/conversations", {
        method: "POST",
        body: JSON.stringify({
          credentialId: selectedModel.credentialId,
          modelId: selectedModel.modelId,
          modelLabel: selectedModel.modelLabel,
        }),
        headers: { "Content-Type": "application/json" },
      });
      const conv = await res.json();

      // Store uploaded files in sessionStorage — chat-interface will pick them up
      if (uploadedFiles.length > 0) {
        try {
          sessionStorage.setItem(
            `pending-files-${conv.id}`,
            JSON.stringify(uploadedFiles),
          );
        } catch {
          // sessionStorage not available
        }
      }

      const qs = text ? `?q=${encodeURIComponent(text)}` : "";
      router.push(`/chat/${conv.id}${qs}`);
    } catch {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-background pt-14 md:pt-0">
      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="mx-auto w-full max-w-4xl px-3 sm:px-4">
          <ConversationEmptyState
            icon={<Logo className="size-16 text-muted-foreground/30" />}
            title=""
            description=""
          />
        </ConversationContent>
      </Conversation>

      <div className="mx-auto w-full max-w-4xl px-3 pb-3 sm:px-4 sm:pb-4">
        <PromptInput
          onSubmit={handleSubmit}
          multiple
          globalDrop
          inputGroupClassName="rounded-[20px] sm:rounded-[24px]"
        >
          <AttachmentHeader />
          <PromptInputTextarea
            dir="auto"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="min-h-9 px-3 pt-3 text-base sm:text-[17px]"
          />
          <PromptInputFooter className="items-center px-2 py-2">
            <PromptInputTools>
              <ModelControl value={selectedModel} onChange={setSelectedModel} />
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger />
                <PromptInputActionMenuContent>
                  <PromptInputActionAddAttachments />
                </PromptInputActionMenuContent>
              </PromptInputActionMenu>
            </PromptInputTools>
            <PromptInputSubmit
              status={sending ? "submitted" : undefined}
              disabled={!selectedModel}
              className="shrink-0 size-9 rounded-full"
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
