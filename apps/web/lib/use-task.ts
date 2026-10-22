"use client";

// สถานะของการกดประมวลผล: กำลังทำ (พร้อมข้อความความคืบหน้า) → เสร็จ (ไฟล์ผลลัพธ์) หรือ error
import { useCallback, useState } from "react";

export type TaskResult = { blob: Blob; name: string; note?: string };

type TaskState =
  | { status: "idle" }
  | { status: "working"; progress?: string }
  | { status: "done"; result: TaskResult }
  | { status: "error"; error: string };

/** error จากโค้ดเรามีข้อความไทยอยู่แล้ว — error ภายในไลบรารี (ภาษาอังกฤษ) ห่อด้วยคำอธิบายภาษาไทย */
export function errorMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/[฀-๿]/.test(msg)) return msg;
  return `ประมวลผลไม่สำเร็จ — ไฟล์อาจมีโครงสร้างที่ยังไม่รองรับ (${msg})`;
}

export function useTask() {
  const [state, setState] = useState<TaskState>({ status: "idle" });

  const run = useCallback(async (fn: (progress: (message: string) => void) => Promise<TaskResult>) => {
    setState({ status: "working" });
    try {
      const result = await fn((message) =>
        setState((s) => (s.status === "working" ? { status: "working", progress: message } : s)),
      );
      setState({ status: "done", result });
    } catch (e) {
      setState({ status: "error", error: errorMessage(e) });
    }
  }, []);

  const reset = useCallback(() => setState({ status: "idle" }), []);

  return { state, run, reset };
}

/** ดาวน์โหลด Blob ทันที (สร้าง object URL ตอนกด แล้วคืนหน่วยความจำภายหลัง) */
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
