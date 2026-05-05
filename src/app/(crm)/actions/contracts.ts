"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CONTRACT_STATUSES, type ContractStatus } from "@/lib/crm/proposal-types";

const CONTRACT_STATUS_SET = new Set<string>(CONTRACT_STATUSES);

export async function updateContractStatus(
  contractId: string,
  status: ContractStatus
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const id = contractId.trim();
  if (!id) return { error: "Missing contract id" };
  if (!CONTRACT_STATUS_SET.has(status)) return { error: "Invalid status" };

  const { data: row } = await supabase
    .from("contract")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();

  if (!row) return { error: "Contract not found" };

  const { error } = await supabase
    .from("contract")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath(`/contracts/${id}`);
  revalidatePath(`/invoices/agreements/${id}`);
  revalidatePath("/invoices/agreements");
  revalidatePath("/invoices");
  return { ok: true };
}

export async function updateContractTermsSnapshot(
  contractId: string,
  terms: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const id = contractId.trim();
  if (!id) return { error: "Missing contract id" };

  const { data: row } = await supabase
    .from("contract")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();

  if (!row) return { error: "Contract not found" };
  if (String(row.status).toLowerCase() === "signed") {
    return { error: "Signed agreements cannot be edited." };
  }

  const { error } = await supabase
    .from("contract")
    .update({
      terms_snapshot: terms,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath(`/contracts/${id}`);
  revalidatePath(`/invoices/agreements/${id}`);
  revalidatePath("/invoices/agreements");
  revalidatePath("/invoices");
  return { ok: true };
}

export async function markContractSent(contractId: string) {
  return updateContractStatus(contractId, "sent");
}

export async function recordContractSignature(
  contractId: string,
  signerName: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const id = contractId.trim();
  const name = signerName.trim();
  if (!id) return { error: "Missing contract id" };
  if (!name) return { error: "Enter signer name" };

  const { data: row } = await supabase
    .from("contract")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (!row) return { error: "Contract not found" };

  const { error } = await supabase
    .from("contract")
    .update({
      status: "signed",
      signer_name: name,
      signed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath(`/contracts/${id}`);
  revalidatePath(`/invoices/agreements/${id}`);
  revalidatePath("/invoices/agreements");
  revalidatePath("/invoices");
  return { ok: true };
}
