import { notFound } from "next/navigation";
import type { UIMessage } from "ai";
import { ChatInterface } from "./_components/chat-interface";
import prisma from "@/lib/prisma";

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

  return (
    <ChatInterface conversationId={id} initialMessages={initialMessages} />
  );
}
