"use client";

// ปุ่มหลักของเครื่องมือ + สถานะ (กำลังทำ / error / ดาวน์โหลด) ในที่เดียว
// มือถือ: ลอยติดขอบล่างจอ กดได้ทันทีไม่ต้องเลื่อนหา · จอใหญ่: อยู่ในแผงตัวเลือกด้านขวา
import { useEffect, useRef } from "react";
import { formatBytes } from "@/lib/files";
import { downloadBlob, type useTask } from "@/lib/use-task";
import { Button, CheckIcon, ErrorBox, Spinner } from "./ui";

type Task = ReturnType<typeof useTask>;

export function ActionBar({
  task,
  label,
  disabled = false,
  hint,
  onRun,
  onStartOver,
  startOverLabel = "เริ่มใหม่กับไฟล์อื่น",
}: {
  task: Task;
  label: string;
  disabled?: boolean;
  /** บอกว่าทำไมยังกดไม่ได้ / ต้องทำอะไรก่อน */
  hint?: string;
  onRun: () => void;
  onStartOver: () => void;
  startOverLabel?: string;
}) {
  const { state } = task;
  const downloadRef = useRef<HTMLButtonElement>(null);
  const done = state.status === "done";

  // เสร็จแล้วย้าย focus ไปที่ปุ่มดาวน์โหลด (ผู้ใช้คีย์บอร์ด/โปรแกรมอ่านหน้าจอไปต่อได้ทันที)
  useEffect(() => {
    if (done) downloadRef.current?.focus();
  }, [done]);

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_30px_-12px_rgb(0_0_0/0.25)] backdrop-blur lg:static lg:z-auto lg:rounded-2xl lg:border lg:p-4 lg:shadow-none lg:backdrop-blur-none">
      <div className="mx-auto max-w-xl space-y-2.5">
        {state.status === "error" && <ErrorBox message={state.error} />}

        {state.status === "done" ? (
          <div role="status" className="space-y-2.5">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ok-soft text-ok">
                <CheckIcon />
              </span>
              <div className="min-w-0">
                <p className="font-semibold">เสร็จแล้ว</p>
                <p className="truncate text-sm text-muted" title={state.result.name}>
                  {state.result.name} · {formatBytes(state.result.blob.size)}
                  {state.result.note ? ` · ${state.result.note}` : ""}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-2 lg:grid-cols-1">
              <Button
                ref={downloadRef}
                variant="cta"
                size="lg"
                onClick={() => downloadBlob(state.result.blob, state.result.name)}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
                  <path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 20h14" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                ดาวน์โหลด
              </Button>
              <Button variant="secondary" size="lg" onClick={onStartOver}>
                <span className="lg:hidden">เริ่มใหม่</span>
                <span className="hidden lg:inline">{startOverLabel}</span>
              </Button>
            </div>
          </div>
        ) : (
          <>
            <Button
              variant="cta"
              size="lg"
              className="w-full"
              disabled={disabled || state.status === "working"}
              aria-busy={state.status === "working"}
              onClick={onRun}
            >
              {state.status === "working" ? (
                <>
                  <Spinner />
                  <span role="status">{state.progress ?? "กำลังประมวลผล…"}</span>
                </>
              ) : (
                label
              )}
            </Button>
            {hint && state.status !== "working" && <p className="text-center text-sm text-muted">{hint}</p>}
          </>
        )}
      </div>
    </div>
  );
}
