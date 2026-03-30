"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { updateLeadRow } from "@/app/(crm)/actions/crm";
import { LEAD_PROJECT_TYPE_OPTIONS } from "@/lib/crm/mock-data";
import CrmNewProjectFromLeadModal from "@/components/crm/CrmNewProjectFromLeadModal";
import TabBar from "@/components/crm/TabBar";
import {
  DEFAULT_LEAD_PIPELINE_COLUMNS,
  leadStageLabelColor,
  type PipelineColumnDef,
} from "@/lib/crm/pipeline-columns";

const inputClass =
  "w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent/15";

const LEAD_TABS = [
  { id: "contact", label: "Contact" },
  { id: "projects", label: "Projects" },
] as const;

type Lead = {
  id: string;
  name: string | null;
  email: string | null;
  company: string | null;
  phone: string | null;
  source: string | null;
  stage: string | null;
  notes: string | null;
  project_type: string | null;
};

export type ClientProjectRow = {
  id: string;
  title: string | null;
};

export default function LeadEditForm({
  lead,
  clientProjects,
  convertedClientId,
  leadPipelineColumns = DEFAULT_LEAD_PIPELINE_COLUMNS,
}: {
  lead: Lead;
  /** Projects for `converted_client_id`, newest first */
  clientProjects: ClientProjectRow[];
  convertedClientId: string | null;
  leadPipelineColumns?: PipelineColumnDef[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>("contact");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);

  const leadStageOptions: PipelineColumnDef[] = (() => {
    const list = leadPipelineColumns.map((c) => ({ ...c }));
    const s = (lead.stage ?? "").trim();
    if (s && !list.some((c) => c.slug === s)) {
      const m = leadStageLabelColor(s, leadPipelineColumns);
      list.unshift({ slug: s, label: m.label, color: m.color });
    }
    return list;
  })();

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "deal" || tab === "projects") setActiveTab("projects");
  }, [searchParams]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const res = await updateLeadRow(fd);
    setPending(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <>
      <form
        onSubmit={onSubmit}
        className="rounded-2xl border border-border bg-white shadow-sm"
      >
        <input type="hidden" name="id" value={lead.id} />

        <div className="px-6 pt-5">
          <TabBar
            tabs={[...LEAD_TABS]}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>

        <div className="border-t border-border px-6 pb-6 pt-5">
          {error ? (
            <p className="mb-4 text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          {saved ? (
            <p className="mb-4 text-sm text-emerald-800">Saved.</p>
          ) : null}

          <div
            className={activeTab === "contact" ? "space-y-4" : "hidden"}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  Name
                </label>
                <input
                  name="name"
                  type="text"
                  defaultValue={lead.name ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  Email
                </label>
                <input
                  name="email"
                  type="email"
                  defaultValue={lead.email ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  Company
                </label>
                <input
                  name="company"
                  type="text"
                  defaultValue={lead.company ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  Phone
                </label>
                <input
                  name="phone"
                  type="tel"
                  defaultValue={lead.phone ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  Source
                </label>
                <input
                  name="source"
                  type="text"
                  defaultValue={lead.source ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  Project type
                </label>
                <select
                  name="project_type"
                  defaultValue={lead.project_type ?? ""}
                  className={inputClass}
                >
                  <option value="">Not set</option>
                  {LEAD_PROJECT_TYPE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  Lead stage
                </label>
                <select
                  name="stage"
                  defaultValue={
                    (lead.stage ?? "").trim() ||
                    leadPipelineColumns[0]?.slug ||
                    "new"
                  }
                  className={inputClass}
                >
                  {leadStageOptions.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Notes
              </label>
              <textarea
                name="notes"
                rows={4}
                defaultValue={lead.notes ?? ""}
                className={inputClass}
              />
            </div>
          </div>

          <div className={activeTab === "projects" ? "space-y-4" : "hidden"}>
            <p className="text-sm text-text-secondary">
              Commercial work and delivery run on{" "}
              <Link href="/projects" className="font-medium text-accent hover:underline">
                Projects
              </Link>
              . Create a project from this lead to capture budget, timeline, and
              team on the board.
            </p>
            <button
              type="button"
              onClick={() => setProjectModalOpen(true)}
              className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
            >
              New project from this lead
            </button>
            {convertedClientId ? (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary/60">
                  Linked client projects
                </p>
                {clientProjects.length === 0 ? (
                  <p className="text-sm text-text-secondary">
                    No projects yet for this client.
                  </p>
                ) : (
                  <ul className="divide-y divide-border rounded-xl border border-border">
                    {clientProjects.map((p) => (
                      <li key={p.id}>
                        <Link
                          href={`/projects/${p.id}`}
                          className="block px-4 py-3 text-sm font-medium text-accent hover:bg-surface hover:underline"
                        >
                          {p.title?.trim() || "Untitled project"}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <p className="rounded-lg border border-border bg-surface/50 px-3 py-2 text-sm text-text-secondary">
                No client linked yet. Starting a project from this lead creates
                the client and links it automatically.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={pending}
            className="mt-6 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
      {projectModalOpen ? (
        <CrmNewProjectFromLeadModal
          leadId={lead.id}
          onClose={() => {
            setProjectModalOpen(false);
            router.refresh();
          }}
        />
      ) : null}
    </>
  );
}
