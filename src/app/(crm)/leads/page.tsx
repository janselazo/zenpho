import LeadsView from "@/components/crm/LeadsView";
import { fetchClientsForClientsView } from "@/lib/crm/fetch-clients-for-view";
import { fetchMergedCrmFieldOptions } from "@/lib/crm/fetch-crm-field-options";
import { fetchCrmPipelineSettings } from "@/lib/crm/fetch-pipeline-settings";
import type { LeadTagCatalogRow } from "@/lib/crm/lead-tag-catalog";
import { fetchCrmAccessContext } from "@/lib/crm/access-context";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const LEADS_SECTIONS = ["pipeline", "leads", "clients"] as const;
type LeadsSectionQuery = (typeof LEADS_SECTIONS)[number];

function parseLeadsSection(
  raw: string | string[] | undefined
): LeadsSectionQuery | undefined {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === "pipeline" || v === "leads" || v === "clients") {
    return v;
  }
  /** Legacy `?section=deals` (removed tab) → pipeline */
  if (v === "deals") return "pipeline";
  return undefined;
}

function parseHighlightClientId(
  raw: string | string[] | undefined
): string | undefined {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length > 0 ? t : undefined;
}

/** Next upcoming `starts_at`, or most recent past if none — for pipeline card preview. */
function pickPipelineCardAppointmentStart(isoTimes: string[]): string | null {
  if (isoTimes.length === 0) return null;
  const sorted = [...isoTimes].sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );
  const now = Date.now();
  const upcoming = sorted.find((t) => new Date(t).getTime() >= now);
  return upcoming ?? sorted[sorted.length - 1] ?? null;
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{
    section?: string | string[];
    client?: string | string[];
  }>;
}) {
  const sp = await searchParams;
  const highlightClientId = parseHighlightClientId(sp.client);
  const initialSection =
    parseLeadsSection(sp.section) ??
    (highlightClientId ? "clients" : undefined);
  if (!isSupabaseConfigured()) {
    return (
      <div className="p-8">
        <h1 className="heading-display text-2xl font-bold">Leads</h1>
        <p className="mt-2 text-text-secondary">Configure Supabase to load CRM.</p>
      </div>
    );
  }

  const supabase = await createClient();
  const access = await fetchCrmAccessContext(supabase);
  if (!access) {
    return (
      <div className="p-8">
        <h1 className="heading-display text-2xl font-bold">Leads</h1>
        <p className="mt-2 text-text-secondary">Sign in to load CRM.</p>
      </div>
    );
  }
  const organizationId = access.organizationId;

  let leadQuery = organizationId
    ? supabase
        .from("lead")
        .select(
          "id, name, email, phone, company, website, stage, source, notes, project_type, contact_category, temperature, created_at, converted_client_id"
        )
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(200)
    : null;
  if (leadQuery && !access.canManageTeam) {
    leadQuery = leadQuery.eq("owner_id", access.userId);
  }

  const [leadsRes, pipeline, clientsPack, fieldOptions] = await Promise.all([
    leadQuery ?? Promise.resolve({ data: [], error: null }),
    fetchCrmPipelineSettings(),
    fetchClientsForClientsView(organizationId, {
      ownerId: access.userId,
      teamWide: access.canManageTeam,
    }),
    fetchMergedCrmFieldOptions(),
  ]);

  const { data: leads, error } = leadsRes;

  const leadRows = leads ?? [];

  let leadTagCatalog: LeadTagCatalogRow[] = [];
  const tagMetaById = new Map<
    string,
    { id: string; name: string; color: string }
  >();
  const tagsByLeadId = new Map<
    string,
    { id: string; name: string; color: string }[]
  >();

  if (organizationId) {
    const tagsRes = await supabase
      .from("lead_tag")
      .select("id, name, color")
      .eq("organization_id", organizationId)
      .order("name");

    const tagAssignmentCounts = new Map<string, number>();

    if (!tagsRes.error && tagsRes.data) {
      for (const t of tagsRes.data) {
        const id = t.id as string;
        tagMetaById.set(id, {
          id,
          name: t.name as string,
          color:
            typeof t.color === "string" && t.color.trim()
              ? t.color.trim()
              : "#2563eb",
        });
      }

      const assignRes = await supabase
        .from("lead_tag_assignment")
        .select("lead_id, tag_id")
        .eq("organization_id", organizationId);
      const assigns = assignRes.error ? [] : (assignRes.data ?? []);
      const leadIdOnPage = new Set(leadRows.map((l) => l.id as string));

      for (const a of assigns) {
        const lid = a.lead_id as string;
        if (!leadIdOnPage.has(lid)) continue;
        const tid = a.tag_id as string;
        tagAssignmentCounts.set(tid, (tagAssignmentCounts.get(tid) ?? 0) + 1);
        const meta = tagMetaById.get(tid);
        if (!meta) continue;
        if (!tagsByLeadId.has(lid)) tagsByLeadId.set(lid, []);
        tagsByLeadId.get(lid)!.push(meta);
      }

      for (const [, list] of tagsByLeadId) {
        list.sort((x, y) => x.name.localeCompare(y.name));
      }

      leadTagCatalog = tagsRes.data.map((t) => ({
        id: t.id as string,
        name: t.name as string,
        color:
          typeof t.color === "string" && t.color.trim()
            ? t.color.trim()
            : "#2563eb",
        leadCount: tagAssignmentCounts.get(t.id as string) ?? 0,
      }));
    }
  }
  const clientIds = [
    ...new Set(
      leadRows
        .map((l) => l.converted_client_id as string | null)
        .filter((id): id is string => Boolean(id?.trim()))
    ),
  ];

  const primaryProjectByClientId = new Map<
    string,
    { title: string | null; budget: number | null }
  >();
  if (organizationId && clientIds.length > 0) {
    const { data: projRows } = await supabase
      .from("project")
      .select("client_id, title, created_at, budget")
      .eq("organization_id", organizationId)
      .in("client_id", clientIds)
      .is("parent_project_id", null)
      .order("created_at", { ascending: false });
    for (const row of projRows ?? []) {
      const cid = row.client_id as string;
      if (!primaryProjectByClientId.has(cid)) {
        const raw = row.budget as number | string | null | undefined;
        const budgetNum =
          raw != null && raw !== ""
            ? Number(raw)
            : NaN;
        primaryProjectByClientId.set(cid, {
          title: (row.title as string | null) ?? null,
          budget: Number.isFinite(budgetNum) ? budgetNum : null,
        });
      }
    }
  }

  const appointmentStartsByLeadId = new Map<string, string[]>();
  const leadIdList = leadRows.map((l) => l.id as string);

  const dealValueByLeadId = new Map<string, number>();
  if (organizationId && leadIdList.length > 0) {
    const { data: dealRows } = await supabase
      .from("deal")
      .select("lead_id, value")
      .eq("organization_id", organizationId)
      .in("lead_id", leadIdList);
    for (const row of dealRows ?? []) {
      const lid = row.lead_id as string | null;
      if (!lid) continue;
      const n =
        row.value != null && row.value !== ""
          ? Number(row.value as number | string)
          : NaN;
      if (!Number.isFinite(n) || n <= 0) continue;
      const prev = dealValueByLeadId.get(lid);
      if (prev == null || n > prev) dealValueByLeadId.set(lid, n);
    }
  }

  if (organizationId && leadIdList.length > 0) {
    const { data: apptRows, error: apptErr } = await supabase
      .from("appointment")
      .select("lead_id, starts_at")
      .eq("organization_id", organizationId)
      .in("lead_id", leadIdList);
    if (!apptErr && apptRows) {
      for (const r of apptRows) {
        const lid = r.lead_id as string | null;
        if (!lid) continue;
        const st = r.starts_at as string;
        if (!appointmentStartsByLeadId.has(lid))
          appointmentStartsByLeadId.set(lid, []);
        appointmentStartsByLeadId.get(lid)!.push(st);
      }
    }
  }

  const leadsForView = leadRows.map((l) => {
    const cid = (l.converted_client_id as string | null)?.trim() ?? null;
    const lid = l.id as string;
    const nextAppointmentStartsAt = pickPipelineCardAppointmentStart(
      appointmentStartsByLeadId.get(lid) ?? []
    );
    return {
      ...l,
      primaryProject:
        cid && primaryProjectByClientId.has(cid)
          ? primaryProjectByClientId.get(cid)!
          : null,
      dealValue: dealValueByLeadId.get(lid) ?? null,
      leadTags: tagsByLeadId.get(lid) ?? [],
      nextAppointmentStartsAt,
    };
  });

  const clientsForTab = clientsPack.error ? [] : clientsPack.rows;

  return (
    <div className="p-8">
      {error ? (
        <div>
          <h1 className="heading-display text-2xl font-bold text-text-primary">
            Leads
          </h1>
          <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
            {error.message}. Apply{" "}
            <code className="font-mono text-xs">supabase/migrations</code>.
          </p>
        </div>
      ) : (
        <LeadsView
          leads={leadsForView}
          fieldOptions={fieldOptions}
          leadPipelineColumns={pipeline.lead}
          leadTagCatalog={leadTagCatalog}
          clientsForTab={clientsForTab}
          clientsTabLoadError={clientsPack.error}
          initialSection={initialSection}
          highlightClientId={highlightClientId}
        />
      )}
    </div>
  );
}
