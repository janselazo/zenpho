import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "prospect-attachments";

export type ProposalAiVisualStored = {
  path: string;
  publicUrl: string;
};

/**
 * Store a GPT-generated proposal illustration (PNG).
 * Paths are prefixed so PDF export + markdown strip stay deterministic.
 */
export async function uploadProposalAiVisualPng(params: {
  proposalId: string;
  ordinal: number;
  bytes: Buffer;
}): Promise<
  | { ok: true; path: string; publicUrl: string }
  | { ok: false; error: string }
> {
  if (params.bytes.length < 120) {
    return { ok: false, error: "Image payload too small." };
  }
  const maxBytes = 12 * 1024 * 1024;
  if (params.bytes.length > maxBytes) {
    return { ok: false, error: "Image is too large to store." };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? e.message
          : "Server storage is not configured (SUPABASE_SERVICE_ROLE_KEY).",
    };
  }

  const pid = params.proposalId.trim();
  if (!pid) return { ok: false, error: "Missing proposal id." };

  const path = `proposal-ai-visuals/${pid}/${Date.now()}-${params.ordinal}-${Math.random().toString(36).slice(2, 9)}.png`;

  const { error } = await admin.storage.from(BUCKET).upload(path, params.bytes, {
    contentType: "image/png",
    upsert: false,
  });
  if (error) return { ok: false, error: error.message || "Upload failed." };

  const {
    data: { publicUrl },
  } = admin.storage.from(BUCKET).getPublicUrl(path);

  return { ok: true, path, publicUrl };
}
