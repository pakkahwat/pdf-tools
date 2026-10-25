// Web Worker ของ MuPDF: รับคำสั่ง { id, op, args } → เรียกฟังก์ชันใน ops.ts พร้อมโมดูล mupdf → ส่งผลกลับ (โอน ArrayBuffer ไม่คัดลอก)
// mupdf.js ไม่ผ่าน bundler (มีโค้ดเฉพาะ Node และโหลด wasm ข้างตัวเอง) — scripts/copy-vendor.mjs คัดลอกไปไว้ที่ public/mupdf
import * as ops from "./ops";

type Request = { id: number; op: keyof typeof ops; args: unknown[] };

const MUPDF_URL = "/mupdf/mupdf.js";
let lib: Promise<ops.Mupdf> | null = null;

function mupdf(): Promise<ops.Mupdf> {
  lib ??= import(/* webpackIgnore: true */ /* turbopackIgnore: true */ new URL(MUPDF_URL, self.location.origin).href);
  return lib;
}

function buffersOf(value: unknown): ArrayBuffer[] {
  if (value instanceof Uint8Array) return [value.buffer as ArrayBuffer];
  if (Array.isArray(value)) return value.flatMap(buffersOf);
  if (value && typeof value === "object") return Object.values(value).flatMap(buffersOf);
  return [];
}

self.addEventListener("message", async (event: MessageEvent<Request>) => {
  const { id, op, args } = event.data;
  try {
    const mu = await mupdf().catch(() => {
      lib = null; // โหลดไม่สำเร็จ (เน็ตหลุด) — ครั้งหน้าลองใหม่
      throw new Error("โหลดเครื่องมือไม่สำเร็จ — ตรวจการเชื่อมต่ออินเทอร์เน็ตแล้วลองอีกครั้ง");
    });
    const fn = ops[op] as (mu: ops.Mupdf, ...a: unknown[]) => unknown;
    const result = fn(mu, ...args);
    self.postMessage({ id, result }, { transfer: [...new Set(buffersOf(result))] });
  } catch (err) {
    self.postMessage({ id, error: err instanceof Error ? err.message : String(err) });
  }
});
