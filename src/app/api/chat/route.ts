import {
  streamText,
  generateText,
  UIMessage,
  convertToModelMessages,
} from "ai";
import { NextResponse } from "next/server";
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

function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function classifyError(error: unknown): { message: string; status: number } {
  const e = error as {
    status?: number;
    statusCode?: number;
    message?: string;
    responseBody?: string;
  };
  const status = e.status ?? e.statusCode ?? 500;
  const raw =
    e.responseBody ?? e.message ?? "An error occurred with the AI provider.";

  if (
    status === 429 ||
    raw.toLowerCase().includes("rate limit") ||
    raw.includes("429")
  ) {
    return {
      message: "Rate limit reached. Please wait a moment and try again.",
      status: 429,
    };
  }
  if (
    status === 401 ||
    raw.toLowerCase().includes("invalid api key") ||
    raw.includes("401")
  ) {
    return {
      message: "Invalid API key. Please check your credentials in Settings.",
      status: 401,
    };
  }
  if (status === 403 || raw.includes("403")) {
    return {
      message: "Access denied. You may not have permission to use this model.",
      status: 403,
    };
  }
  if (
    status === 404 ||
    raw.toLowerCase().includes("model not found") ||
    raw.includes("404")
  ) {
    return {
      message: "Model not found. Please verify your model selection.",
      status: 404,
    };
  }
  if (
    raw.toLowerCase().includes("quota") ||
    raw.toLowerCase().includes("billing")
  ) {
    return {
      message: "API quota exceeded. Please check your billing details.",
      status: 402,
    };
  }
  return { message: raw, status: status >= 400 && status < 600 ? status : 500 };
}

async function generateTitle(
  message: string,
  model: ReturnType<typeof buildLanguageModel>,
): Promise<string> {
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
  // ── 1. Parse body ──────────────────────────────────────────────────────────
  let body: ChatBody;
  try {
    body = (await req.json()) as ChatBody;
  } catch {
    return err("Invalid request body.", 400);
  }

  const { messages, conversationId, credentialId, modelId, modelLabel } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return err("Messages are required.", 400);
  }

  // ── 2. Resolve model & credential ─────────────────────────────────────────
  try {
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

    const activeCredentialId =
      credentialId ?? conversation?.credentialId ?? null;
    const activeModelId = modelId ?? conversation?.modelId ?? null;
    const activeModelLabel = modelLabel ?? conversation?.modelLabel ?? null;

    if (!activeCredentialId || !activeModelId) {
      return err("Select a model and connect an API key first.", 400);
    }

    const credential = await prisma.aICredential.findUnique({
      where: { id: activeCredentialId },
      select: { id: true, kind: true, apiKey: true, baseUrl: true },
    });

    if (!credential) {
      return err("Selected AI credential was not found.", 400);
    }

    // ── 3. Update conversation model if changed ──────────────────────────────
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

    // ── 4. Save user message (deduplicated by checking last message) ─────────
    let userMessageSaved = false;
    if (conversationId) {
      const lastUser = [...messages].reverse().find((m) => m.role === "user");
      if (lastUser) {
        const textContent = lastUser.parts
          .filter((p) => p.type === "text")
          .map((p) => (p as { type: "text"; text: string }).text)
          .join("\n");

        // Avoid duplicating the message if it was already saved (e.g. on retry)
        const existing = await prisma.message.findFirst({
          where: { conversationId, role: "user", content: textContent },
          orderBy: { createdAt: "desc" },
        });
        const fiveSecondsAgo = new Date(Date.now() - 5000);
        const isRecent = existing && existing.createdAt > fiveSecondsAgo;

        if (!isRecent) {
          await prisma.message.create({
            data: { role: "user", content: textContent, conversationId },
          });
          userMessageSaved = true;
        }

        if (conversation?.title === "New Conversation" && textContent) {
          generateTitle(textContent, languageModel)
            .then((title) =>
              prisma.conversation
                .update({ where: { id: conversationId }, data: { title } })
                .catch(() => {}),
            )
            .catch(() => {});
        }
      }
    }

    // ── 5. Stream ─────────────────────────────────────────────────────────────
    const result = streamText({
      model: languageModel,
      system: "You are a helpful assistant.",
      messages: await convertToModelMessages(messages),
      onError({ error }) {
        console.error("[streamText error]", error);
      },
      async onFinish({ text }) {
        if (!conversationId || !text) return;
        try {
          await prisma.message.create({
            data: { role: "assistant", content: text, conversationId },
          });
          await prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
          });
        } catch (dbErr) {
          console.error("[onFinish DB error]", dbErr);
        }
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    const { message, status } = classifyError(error);
    return err(message, status);
  }
}
