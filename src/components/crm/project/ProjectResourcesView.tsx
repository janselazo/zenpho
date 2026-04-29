"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  Figma,
  Github,
  Globe,
  Link2,
} from "lucide-react";
import type { ResourceKind, WorkspaceResource } from "@/lib/crm/project-workspace-types";

const KINDS: { value: ResourceKind; label: string }[] = [
  { value: "doc", label: "Document" },
  { value: "design", label: "Design" },
  { value: "repo", label: "Repo" },
  { value: "website", label: "Website" },
  { value: "other", label: "Other" },
];

function KindIcon({ kind }: { kind: ResourceKind }) {
  switch (kind) {
    case "doc":
      return <FileText className="h-5 w-5" />;
    case "design":
      return <Figma className="h-5 w-5" />;
    case "repo":
      return <Github className="h-5 w-5" />;
    case "website":
      return <Globe className="h-5 w-5" />;
    default:
      return <Link2 className="h-5 w-5" />;
  }
}

type Props = {
  resources: WorkspaceResource[];
  onAdd: (label: string, url: string, kind: ResourceKind) => void;
  onUpdate: (id: string, label: string, url: string, kind: ResourceKind) => void;
  onDelete: (id: string) => void;
};

export default function ProjectResourcesView({
  resources,
  onAdd,
  onUpdate,
  onDelete,
}: Props) {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [kind, setKind] = useState<ResourceKind>("doc");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editKind, setEditKind] = useState<ResourceKind>("doc");

  useEffect(() => {
    if (editingId && !resources.some((r) => r.id === editingId)) {
      setEditingId(null);
    }
  }, [resources, editingId]);

  function startEdit(r: WorkspaceResource) {
    setEditingId(r.id);
    setEditLabel(r.label);
    setEditUrl(r.url);
    setEditKind(r.kind);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  function saveEdit() {
    if (!editingId) return;
    if (!editLabel.trim() || !editUrl.trim()) return;
    onUpdate(editingId, editLabel.trim(), editUrl.trim(), editKind);
    setEditingId(null);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-text-primary dark:text-zinc-100">
        Resources
      </h2>

      <form
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
        onSubmit={(e) => {
          e.preventDefault();
          if (!label.trim() || !url.trim()) return;
          onAdd(label, url, kind);
          setLabel("");
          setUrl("");
          setKind("doc");
        }}
      >
        <div className="min-w-[140px] flex-1">
          <label className="mb-1 block text-xs font-medium">Label</label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full rounded-lg border border-border px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
          />
        </div>
        <div className="min-w-[180px] flex-[2]">
          <label className="mb-1 block text-xs font-medium">URL</label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full rounded-lg border border-border px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
            placeholder="https://"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Type</label>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as ResourceKind)}
            className="rounded-lg border border-border px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
          >
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
        >
          Add
        </button>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {resources.length === 0 ? (
          <p className="col-span-full rounded-2xl border border-dashed border-border py-12 text-center text-sm text-text-secondary dark:border-zinc-700">
            No resources yet.
          </p>
        ) : (
          resources.map((r) => (
            <div
              key={r.id}
              className="flex items-start gap-3 rounded-xl border border-border bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <div className="text-text-secondary">
                <KindIcon kind={editingId === r.id ? editKind : r.kind} />
              </div>
              <div className="min-w-0 flex-1">
                {editingId === r.id ? (
                  <>
                    <input
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      className="mb-2 w-full rounded-lg border border-border px-2 py-1.5 text-sm font-medium dark:border-zinc-600 dark:bg-zinc-800"
                      aria-label="Resource label"
                    />
                    <input
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      className="mb-2 w-full rounded-lg border border-border px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                      placeholder="https://"
                      aria-label="Resource URL"
                    />
                    <select
                      value={editKind}
                      onChange={(e) =>
                        setEditKind(e.target.value as ResourceKind)
                      }
                      className="mb-2 w-full rounded-lg border border-border px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                      aria-label="Resource type"
                    >
                      {KINDS.map((k) => (
                        <option key={k.value} value={k.value}>
                          {k.label}
                        </option>
                      ))}
                    </select>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={saveEdit}
                        className="text-xs font-semibold text-accent hover:underline"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="text-xs text-text-secondary hover:underline dark:text-zinc-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-text-primary dark:text-zinc-100">
                      {r.label}
                    </p>
                    <a
                      href={
                        /^https?:\/\//i.test(r.url)
                          ? r.url
                          : `https://${r.url}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 block truncate text-sm text-accent hover:underline"
                    >
                      {r.url}
                    </a>
                    <div className="mt-2 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => startEdit(r)}
                        className="text-xs font-semibold text-accent hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(r.id)}
                        className="text-xs text-red-600 hover:underline dark:text-red-400"
                      >
                        Remove
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
