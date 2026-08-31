import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from "@/lib/constants";
import { PUBLIC_UPLOADS_ROOT } from "@/lib/storage";

// Accepts: multipart/form-data with fields:
//   file  — the image blob
//   type  — "avatar" | "logo"
//   id    — the entity id (used as filename stem)

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const type = formData.get("type") as string | null;
  const id = formData.get("id") as string | null;

  if (!file || !type || !id) {
    return NextResponse.json({ error: "Missing file, type, or id" }, { status: 400 });
  }

  if (!["avatar", "logo"].includes(type)) {
    return NextResponse.json({ error: "Invalid upload type" }, { status: 400 });
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, WebP, and GIF images are allowed" },
      { status: 400 }
    );
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File exceeds 5 MB limit" }, { status: 400 });
  }

  // Sanitise id so it can't escape the upload directory
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "");
  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const folder = type === "avatar" ? "avatars" : "logos";
  const filename = `${safeId}.${ext}`;

  const uploadDir = path.join(PUBLIC_UPLOADS_ROOT, folder);
  await mkdir(uploadDir, { recursive: true });

  const bytes = await file.arrayBuffer();
  await writeFile(path.join(uploadDir, filename), Buffer.from(bytes));

  const url = `/api/uploads/${folder}/${filename}`;
  return NextResponse.json({ url });
}
