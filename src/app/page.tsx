"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, ArrowUpIcon, SparklesIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";
import { ModelControl } from "@/components/features/model-control";
import { usePersistedModel } from "@/hooks/use-persisted-model";

// Landing page for the AI Chat application

export default function HomePage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const { selectedModel, setSelectedModel } = usePersistedModel();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // No recent conversations shown on the landing page by design

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
          <div className="mt-2 w-full space-y-2">
            <div className="overflow-hidden rounded-[20px] border bg-background shadow-lg ring-1 ring-transparent transition-all focus-within:ring-primary/20 sm:rounded-[24px]">
              <div className="flex items-end gap-2 px-3 py-2.5 sm:px-4 sm:py-3">
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
              <div className="flex items-center gap-2 border-t px-3 py-2 sm:px-4">
                <ModelControl
                  value={selectedModel}
                  onChange={setSelectedModel}
                />
              </div>
            </div>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Shift+Enter for new line · Enter to send
            </p>
          </div>
        </div>
      </section>

      {/* Recent conversations removed from landing page */}

      {/* Footer removed as requested */}
    </div>
  );
}
