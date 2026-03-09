"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  HomeIcon,
  MenuIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  PlusIcon,
  SettingsIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
}

function groupConversations(conversations: Conversation[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const lastWeek = new Date(today.getTime() - 7 * 86400000);

  const groups: { label: string; items: Conversation[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Previous 7 days", items: [] },
    { label: "Older", items: [] },
  ];

  conversations.forEach((conv) => {
    const date = new Date(conv.updatedAt);
    if (date >= today) groups[0].items.push(conv);
    else if (date >= yesterday) groups[1].items.push(conv);
    else if (date >= lastWeek) groups[2].items.push(conv);
    else groups[3].items.push(conv);
  });

  return groups.filter((g) => g.items.length > 0);
}

export function Sidebar() {
  const router = useRouter();
  const params = useParams();
  const activeId = params?.id as string | undefined;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  const toggleCollapsed = (value: boolean) => {
    setCollapsed(value);
    localStorage.setItem("sidebar-collapsed", String(value));
  };

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      const data = await res.json();
      setConversations(data);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [activeId, fetchConversations]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeId === id) router.push("/chat");
    } catch {
      /* silent */
    } finally {
      setDeletingId(null);
    }
  };

  const groups = groupConversations(conversations);

  const openConversation = (id: string) => {
    router.push(`/chat/${id}`);
    setMobileOpen(false);
  };

  const openNewChat = () => {
    router.push("/chat");
    setMobileOpen(false);
  };

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <>
      <div className="flex items-center justify-between px-3 py-3">
        <Link
          href="/"
          className="flex items-center gap-2.5 px-1"
          onClick={() => setMobileOpen(false)}
        >
          <div className="flex size-7 items-center justify-center rounded-md bg-primary">
            <Logo className="size-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold tracking-tight">AI Chat</span>
        </Link>

        {isMobile ? (
          <button
            onClick={() => setMobileOpen(false)}
            className="flex size-8 items-center justify-center rounded-lg text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            aria-label="Close sidebar"
          >
            <XIcon className="size-4" />
          </button>
        ) : (
          <button
            onClick={() => toggleCollapsed(true)}
            className="flex size-8 items-center justify-center rounded-lg text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            aria-label="Collapse sidebar"
          >
            <PanelLeftCloseIcon className="size-4" />
          </button>
        )}
      </div>

      <div className="px-3 pb-3">
        <button
          onClick={openNewChat}
          className="flex w-full items-center gap-2 rounded-lg border border-dashed border-sidebar-border px-3 py-2 text-sm text-sidebar-foreground/70 transition-all hover:border-primary/40 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <PlusIcon className="size-4 shrink-0" />
          <span>New chat</span>
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-3 pb-3">
          {groups.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No conversations yet
            </p>
          ) : (
            groups.map((group) => (
              <div key={group.label} className="mb-3">
                <div className="mb-1 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </div>
                <div className="space-y-0.5">
                  {group.items.map((conv) => (
                    <div
                      key={conv.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => openConversation(conv.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openConversation(conv.id);
                        }
                      }}
                      className={cn(
                        "group relative flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                        conv.id === activeId
                          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                      )}
                    >
                      <span className="line-clamp-1 flex-1">{conv.title}</span>
                      <button
                        onClick={(e) => handleDelete(e, conv.id)}
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-md opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100",
                          deletingId === conv.id && "animate-pulse opacity-100",
                        )}
                        aria-label="Delete conversation"
                      >
                        <Trash2Icon className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <div className="border-t px-3 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setMobileOpen(false)}
            >
              <HomeIcon className="size-3.5" />
              Home
            </Link>
            <Link
              href="/chat/settings"
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setMobileOpen(false)}
            >
              <SettingsIcon className="size-3.5" />
              Settings
            </Link>
          </div>
          <ThemeToggle className="text-sidebar-foreground/60" />
        </div>
      </div>
    </>
  );

  const MobileDrawer = () => (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-3 left-3 z-40 flex size-9 items-center justify-center rounded-lg border bg-background/95 text-foreground shadow-sm backdrop-blur md:hidden"
        aria-label="Open sidebar"
      >
        <MenuIcon className="size-4" />
      </button>

      {mobileOpen && (
        <>
          <button
            className="fixed inset-0 z-40 bg-black/30 md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close sidebar overlay"
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-[84vw] max-w-72 flex-col border-r bg-sidebar text-sidebar-foreground shadow-xl md:hidden">
            <SidebarContent isMobile />
          </aside>
        </>
      )}
    </>
  );

  /* ── Collapsed state ── */
  if (collapsed) {
    return (
      <>
        <MobileDrawer />
        <div className="hidden h-full w-13 flex-col items-center border-r bg-sidebar py-3 transition-all duration-200 md:flex">
          <button
            onClick={() => toggleCollapsed(false)}
            className="mb-3 flex size-9 items-center justify-center rounded-lg text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpenIcon className="size-4" />
          </button>

          <button
            onClick={() => router.push("/chat")}
            className="mb-1 flex size-9 items-center justify-center rounded-lg text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            aria-label="New chat"
          >
            <PlusIcon className="size-4" />
          </button>

          <Link
            href="/"
            className="flex size-9 items-center justify-center rounded-lg text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            aria-label="Home"
          >
            <HomeIcon className="size-4" />
          </Link>

          <div className="mt-auto flex flex-col items-center gap-1">
            <Link
              href="/chat/settings"
              className="flex size-9 items-center justify-center rounded-lg text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              aria-label="Settings"
            >
              <SettingsIcon className="size-4" />
            </Link>
            <ThemeToggle className="text-sidebar-foreground/60" />
          </div>
        </div>
      </>
    );
  }

  /* ── Expanded state ── */
  return (
    <>
      <MobileDrawer />
      <div className="hidden h-full w-64 flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-200 md:flex">
        <SidebarContent />
      </div>
    </>
  );
}
