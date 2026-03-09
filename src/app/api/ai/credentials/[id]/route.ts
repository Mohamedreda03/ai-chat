import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { NotFoundError, handleAPIError } from "@/lib/errors";

interface Params {
  params: Promise<{ id: string }>;
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id } = await params;

    // Verify existence before delete
    const existing = await prisma.aICredential.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError("Credential not found");
    }

    await prisma.aICredential.delete({ where: { id } });

    // Clear credential reference from conversations
    await prisma.conversation.updateMany({
      where: { credentialId: id },
      data: {
        credentialId: null,
        modelId: null,
        modelLabel: null,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const errorResponse = handleAPIError(error);
    return NextResponse.json(
      { error: errorResponse.error },
      { status: errorResponse.statusCode },
    );
  }
}
