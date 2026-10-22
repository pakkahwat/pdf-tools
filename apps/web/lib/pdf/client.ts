// เรียกงานใน ops.ts ผ่าน Web Worker ตัวเดียว (สร้างครั้งแรกที่ใช้) เพื่อไม่ให้หน้าเว็บค้างระหว่างประมวลผลไฟล์ใหญ่
import type * as Ops from "./ops";

type OpName = {
  [K in keyof typeof Ops]: (typeof Ops)[K] extends (...args: never[]) => Promise<unknown> ? K : never;
}[keyof typeof Ops];

type Pending = { resolve: (v: unknown) => void; reject: (e: Error) => void };

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, Pending>();

function failAll(message: string) {
  for (const p of pending.values()) p.reject(new Error(message));
  pending.clear();
}

function getWorker(): Worker {
  if (worker) return worker;
  const w = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
  w.addEventListener("message", (event: MessageEvent<{ id: number; result?: unknown; error?: string }>) => {
    const { id, result, error } = event.data;
    const p = pending.get(id);
    if (!p) return;
    pending.delete(id);
    if (error !== undefined) p.reject(new Error(error));
    else p.resolve(result);
  });
  w.addEventListener("error", () => {
    // worker ล่ม (เช่นหน่วยความจำไม่พอกับไฟล์ใหญ่มาก) — ทิ้งตัวเดิม ครั้งหน้าสร้างใหม่
    failAll("ประมวลผลไม่สำเร็จ — ไฟล์อาจใหญ่เกินไปสำหรับเครื่องนี้ ลองไฟล์ที่เล็กลงหรือปิดแท็บอื่นก่อน");
    w.terminate();
    worker = null;
  });
  worker = w;
  return w;
}

export function runPdf<K extends OpName>(
  op: K,
  ...args: Parameters<(typeof Ops)[K]>
): Promise<Awaited<ReturnType<(typeof Ops)[K]>>> {
  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
    getWorker().postMessage({ id, op, args });
  });
}
