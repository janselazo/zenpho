"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const full_name = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: full_name || null,
      phone: phone || null,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { ok: true as const };
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }
  if (password !== confirm) {
    return { error: "Passwords do not match." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { ok: true as const };
}

export async function removeAvatar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const url = profile?.avatar_url;
  if (url) {
    let path: string | undefined;
    if (url.includes("/object/public/avatars/")) {
      path = url.split("/object/public/avatars/")[1]?.split("?")[0];
    } else if (url.includes("/avatars/")) {
      path = url.split("/avatars/")[1]?.split("?")[0];
    }
    if (path) {
      await supabase.storage
        .from("avatars")
        .remove([decodeURIComponent(path)]);
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", user.id);

  if (error) return { error: error.message };
  // Client calls router.refresh() so layout/top bar update without revalidating the full tree (avoids RSC issues in some deployments).
  return { ok: true as const };
}

export async function uploadAvatar(formData: FormData) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr) {
      console.error("uploadAvatar: auth error", authErr);
      return { error: `Auth failed: ${authErr.message}` };
    }
    if (!user) return { error: "Not signed in. Refresh the page and try again." };

    const raw = formData.get("avatar");
    if (raw == null || typeof raw !== "object") {
      return { error: "Choose an image file." };
    }
    if (typeof (raw as Blob).arrayBuffer !== "function") {
      return { error: "Choose an image file." };
    }
    const blob = raw as Blob;
    if (blob.size === 0) {
      return { error: "Choose an image file." };
    }
    if (blob.size > 5 * 1024 * 1024) {
      return { error: "Image must be 5MB or smaller." };
    }

    let bytes: Uint8Array;
    try {
      bytes = new Uint8Array(await blob.arrayBuffer());
    } catch (readErr) {
      console.error("uploadAvatar: read file", readErr);
      return {
        error: "Could not read the image file. Try another file or a smaller size.",
      };
    }
    if (bytes.length === 0) {
      return { error: "Choose an image file." };
    }

    const fileName = raw instanceof File ? raw.name : "";
    const mime = (blob.type || "").toLowerCase();
    const nameTail = (fileName.split(".").pop() || "").toLowerCase();
    const nameExt =
      nameTail === "jpeg"
        ? "jpg"
        : nameTail === "jpg" || nameTail === "png" || nameTail === "webp"
          ? nameTail
          : null;

    let ext: string;
    let contentType: string;
    if (mime === "image/jpeg" || mime === "image/jpg") {
      ext = "jpg";
      contentType = "image/jpeg";
    } else if (mime === "image/png") {
      ext = "png";
      contentType = "image/png";
    } else if (mime === "image/webp") {
      ext = "webp";
      contentType = "image/webp";
    } else if (nameExt) {
      ext = nameExt;
      contentType =
        nameExt === "png"
          ? "image/png"
          : nameExt === "webp"
            ? "image/webp"
            : "image/jpeg";
    } else {
      return {
        error:
          "Use a JPG, PNG, or WebP image. If this file is one of those, rename it to end in .jpg, .png, or .webp.",
      };
    }

    const path = `${user.id}/avatar.${ext}`;
    console.log(
      `uploadAvatar: uploading ${bytes.length} bytes (${contentType}) to avatars/${path}`
    );

    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, bytes, { upsert: true, contentType });

    if (upErr) {
      console.error("uploadAvatar: storage upload failed", upErr);
      const m = upErr.message || "";
      if (/row-level security|rls|new row violates|policy/i.test(m)) {
        return {
          error:
            "Storage RLS denied this upload. In Supabase Storage policies for `avatars`, allow authenticated INSERT/UPDATE where the path's first folder equals auth.uid()::text.",
        };
      }
      if (/bucket.*not.*found|no such bucket/i.test(m)) {
        return {
          error:
            "The `avatars` storage bucket was not found. Create a public bucket named `avatars` in Supabase Storage.",
        };
      }
      return { error: m || "Storage upload failed (no message returned)." };
    }

    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = pub?.publicUrl;
    if (!publicUrl) {
      return {
        error:
          "Upload finished but the public URL was empty. Make sure the `avatars` bucket is public.",
      };
    }

    const { error: dbErr } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", user.id);

    if (dbErr) {
      console.error("uploadAvatar: profile update failed", dbErr);
      return { error: `Profile save failed: ${dbErr.message}` };
    }
    return { ok: true as const, url: publicUrl };
  } catch (e) {
    console.error("uploadAvatar: unexpected", e);
    const raw = e instanceof Error ? e.message : String(e);
    return {
      error:
        raw && raw.length < 300
          ? `Unexpected error: ${raw}`
          : "Unexpected error. See server logs.",
    };
  }
}
