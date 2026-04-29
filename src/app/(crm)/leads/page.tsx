import LeadsView from "@/components/crm/LeadsView";
import { fetchClientsForClientsView } from "@/lib/crm/fetch-clients-for-view";
import { fetchMergedCrmFieldOptions } from "@/lib/crm/fetch-crm-field-options";
import { fetchCrmPipelineSettings } from "@/lib/crm/fetch-pipeline-settings";
import type { LeadTagCatalogRow } from "@/lib/crm/lead-tag-catalog";
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
  const [leadsRes, pipeline, clientsPack, fieldOptions] = await Promise.all([
    supabase
      .from("lead")
      .select(
        "id, name, email, phone, company, stage, source, notes, project_type, contact_category, temperature, created_at, converted_client_id"
      )
      .order("created_at", { ascending: false })
      .limit(200),
    fetchCrmPipelineSettings(),
    fetchClientsForClientsView(),
    fetchMergedCrmFieldOptions(),
  ]);

  const { data: leads, error } = leadsRes;

  const leadRows = leads ?? [];

  let leadTagCatalog: LeadTagCatalogRow[] = [];
  const tagsRes = await supabase
    .from("lead_tag")
    .select("id, name, color")
    .order("name");
  const tagMetaById = new Map<
    string,
    { id: string; name: string; color: string }
  >();
  const tagsByLeadId = new Map<
    string,
    { id: string; name: string; color: string }[]
  >();
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
      .select("lead_id, tag_id");
    const assigns = assignRes.error ? [] : (assignRes.data ?? []);
    const leadIdOnPage = new Set(leadRows.map((l) => l.id as string));

    for (const a of assigns) {
      const tid = a.tag_id as string;
      tagAssignmentCounts.set(tid, (tagAssignmentCounts.get(tid) ?? 0) + 1);
      const lid = a.lead_id as string;
      if (!leadIdOnPage.has(lid)) continue;
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
  const clientIds = [
    ...new Set(
      leadRows
        .map((l) => l.converted_client_id as string | null)
        .filter((id): id is string => Boolean(id?.trim()))
    ),
  ];

  const primaryProjectByClientId = new Map<
    string,
    { title: string | null }
  >();
  if (clientIds.length > 0) {
    const { data: projRows } = await supabase
      .from("project")
      .select("client_id, title, created_at")
      .in("client_id", clientIds)
      .is("parent_project_id", null)
      .order("created_at", { ascending: false });
    for (const row of projRows ?? []) {
      const cid = row.client_id as string;
      if (!primaryProjectByClientId.has(cid)) {
        primaryProjectByClientId.set(cid, {
          title: (row.title as string | null) ?? null,
        });
      }
    }
  }

  const appointmentStartsByLeadId = new Map<string, string[]>();
  const leadIdList = leadRows.map((l) => l.id as string);
  if (leadIdList.length > 0) {
    const { data: apptRows, error: apptErr } = await supabase
      .from("appointment")
      .select("lead_id, starts_at")
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
