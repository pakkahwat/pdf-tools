// PDF → Word: เรียก Web Worker (public/p2w/worker.js — Pyodide + pdf2docx) แล้วใส่ตัวตัดคำไทยให้ DOCX ที่ได้
import { insertThaiBreaks } from "./thai-breaks";

export type P2WStage = "runtime" | "packages" | "engine" | "parse" | "create" | "fonts";
export type P2WProgress = { stage: P2WStage; current?: number; total?: number };
export type P2WResult = {
  docx: Uint8Array;
  pages: number;
  /** จำนวนตัวอักษรที่ดึงได้จาก PDF — 0 = ภาพสแกน (ได้แค่รูปในไฟล์ Word) */
  textChars: number;
  fonts: string[];
  embedded: string[];
};

type Message =
  | ({ id: number; type: "progress" } & P2WProgress)
  | ({ id: number; type: "done" } & Omit<P2WResult, "docx"> & { docx: Uint8Array })
  | { id: number; type: "error"; message: string };

// เปลี่ยนเมื่อแก้ p2w.py เพื่อไม่ให้เบราว์เซอร์ใช้ไฟล์เก่าจากแคช
const ENGINE_VERSION = "2026-10-25";

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<
  number,
  { resolve: (r: P2WResult) => void; reject: (e: Error) => void; onProgress?: (p: P2WProgress) => void }
>();

function failAll(message: string) {
  for (const p of pending.values()) p.reject(new Error(message));
  pending.clear();
}

function getWorker(): Worker {
  if (worker) return worker;
  const w = new Worker(`/p2w/worker.js?v=${ENGINE_VERSION}`);
  w.addEventListener("message", (event: MessageEvent<Message>) => {
    const msg = event.data;
    const p = pending.get(msg.id);
    if (!p) return;
    if (msg.type === "progress") {
      p.onProgress?.({ stage: msg.stage, current: msg.current, total: msg.total });
      return;
    }
    pending.delete(msg.id);
    if (msg.type === "error") {
      p.reject(new Error(friendlyError(msg.message)));
      return;
    }
    const { bytes } = insertThaiBreaks(msg.docx);
    p.resolve({ docx: bytes, pages: msg.pages, textChars: msg.textChars, fonts: msg.fonts, embedded: msg.embedded });
  });
  w.addEventListener("error", () => {
    // ตัวแปลงล่ม (มักเป็นหน่วยความจำไม่พอบนมือถือ) — ทิ้งตัวเดิม ครั้งหน้าเริ่มใหม่
    failAll("ตัวแปลงหยุดทำงาน — หน่วยความจำอาจไม่พอ ลองใช้บนคอมพิวเตอร์ หรือแยก PDF เป็นไฟล์ที่เล็กลงก่อน");
    w.terminate();
    worker = null;
  });
  worker = w;
  return w;
}

function friendlyError(message: string): string {
  if (message === "ENCRYPTED") return "ไฟล์นี้ถูกล็อกด้วยรหัสผ่าน — ยังแปลงไม่ได้ในเวอร์ชันนี้";
  if (/fetch|network|Failed to load/i.test(message)) {
    return "โหลดตัวแปลงไม่สำเร็จ — ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่ (ต้องโหลดครั้งแรกครั้งเดียว)";
  }
  return `แปลงไม่สำเร็จ — ไฟล์อาจมีโครงสร้างที่ยังไม่รองรับ (${message.split("\n").filter(Boolean).at(-1)?.slice(0, 160)})`;
}

export function pdfToWord(pdf: Uint8Array, onProgress?: (p: P2WProgress) => void): Promise<P2WResult> {
  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject, onProgress });
    getWorker().postMessage({ id, pdf: pdf.slice().buffer });
  });
}

export function progressText(p: P2WProgress): string {
  switch (p.stage) {
    case "runtime":
      return "กำลังโหลดตัวแปลง (1/3)… ครั้งแรกใช้เวลาสักครู่";
    case "packages":
      return "กำลังโหลดตัวแปลง (2/3)…";
    case "engine":
      return "กำลังโหลดตัวแปลง (3/3)…";
    case "parse":
      return `กำลังอ่านหน้า ${p.current}/${p.total}…`;
    case "create":
      return `กำลังสร้างไฟล์ Word หน้า ${p.current}/${p.total}…`;
    case "fonts":
      return "กำลังฝังฟอนต์ลงไฟล์…";
  }
}
