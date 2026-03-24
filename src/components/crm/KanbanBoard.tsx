"use client";

import {
  type ReactNode,
  useRef,
  useState,
  useEffect,
  type DragEvent,
} from "react";

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
}

export default function KanbanBoard<T extends { id: string }>({
  columns,
  renderCard,
  onAddNew,
  onMove,
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
        return (
          <div
            key={col.id}
            className={`flex w-[min(100%,20.5rem)] shrink-0 flex-col rounded-2xl bg-[#eceef2] transition-[box-shadow,background-color] dark:bg-zinc-800/55 ${
              isOver
                ? "ring-2 ring-violet-500/35 ring-offset-2 ring-offset-surface dark:ring-violet-400/30 dark:ring-offset-zinc-950"
                : ""
            }`}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDragLeave={(e) => handleDragLeave(e, col.id)}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            <div className="flex items-center gap-2.5 px-3.5 pb-2 pt-3.5">
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
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg font-light leading-none text-zinc-500 transition-colors hover:bg-white/70 hover:text-violet-600 dark:text-zinc-400 dark:hover:bg-zinc-700/60 dark:hover:text-violet-300"
                  aria-label={`Add to ${col.label}`}
                >
                  +
                </button>
              )}
            </div>

            <div className="flex min-h-[5rem] flex-1 flex-col gap-3 px-2.5 pb-2 pt-0.5">
              {col.items.length === 0 && !isOver ? (
                <div className="rounded-xl py-10 text-center text-[12px] font-medium text-zinc-400/90 dark:text-zinc-500">
                  No projects
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

            {onAddNew && (
              <button
                type="button"
                onClick={() => onAddNew(col.id)}
                className="mx-2 mb-2.5 rounded-lg px-2 py-2 text-left text-[12px] font-semibold text-zinc-500 transition-colors hover:bg-white/60 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700/40 dark:hover:text-zinc-200"
              >
                + Add project
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
