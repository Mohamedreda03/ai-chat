import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import {
  CREDENTIAL_KINDS,
  maskApiKey,
  type CredentialKind,
} from "@/lib/ai-platforms";
import { ValidationError, handleAPIError } from "@/lib/errors";
import { CredentialFormSchema } from "@/types/api";

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

    return NextResponse.json(
      credentials.map((credential) => ({
        id: credential.id,
        name: credential.name,
        kind: credential.kind,
        baseUrl: credential.baseUrl,
        keyHint: maskApiKey(credential.apiKey),
      })),
    );
  } catch (error) {
    const errorResponse = handleAPIError(error);
    return NextResponse.json(
      { error: errorResponse.error },
      { status: errorResponse.statusCode },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    
    if (!body) {
      throw new ValidationError("Invalid request body");
    }

    // Validate with Zod schema
    const result = CredentialFormSchema.safeParse(body);
    
    if (!result.success) {
      throw new ValidationError(result.error.issues[0]?.message || "Validation failed");
    }

    const { id, name, kind, apiKey, baseUrl } = result.data;

    const credential = id
      ? await prisma.aICredential.update({
          where: { id },
          data: { name, kind, apiKey, baseUrl: baseUrl || null },
        })
      : await prisma.aICredential.create({
          data: { name, kind, apiKey, baseUrl: baseUrl || null },
        });

    return NextResponse.json({
      id: credential.id,
      name: credential.name,
      kind: credential.kind,
      baseUrl: credential.baseUrl,
      keyHint: maskApiKey(credential.apiKey),
    });
  } catch (error) {
    const errorResponse = handleAPIError(error);
    return NextResponse.json(
      { error: errorResponse.error },
      { status: errorResponse.statusCode },
    );
  }
}
