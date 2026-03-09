import { streamText, generateText, UIMessage, convertToModelMessages } from "ai";
import prisma from "@/lib/prisma";
import { buildLanguageModel } from "@/lib/ai-platforms";

export const maxDuration = 60;

type ChatBody = {
  messages: UIMessage[];
  conversationId?: string;
  credentialId?: string;
  modelId?: string;
  modelLabel?: string;
};

async function generateTitle(message: string, model: ReturnType<typeof buildLanguageModel>): Promise<string> {
  try {
    const { text } = await generateText({
      model,
      prompt: `Generate a very short, concise title (3-6 words max) for a conversation starting with this message. Return ONLY the title text, no quotes, no extra punctuation:\n\n${message}`,
    });
    return text.trim().slice(0, 60) || message.slice(0, 60);
  } catch {
    return message.slice(0, 60);
  }
}

export async function POST(req: Request) {
  const { messages, conversationId, credentialId, modelId, modelLabel }: ChatBody =
    await req.json();

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response("Messages are required", { status: 400 });
  }

  const conversation = conversationId
    ? await prisma.conversation.findUnique({
        where: { id: conversationId },
        select: {
          id: true,
          title: true,
          credentialId: true,
          modelId: true,
          modelLabel: true,
        },
      })
    : null;

  const activeCredentialId = credentialId ?? conversation?.credentialId ?? null;
  const activeModelId = modelId ?? conversation?.modelId ?? null;
  const activeModelLabel = modelLabel ?? conversation?.modelLabel ?? null;

  if (!activeCredentialId || !activeModelId) {
    return new Response("Select a model and connect an API key first.", {
      status: 400,
    });
  }

  const credential = await prisma.aICredential.findUnique({
    where: { id: activeCredentialId },
    select: {
      id: true,
      kind: true,
      apiKey: true,
      baseUrl: true,
    },
  });

  if (!credential) {
    return new Response("Selected AI credential was not found.", { status: 400 });
  }

  if (conversationId && (credentialId || modelId || modelLabel)) {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        credentialId: activeCredentialId,
        modelId: activeModelId,
        modelLabel: activeModelLabel || activeModelId,
      },
    });
  }

  const languageModel = buildLanguageModel({
    kind: credential.kind,
    apiKey: credential.apiKey,
    baseUrl: credential.baseUrl,
    modelId: activeModelId,
  });

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

      if (conversation?.title === "New Conversation" && textContent) {
        generateTitle(textContent, languageModel).then((title) => {
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

  try {
    const result = streamText({
      model: languageModel,
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
  } catch (error) {
    const err = error as { status?: number; statusCode?: number; message?: string; responseBody?: string };
    const status = err.status ?? err.statusCode ?? 500;
    const body = err.responseBody ?? err.message ?? "An error occurred with the AI provider.";

    if (status === 429) {
      return new Response("Rate limit reached. Please wait a moment and try again.", { status: 429 });
    }
    if (status === 401) {
      return new Response("Invalid API key. Please check your credentials.", { status: 401 });
    }
    if (status === 403) {
      return new Response("Access denied. You may not have permission to use this model.", { status: 403 });
    }
    if (status === 404) {
      return new Response("Model not found. Please verify your model selection.", { status: 404 });
    }

    return new Response(body, { status });
  }
}
