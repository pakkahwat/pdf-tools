// ตัวช่วยเรื่องไฟล์ฝั่งเบราว์เซอร์: ตรวจชนิด, ตั้งชื่อผลลัพธ์, zip, ขนาดไฟล์
import { zipSync } from "fflate";

export const PDF_ACCEPT = "application/pdf,.pdf";

export function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

/** "รายงาน ปี 2569.pdf" → "รายงาน ปี 2569" */
export function baseName(name: string): string {
  return name.replace(/\.[^./\\]+$/, "") || "file";
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(n < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

export function pdfBlob(bytes: Uint8Array): Blob {
  return new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
}

/** รวมหลายไฟล์เป็น .zip (ไม่บีบซ้ำ เพราะ PDF/JPG บีบอัดมาแล้ว) */
export function zipBlob(files: { name: string; bytes: Uint8Array }[]): Blob {
  const used = new Set<string>();
  const entries: Record<string, [Uint8Array, { level: 0 }]> = {};
  for (const f of files) {
    let name = f.name;
    for (let i = 2; used.has(name); i++) name = f.name.replace(/(\.[^.]+)?$/, ` (${i})$1`);
    used.add(name);
    entries[name] = [f.bytes, { level: 0 }];
  }
  const zipped = zipSync(entries);
  return new Blob([zipped as Uint8Array<ArrayBuffer>], { type: "application/zip" });
}

export function padNumber(n: number, total: number): string {
  return String(n).padStart(String(total).length, "0");
}
