"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Income Sources
// ---------------------------------------------------------------------------

export async function getIncomeSources() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("income_source")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function createIncomeSource(fd: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const name = (fd.get("name") as string)?.trim();
  if (!name) return { error: "Name is required" };

  const kind = (fd.get("kind") as string) || "other";
  const { error } = await supabase.from("income_source").insert({
    user_id: user.id,
    name,
    kind,
  });
  if (error) return { error: error.message };
  revalidatePath("/finances");
  return { error: null };
}

export async function updateIncomeSource(id: string, fd: FormData) {
  const supabase = await createClient();
  const name = (fd.get("name") as string)?.trim();
  const kind = fd.get("kind") as string | null;
  const isActive = fd.get("is_active");
  const sortOrder = fd.get("sort_order");

  const patch: Record<string, unknown> = {};
  if (name) patch.name = name;
  if (kind) patch.kind = kind;
  if (isActive !== null && isActive !== undefined)
    patch.is_active = isActive === "true" || isActive === "1";
  if (sortOrder !== null && sortOrder !== undefined)
    patch.sort_order = Number(sortOrder);

  const { error } = await supabase
    .from("income_source")
    .update(patch)
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/finances");
  return { error: null };
}

export async function deleteIncomeSource(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("income_source")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/finances");
  return { error: null };
}

// ---------------------------------------------------------------------------
// Income Entries (one per source per month)
// ---------------------------------------------------------------------------

