import type { SupabaseClient } from "@supabase/supabase-js";
import {
  googleFaviconUrl,
  websiteHostnameFromUri,
} from "@/lib/crm/places-search-ui";

type ConversationLogoInput = {
  id: string;
  contact_name?: string | null;
  lead_id?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
};

type LeadLogoRow = {
  id: string;
  name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
};

type DealWebsiteRow = {
  lead_id: string | null;
  website: string | null;
};

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "icloud.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
]);

function compactUnique(values: Array<string | null | undefined>) {
  return [...new Set(values.map((v) => v?.trim()).filter((v): v is string => Boolean(v)))];
}

function normalizePhone(raw: string | null | undefined) {
  const digits = raw?.replace(/[^\d]/g, "") ?? "";
  if (!digits) return "";
  if (digits.length === 10) return `1${digits}`;
  return digits.startsWith("1") && digits.length === 11 ? digits : digits;
}

function businessDomainFromEmail(email: string | null | undefined) {
  const domain = email?.trim().toLowerCase().split("@")[1] ?? "";
  if (!domain || FREE_EMAIL_DOMAINS.has(domain)) return null;
  return domain;
}

function extractWebsiteFromNotes(notes: string | null | undefined) {
  const text = notes ?? "";
  const explicit = text.match(
    /(?:website|site)\s*:\s*((?:https?:\/\/|www\.)[^\s)]+|[a-z0-9.-]+\.[a-z]{2,}[^\s)]*)/i
  );
  const fallback = text.match(/https?:\/\/[^\s)]+/i);
  const value = explicit?.[1] ?? fallback?.[0] ?? null;
  if (!value || /google\.[^/]+\/maps|maps\.app\.goo\.gl/i.test(value)) return null;
  return value.replace(/[.,;]+$/, "");
}

function faviconFromWebsite(website: string | null | undefined) {
  const host = websiteHostnameFromUri(website);
  return host ? googleFaviconUrl(host, 96) : null;
}

export async function conversationBusinessLogoById(
  supabase: SupabaseClient,
  conversations: ConversationLogoInput[]
): Promise<Record<string, string>> {
  const leadIds = compactUnique(conversations.map((c) => c.lead_id));
  const emails = compactUnique(conversations.map((c) => c.contact_email?.toLowerCase()));
  const rawPhones = compactUnique(conversations.map((c) => c.contact_phone));
  const names = compactUnique(conversations.map((c) => c.contact_name));

  const leadById = new Map<string, LeadLogoRow>();
  const leadByEmail = new Map<string, LeadLogoRow>();
  const leadByPhone = new Map<string, LeadLogoRow>();
  const leadByName = new Map<string, LeadLogoRow>();

  async function addLeads(query: PromiseLike<{ data: LeadLogoRow[] | null }>) {
    const { data } = await query;
    for (const lead of data ?? []) {
      leadById.set(lead.id, lead);
      if (lead.email) leadByEmail.set(lead.email.trim().toLowerCase(), lead);
      const phoneKey = normalizePhone(lead.phone);
      if (phoneKey) leadByPhone.set(phoneKey, lead);
      for (const name of [lead.name, lead.company]) {
        const key = name?.trim().toLowerCase();
        if (key) leadByName.set(key, lead);
      }
    }
  }

  await Promise.all([
    leadIds.length
      ? addLeads(
          supabase
            .from("lead")
            .select("id, name, company, email, phone, notes")
            .in("id", leadIds)
        )
      : Promise.resolve(),
    emails.length
      ? addLeads(
          supabase
            .from("lead")
            .select("id, name, company, email, phone, notes")
            .in("email", emails)
        )
      : Promise.resolve(),
    rawPhones.length
      ? addLeads(
          supabase
            .from("lead")
            .select("id, name, company, email, phone, notes")
            .in("phone", rawPhones)
        )
      : Promise.resolve(),
    names.length
      ? addLeads(
          supabase
            .from("lead")
            .select("id, name, company, email, phone, notes")
            .in("name", names)
        )
      : Promise.resolve(),
    names.length
      ? addLeads(
          supabase
            .from("lead")
            .select("id, name, company, email, phone, notes")
            .in("company", names)
        )
      : Promise.resolve(),
  ]);

  const matchedLeadIds = compactUnique(
    conversations.map((conversation) => {
      const byLeadId = conversation.lead_id ? leadById.get(conversation.lead_id) : null;
      const byEmail = conversation.contact_email
        ? leadByEmail.get(conversation.contact_email.trim().toLowerCase())
        : null;
      const byPhone = leadByPhone.get(normalizePhone(conversation.contact_phone));
      const byName = conversation.contact_name
        ? leadByName.get(conversation.contact_name.trim().toLowerCase())
        : null;
      return (byLeadId ?? byEmail ?? byPhone ?? byName)?.id;
    })
  );

  const websiteByLeadId = new Map<string, string>();
  if (matchedLeadIds.length) {
    const { data: deals } = await supabase
      .from("deal")
      .select("lead_id, website")
      .in("lead_id", matchedLeadIds)
      .not("website", "is", null)
      .order("updated_at", { ascending: false });

    for (const deal of (deals ?? []) as DealWebsiteRow[]) {
      if (deal.lead_id && deal.website && !websiteByLeadId.has(deal.lead_id)) {
        websiteByLeadId.set(deal.lead_id, deal.website);
      }
    }
  }

  const out: Record<string, string> = {};
  for (const conversation of conversations) {
    const lead =
      (conversation.lead_id ? leadById.get(conversation.lead_id) : null) ??
      (conversation.contact_email
        ? leadByEmail.get(conversation.contact_email.trim().toLowerCase())
        : null) ??
      leadByPhone.get(normalizePhone(conversation.contact_phone)) ??
      (conversation.contact_name
        ? leadByName.get(conversation.contact_name.trim().toLowerCase())
        : null);

    const website =
      (lead ? websiteByLeadId.get(lead.id) : null) ??
      extractWebsiteFromNotes(lead?.notes) ??
      businessDomainFromEmail(conversation.contact_email);

    const logo = faviconFromWebsite(website);
    if (logo) out[conversation.id] = logo;
  }

  return out;
}
