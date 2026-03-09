"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRightIcon,
  ArrowUpIcon,
  SparklesIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";
import { ModelControl } from "@/components/features/model-control";
import { usePersistedModel } from "@/hooks/use-persisted-model";

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  return date.toLocaleDateString();
}

export default function HomePage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const { selectedModel, setSelectedModel } = usePersistedModel();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    fetch("/api/conversations")
      .then((r) => r.json())
      .then((data) => setConversations(data.slice(0, 6)))
      .catch(() => {});
  }, []);

  const handleStart = async () => {
    if (loading) return;
    const text = input.trim();
    if (!text) {
      router.push("/chat");
      return;
    }
    if (!selectedModel) return;

    setLoading(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        body: JSON.stringify({
          credentialId: selectedModel?.credentialId,
          modelId: selectedModel?.modelId,
          modelLabel: selectedModel?.modelLabel,
        }),
        headers: { "Content-Type": "application/json" },
      });
      const conv = await res.json();
      router.push(`/chat/${conv.id}?q=${encodeURIComponent(text)}`);
    } catch {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) handleStart();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
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
            className="flex items-center gap-2.5 font-semibold tracking-tight"
          >
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
              <Logo className="size-5 text-primary-foreground" />
            </div>
            <span className="hidden sm:inline">AI Chat</span>
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
      <section className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-4 pt-14 sm:px-6 sm:pt-16">
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
          <div className="flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-sm text-muted-foreground backdrop-blur">
            <SparklesIcon className="size-3.5 text-primary" />
            {selectedModel
              ? `${selectedModel.modelLabel} - ${selectedModel.credentialName}`
              : "Connect a model to start"}
          </div>

          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            What do you want
            <br />
            <span className="text-muted-foreground">to build today?</span>
          </h1>

          <p className="max-w-xl px-1 text-base text-muted-foreground sm:text-lg">
            Your intelligent AI assistant, ready to help you code, think, and
            create — in any language.
          </p>

          {/* Hero prompt input */}
          <div className="mt-2 w-full space-y-2">
            <ModelControl value={selectedModel} onChange={setSelectedModel} />
            <div className="flex items-end gap-2 rounded-[20px] border bg-background px-3 py-2.5 shadow-lg ring-1 ring-transparent transition-all focus-within:ring-primary/20 sm:rounded-[24px] sm:px-4 sm:py-3">
              <textarea
                ref={textareaRef}
                rows={1}
                dir="auto"
                value={input}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything..."
                className="min-h-8 w-full resize-none bg-transparent text-base outline-none placeholder:text-muted-foreground sm:text-[17px]"
                style={{ maxHeight: "200px", overflowY: "auto" }}
              />
              <button
                onClick={handleStart}
                disabled={loading || !input.trim() || !selectedModel}
                aria-label="Send"
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all sm:size-9",
                  loading || !input.trim()
                    ? "cursor-not-allowed opacity-50"
                    : "hover:opacity-90 active:scale-95",
                )}
              >
                <ArrowUpIcon className="size-4" />
              </button>
            </div>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Shift+Enter for new line · Enter to send
            </p>
          </div>
        </div>
      </section>

      {/* Recent conversations section */}
      {conversations.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 sm:pb-24">
          <div className="mb-5 flex items-center justify-between sm:mb-6">
            <h2 className="text-lg font-semibold sm:text-xl">Recent conversations</h2>
            <Link
              href="/chat"
              className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              View all
              <ArrowRightIcon className="size-3.5" />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {conversations.map((conv) => (
              <Link
                key={conv.id}
                href={`/chat/${conv.id}`}
                className="group flex flex-col gap-2 rounded-xl border bg-card p-4 text-card-foreground transition-all hover:border-primary/30 hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Logo className="size-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium leading-snug">
                      {conv.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatTime(conv.updatedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  Continue conversation
                  <ArrowRightIcon className="size-3" />
                </div>
              </Link>
            ))}

            {/* New chat card */}
            <button
              onClick={() => router.push("/chat")}
              className="group flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-card/50 p-4 text-muted-foreground transition-all hover:border-primary/40 hover:bg-card hover:text-foreground hover:shadow-md"
            >
              <div className="flex size-8 items-center justify-center rounded-lg border border-dashed transition-colors group-hover:border-primary/40">
                <ArrowRightIcon className="size-4" />
              </div>
              <span className="text-sm font-medium">New conversation</span>
            </button>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t py-6 sm:py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-2 px-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded-md bg-primary">
              <Logo className="size-3.5 text-primary-foreground" />
            </div>
            AI Chat
          </div>
          <p>Built with Next.js &amp; Google Gemini</p>
        </div>
      </footer>
    </div>
  );
}
