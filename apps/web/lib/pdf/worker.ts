// Web Worker: รับคำสั่ง { id, op, args } → เรียกฟังก์ชันใน ops.ts → ส่งผลกลับ (โอน ArrayBuffer ของผลลัพธ์ ไม่คัดลอก)
import * as ops from "./ops";

type Request = { id: number; op: keyof typeof ops; args: unknown[] };

function buffersOf(value: unknown): ArrayBuffer[] {
  if (value instanceof Uint8Array) return [value.buffer as ArrayBuffer];
  if (Array.isArray(value)) return value.flatMap(buffersOf);
  return [];
}

self.addEventListener("message", async (event: MessageEvent<Request>) => {
  const { id, op, args } = event.data;
  try {
    const fn = ops[op] as (...a: unknown[]) => Promise<unknown>;
    const result = await fn(...args);
    self.postMessage({ id, result }, { transfer: [...new Set(buffersOf(result))] });
  } catch (err) {
    self.postMessage({ id, error: err instanceof Error ? err.message : String(err) });
  }
});