export async function getIncomeEntries(month: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("income_entry")
    .select("*, income_source:income_source_id(id, name, kind, is_active, sort_order)")
    .eq("month", month)
    .order("created_at", { ascending: true });
  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function upsertIncomeEntry(fd: FormData) {
  const supabase = await createClient();

  const incomeSourceId = fd.get("income_source_id") as string;
  const month = fd.get("month") as string;
  if (!incomeSourceId || !month) return { error: "Source and month are required" };

  const hours = Number(fd.get("hours") ?? 0);
  const revenue = Number(fd.get("revenue") ?? 0);
  const expenses = Number(fd.get("expenses") ?? 0);
  const notes = (fd.get("notes") as string) || null;

  const { error } = await supabase.from("income_entry").upsert(
    {
      income_source_id: incomeSourceId,
      month,
      hours,
      revenue,
      expenses,
      notes,
    },
    { onConflict: "income_source_id,month" }
  );
  if (error) return { error: error.message };
  revalidatePath("/finances");
  return { error: null };
}

export async function deleteIncomeEntry(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("income_entry")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/finances");
  return { error: null };
}

// ---------------------------------------------------------------------------
// Fixed Expenses
// ---------------------------------------------------------------------------

export async function getFixedExpenses() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fixed_expense")
    .select("*")
    .order("due_day", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function createFixedExpense(fd: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const name = (fd.get("name") as string)?.trim();
  if (!name) return { error: "Name is required" };

  const amount = Number(fd.get("amount") ?? 0);
  const dueDay = Number(fd.get("due_day") ?? 1);
  const category = (fd.get("category") as string) || null;

  const { error } = await supabase.from("fixed_expense").insert({
    user_id: user.id,
    name,
    amount,
    due_day: Math.max(1, Math.min(31, dueDay)),
    category,
  });
  if (error) return { error: error.message };
  revalidatePath("/finances");
  return { error: null };
}

export async function updateFixedExpense(id: string, fd: FormData) {
  const supabase = await createClient();
  const patch: Record<string, unknown> = {};

  const name = (fd.get("name") as string)?.trim();
  if (name) patch.name = name;

  const amount = fd.get("amount");
  if (amount !== null && amount !== undefined) patch.amount = Number(amount);

  const dueDay = fd.get("due_day");
  if (dueDay !== null && dueDay !== undefined)
    patch.due_day = Math.max(1, Math.min(31, Number(dueDay)));

  const category = fd.get("category");
  if (category !== null && category !== undefined) patch.category = category;

  const isActive = fd.get("is_active");
  if (isActive !== null && isActive !== undefined)
    patch.is_active = isActive === "true" || isActive === "1";

  const { error } = await supabase
    .from("fixed_expense")
    .update(patch)
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/finances");
  return { error: null };
}

export async function deleteFixedExpense(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("fixed_expense")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/finances");
  return { error: null };
}

// ---------------------------------------------------------------------------
// Variable Expenses
// ---------------------------------------------------------------------------

export async function getVariableExpenses(month: string) {
  const supabase = await createClient();
  const endOfMonth = lastDayOfMonth(month);
  const { data, error } = await supabase
    .from("variable_expense_entry")
    .select("*")
    .gte("date", month)
    .lte("date", endOfMonth)
    .order("date", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function addVariableExpense(fd: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const category = (fd.get("category") as string)?.trim();
  if (!category) return { error: "Category is required" };

  const amount = Number(fd.get("amount") ?? 0);
  const date = (fd.get("date") as string) || new Date().toISOString().slice(0, 10);
  const description = (fd.get("description") as string) || null;

  const { error } = await supabase.from("variable_expense_entry").insert({
    user_id: user.id,
    category,
    amount,
    date,
    description,
  });
  if (error) return { error: error.message };
  revalidatePath("/finances");
  return { error: null };
}

export async function updateVariableExpense(id: string, fd: FormData) {
  const supabase = await createClient();
  const patch: Record<string, unknown> = {};

  const category = (fd.get("category") as string)?.trim();
  if (category) patch.category = category;

  const amount = fd.get("amount");
  if (amount !== null && amount !== undefined) patch.amount = Number(amount);

  const date = fd.get("date");
  if (date) patch.date = date;

  const description = fd.get("description");
  if (description !== null && description !== undefined)
    patch.description = description;

  const { error } = await supabase
    .from("variable_expense_entry")
    .update(patch)
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/finances");
  return { error: null };
}

export async function deleteVariableExpense(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("variable_expense_entry")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/finances");
  return { error: null };
}

// ---------------------------------------------------------------------------
// Monthly Overview (aggregated from queries)
// ---------------------------------------------------------------------------

export async function getMonthlyOverview(month: string) {
  const supabase = await createClient();
  const endOfMonth = lastDayOfMonth(month);

  const [incomeRes, fixedRes, variableRes] = await Promise.all([
    supabase
      .from("income_entry")
      .select("revenue, expenses")
      .eq("month", month),
    supabase
      .from("fixed_expense")
      .select("amount")
      .eq("is_active", true),
    supabase
      .from("variable_expense_entry")
      .select("amount")
      .gte("date", month)
      .lte("date", endOfMonth),
  ]);

  const totalIncome =
    incomeRes.data?.reduce((s, r) => s + Number(r.revenue), 0) ?? 0;
  const totalIncomeExpenses =
    incomeRes.data?.reduce((s, r) => s + Number(r.expenses), 0) ?? 0;
  const totalFixedExpenses =
    fixedRes.data?.reduce((s, r) => s + Number(r.amount), 0) ?? 0;
  const totalVariableExpenses =
    variableRes.data?.reduce((s, r) => s + Number(r.amount), 0) ?? 0;

  const totalExpenses =
    totalIncomeExpenses + totalFixedExpenses + totalVariableExpenses;
  const net = totalIncome - totalExpenses;

  return {
    totalIncome,
    totalIncomeExpenses,
    totalFixedExpenses,
    totalVariableExpenses,
    totalExpenses,
    net,
  };
}

// ---------------------------------------------------------------------------
// Daily Income Log
// ---------------------------------------------------------------------------

export async function getDailyIncomeLogs(month: string) {
  const supabase = await createClient();
  const endOfMonth = lastDayOfMonth(month);
  const { data, error } = await supabase
    .from("daily_income_log")
    .select("*, income_source:income_source_id(id, name, kind)")
    .gte("date", month)
    .lte("date", endOfMonth)
    .order("date", { ascending: true });
  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function upsertDailyIncomeLog(fd: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const incomeSourceId = fd.get("income_source_id") as string;
  const date = fd.get("date") as string;
  if (!incomeSourceId || !date) return { error: "Source and date are required" };

  const amount = Number(fd.get("amount") ?? 0);
  const hours = Number(fd.get("hours") ?? 0);
  const notes = (fd.get("notes") as string) || null;

  const { error } = await supabase.from("daily_income_log").upsert(
    {
      user_id: user.id,
      income_source_id: incomeSourceId,
      date,
      amount,
      hours,
      notes,
    },
    { onConflict: "income_source_id,date" }
  );
  if (error) return { error: error.message };
  revalidatePath("/finances");
  return { error: null };
}

export async function deleteDailyIncomeLog(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("daily_income_log")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/finances");
  return { error: null };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function lastDayOfMonth(monthStr: string): string {
  const [y, m] = monthStr.split("-").map(Number);
  const d = new Date(y, m, 0);
  return `${y}-${String(m).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
