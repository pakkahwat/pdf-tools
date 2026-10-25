// แสดงผลหน้า PDF เป็นภาพด้วย pdf.js (ภาพย่อ, พรีวิว, PDF → รูปภาพ) — ใช้ได้เฉพาะฝั่งเบราว์เซอร์
import type { PDFDocumentProxy } from "pdfjs-dist";

let lib: Promise<typeof import("pdfjs-dist")> | null = null;

function pdfjs() {
  lib ??= import("pdfjs-dist").then((m) => {
    // ไฟล์เหล่านี้ถูกคัดลอกไปที่ public/pdfjs ตอน npm install (scripts/copy-vendor.mjs)
    m.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
    return m;
  });
  return lib;
}

export async function openPdf(bytes: Uint8Array): Promise<PDFDocumentProxy> {
  const { getDocument } = await pdfjs();
  try {
    return await getDocument({
      // pdf.js โอน buffer ไปให้ worker ของมัน (buffer เดิมจะใช้ต่อไม่ได้) จึงส่งสำเนาไป
      data: bytes.slice(),
      cMapUrl: "/pdfjs/cmaps/",
      standardFontDataUrl: "/pdfjs/standard_fonts/",
      wasmUrl: "/pdfjs/wasm/",
      iccUrl: "/pdfjs/iccs/",
    }).promise;
  } catch (e) {
    if (e instanceof Error && e.name === "PasswordException") {
      throw new Error("ไฟล์นี้มีรหัสผ่าน — ปลดรหัสด้วยเครื่องมือ “ปลดรหัส PDF” ก่อน แล้วค่อยใช้ไฟล์ที่ได้");
    }
    throw new Error("เปิดไฟล์ไม่ได้ — ไฟล์อาจเสียหรือไม่ใช่ PDF");
  }
}

/** ปิดไฟล์และคืนหน่วยความจำของ pdf.js (v6 ไม่มี doc.destroy() แล้ว ต้องปิดผ่าน loadingTask) */
export function closePdf(doc: PDFDocumentProxy | null | undefined): void {
  if (doc) void doc.loadingTask.destroy();
}

// Safari บนมือถือวาด canvas ได้ไม่เกินราว 16 ล้านพิกเซล — จำกัดไว้ไม่ให้ภาพออกมาว่างเปล่า
const MAX_PIXELS = 16_000_000;

export type RenderOptions = {
  /** 1 = 72 DPI */
  scale?: number;
  /** ย่อให้ด้านยาวไม่เกินค่านี้ (px) — ใช้แทน scale */
  maxSize?: number;
  type?: "image/jpeg" | "image/png";
  quality?: number;
};

async function renderToCanvas(doc: PDFDocumentProxy, pageNumber: number, opts: RenderOptions): Promise<HTMLCanvasElement> {
  const page = await doc.getPage(pageNumber);
  try {
    const base = page.getViewport({ scale: 1 });
    let scale = opts.maxSize ? opts.maxSize / Math.max(base.width, base.height) : (opts.scale ?? 1);
    const pixels = base.width * base.height * scale * scale;
    if (pixels > MAX_PIXELS) scale *= Math.sqrt(MAX_PIXELS / pixels);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("เบราว์เซอร์นี้วาดภาพไม่ได้");
    // พื้นขาว — JPEG ไม่มีความโปร่งใส และหน้า PDF ส่วนใหญ่ถือว่าพื้นขาว
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // intent "print": pdf.js จะไม่รอ requestAnimationFrame ระหว่างวาด — ถ้าใช้ค่าเริ่มต้น ("display")
    // การแปลงจะหยุดค้างทันทีที่ผู้ใช้สลับไปแท็บอื่น (เบราว์เซอร์หยุด rAF ของแท็บที่ไม่ได้แสดง)
    await page.render({ canvas, viewport, intent: "print" }).promise;
    return canvas;
  } finally {
    page.cleanup();
  }
}

export async function renderPage(doc: PDFDocumentProxy, pageNumber: number, opts: RenderOptions = {}): Promise<Blob> {
  const canvas = await renderToCanvas(doc, pageNumber, opts);
  const blob = await new Promise<Blob | null>((res) =>
    canvas.toBlob(res, opts.type ?? "image/jpeg", opts.quality ?? 0.9),
  );
  canvas.width = canvas.height = 0; // คืนหน่วยความจำทันที (สำคัญบน iOS)
  if (!blob) throw new Error(`แปลงหน้า ${pageNumber} เป็นภาพไม่สำเร็จ`);
  return blob;
}

/** ภาพย่อเป็น data URL — ไม่ต้องตามคืน object URL เอง (ภาพเล็ก ไม่กินหน่วยความจำ) */
export async function renderThumb(doc: PDFDocumentProxy, pageNumber: number, maxSize: number): Promise<string> {
  const canvas = await renderToCanvas(doc, pageNumber, { maxSize });
  const url = canvas.toDataURL("image/jpeg", 0.8);
  canvas.width = canvas.height = 0;
  return url;
}
