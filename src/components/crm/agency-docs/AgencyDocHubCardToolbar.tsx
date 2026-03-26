"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { hideAgencyDocHubCard } from "@/app/(crm)/actions/agency-docs";
import { getAgencyDocBySlug } from "@/lib/crm/agency-docs";
import AgencyDocHubCardEditModal from "@/components/crm/agency-docs/AgencyDocHubCardEditModal";

type AgencyDocHubCardToolbarProps = {
  slug: string;
  title: string;
  description: string;
  canPersist: boolean;
};

export default function AgencyDocHubCardToolbar({
  slug,
  title,
  description,
  canPersist,
}: AgencyDocHubCardToolbarProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);

  if (!canPersist) return null;

  async function onDelete() {
    const isBuiltIn = Boolean(getAgencyDocBySlug(slug));
    const ok = window.confirm(
      isBuiltIn
        ? "Remove this card from the hub? The built-in document still opens from a direct link."
        : "Delete this custom document? Its hub card and saved content will be removed, and you can create a new doc with the same title."
    );
    if (!ok) return;
    const res = await hideAgencyDocHubCard(slug);
    if ("error" in res && res.error) {
      window.alert(res.error);
      return;
    }
    router.refresh();
  }

  return (
    <>
      <div className="absolute bottom-3 right-3 z-10 flex items-center gap-px rounded-md border border-border/80 bg-white/95 p-px shadow-sm backdrop-blur-sm transition-opacity duration-150 motion-reduce:transition-none dark:border-zinc-700/90 dark:bg-zinc-900/95 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setEditOpen(true);
          }}
          className="rounded p-1 text-text-secondary transition-colors hover:bg-surface hover:text-accent dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-blue-400"
          aria-label="Edit card"
        >
          <Pencil className="h-3 w-3" aria-hidden strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void onDelete();
          }}
          className="rounded p-1 text-text-secondary transition-colors hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-950/50 dark:hover:text-red-400"
          aria-label="Remove card from hub"
        >
          <Trash2 className="h-3 w-3" aria-hidden strokeWidth={2} />
        </button>
      </div>
      <AgencyDocHubCardEditModal
        slug={slug}
        initialTitle={title}
        initialDescription={description}
        open={editOpen}
        onClose={() => setEditOpen(false)}
      />
    </>
  );
}
