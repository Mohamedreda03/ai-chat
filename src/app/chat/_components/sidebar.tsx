"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  HomeIcon,
  Loader2Icon,
  MenuIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  PinIcon,
  PinOffIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  useConversations,
  useDeleteConversation,
  useRenameConversation,
  type Conversation,
} from "@/hooks/use-conversations";

// --- Date grouping ---

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

// --- Pinned storage ---

function loadPinnedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem("pinned-conversations");
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

// --- Search Dialog ---

interface SearchDialogProps {
  open: boolean;
  onClose: () => void;
  conversations: Conversation[];
  onSelect: (id: string) => void;
}

function SearchDialog({
  open,
  onClose,
  conversations,
  onSelect,
}: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? conversations.filter((c) => c.title.toLowerCase().includes(q))
      : conversations;
    return filtered.slice(0, 8);
  }, [conversations, query]);

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setQuery("");
      onClose();
    }
  };

  const handleSelect = (id: string) => {
    setQuery("");
    onSelect(id);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-2xl! overflow-hidden p-0"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Search conversations</DialogTitle>
        <div className="flex items-center gap-3 border-b px-5 py-4">
          <SearchIcon className="size-5 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            autoFocus
            type="text"
            placeholder="Search conversations..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Clear search"
            >
              <XIcon className="size-4" />
            </button>
          )}
        </div>

        <div className="max-h-[420px] min-h-[200px] overflow-y-auto py-1.5">
          {results.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              No conversations found
            </p>
          ) : (
            <ul>
              {results.map((conv) => (
                <li key={conv.id}>
                  <button
                    onClick={() => handleSelect(conv.id)}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm transition-colors hover:bg-muted"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{conv.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(conv.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!query.trim() && conversations.length > 8 && (
            <p className="pb-2.5 pt-1 text-center text-xs text-muted-foreground">
              Showing 8 of {conversations.length} — type to filter
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --- Conversation item (stable external component, prevents rename-input remount) ---

interface ConvItemProps {
  conv: Conversation;
  isActive: boolean;
  isPinned: boolean;
  isRenaming: boolean;
  renameValue: string;
  deleteIsPending: boolean;
  onOpen: (id: string) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
  onTogglePin: (id: string) => void;
  onStartRename: (id: string, title: string) => void;
  onRenameChange: (value: string) => void;
  onRenameCommit: (id: string) => void;
  onRenameCancel: () => void;
}

function ConvItem({
  conv,
  isActive,
  isPinned,
  isRenaming,
  renameValue,
  deleteIsPending,
  onOpen,
  onDelete,
  onTogglePin,
  onStartRename,
  onRenameChange,
  onRenameCommit,
  onRenameCancel,
}: ConvItemProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !isRenaming && onOpen(conv.id)}
      onDoubleClick={() => !isRenaming && onStartRename(conv.id, conv.title)}
      onKeyDown={(e) => {
        if (!isRenaming && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onOpen(conv.id);
        }
      }}
      className={cn(
        "group relative flex w-full min-w-0 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
        isActive
          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
      )}
    >
      {isRenaming ? (
        <input
          autoFocus
          value={renameValue}
          onChange={(e) => onRenameChange(e.target.value)}
          onBlur={() => onRenameCommit(conv.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onRenameCommit(conv.id);
            else if (e.key === "Escape") onRenameCancel();
            e.stopPropagation();
          }}
          onClick={(e) => e.stopPropagation()}
          className="min-w-0 flex-1 rounded bg-background px-1.5 py-0.5 text-sm text-foreground outline-none ring-1 ring-ring/70"
        />
      ) : (
        <span className="min-w-0 flex-1 truncate">{conv.title}</span>
      )}

      {!isRenaming && (
        <div
          className="flex shrink-0 items-center"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onTogglePin(conv.id)}
            className={cn(
              "flex size-6 items-center justify-center rounded-md transition-all",
              isPinned
                ? "text-primary opacity-100 hover:bg-primary/10"
                : "opacity-0 text-muted-foreground group-hover:opacity-100 hover:bg-sidebar-accent",
            )}
            aria-label={isPinned ? "Unpin" : "Pin"}
          >
            {isPinned ? (
              <PinOffIcon className="size-3" />
            ) : (
              <PinIcon className="size-3" />
            )}
          </button>
          <button
            onClick={(e) => onDelete(e, conv.id)}
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-md opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100",
              deleteIsPending && "animate-pulse opacity-100",
            )}
            aria-label="Delete conversation"
          >
            <Trash2Icon className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// --- Sidebar inner content (extracted outside Sidebar to avoid remount bug) ---

interface SidebarInnerProps {
  isMobile?: boolean;
  activeId: string | undefined;
  groups: { label: string; items: Conversation[] }[];
  pinnedConvs: Conversation[];
  pinnedIds: Set<string>;
  renamingId: string | null;
  renameValue: string;
  deleteConversation: { isPending: boolean; variables?: string };
  totalCount: number;
  conversationsLoading: boolean;
  onOpenNewChat: () => void;
  onOpenConversation: (id: string) => void;
  onOpenSearch: () => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
  onTogglePin: (id: string) => void;
  onStartRename: (id: string, title: string) => void;
  onRenameChange: (value: string) => void;
  onRenameCommit: (id: string) => void;
  onRenameCancel: () => void;
  onToggleCollapsed: (value: boolean) => void;
  onCloseMobile: () => void;
}

function SidebarInner({
  isMobile = false,
  activeId,
  groups,
  pinnedConvs,
  pinnedIds,
  renamingId,
  renameValue,
  deleteConversation,
  totalCount,
  conversationsLoading,
  onOpenNewChat,
  onOpenConversation,
  onOpenSearch,
  onDelete,
  onTogglePin,
  onStartRename,
  onRenameChange,
  onRenameCommit,
  onRenameCancel,
  onToggleCollapsed,
  onCloseMobile,
}: SidebarInnerProps) {
  return (
    <>
      <div className="flex items-center justify-between px-3 py-3">
        <Link
          href="/"
          className="flex items-center gap-2.5 px-1"
          onClick={onCloseMobile}
        >
          <div className="flex size-7 items-center justify-center rounded-md bg-primary">
            <Logo className="size-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold tracking-tight">AI Chat</span>
        </Link>

        <div className="flex items-center gap-0.5">
          <button
            onClick={onOpenSearch}
            className="flex size-8 items-center justify-center rounded-lg text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            aria-label="Search conversations"
          >
            <SearchIcon className="size-4" />
          </button>

          {isMobile ? (
            <button
              onClick={onCloseMobile}
              className="flex size-8 items-center justify-center rounded-lg text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              aria-label="Close sidebar"
            >
              <XIcon className="size-4" />
            </button>
          ) : (
            <button
              onClick={() => onToggleCollapsed(true)}
              className="flex size-8 items-center justify-center rounded-lg text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              aria-label="Collapse sidebar"
            >
              <PanelLeftCloseIcon className="size-4" />
            </button>
          )}
        </div>
      </div>

      <div className="px-3 pb-3">
        <button
          onClick={onOpenNewChat}
          className="flex w-full items-center gap-2 rounded-lg border border-dashed border-sidebar-border px-3 py-2 text-sm text-sidebar-foreground/70 transition-all hover:border-primary/40 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <PlusIcon className="size-4 shrink-0" />
          <span>New chat</span>
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-3 pb-3">
          {conversationsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : totalCount === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No conversations yet
            </p>
          ) : (
            <>
              {pinnedConvs.length > 0 && (
                <div className="mb-3">
                  <div className="mb-1 flex items-center gap-1.5 px-2">
                    <PinIcon className="size-2.5 text-muted-foreground" />
                    <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Pinned
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {pinnedConvs.map((conv) => (
                      <ConvItem
                        key={conv.id}
                        conv={conv}
                        isActive={conv.id === activeId}
                        isPinned
                        isRenaming={renamingId === conv.id}
                        renameValue={renameValue}
                        deleteIsPending={
                          deleteConversation.isPending &&
                          deleteConversation.variables === conv.id
                        }
                        onOpen={onOpenConversation}
                        onDelete={onDelete}
                        onTogglePin={onTogglePin}
                        onStartRename={onStartRename}
                        onRenameChange={onRenameChange}
                        onRenameCommit={onRenameCommit}
                        onRenameCancel={onRenameCancel}
                      />
                    ))}
                  </div>
                </div>
              )}

              {groups.map((group) => (
                <div key={group.label} className="mb-3">
                  <div className="mb-1 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {group.label}
                  </div>
                  <div className="space-y-0.5">
                    {group.items.map((conv) => (
                      <ConvItem
                        key={conv.id}
                        conv={conv}
                        isActive={conv.id === activeId}
                        isPinned={pinnedIds.has(conv.id)}
                        isRenaming={renamingId === conv.id}
                        renameValue={renameValue}
                        deleteIsPending={
                          deleteConversation.isPending &&
                          deleteConversation.variables === conv.id
                        }
                        onOpen={onOpenConversation}
                        onDelete={onDelete}
                        onTogglePin={onTogglePin}
                        onStartRename={onStartRename}
                        onRenameChange={onRenameChange}
                        onRenameCommit={onRenameCommit}
                        onRenameCancel={onRenameCancel}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </ScrollArea>

      <div className="border-t px-3 py-3">
        <div className="flex items-center justify-between">
          <div className="flex-col items-center gap-1">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              onClick={onCloseMobile}
            >
              <HomeIcon className="size-3.5" />
              Home
            </Link>
            <Link
              href="/chat/settings"
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              onClick={onCloseMobile}
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
}

// --- Main Sidebar export ---

export function Sidebar() {
  const router = useRouter();
  const params = useParams();
  const activeId = params?.id as string | undefined;

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidebar-collapsed") === "true";
    }
    return false;
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(loadPinnedIds);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const { data: conversations = [], isLoading: conversationsLoading } =
    useConversations();
  const deleteConversation = useDeleteConversation();
  const renameConversation = useRenameConversation();

  const toggleCollapsed = useCallback((value: boolean) => {
    setCollapsed(value);
    localStorage.setItem("sidebar-collapsed", String(value));
  }, []);

  const handleDelete = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setPendingDeleteId(id);
  }, []);

  const confirmDelete = () => {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    deleteConversation.mutate(id, {
      onSuccess: () => {
        if (activeId === id) router.push("/chat");
      },
    });
  };

  const togglePin = useCallback((id: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem("pinned-conversations", JSON.stringify([...next]));
      return next;
    });
  }, []);

  const startRename = useCallback((id: string, title: string) => {
    setRenamingId(id);
    setRenameValue(title);
  }, []);

  const commitRename = useCallback(
    (id: string) => {
      const trimmed = renameValue.trim();
      if (trimmed) renameConversation.mutate({ id, title: trimmed });
      setRenamingId(null);
      setRenameValue("");
    },
    [renameValue, renameConversation],
  );

  const cancelRename = useCallback(() => {
    setRenamingId(null);
    setRenameValue("");
  }, []);

  const openConversation = useCallback(
    (id: string) => {
      if (id === activeId) return;
      router.push(`/chat/${id}`);
      setMobileOpen(false);
      setSearchOpen(false);
    },
    [router, activeId],
  );

  const openNewChat = useCallback(() => {
    router.push("/chat");
    setMobileOpen(false);
  }, [router]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  const pinnedConvs = useMemo(
    () => conversations.filter((c) => pinnedIds.has(c.id)),
    [conversations, pinnedIds],
  );

  const unpinned = useMemo(
    () => conversations.filter((c) => !pinnedIds.has(c.id)),
    [conversations, pinnedIds],
  );

  const groups = useMemo(() => groupConversations(unpinned), [unpinned]);

  const sharedProps: Omit<SidebarInnerProps, "isMobile"> = {
    activeId,
    groups,
    pinnedConvs,
    pinnedIds,
    renamingId,
    renameValue,
    deleteConversation,
    totalCount: conversations.length,
    conversationsLoading,
    onOpenNewChat: openNewChat,
    onOpenConversation: openConversation,
    onOpenSearch: openSearch,
    onDelete: handleDelete,
    onTogglePin: togglePin,
    onStartRename: startRename,
    onRenameChange: setRenameValue,
    onRenameCommit: commitRename,
    onRenameCancel: cancelRename,
    onToggleCollapsed: toggleCollapsed,
    onCloseMobile: closeMobile,
  };

  const dialogs = (
    <>
      <SearchDialog
        open={searchOpen}
        onClose={closeSearch}
        conversations={conversations}
        onSelect={openConversation}
      />
      <Dialog
        open={!!pendingDeleteId}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete conversation?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The conversation will be permanently
              deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  const mobileDrawer = (
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
            onClick={closeMobile}
            aria-label="Close sidebar overlay"
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-[84vw] max-w-72 flex-col border-r bg-sidebar text-sidebar-foreground shadow-xl md:hidden">
            <SidebarInner {...sharedProps} isMobile />
          </aside>
        </>
      )}
    </>
  );

  if (collapsed) {
    return (
      <>
        {dialogs}
        {mobileDrawer}
        <div className="hidden h-full w-13 flex-col items-center border-r bg-sidebar py-3 transition-all duration-200 md:flex">
          <button
            onClick={() => toggleCollapsed(false)}
            className="mb-3 flex size-9 items-center justify-center rounded-lg text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpenIcon className="size-4" />
          </button>
          <button
            onClick={openNewChat}
            className="mb-1 flex size-9 items-center justify-center rounded-lg text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            aria-label="New chat"
          >
            <PlusIcon className="size-4" />
          </button>
          <button
            onClick={openSearch}
            className="mb-1 flex size-9 items-center justify-center rounded-lg text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            aria-label="Search conversations"
          >
            <SearchIcon className="size-4" />
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

  return (
    <>
      {dialogs}
      {mobileDrawer}
      <div className="hidden h-full w-64 flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-200 md:flex">
        <SidebarInner {...sharedProps} />
      </div>
    </>
  );
}
