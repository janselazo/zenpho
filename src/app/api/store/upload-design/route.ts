import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function bad(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return bad("Sign in to upload a design.", 401);

  const form = await req.formData().catch(() => null);
  if (!form) return bad("Expected multipart form data.");
  const file = form.get("file");
  const productSlug = (form.get("productSlug") as string | null)?.trim() ?? "";
  if (!productSlug || !/^[a-z0-9-]+$/.test(productSlug)) {
    return bad("Invalid productSlug.");
  }
  if (!(file instanceof File)) return bad("Missing file.");
  if (file.size === 0) return bad("Empty file.");
  if (file.size > MAX_BYTES) {
    return bad(`File too large (max ${Math.round(MAX_BYTES / (1024 * 1024))} MB).`);
  }

  const type = file.type || "";
  const ext = ALLOWED_TYPES[type];
  if (!ext) return bad("Use a JPG, PNG, or WebP image.");

  const buf = Buffer.from(await file.arrayBuffer());
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  const path = `${user.id}/${productSlug}/${stamp}_${rand}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from("store-uploads")
    .upload(path, buf, { upsert: false, contentType: type });
  if (upErr) {
    return bad(`Upload failed: ${upErr.message}`, 500);
  }

  const { data: pub } = supabase.storage.from("store-uploads").getPublicUrl(path);
  const url = pub?.publicUrl ?? null;
  if (!url) return bad("Upload completed but public URL was empty.", 500);

  return NextResponse.json({ ok: true, url, path });
}
