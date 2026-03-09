import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join, extname } from "path";
import { randomUUID } from "crypto";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export async function POST(req: Request) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File too large (max 10 MB)" },
      { status: 413 },
    );
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: `File type not allowed: ${file.type}` },
      { status: 415 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const uploadsDir = join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });

  // Only keep the extension from the original name — never use the name directly
  const rawExt = extname(file.name).toLowerCase().slice(0, 10);
  const safeExt = /^\.[a-z0-9]+$/.test(rawExt) ? rawExt : "";
  const filename = `${randomUUID()}${safeExt}`;

  await writeFile(join(uploadsDir, filename), buffer);

  return NextResponse.json({
    url: `/uploads/${filename}`,
    filename: file.name,
    mediaType: file.type,
  });
}
