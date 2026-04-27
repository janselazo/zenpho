"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  MONEY_JOURNAL_TAG,
  type MoneyJournalEntryPayload,
  type MoneyJournalGoals,
} from "@/lib/crm/money-journal-types";

function humanizeTimeEntryError(message: string): string {
  const m = message.toLowerCase();
  if (
    m.includes("does not exist") ||
    m.includes("schema cache") ||
    m.includes("pgrst202") ||
    m.includes("pgrst205")
  ) {
    return (
      "Time tracking is not on this database yet. Apply " +
      "`supabase/migrations/20260402120000_time_entry.sql` or run `supabase db push`."
    );
  }
  return message;
}

const MIN_SEC = 30;
const MAX_SEC = 4 * 60 * 60; // 4h
const HOUR_MAX = 24;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isMoneyJournalGoals(v: unknown): v is MoneyJournalGoals {
  if (!isRecord(v)) return false;
  const keys: (keyof MoneyJournalGoals)[] = [
    "majorDefinitePurpose",
    "northGoalAmount",
    "northGoalProject",
    "northGoalDate",
    "quarterGoalAmount",
    "dayGoal",
    "progressDone",
    "progressTotal",
    "makeToday",
    "moneyMadeToday",
    "hoursWorkedToday",
  ];
  for (const k of keys) {
    if (typeof v[k] !== "string") return false;
  }
  return true;
}

function isMoneyJournalEntryPayload(v: unknown): v is MoneyJournalEntryPayload {
  if (!isRecord(v)) return false;
  if (typeof v.hourNumber !== "number" || v.hourNumber < 1 || v.hourNumber > HOUR_MAX)
    return false;
  if (typeof v.timerStartedAtIso !== "string" || typeof v.timerStoppedAtIso !== "string") {
    return false;
  }
  const strs = [
    "prospectingDone",
    "startTimeLabel",
    "stopTimeLabel",
    "moneyPurpose",
    "workDetail60m",
    "focusEffortRating",
    "improveNextHour",
    "promiseKeepGoing",
  ] as const;
  for (const k of strs) {
    if (typeof v[k] !== "string") return false;
  }
  if (typeof v.billable !== "boolean") return false;
  if (v.projectId !== null && typeof v.projectId !== "string") return false;
  if (v.taskId !== null && typeof v.taskId !== "string") return false;
  if (!isMoneyJournalGoals(v.goalsSnapshot)) return false;
  return true;
}

function buildDescription(hourN: number, workDetail: string): string {
  const detail = workDetail.trim();
  const firstLine = detail.split(/\r?\n/)[0]?.trim() || "";
  const head =
    firstLine.length > 80
      ? `${firstLine.slice(0, 77)}...`
      : firstLine;
  if (head) return `Hour ${hourN}: ${head}`;
  return `Money Journal · hour ${hourN}`;
}

/**
 * Log one completed hour as a **closed** time_entry. Does not use the open-timer row.
 */
export async function logMoneyJournalEntry(input: {
  startedAtIso: string;
  endedAtIso: string;
  journalData: unknown;
  extraTags?: string[];
}): Promise<{ ok: true; id: string } | { error: string }> {
  if (!isMoneyJournalEntryPayload(input.journalData)) {
    return { error: "Invalid journal payload." };
  }
  const jd = input.journalData;
  const startMs = new Date(input.startedAtIso).getTime();
  const endMs = new Date(input.endedAtIso).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    return { error: "Invalid start or end time." };
  }
  if (endMs <= startMs) {
    return { error: "End time must be after start time." };
  }
  const durSec = Math.floor((endMs - startMs) / 1000);
  if (durSec < MIN_SEC || durSec > MAX_SEC) {
    return {
      error: `Duration must be between ${MIN_SEC}s and 4h.`,
    };
  }
  const now = Date.now();
  if (endMs - now > 5 * 60_000) {
    return { error: "End time is too far in the future." };
  }
  if (startMs < now - 2 * 24 * 60 * 60_000) {
    return { error: "Start time is too far in the past." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const pid = jd.projectId?.trim() || null;
  const tid = jd.taskId?.trim() || null;
  if (tid && pid) {
    const { data: taskRow } = await supabase
      .from("task")
      .select("project_id")
      .eq("id", tid)
      .maybeSingle();
    if (taskRow && taskRow.project_id !== pid) {
      return { error: "Selected task does not belong to the chosen project." };
    }
  }

  const description = buildDescription(jd.hourNumber, jd.workDetail60m);
  const baseTags = (input.extraTags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean);
  const tagSet = new Set<string>([MONEY_JOURNAL_TAG, ...baseTags]);
  const tags = [...tagSet];

  const { data: row, error } = await supabase
    .from("time_entry")
    .insert({
      user_id: user.id,
      description,
      project_id: pid,
      task_id: tid,
      billable: jd.billable,
      tags,
      started_at: new Date(startMs).toISOString(),
      ended_at: new Date(endMs).toISOString(),
      journal_data: jd as object,
    })
    .select("id")
    .single();

  if (error) {
    if (
      (error.message || "").toLowerCase().includes("journal_data") &&
      (error.message || "").toLowerCase().includes("column")
    ) {
      return {
        error:
          "Database is missing `journal_data` on `time_entry`. Run the migration " +
          "`supabase/migrations/20260425120000_time_entry_journal_data.sql`.",
      };
    }
    return { error: humanizeTimeEntryError(error.message) };
  }
  if (!row?.id) return { error: "Insert failed (no id)." };

  revalidatePath("/time-tracking");
  return { ok: true, id: row.id as string };
}
