// คัดลอก worker + ไฟล์ข้อมูลของ pdf.js (cmaps, ฟอนต์มาตรฐาน, wasm) ไปไว้ที่ public/pdfjs/
// ให้เบราว์เซอร์โหลดตรงเป็นไฟล์ static — รันอัตโนมัติหลัง npm install (รวมถึงตอน build บน Vercel)
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "node_modules", "pdfjs-dist");
const dest = path.join(root, "public", "pdfjs");

if (!existsSync(src)) {
  console.warn("[copy-pdfjs] ไม่พบ pdfjs-dist — ข้าม");
  process.exit(0);
}

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(path.join(src, "build", "pdf.worker.min.mjs"), path.join(dest, "pdf.worker.min.mjs"));
for (const dir of ["cmaps", "standard_fonts", "wasm", "iccs"]) {
  if (existsSync(path.join(src, dir))) cpSync(path.join(src, dir), path.join(dest, dir), { recursive: true });
}
console.log("[copy-pdfjs] คัดลอกไฟล์ pdf.js ไปที่ public/pdfjs แล้ว");
