import { google } from "@ai-sdk/google";
import {
  streamText,
  generateText,
  UIMessage,
  convertToModelMessages,
} from "ai";
import prisma from "@/lib/prisma";

export const maxDuration = 60;

async function generateTitle(message: string): Promise<string> {
  try {
    const { text } = await generateText({
      model: google("gemini-2.5-flash"),
      prompt: `Generate a very short, concise title (3-6 words max) for a conversation starting with this message. Return ONLY the title text, no quotes, no extra punctuation:\n\n${message}`,
    });
    return text.trim().slice(0, 60) || message.slice(0, 60);
  } catch {
    return message.slice(0, 60);
  }
}

export async function POST(req: Request) {
  const {
    messages,
    conversationId,
  }: { messages: UIMessage[]; conversationId?: string } = await req.json();

  // Persist the last user message
  if (conversationId) {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (lastUser) {
      const textContent = lastUser.parts
        .filter((p) => p.type === "text")
        .map((p) => (p as { type: "text"; text: string }).text)
        .join("\n");

      await prisma.message.create({
        data: { role: "user", content: textContent, conversationId },
      });

      // Auto-title: generate a concise AI title from the first user message
      const conv = await prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { title: true },
      });
      if (conv?.title === "New Conversation" && textContent) {
        generateTitle(textContent).then((title) => {
          prisma.conversation
            .update({
              where: { id: conversationId },
              data: { title },
            })
            .catch(() => {});
        });
      }
    }
  }

  const result = streamText({
    model: google("gemini-2.5-flash"),
    system: "You are a helpful assistant.",
    messages: await convertToModelMessages(messages),
    async onFinish({ text }) {
      if (conversationId && text) {
        await prisma.message.create({
          data: { role: "assistant", content: text, conversationId },
        });
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });
      }
    },
  });

  return result.toUIMessageStreamResponse();
}
