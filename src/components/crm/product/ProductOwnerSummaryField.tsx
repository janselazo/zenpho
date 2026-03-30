"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UserCircle2 } from "lucide-react";
import { setProductPointOfContact } from "@/app/(crm)/actions/projects";
import { useCrmTeamMembers } from "@/lib/crm/use-crm-team-members";

type Props = {
  productId: string;
  teamId: string;
  pointOfContactMemberId: string | null;
  pointOfContactName: string | null;
};

export default function ProductOwnerSummaryField({
  productId,
  teamId,
  pointOfContactMemberId,
  pointOfContactName,
}: Props) {
  const router = useRouter();
  const members = useCrmTeamMembers();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const pickList = useMemo(() => {
    const onTeam = members.filter((m) => m.teamId === teamId);
    return onTeam.length > 0 ? onTeam : members;
  }, [members, teamId]);

  const resolvedLabel = useMemo(() => {
    if (pointOfContactName?.trim()) return pointOfContactName.trim();
    if (pointOfContactMemberId) {
      const m = members.find((x) => x.id === pointOfContactMemberId);
      if (m?.name?.trim()) return m.name.trim();
    }
    return null;
  }, [pointOfContactName, pointOfContactMemberId, members]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const el = containerRef.current;
      if (el && !el.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function pick(memberId: string, name: string) {
    setPending(true);
    const res = await setProductPointOfContact(productId, {
      memberId,
      displayName: name,
    });
    setPending(false);
    if ("error" in res && res.error) {
      window.alert(res.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  async function clearOwner() {
    setPending(true);
    const res = await setProductPointOfContact(productId, { memberId: null });
    setPending(false);
    if ("error" in res && res.error) {
      window.alert(res.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <div ref={containerRef} className="relative flex items-center gap-2">
      <span className="font-medium text-text-primary dark:text-zinc-100">
        {resolvedLabel ?? "Not assigned"}
      </span>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border text-text-secondary transition-colors hover:border-accent hover:text-accent disabled:opacity-50 dark:border-zinc-600 dark:hover:border-accent"
        aria-label={
          resolvedLabel ? "Change point of contact" : "Assign point of contact"
        }
        aria-expanded={open}
      >
        <UserCircle2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
      </button>
      {open ? (
        <div
          className="absolute left-0 top-full z-50 mt-1 max-h-64 w-[min(18rem,calc(100vw-2rem))] overflow-auto rounded-xl border border-border bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
          role="listbox"
          aria-label="Choose point of contact"
        >
          {pickList.length === 0 ? (
            <p className="px-3 py-2 text-xs text-text-secondary dark:text-zinc-500">
              Add people on the Team page first, then assign an owner here.
            </p>
          ) : (
            <ul className="text-sm">
              {pickList.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    role="option"
                    className="flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-surface dark:hover:bg-zinc-800"
                    onClick={() =>
                      void pick(m.id, m.name?.trim() || "Team member")
                    }
                  >
                    <span className="font-medium text-text-primary dark:text-zinc-100">
                      {m.name?.trim() || "—"}
                    </span>
                    {m.email?.trim() ? (
                      <span className="truncate text-xs text-text-secondary dark:text-zinc-500">
                        {m.email.trim()}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {resolvedLabel ? (
            <button
              type="button"
              className="w-full border-t border-border px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 dark:border-zinc-700 dark:text-red-400 dark:hover:bg-red-950/30"
              onClick={() => void clearOwner()}
            >
              Clear owner
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
