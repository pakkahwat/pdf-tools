// เรียกงานใน ops.ts ผ่าน Web Worker ตัวเดียว (สร้างครั้งแรกที่ใช้ — โหลด mupdf ราว 3.6MB ครั้งแรกครั้งเดียว)
import type * as Ops from "./ops";

type Fn = (mu: Ops.Mupdf, ...args: never[]) => unknown;
type OpName = { [K in keyof typeof Ops]: (typeof Ops)[K] extends Fn ? K : never }[keyof typeof Ops];
type ArgsOf<K extends OpName> = (typeof Ops)[K] extends (mu: Ops.Mupdf, ...args: infer A) => unknown ? A : never;

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

export function runMupdf<K extends OpName>(op: K, ...args: ArgsOf<K>): Promise<ReturnType<(typeof Ops)[K]>> {
  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
    getWorker().postMessage({ id, op, args });
  });
}
