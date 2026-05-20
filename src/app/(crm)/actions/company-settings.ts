"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fetchCurrentOrganizationId } from "@/lib/organization";

async function requireOrgContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" as const };

  const organizationId = await fetchCurrentOrganizationId(supabase);
  if (!organizationId) return { error: "Organization not found." as const };

  return { supabase, organizationId };
}

export async function updateCompanyProfile(formData: FormData) {
  const ctx = await requireOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const { supabase, organizationId } = ctx;
  const company_name = String(formData.get("company_name") ?? "").trim();
  const company_email = String(formData.get("company_email") ?? "").trim();
  const company_category = String(formData.get("company_category") ?? "").trim();
  const company_phone = String(formData.get("company_phone") ?? "").trim();
  const company_address = String(formData.get("company_address") ?? "").trim();

  const { error } = await supabase
    .from("organization")
    .update({
      company_name: company_name || null,
      company_email: company_email || null,
      company_category: company_category || null,
      company_phone: company_phone || null,
      company_address: company_address || null,
    })
    .eq("id", organizationId);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { ok: true as const };
}

function parseLogoPathFromUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.includes("/object/public/company-logos/")) {
    return url.split("/object/public/company-logos/")[1]?.split("?")[0];
  }
  if (url.includes("/company-logos/")) {
    return url.split("/company-logos/")[1]?.split("?")[0];
  }
  return undefined;
}

export async function removeCompanyLogo() {
  const ctx = await requireOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const { supabase, organizationId } = ctx;
  const { data: org } = await supabase
    .from("organization")
    .select("logo_url")
    .eq("id", organizationId)
    .maybeSingle();

  const url = org?.logo_url;
  if (url) {
    const path = parseLogoPathFromUrl(url);
    if (path) {
      await supabase.storage
        .from("company-logos")
        .remove([decodeURIComponent(path)]);
    }
  }

  const { error } = await supabase
    .from("organization")
    .update({ logo_url: null })
    .eq("id", organizationId);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function uploadCompanyLogo(formData: FormData) {
  try {
    const ctx = await requireOrgContext();
    if ("error" in ctx) return { error: ctx.error };

    const { supabase, organizationId } = ctx;
    const raw = formData.get("logo");
    if (raw == null || typeof raw !== "object") {
      return { error: "Choose an image file." };
    }
    if (typeof (raw as Blob).arrayBuffer !== "function") {
      return { error: "Choose an image file." };
    }

    const blob = raw as Blob;
    if (blob.size === 0) return { error: "Choose an image file." };
    if (blob.size > 5 * 1024 * 1024) {
      return { error: "Image must be 5MB or smaller." };
    }

    const bytes = new Uint8Array(await blob.arrayBuffer());
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

    const path = `${organizationId}/logo.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("company-logos")
      .upload(path, bytes, { upsert: true, contentType });

    if (upErr) {
      const m = upErr.message || "";
      if (/row-level security|rls|new row violates|policy/i.test(m)) {
        return {
          error:
            "Storage RLS denied this upload. Ensure the `company-logos` bucket policies are applied.",
        };
      }
      if (/bucket.*not.*found|no such bucket/i.test(m)) {
        return {
          error:
            "The `company-logos` storage bucket was not found. Apply the latest database migration.",
        };
      }
      return { error: m || "Storage upload failed." };
    }

    const { data: pub } = supabase.storage.from("company-logos").getPublicUrl(path);
    const publicUrl = pub?.publicUrl;
    if (!publicUrl) {
      return { error: "Upload finished but the public URL was empty." };
    }

    const { error: dbErr } = await supabase
      .from("organization")
      .update({ logo_url: publicUrl })
      .eq("id", organizationId);

    if (dbErr) return { error: `Company save failed: ${dbErr.message}` };

    revalidatePath("/settings");
    revalidatePath("/", "layout");
    return { ok: true as const, url: publicUrl };
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    return {
      error:
        raw && raw.length < 300
          ? `Unexpected error: ${raw}`
          : "Unexpected error. See server logs.",
    };
  }
}
