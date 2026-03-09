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

  const initialMessages: UIMessage[] = conversation.messages.map((m) => ({
    id: m.id,
    role: m.role as "user" | "assistant",
    content: m.content,
    parts: [{ type: "text" as const, text: m.content }],
  }));

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
