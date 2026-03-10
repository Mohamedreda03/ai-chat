"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type FileUIPart, type UIMessage } from "ai";
import {
  Fragment,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircleIcon,
  CopyIcon,
  DownloadIcon,
  EllipsisVerticalIcon,
  RefreshCcwIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  XIcon,
} from "lucide-react";
import { CONVERSATIONS_KEY } from "@/hooks/use-conversations";
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
import {
  ModelControl,
  type ModelSelectionValue,
} from "@/components/features/model-control";
import { usePersistedModel } from "@/hooks/use-persisted-model";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PromptInputAttachmentsDisplay = () => {
  const attachments = usePromptInputAttachments();
  if (attachments.files.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 px-1">
      {attachments.files.map((attachment) => {
        const isImage =
          attachment.type === "file" &&
          attachment.mediaType?.startsWith("image/");
        if (isImage) {
          return (
            <div
              key={attachment.id}
              className="relative size-14 shrink-0 overflow-hidden rounded-xl"
            >
              <img
                src={attachment.url}
                alt={attachment.filename ?? "Image"}
                className="size-full object-cover"
              />
              <button
                type="button"
                onClick={() => attachments.remove(attachment.id)}
                className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-black/60"
                aria-label="Remove"
              >
                <XIcon className="size-2.5 text-white" />
              </button>
            </div>
          );
        }
        return (
          <Attachments key={attachment.id} variant="inline">
            <Attachment
              data={attachment}
              onRemove={() => attachments.remove(attachment.id)}
            >
              <AttachmentPreview />
              <AttachmentRemove />
            </Attachment>
          </Attachments>
        );
      })}
    </div>
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
  initialError?: string | null;
}

// Isolated component so useSearchParams is inside a Suspense boundary
function InitialQuerySender({
  conversationId,
  onSend,
}: {
  conversationId: string;
  onSend: (text: string, files?: FileUIPart[]) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Guard against React StrictMode double-invocation in development
  const hasSent = useRef(false);

  useEffect(() => {
    if (hasSent.current) return;
    const q = searchParams.get("q");
    const pendingKey = `pending-files-${conversationId}`;
    let files: FileUIPart[] = [];
    try {
      const saved = sessionStorage.getItem(pendingKey);
      if (saved) {
        files = JSON.parse(saved) as FileUIPart[];
        sessionStorage.removeItem(pendingKey);
      }
    } catch {
      // sessionStorage not available
    }
    if (q || files.length > 0) {
      hasSent.current = true;
      onSend(q ?? "", files);
      router.replace(`/chat/${conversationId}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

function getErrorMessage(err: Error): string {
  // The API route now returns JSON { error: string } – parse it
  let msg = err.message;
  try {
    const parsed = JSON.parse(msg) as { error?: string };
    if (parsed?.error) msg = parsed.error;
  } catch {
    // plain text message, use as-is
  }
  const lower = msg.toLowerCase();
  if (
    lower.includes("rate limit") ||
    lower.includes("429") ||
    lower.includes("too many requests")
  ) {
    return "Rate limit reached. Please wait a moment and try again.";
  }
  if (
    lower.includes("401") ||
    lower.includes("unauthorized") ||
    lower.includes("invalid api key") ||
    lower.includes("authentication")
  ) {
    return "Invalid API key. Please check your credentials in Settings.";
  }
  if (lower.includes("403") || lower.includes("forbidden")) {
    return "Access denied. You may not have permission to use this model.";
  }
  if (
    lower.includes("quota") ||
    lower.includes("billing") ||
    lower.includes("insufficient_quota")
  ) {
    return "API quota exceeded. Please check your billing details with your AI provider.";
  }
  if (
    lower.includes("context length") ||
    lower.includes("context window") ||
    lower.includes("maximum context")
  ) {
    return "The conversation is too long for this model's context window.";
  }
  if (
    lower.includes("model not found") ||
    lower.includes("model does not exist") ||
    lower.includes("404")
  ) {
    return "The selected model is not available. Please verify your model selection.";
  }
  if (
    lower.includes("network") ||
    lower.includes("fetch") ||
    lower.includes("connection")
  ) {
    return "Network error. Please check your connection and try again.";
  }
  return msg || "Something went wrong. Please try again.";
}

export function ChatInterface({
  conversationId,
  initialMessages,
  initialModel,
  initialError = null,
}: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const { selectedModel, setSelectedModel } = usePersistedModel(initialModel);
  const queryClient = useQueryClient();

  // Persisted error: initialised from DB, kept in sync with DB on errors/retries
  const [persistedError, setPersistedError] = useState<string | null>(
    initialError,
  );

  const saveError = (message: string) => {
    setPersistedError(message);
    fetch(`/api/conversations/${conversationId}/error`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    }).catch(() => {});
  };

  const clearError = () => {
    setPersistedError(null);
    fetch(`/api/conversations/${conversationId}/error`, {
      method: "DELETE",
    }).catch(() => {});
  };

  // Keep a ref so the transport body function always reads the latest model
  const selectedModelRef = useRef(selectedModel);
  selectedModelRef.current = selectedModel;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        body: () => ({
          conversationId,
          credentialId: selectedModelRef.current?.credentialId,
          modelId: selectedModelRef.current?.modelId,
          modelLabel: selectedModelRef.current?.modelLabel,
        }),
      }),
    [conversationId],
  );

  const { messages, sendMessage, status, stop, regenerate, error } = useChat({
    messages: initialMessages,
    transport,
    onError: (err) => {
      const msg = getErrorMessage(err);
      saveError(msg);
    },
    onFinish: () => {
      // Clear persisted error on successful response
      clearError();
      // Refresh sidebar title after a short delay (server needs time to save title)
      setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
      }, 1500);
    },
  });

  const isStreaming = status === "streaming";

  // Send initial query from URL (e.g. from landing page hero input)
  // Wrapped in Suspense because useSearchParams() requires it in App Router

  /** Upload files (data/blob URLs) to the server, return FileUIParts with /uploads URLs */
  const uploadFiles = async (files: FileUIPart[]): Promise<FileUIPart[]> => {
    return Promise.all(
      files.map(async (file) => {
        // Already a server URL — skip
        if (file.url.startsWith("/uploads/")) return file;
        try {
          const response = await fetch(file.url);
          const blob = await response.blob();
          const form = new FormData();
          form.append(
            "file",
            new File([blob], file.filename ?? "file", { type: file.mediaType }),
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
  };

  const handleSubmit = async (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);
    if (!(hasText || hasAttachments) || !selectedModel) return;
    clearError();
    const filesToSend = message.files?.length
      ? await uploadFiles(message.files)
      : [];
    sendMessage({
      text: message.text || "Sent with attachments",
      files: filesToSend,
    });
    setInput("");
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const handleExport = () => {
    const lines: string[] = [];
    lines.push(`# Conversation Export`);
    lines.push(`\n_Exported on ${new Date().toLocaleDateString()}_`);
    lines.push(`\n---`);
    for (const message of messages) {
      const role = message.role === "user" ? "**You**" : "**Assistant**";
      lines.push(`\n### ${role}\n`);
      for (const part of message.parts) {
        if (part.type === "text") {
          lines.push(part.text);
        } else if (part.type === "reasoning") {
          lines.push(
            `\n<details>\n<summary>Reasoning</summary>\n\n${part.text}\n</details>`,
          );
        }
      }
    }
    const content = lines.join("\n");
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `conversation-${conversationId}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full flex-col bg-background pt-14 md:pt-0">
      {/* Top-right action menu */}
      <div className="absolute right-8 top-3 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Conversation options"
              className="flex size-8 items-center justify-center rounded-lg border bg-background/80 text-foreground/60 shadow-sm backdrop-blur transition-colors hover:text-foreground"
            >
              <EllipsisVerticalIcon className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={handleExport}
              disabled={messages.length === 0}
            >
              <DownloadIcon className="mr-2 size-4" />
              Export as Markdown
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Reads ?q= from URL and sends the initial message; must be in Suspense */}
      <Suspense fallback={null}>
        <InitialQuerySender
          conversationId={conversationId}
          onSend={(text, files) => {
            if (messages.length === 0 && selectedModel)
              sendMessage({
                text: text || (files?.length ? "Sent with attachments" : ""),
                files,
              });
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
            messages.map((message) => {
              // Collect image parts to render together in a grid
              const imageParts = message.parts
                .map((p, idx) => ({ p, idx }))
                .filter(
                  ({ p }) =>
                    p.type === "file" &&
                    "mediaType" in p &&
                    (p as { mediaType?: string }).mediaType?.startsWith(
                      "image/",
                    ),
                );
              const imageIdxSet = new Set(imageParts.map(({ idx }) => idx));
              const cols =
                imageParts.length === 1
                  ? "grid-cols-1"
                  : imageParts.length === 2
                    ? "grid-cols-2"
                    : imageParts.length === 4
                      ? "grid-cols-2"
                      : "grid-cols-3";

              const firstNonImageIndex = message.parts.findIndex(
                (_, idx) => !imageIdxSet.has(idx),
              );

              return (
                <div key={message.id} dir="auto">
                  {/* Render all images in a grid */}
                  {imageParts.length > 0 && (
                    <Message from={message.role}>
                      <div
                        className={`grid gap-1.5 ${cols} ${
                          imageParts.length === 1 ? "max-w-xs" : "max-w-xs"
                        }`}
                      >
                        {imageParts.map(({ p, idx }) => {
                          const fp = p as {
                            url: string;
                            filename?: string;
                          };
                          return (
                            <img
                              key={`${message.id}-${idx}`}
                              src={fp.url}
                              alt={fp.filename ?? "Image"}
                              className="aspect-square w-full rounded-xl object-cover"
                            />
                          );
                        })}
                      </div>
                    </Message>
                  )}

                  {message.parts.map((part, i) => {
                    if (imageIdxSet.has(i)) return null;
                    switch (part.type) {
                      case "file": {
                        const attachment = {
                          id: `${message.id}-${i}`,
                          type: "file" as const,
                          url: part.url,
                          mediaType: part.mediaType,
                          filename: part.filename,
                        };
                        return (
                          <Message
                            key={`${message.id}-${i}`}
                            from={message.role}
                            className={
                              firstNonImageIndex === i ? "mt-3" : undefined
                            }
                          >
                            <MessageContent>
                              <Attachments variant="inline">
                                <Attachment data={attachment}>
                                  <AttachmentPreview />
                                </Attachment>
                              </Attachments>
                            </MessageContent>
                          </Message>
                        );
                      }
                      case "text":
                        return (
                          <Fragment key={`${message.id}-${i}`}>
                            <Message
                              from={message.role}
                              className={
                                firstNonImageIndex === i ? "mt-3" : undefined
                              }
                            >
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
              );
            })
          )}
          {(status === "submitted" || status === "streaming") &&
            messages[messages.length - 1]?.role !== "assistant" && (
              <Message from="assistant">
                <MessageContent>
                  <Shimmer>Thinking...</Shimmer>
                </MessageContent>
              </Message>
            )}

          {persistedError &&
            status !== "streaming" &&
            status !== "submitted" && (
              <div className="mb-4 flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3.5">
                <AlertCircleIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-destructive">
                    Error
                  </p>
                  <p className="mt-0.5 text-sm text-destructive/80">
                    {persistedError}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => regenerate()}
                    className="flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-background px-2.5 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <RefreshCcwIcon className="size-3" />
                    Retry
                  </button>
                  <button
                    onClick={clearError}
                    className="flex items-center justify-center size-6 rounded-md text-destructive/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Dismiss error"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="mx-auto w-full max-w-4xl px-3 pb-3 sm:px-4 sm:pb-4">
        <PromptInput
          onSubmit={handleSubmit}
          globalDrop
          multiple
          inputGroupClassName="rounded-[20px] sm:rounded-[24px]"
        >
          <PromptInputAttachmentHeader />
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
