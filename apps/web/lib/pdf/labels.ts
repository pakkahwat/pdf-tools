// รูปแบบเลขหน้า — ใช้ร่วมกันทั้งฝั่ง UI (main thread) และ ops (worker)

export const PAGE_NUMBER_FORMATS = [
  { value: "{n}", label: "1" },
  { value: "{n} / {total}", label: "1 / 10" },
  { value: "- {n} -", label: "- 1 -" },
  { value: "หน้า {n}", label: "หน้า 1" },
  { value: "หน้า {n} จาก {total}", label: "หน้า 1 จาก 10" },
  { value: "Page {n} of {total}", label: "Page 1 of 10" },
] as const;

export function formatLabel(format: string, n: number, total: number): string {
  return format.replaceAll("{n}", String(n)).replaceAll("{total}", String(total));
}

/** ฟอนต์มาตรฐานของ PDF (Helvetica) เขียนได้แค่อักษรละติน — ข้อความไทยต้องวาดเป็นภาพจากฝั่งเบราว์เซอร์แทน */
export function needsTextImage(text: string): boolean {
  return !/^[\x20-\x7E]*$/.test(text);
}

/** เลขหน้าที่จะพิมพ์ลงแต่ละหน้า (index หน้า → ข้อความ) ตามหน้าที่เริ่มใส่และเลขเริ่มต้น */
export function pageLabels(
  pageCount: number,
  opts: { format: string; startAt: number; fromPage: number; total?: number },
): { index: number; text: string }[] {
  const first = Math.max(1, opts.fromPage) - 1;
  const count = Math.max(0, pageCount - first);
  const total = opts.total ?? opts.startAt + count - 1;
  return Array.from({ length: count }, (_, k) => ({
    index: first + k,
    text: formatLabel(opts.format, opts.startAt + k, total),
  }));
}
