"use client";

import { formatBytes } from "@/lib/files";
import { downloadBlob, type useTask } from "@/lib/use-task";
import { Button, ErrorBox, Spinner } from "./ui";

type Task = ReturnType<typeof useTask>;

/** แสดงผลของ useTask: กำลังทำ / error / ไฟล์ผลลัพธ์พร้อมปุ่มดาวน์โหลด */
export function TaskStatus({
  task,
  onStartOver,
  startOverLabel = "ทำไฟล์อื่นต่อ",
}: {
  task: Task;
  onStartOver: () => void;
  startOverLabel?: string;
}) {
  const { state } = task;
  if (state.status === "idle") return null;
  if (state.status === "working") {
    return (
      <div role="status" className="flex items-center gap-3 rounded-xl bg-primary-soft px-4 py-3 text-primary">
        <Spinner />
        <span>{state.progress ?? "กำลังประมวลผล…"}</span>
      </div>
    );
  }
  if (state.status === "error") return <ErrorBox message={state.error} />;

  const { result } = state;
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-ok/40 bg-card p-5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ok/15 text-ok">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
            <path d="m5 12 5 5 9-10" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="font-medium">เสร็จแล้ว</p>
          <p className="truncate text-sm text-muted" title={result.name}>
            {result.name} · {formatBytes(result.blob.size)}
            {result.note ? ` · ${result.note}` : ""}
          </p>
        </div>
      </div>
      <div className="grid gap-2">
        <Button variant="primary" size="lg" onClick={() => downloadBlob(result.blob, result.name)}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
            <path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 20h14" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          ดาวน์โหลด
        </Button>
        <Button size="lg" onClick={onStartOver}>
          {startOverLabel}
        </Button>
      </div>
    </div>
  );
}
