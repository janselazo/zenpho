"use client";

import {
  type ReactNode,
  useRef,
  useState,
  useEffect,
  type DragEvent,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface KanbanColumn<T> {
  id: string;
  label: string;
  color: string;
  items: T[];
  /** Optional column icon (e.g. status glyph); falls back to a color dot */
  icon?: ReactNode;
}

interface KanbanBoardProps<T> {
  columns: KanbanColumn<T>[];
  renderCard: (item: T) => ReactNode;
  onAddNew?: (columnId: string) => void;
  onMove?: (itemId: string, fromColumnId: string, toColumnId: string) => void;
  /** Shown when a column has no cards (default: "No projects"). */
  emptyColumnLabel?: string;
  /** Column ids that can collapse to a narrow strip (e.g. Won/Lost on leads). */
  collapsibleColumnIds?: ReadonlySet<string>;
  collapsedColumnIds?: ReadonlySet<string>;
  onToggleColumnCollapse?: (columnId: string) => void;
}

export default function KanbanBoard<T extends { id: string }>({
  columns,
  renderCard,
  onAddNew,
  onMove,
  emptyColumnLabel = "No projects",
  collapsibleColumnIds,
  collapsedColumnIds,
  onToggleColumnCollapse,
}: KanbanBoardProps<T>) {
  const dragRef = useRef<{ itemId: string; colId: string } | null>(null);
  const [dragItemId, setDragItemId] = useState<string | null>(null);
  const [dropTargetCol, setDropTargetCol] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  // Disable draggable on all inner <a> tags so they don't hijack the drag
  useEffect(() => {
    if (!onMove || !boardRef.current) return;
    const anchors = boardRef.current.querySelectorAll("a");
    anchors.forEach((a) => a.setAttribute("draggable", "false"));
  });

  function handleDragStart(e: DragEvent, itemId: string, colId: string) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", itemId);
    dragRef.current = { itemId, colId };
    requestAnimationFrame(() => setDragItemId(itemId));
  }

  function handleDragEnd() {
    dragRef.current = null;
    setDragItemId(null);
    setDropTargetCol(null);
  }

  function handleDragOver(e: DragEvent, colId: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dropTargetCol !== colId) setDropTargetCol(colId);
  }

  function handleDragLeave(e: DragEvent, colId: string) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const { clientX, clientY } = e;
    if (
      clientX < rect.left ||
      clientX > rect.right ||
      clientY < rect.top ||
      clientY > rect.bottom
    ) {
      if (dropTargetCol === colId) setDropTargetCol(null);
    }
  }

  function handleDrop(e: DragEvent, colId: string) {
    e.preventDefault();
    setDropTargetCol(null);
    const ref = dragRef.current;
    if (onMove && ref && ref.colId !== colId) {
      onMove(ref.itemId, ref.colId, colId);
    }
    dragRef.current = null;
    setDragItemId(null);
  }

  return (
    <div
      ref={boardRef}
      className="flex gap-4 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:thin] [scrollbar-color:rgba(0,0,0,0.12)_transparent] dark:[scrollbar-color:rgba(255,255,255,0.12)_transparent]"
    >
      {columns.map((col) => {
        const isOver =
          dropTargetCol === col.id &&
          dragRef.current !== null &&
          dragRef.current.colId !== col.id;
        const collapsible =
          !!collapsibleColumnIds &&
          !!onToggleColumnCollapse &&
          collapsibleColumnIds.has(col.id);
        const isCollapsed =
          collapsible && !!collapsedColumnIds?.has(col.id);

        const shellClass = isCollapsed
          ? "w-[3.35rem] min-w-[3.35rem] max-w-[3.35rem]"
          : "w-[min(100%,20.5rem)]";

        return (
          <div
            key={col.id}
            className={`flex ${shellClass} shrink-0 flex-col rounded-2xl border border-zinc-200/80 bg-zinc-50/95 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[box-shadow,background-color,border-color,width] dark:border-zinc-700/70 dark:bg-zinc-900/50 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] ${
              isOver
                ? "ring-2 ring-violet-500/35 ring-offset-2 ring-offset-white dark:ring-violet-400/30 dark:ring-offset-zinc-950"
                : ""
            }`}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDragLeave={(e) => handleDragLeave(e, col.id)}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            {isCollapsed ? (
              <>
                <div className="flex flex-col items-center gap-2 border-b border-zinc-200/70 px-1.5 pb-2.5 pt-3 dark:border-zinc-700/70">
                  <button
                    type="button"
                    onClick={() => onToggleColumnCollapse!(col.id)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-white hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    aria-expanded={false}
                    aria-label={`Expand ${col.label} column`}
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </button>
                  <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-bold tabular-nums text-sky-900 dark:bg-sky-950/80 dark:text-sky-100">
                    {col.items.length}
                  </span>
                </div>
                <div className="flex min-h-[10rem] flex-1 flex-col items-center justify-center bg-white/60 px-0 py-4 dark:bg-zinc-950/40">
                  <span
                    className="text-[12px] font-semibold tracking-tight text-zinc-600 dark:text-zinc-300"
                    style={{
                      writingMode: "vertical-rl",
                      transform: "rotate(180deg)",
                    }}
                  >
                    {col.label}
                  </span>
                </div>
                {isOver ? (
                  <div className="border-t border-violet-200/80 bg-violet-50/90 px-1 py-2 text-center text-[10px] font-semibold leading-tight text-violet-700 dark:border-violet-900/40 dark:bg-violet-950/50 dark:text-violet-300">
                    Drop
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 px-3.5 pb-2 pt-3.5">
                  {collapsible ? (
                    <button
                      type="button"
                      onClick={() => onToggleColumnCollapse!(col.id)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                      aria-expanded
                      aria-label={`Collapse ${col.label} column`}
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden />
                    </button>
                  ) : null}
                  {col.icon ?? (
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: col.color }}
                    />
                  )}
                  <span className="min-w-0 flex-1 text-[13px] font-semibold tracking-tight text-zinc-800 dark:text-zinc-100">
                    {col.label}
                    <span className="ml-1 font-medium text-zinc-500 dark:text-zinc-400">
                      ({col.items.length})
                    </span>
                  </span>
                  {onAddNew && (
                    <button
                      type="button"
                      onClick={() => onAddNew(col.id)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg font-light leading-none text-zinc-500 transition-colors hover:bg-white hover:text-violet-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-violet-300"
                      aria-label={`Add to ${col.label}`}
                    >
                      +
                    </button>
                  )}
                </div>

                <div className="flex min-h-[5rem] flex-1 flex-col gap-3 px-2.5 pb-3 pt-0.5">
                  {col.items.length === 0 && !isOver ? (
                    <div className="rounded-xl py-10 text-center text-[12px] font-medium text-zinc-400/90 dark:text-zinc-500">
                      {emptyColumnLabel}
                    </div>
                  ) : (
                    col.items.map((item) => (
                      <div
                        key={item.id}
                        draggable={!!onMove}
                        onDragStart={(e) => handleDragStart(e, item.id, col.id)}
                        onDragEnd={handleDragEnd}
                        className={`select-none ${
                          onMove ? "cursor-grab active:cursor-grabbing" : ""
                        } ${dragItemId === item.id ? "scale-[0.98] opacity-40" : ""}`}
                      >
                        {renderCard(item)}
                      </div>
                    ))
                  )}
                  {isOver && (
                    <div className="rounded-xl border-2 border-dashed border-violet-400/50 bg-white/70 py-6 text-center text-[12px] font-semibold text-violet-600 dark:border-violet-500/35 dark:bg-zinc-900/50 dark:text-violet-300">
                      Drop here
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
