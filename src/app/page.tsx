"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRightIcon } from "lucide-react";
import type { FileUIPart } from "ai";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";
import { ModelControl } from "@/components/features/model-control";
import { usePersistedModel } from "@/hooks/use-persisted-model";
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

// Landing page for the AI Chat application

// Shows attached files above the textarea
const AttachmentHeader = () => {
  const attachments = usePromptInputAttachments();
  if (attachments.files.length === 0) return null;
  return (
    <PromptInputHeader>
      <div className="flex flex-wrap gap-1.5 px-1">
        {attachments.files.map((f) => {
          const isImage =
            f.type === "file" && f.mediaType?.startsWith("image/");
          if (isImage) {
            return (
              <div
                key={f.id}
                className="relative size-14 shrink-0 overflow-hidden rounded-xl"
              >
                <img
                  src={f.url}
                  alt={f.filename ?? "Image"}
                  className="size-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => attachments.remove(f.id)}
                  className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-black/60"
                  aria-label="Remove"
                >
                  <XIcon className="size-2.5 text-white" />
                </button>
              </div>
            );
          }
          return (
            <Attachments key={f.id} variant="inline">
              <Attachment data={f} onRemove={() => attachments.remove(f.id)}>
                <AttachmentPreview />
                <AttachmentRemove />
              </Attachment>
            </Attachments>
          );
        })}
      </div>
    </PromptInputHeader>
  );
};

export default function HomePage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const { selectedModel, setSelectedModel } = usePersistedModel();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSubmit = async (message: PromptInputMessage) => {
    const text = message.text?.trim() ?? "";
    const hasFiles = (message.files?.length ?? 0) > 0;
    if ((!text && !hasFiles) || sending) return;

    // If no model selected and no files, just navigate to /chat
    if (!text && !hasFiles) {
      router.push("/chat");
      return;
    }
    if (!selectedModel && !hasFiles) {
      router.push("/chat");
      return;
    }
    if (!selectedModel) return;

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
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-200",
          scrolled
            ? "border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60"
            : "bg-transparent",
        )}
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-4 font-semibold tracking-tight"
          >
            <div className="flex size-8 items-center justify-center rounded-full bg-primary px-1.5 shadow-sm">
              <Logo className="size-5 text-primary-foreground" />
            </div>
            <span className="text-xs sm:text-sm">AI Chat</span>
          </Link>
          <nav className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/chat"
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 sm:px-4"
            >
              <span className="hidden sm:inline">Start Chatting</span>
              <span className="sm:hidden">Chat</span>
              <ArrowRightIcon className="size-3.5" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 pt-14 sm:px-6 sm:pt-16">
        {/* Dotted background */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "radial-gradient(circle, oklch(0.556 0 0) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        {/* Gradient overlay bottom */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-48 bg-linear-to-t from-background to-transparent" />

        <div className="relative z-10 flex w-full max-w-3xl flex-col items-center gap-4 text-center sm:gap-6">
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            What do you want
            <br />
            <span className="text-muted-foreground">to chat about today?</span>
          </h1>

          <p className="max-w-xl px-1 text-base text-muted-foreground sm:text-lg">
            Your intelligent AI chat assistant, ready to help you converse,
            explore ideas, and get answers — in any language.
          </p>

          {/* Hero prompt input */}
          <div className="mt-2 w-full">
            <PromptInput
              onSubmit={handleSubmit}
              multiple
              globalDrop
              className="bg-background"
              inputGroupClassName="rounded-[20px] sm:rounded-[24px] shadow-lg"
            >
              <AttachmentHeader />
              <PromptInputTextarea
                dir="auto"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything..."
                className="min-h-9 px-3 pt-3 text-base sm:text-[17px]"
              />
              <PromptInputFooter className="items-center px-2 py-2">
                <PromptInputTools>
                  <ModelControl
                    value={selectedModel}
                    onChange={setSelectedModel}
                  />
                  <PromptInputActionMenu>
                    <PromptInputActionMenuTrigger />
                    <PromptInputActionMenuContent>
                      <PromptInputActionAddAttachments />
                    </PromptInputActionMenuContent>
                  </PromptInputActionMenu>
                </PromptInputTools>
                <PromptInputSubmit
                  aria-label="Send"
                  status={sending ? "submitted" : undefined}
                  disabled={!selectedModel}
                  className="size-9 shrink-0 rounded-full"
                />
              </PromptInputFooter>
            </PromptInput>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Shift+Enter for new line · Enter to send · Attach files with the
              menu
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
