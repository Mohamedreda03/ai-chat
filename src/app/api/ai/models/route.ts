import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { fetchModelsForCredential, maskApiKey } from "@/lib/ai-platforms";
import { handleAPIError } from "@/lib/errors";

export async function GET() {
  try {
    const credentials = await prisma.aICredential.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        kind: true,
        baseUrl: true,
        apiKey: true,
      },
    });

    const result = await Promise.allSettled(
      credentials.map(async (credential) => {
        try {
          const models = await fetchModelsForCredential({
            kind: credential.kind,
            apiKey: credential.apiKey,
            baseUrl: credential.baseUrl,
          });

          return {
            credential: {
              id: credential.id,
              name: credential.name,
              kind: credential.kind,
              baseUrl: credential.baseUrl,
              keyHint: maskApiKey(credential.apiKey),
            },
            models,
            error: null,
          };
        } catch (error) {
          return {
            credential: {
              id: credential.id,
              name: credential.name,
              kind: credential.kind,
              baseUrl: credential.baseUrl,
              keyHint: maskApiKey(credential.apiKey),
            },
            models: [],
            error: error instanceof Error ? error.message : "Failed to load models",
          };
        }
      }),
    );

    // Extract successful results
    const credentials_result = result.map((r) =>
      r.status === "fulfilled" ? r.value : r.reason,
    );

    return NextResponse.json({ credentials: credentials_result });
  } catch (error) {
    const errorResponse = handleAPIError(error);
    return NextResponse.json(
      { error: errorResponse.error },
      { status: errorResponse.statusCode },
    );
  }
}
