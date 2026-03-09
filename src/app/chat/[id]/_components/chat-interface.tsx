"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Fragment, Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CopyIcon,
  RefreshCcwIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
} from "lucide-react";
import { Logo } from "@/components/logo";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
  MessageToolbar,
} from "@/components/ai-elements/message";
import {
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from "@/components/ai-elements/attachments";
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
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { ModelControl, type ModelSelectionValue } from "@/components/features/model-control";
import { usePersistedModel } from "@/hooks/use-persisted-model";

const PromptInputAttachmentsDisplay = () => {
  const attachments = usePromptInputAttachments();
  if (attachments.files.length === 0) return null;
  return (
    <Attachments variant="inline">
      {attachments.files.map((attachment) => (
        <Attachment
          data={attachment}
          key={attachment.id}
          onRemove={() => attachments.remove(attachment.id)}
        >
          <AttachmentPreview />
          <AttachmentRemove />
        </Attachment>
      ))}
    </Attachments>
  );
};

const PromptInputAttachmentHeader = () => {
  const attachments = usePromptInputAttachments();
  if (attachments.files.length === 0) return null;
  return (
    <PromptInputHeader>
      <PromptInputAttachmentsDisplay />
    </PromptInputHeader>
  );
};

interface ChatInterfaceProps {
  conversationId: string;
  initialMessages: UIMessage[];
  initialModel: ModelSelectionValue | null;
}

// Isolated component so useSearchParams is inside a Suspense boundary
function InitialQuerySender({
  conversationId,
  onSend,
}: {
  conversationId: string;
  onSend: (text: string) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      onSend(q);
      router.replace(`/chat/${conversationId}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export function ChatInterface({
  conversationId,
  initialMessages,
  initialModel,
}: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const { selectedModel, setSelectedModel } = usePersistedModel(initialModel);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        body: {
          conversationId,
          credentialId: selectedModel?.credentialId,
          modelId: selectedModel?.modelId,
          modelLabel: selectedModel?.modelLabel,
        },
      }),
    [conversationId, selectedModel],
  );

  const { messages, sendMessage, status, stop, regenerate } = useChat({
    messages: initialMessages,
    transport,
  });

  const isStreaming = status === "streaming";

  // Send initial query from URL (e.g. from landing page hero input)
  // Wrapped in Suspense because useSearchParams() requires it in App Router

  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);
    if (!(hasText || hasAttachments) || !selectedModel) return;
    sendMessage({
      text: message.text || "Sent with attachments",
      files: message.files,
    });
    setInput("");
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Reads ?q= from URL and sends the initial message; must be in Suspense */}
      <Suspense fallback={null}>
        <InitialQuerySender
          conversationId={conversationId}
          onSend={(text) => {
            if (messages.length === 0 && selectedModel) sendMessage({ text });
          }}
        />
      </Suspense>
      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="mx-auto w-full max-w-4xl px-4">
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={<Logo className="size-16 text-muted-foreground/30" />}
              title="How can I help you today?"
              description="Send a message to get started"
            />
          ) : (
            messages.map((message) => (
              <div key={message.id} dir="auto">
                {message.parts.map((part, i) => {
                  switch (part.type) {
                    case "text":
                      return (
                        <Fragment key={`${message.id}-${i}`}>
                          <Message from={message.role}>
                            <MessageContent>
                              <MessageResponse>{part.text}</MessageResponse>
                            </MessageContent>
                          </Message>
                          {message.role === "assistant" && (
                            <MessageToolbar>
                              <MessageActions>
                                <MessageAction
                                  tooltip="Copy"
                                  onClick={() => handleCopy(part.text)}
                                >
                                  <CopyIcon className="size-4" />
                                </MessageAction>
                                <MessageAction tooltip="Good response">
                                  <ThumbsUpIcon className="size-4" />
                                </MessageAction>
                                <MessageAction tooltip="Bad response">
                                  <ThumbsDownIcon className="size-4" />
                                </MessageAction>
                                <MessageAction
                                  tooltip="Regenerate"
                                  onClick={() => regenerate()}
                                >
                                  <RefreshCcwIcon className="size-4" />
                                </MessageAction>
                              </MessageActions>
                            </MessageToolbar>
                          )}
                        </Fragment>
                      );
                    case "reasoning":
                      return (
                        <Reasoning
                          key={`${message.id}-${i}`}
                          isStreaming={
                            isStreaming &&
                            message.id === messages[messages.length - 1]?.id
                          }
                        >
                          <ReasoningTrigger />
                          <ReasoningContent>{part.text}</ReasoningContent>
                        </Reasoning>
                      );
                    default:
                      return null;
                  }
                })}
              </div>
            ))
          )}
          {(status === "submitted" || status === "streaming") &&
            messages[messages.length - 1]?.role !== "assistant" && (
              <Message from="assistant">
                <MessageContent>
                  <Shimmer>Thinking...</Shimmer>
                </MessageContent>
              </Message>
            )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="mx-auto w-full max-w-4xl px-4 pb-4">
        <ModelControl
          value={selectedModel}
          onChange={setSelectedModel}
          className="mb-2"
        />
        <PromptInput
          onSubmit={handleSubmit}
          globalDrop
          multiple
          inputGroupClassName="rounded-[50px]"
        >
          <PromptInputAttachmentHeader />
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
              status={status}
              disabled={!selectedModel}
              onStop={stop}
              className="rounded-full shrink-0 size-9"
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
