// คัดลอกไฟล์ของไลบรารีที่เบราว์เซอร์ต้องโหลดตรง (ไม่ผ่าน bundler) ไปไว้ใน public/ — รันอัตโนมัติหลัง npm install (รวมถึงตอน build บน Vercel)
// - public/pdfjs: worker + ไฟล์ข้อมูลของ pdf.js (cmaps, ฟอนต์มาตรฐาน, wasm)
// - public/mupdf: mupdf.js + wasm (ใส่/ปลดรหัส, บีบอัด) — โหลดใน worker ด้วย import() จาก URL
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function vendor(pkg, dest, copy) {
  const src = path.join(root, "node_modules", pkg);
  if (!existsSync(src)) {
    console.warn(`[copy-vendor] ไม่พบ ${pkg} — ข้าม`);
    return;
  }
  const out = path.join(root, "public", dest);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  copy(src, out);
  console.log(`[copy-vendor] คัดลอก ${pkg} ไปที่ public/${dest} แล้ว`);
}

vendor("pdfjs-dist", "pdfjs", (src, out) => {
  cpSync(path.join(src, "build", "pdf.worker.min.mjs"), path.join(out, "pdf.worker.min.mjs"));
  for (const dir of ["cmaps", "standard_fonts", "wasm", "iccs"]) {
    if (existsSync(path.join(src, dir))) cpSync(path.join(src, dir), path.join(out, dir), { recursive: true });
  }
});

vendor("mupdf", "mupdf", (src, out) => {
  for (const file of ["mupdf.js", "mupdf-wasm.js", "mupdf-wasm.wasm"]) {
    cpSync(path.join(src, "dist", file), path.join(out, file));
  }
});
