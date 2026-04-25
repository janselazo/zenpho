"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const ROLE_LABELS: Record<string, string> = {
  agency_admin: "Agency admin",
  agency_member: "Agency member",
  client: "Client",
};

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
  revalidatePath("/settings");
  return { ok: true as const };
}

export async function uploadAvatar(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const raw = formData.get("avatar");
  if (!raw || typeof raw !== "object") {
    return { error: "Choose an image file." };
  }
  const blob = raw as Blob;
  if (!(blob instanceof Blob) || blob.size === 0) {
    return { error: "Choose an image file." };
  }
  if (blob.size > 5 * 1024 * 1024) {
    return { error: "Image must be 5MB or smaller." };
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
  const { error: upErr } = await supabase.storage
    .from("avatars")
    .upload(path, blob, { upsert: true, contentType });

  if (upErr) return { error: upErr.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(path);

  const { error: dbErr } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", user.id);

  if (dbErr) return { error: dbErr.message };
  revalidatePath("/settings");
  return { ok: true as const, url: publicUrl };
}

export { ROLE_LABELS };
