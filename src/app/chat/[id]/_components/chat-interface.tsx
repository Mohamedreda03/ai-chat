"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Fragment, Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircleIcon,
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

  const { messages, sendMessage, status, stop, regenerate, error } = useChat({
    messages: initialMessages,
    transport,
  });

  const isStreaming = status === "streaming";

  const getErrorMessage = (err: Error): string => {
    const msg = err.message.toLowerCase();
    if (msg.includes("rate limit") || msg.includes("429") || msg.includes("too many requests")) {
      return "Rate limit reached. Please wait a moment and try again.";
    }
    if (msg.includes("401") || msg.includes("unauthorized") || msg.includes("invalid api key") || msg.includes("authentication")) {
      return "Invalid API key. Please check your credentials in Models & Keys.";
    }
    if (msg.includes("403") || msg.includes("forbidden")) {
      return "Access denied. You may not have permission to use this model.";
    }
    if (msg.includes("quota") || msg.includes("billing") || msg.includes("insufficient_quota")) {
      return "API quota exceeded. Please check your billing details with your AI provider.";
    }
    if (msg.includes("context length") || msg.includes("context window") || msg.includes("maximum context")) {
      return "The conversation is too long for this model's context window.";
    }
    if (msg.includes("model not found") || msg.includes("model does not exist") || msg.includes("404")) {
      return "The selected model is not available. Please verify your model selection.";
    }
    if (msg.includes("network") || msg.includes("fetch") || msg.includes("connection")) {
      return "Network error. Please check your connection and try again.";
    }
    return err.message || "Something went wrong. Please try again.";
  };

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
    <div className="flex h-full flex-col bg-background pt-14 md:pt-0">
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
        <ConversationContent className="mx-auto w-full max-w-4xl px-3 sm:px-4">
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

          {error && status !== "streaming" && status !== "submitted" && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3.5">
              <AlertCircleIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-destructive">Error</p>
                <p className="mt-0.5 text-sm text-destructive/80">{getErrorMessage(error)}</p>
              </div>
              <button
                onClick={() => regenerate()}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-destructive/30 bg-background px-2.5 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
              >
                <RefreshCcwIcon className="size-3" />
                Retry
              </button>
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="mx-auto w-full max-w-4xl px-3 pb-3 sm:px-4 sm:pb-4">
        <ModelControl
          value={selectedModel}
          onChange={setSelectedModel}
          className="mb-2"
        />
        <PromptInput
          onSubmit={handleSubmit}
          globalDrop
          multiple
          inputGroupClassName="rounded-[20px] sm:rounded-[50px]"
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
              className="min-h-9 text-base sm:text-[17px]"
            />
            <PromptInputSubmit
              status={status}
              disabled={!selectedModel}
              onStop={stop}
              className="shrink-0 size-9 rounded-full"
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
