"use client";

import { useEffect, useState, useTransition } from "react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GripVertical } from "lucide-react";
import { reorderAgencyDocHubCards } from "@/app/(crm)/actions/agency-docs";
import { hubDocIcon } from "@/lib/crm/agency-doc-icons";
import { getAgencyDocBySlug } from "@/lib/crm/agency-docs";
import type { AgencyHubDocItem } from "@/lib/crm/agency-docs-hub";
import type { AgencyDocType } from "@/lib/crm/agency-custom-doc";
import AgencyDocHubCardToolbar from "@/components/crm/agency-docs/AgencyDocHubCardToolbar";

type Props = {
  items: AgencyHubDocItem[];
  canPersist: boolean;
  docType?: AgencyDocType;
  basePath?: string;
};

function serverItemsKey(items: AgencyHubDocItem[]) {
  return items
    .map((i) => `${i.slug}\x1f${i.title}\x1f${i.description}`)
    .join("\x1e");
}

export default function AgencyDocsHubSortableGrid({
  items,
  canPersist,
  docType = "doc",
  basePath = "/docs",
}: Props) {
  const router = useRouter();
  const [ordered, setOrdered] = useState(items);
  const [pending, startTransition] = useTransition();

  const serverKey = serverItemsKey(items);
  useEffect(() => {
    setOrdered(items);
  }, [serverKey, items]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    if (!canPersist) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ordered.findIndex((i) => i.slug === active.id);
    const newIndex = ordered.findIndex((i) => i.slug === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const previous = ordered;
    const next = arrayMove(ordered, oldIndex, newIndex);
    setOrdered(next);
    startTransition(async () => {
      const res = await reorderAgencyDocHubCards(next.map((i) => i.slug), docType);
      if ("error" in res && res.error) {
        setOrdered(previous);
        window.alert(res.error);
        return;
      }
      router.refresh();
    });
  }

  const gridClass =
    "mt-10 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

  if (!canPersist) {
    return (
      <ul className={gridClass}>
        {items.map((item) => (
          <HubDocCardStatic key={item.slug} item={item} basePath={basePath} docType={docType} />
        ))}
      </ul>
    );
  }

  return (
    <DndContext
      id="agency-docs-hub-grid"
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={ordered.map((i) => i.slug)}
        strategy={rectSortingStrategy}
      >
        <ul className={gridClass}>
          {ordered.map((item) => (
            <HubDocCardSortable
              key={item.slug}
              item={item}
              persistPending={pending}
              basePath={basePath}
              docType={docType}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function HubDocCardStatic({
  item,
  basePath = "/docs",
  docType = "doc",
}: {
  item: AgencyHubDocItem;
  basePath?: string;
  docType?: AgencyDocType;
}) {
  const reg = getAgencyDocBySlug(item.slug);
  const Icon = reg?.icon ?? hubDocIcon(item.iconKey);
  return (
    <li className="group relative">
      <AgencyDocHubCardToolbar
        slug={item.slug}
        title={item.title}
        description={item.description}
        canPersist={false}
        docType={docType}
      />
      <Link
        href={`${basePath}/${item.slug}`}
        className="flex h-full flex-col rounded-2xl border border-border bg-white p-6 pb-10 shadow-sm transition-colors hover:border-accent/25 hover:bg-surface/80 dark:border-zinc-800 dark:bg-zinc-900/80 dark:hover:border-blue-500/25 dark:hover:bg-zinc-800/60"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-text-secondary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <span className="mt-4 text-base font-semibold text-text-primary dark:text-zinc-100">
          {item.title}
        </span>
        <span className="mt-2 flex-1 text-sm leading-relaxed text-text-secondary dark:text-zinc-400">
          {item.description}
        </span>
      </Link>
    </li>
  );
}

function HubDocCardSortable({
  item,
  persistPending,
  basePath = "/docs",
  docType = "doc",
}: {
  item: AgencyHubDocItem;
  persistPending: boolean;
  basePath?: string;
  docType?: AgencyDocType;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.slug });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
    zIndex: isDragging ? 20 : undefined,
  };

  const reg = getAgencyDocBySlug(item.slug);
  const Icon = reg?.icon ?? hubDocIcon(item.iconKey);

  return (
    <li ref={setNodeRef} style={style} className="group relative">
      <button
        type="button"
        className="absolute bottom-3 left-3 z-10 flex cursor-grab touch-none rounded-md border border-border/80 bg-white/95 p-1 text-text-secondary shadow-sm backdrop-blur-sm transition-opacity duration-150 hover:bg-surface active:cursor-grabbing motion-reduce:transition-none dark:border-zinc-700/90 dark:bg-zinc-900/95 dark:hover:bg-zinc-800 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-3 w-3" aria-hidden strokeWidth={2} />
      </button>
      <AgencyDocHubCardToolbar
        slug={item.slug}
        title={item.title}
        description={item.description}
        canPersist
        docType={docType}
      />
      <Link
        href={`${basePath}/${item.slug}`}
        className={`flex h-full flex-col rounded-2xl border border-border bg-white p-6 pb-10 shadow-sm transition-colors hover:border-accent/25 hover:bg-surface/80 dark:border-zinc-800 dark:bg-zinc-900/80 dark:hover:border-blue-500/25 dark:hover:bg-zinc-800/60 ${
          persistPending ? "pointer-events-none opacity-70" : ""
        }`}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-text-secondary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <span className="mt-4 text-base font-semibold text-text-primary dark:text-zinc-100">
          {item.title}
        </span>
        <span className="mt-2 flex-1 text-sm leading-relaxed text-text-secondary dark:text-zinc-400">
          {item.description}
        </span>
      </Link>
    </li>
  );
}
