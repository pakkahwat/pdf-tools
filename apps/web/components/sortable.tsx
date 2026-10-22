"use client";

// รายการที่ลากสลับลำดับได้ (เมาส์ นิ้ว และคีย์บอร์ด) — บนมือถือต้องกดค้างเล็กน้อยก่อนลาก เพื่อให้ยังเลื่อนหน้าจอได้
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
  children: (item: T, index: number) => React.ReactNode;
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
              {children(item, index)}
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
      className={`relative cursor-grab touch-manipulation rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-primary active:cursor-grabbing ${
        isDragging ? "opacity-90 shadow-2xl" : ""
      }`}
      {...attributes}
      aria-label={label}
      {...listeners}
    >
      {children}
    </li>
  );
}
