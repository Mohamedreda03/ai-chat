import { notFound } from "next/navigation";
import type { UIMessage } from "ai";
import { ChatInterface } from "./_components/chat-interface";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import prisma from "@/lib/prisma";
import type { ModelSelectionValue } from "@/components/features/model-control";

export const dynamic = "force-dynamic";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      credential: {
        select: {
          id: true,
          name: true,
        },
      },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!conversation) notFound();

  const initialMessages: UIMessage[] = conversation.messages.map((m) => {
    type SavedFile = {
      url: string;
      mediaType: string;
      filename: string | null;
    };
    let savedFiles: SavedFile[] = [];
    if (m.files) {
      try {
        savedFiles = JSON.parse(m.files) as SavedFile[];
      } catch {
        /* ignore */
      }
    }

    const parts: UIMessage["parts"] = [];

    // Add file parts first (so they appear above the text, matching send order)
    for (const f of savedFiles) {
      parts.push({
        type: "file" as const,
        url: f.url,
        mediaType: f.mediaType,
        ...(f.filename ? { filename: f.filename } : {}),
      });
    }

    // Add text part (skip placeholder "[file]" if there are file parts)
    if (m.content && !(m.content === "[file]" && savedFiles.length > 0)) {
      parts.push({ type: "text" as const, text: m.content });
    }

    return {
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
      parts,
    };
  });

  const initialModel: ModelSelectionValue | null =
    conversation.credentialId && conversation.modelId && conversation.credential
      ? {
          credentialId: conversation.credentialId,
          credentialName: conversation.credential.name,
          modelId: conversation.modelId,
          modelLabel: conversation.modelLabel || conversation.modelId,
        }
      : null;

  return (
    <ErrorBoundary>
      <ChatInterface
        conversationId={id}
        initialMessages={initialMessages}
        initialModel={initialModel}
      />
    </ErrorBoundary>
  );
}
