"use client";

// รายการที่สลับลำดับได้ 3 ทาง: ลาก (เมาส์/นิ้ว — มือถือกดค้างก่อนลาก), คีย์บอร์ด, และปุ่มลูกศรบนการ์ด
// (ปุ่มลูกศรสำหรับคนที่ลากไม่ถนัด — WCAG 2.2 ต้องมีทางเลือกแทนการลาก)
import { useId } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/** ใส่ให้ปุ่มที่อยู่ในการ์ดที่ลากได้ เพื่อให้กดปุ่มแล้วไม่เริ่มลาก */
export const noDrag = {
  onMouseDown: (e: React.SyntheticEvent) => e.stopPropagation(),
  onTouchStart: (e: React.SyntheticEvent) => e.stopPropagation(),
  onKeyDown: (e: React.SyntheticEvent) => e.stopPropagation(),
};

export function SortableList<T extends { id: string }>({
  items,
  onChange,
  layout,
  className,
  itemLabel,
  children,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  layout: "grid" | "list";
  className?: string;
  /** ชื่อรายการสำหรับโปรแกรมอ่านหน้าจอ */
  itemLabel: (item: T, index: number) => string;
  /** move(to) = ย้ายรายการนี้ไปตำแหน่ง to (ใช้กับปุ่มลูกศร) */
  children: (item: T, index: number, move: (to: number) => void) => React.ReactNode;
}) {
  const id = useId();
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const labelOf = (key: string | number) => {
    const index = items.findIndex((i) => i.id === key);
    return index >= 0 ? itemLabel(items[index], index) : "";
  };

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = items.findIndex((i) => i.id === active.id);
    const to = items.findIndex((i) => i.id === over.id);
    if (from >= 0 && to >= 0) onChange(arrayMove(items, from, to));
  }

  return (
    <DndContext
      id={id}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      accessibility={{
        screenReaderInstructions: {
          draggable: "กด Space หรือ Enter เพื่อหยิบ ใช้ปุ่มลูกศรเพื่อย้าย แล้วกด Space อีกครั้งเพื่อวาง กด Esc เพื่อยกเลิก",
        },
        announcements: {
          onDragStart: ({ active }) => `หยิบ ${labelOf(active.id)}`,
          onDragOver: ({ active, over }) => (over ? `${labelOf(active.id)} อยู่ที่ตำแหน่งของ ${labelOf(over.id)}` : ""),
          onDragEnd: ({ active, over }) => (over ? `วาง ${labelOf(active.id)} แล้ว` : "ยกเลิกการย้าย"),
          onDragCancel: () => "ยกเลิกการย้าย",
        },
      }}
    >
      <SortableContext items={items} strategy={layout === "grid" ? rectSortingStrategy : verticalListSortingStrategy}>
        <ul className={className}>
          {items.map((item, index) => (
            <SortableItem key={item.id} id={item.id} label={itemLabel(item, index)}>
              {children(item, index, (to) => {
                if (to >= 0 && to < items.length && to !== index) onChange(arrayMove(items, index, to));
              })}
            </SortableItem>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableItem({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition, zIndex: isDragging ? 20 : undefined }}
      className={`relative cursor-grab touch-manipulation rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-primary active:cursor-grabbing ${
        isDragging ? "opacity-90 shadow-2xl ring-2 ring-primary" : ""
      }`}
      {...attributes}
      aria-label={label}
      {...listeners}
    >
      {children}
    </li>
  );
}

/** ปุ่มเลื่อนก่อน/หลัง ใต้การ์ด */
export function MoveButtons({
  index,
  count,
  move,
  name,
  children,
}: {
  index: number;
  count: number;
  move: (to: number) => void;
  /** เช่น "ไฟล์ a.pdf" — ใช้ในชื่อปุ่มสำหรับโปรแกรมอ่านหน้าจอ */
  name: string;
  children?: React.ReactNode;
}) {
  const cls =
    "grid h-11 w-11 shrink-0 place-items-center rounded-xl text-muted transition-colors hover:bg-primary-soft hover:text-primary disabled:opacity-25 disabled:hover:bg-transparent sm:h-9 sm:w-9";
  return (
    <div className="mt-1 flex items-center gap-1">
      <button type="button" {...noDrag} className={cls} disabled={index === 0} onClick={() => move(index - 1)} aria-label={`เลื่อน${name}ไปก่อนหน้า`}>
        <Chevron dir="left" />
      </button>
      <div className="min-w-0 flex-1 text-center">{children}</div>
      <button
        type="button"
        {...noDrag}
        className={cls}
        disabled={index === count - 1}
        onClick={() => move(index + 1)}
        aria-label={`เลื่อน${name}ไปถัดไป`}
      >
        <Chevron dir="right" />
      </button>
    </div>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={dir === "left" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
    </svg>
  );
}

/** ปุ่มไอคอนบนมุมภาพย่อ (ลบ/หมุน) — 40px บนมือถือ (ใหญ่กว่านี้จะบังภาพย่อบนจอแคบ) */
export function OverlayButton({
  label,
  tone = "default",
  onClick,
  children,
}: {
  label: string;
  tone?: "default" | "danger";
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      {...noDrag}
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`grid h-10 w-10 place-items-center rounded-full border border-line bg-card/95 text-muted shadow-sm transition-colors sm:h-9 sm:w-9 ${
        tone === "danger" ? "hover:border-danger hover:text-danger" : "hover:border-primary hover:text-primary"
      }`}
    >
      {children}
    </button>
  );
}
