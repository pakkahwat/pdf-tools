// แปลงข้อความช่วงหน้าที่ผู้ใช้พิมพ์ (เลขหน้าเริ่มที่ 1) ⇄ กลุ่มของ index หน้า (เริ่มที่ 0)

/**
 * "1-3, 5, 8-" → [[0,1,2],[4],[7,8,…สุดท้าย]] · "-3" = หน้า 1 ถึง 3 · "8-" = หน้า 8 ถึงหน้าสุดท้าย
 * ข้อความผิดรูปแบบหรือเกินจำนวนหน้า → throw Error ข้อความภาษาไทยที่แสดงให้ผู้ใช้ได้เลย
 */
export function parseRanges(input: string, pageCount: number): number[][] {
  const parts = input
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) throw new Error("กรุณาระบุหน้า เช่น 1-3, 5");

  return parts.map((part) => {
    const m = /^(\d+)?\s*(-)?\s*(\d+)?$/.exec(part);
    if (!m || (!m[1] && !m[3]) || (!m[2] && (!m[1] || m[3]))) {
      throw new Error(`รูปแบบ "${part}" ไม่ถูกต้อง — ใช้แบบ 1-3, 5, 8-`);
    }
    const start = m[1] ? Number(m[1]) : 1;
    const end = m[2] ? (m[3] ? Number(m[3]) : pageCount) : start;
    if (start < 1 || end < 1) throw new Error(`ไม่มีหน้า 0 — หน้าแรกคือหน้า 1`);
    if (start > pageCount || end > pageCount) {
      throw new Error(`"${part}" เกินจำนวนหน้าที่มี (${pageCount} หน้า)`);
    }
    if (start > end) throw new Error(`"${part}" หน้าเริ่มต้องไม่มากกว่าหน้าสุดท้าย`);
    return Array.from({ length: end - start + 1 }, (_, i) => start - 1 + i);
  });
}

/** รวมทุกกลุ่มเป็นรายการหน้าเดียว (ไม่ซ้ำ เรียงตามลำดับที่พิมพ์) */
export function parsePageList(input: string, pageCount: number): number[] {
  return [...new Set(parseRanges(input, pageCount).flat())];
}

/** แยกทุกหน้าเป็นไฟล์ละหน้า */
export function everyPage(pageCount: number): number[][] {
  return Array.from({ length: pageCount }, (_, i) => [i]);
}

/** แบ่งทุก ๆ size หน้า */
export function chunkPages(pageCount: number, size: number): number[][] {
  if (!Number.isInteger(size) || size < 1) throw new Error("จำนวนหน้าต่อไฟล์ต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป");
  const groups: number[][] = [];
  for (let i = 0; i < pageCount; i += size) {
    groups.push(Array.from({ length: Math.min(size, pageCount - i) }, (_, k) => i + k));
  }
  return groups;
}

/** [0,1,2,4,7,8] → "1-3, 5, 8-9" (ใช้แสดงผลและเขียนกลับลงช่องกรอก) */
export function compressRanges(indices: number[]): string {
  const sorted = [...new Set(indices)].sort((a, b) => a - b);
  const out: string[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const start = sorted[i];
    while (i + 1 < sorted.length && sorted[i + 1] === sorted[i] + 1) i++;
    out.push(start === sorted[i] ? `${start + 1}` : `${start + 1}-${sorted[i] + 1}`);
  }
  return out.join(", ");
}

/** ชื่อช่วงหน้าสำหรับตั้งชื่อไฟล์ เช่น [0,1,2] → "1-3" */
export function rangeLabel(group: number[]): string {
  const first = group[0] + 1;
  const last = group[group.length - 1] + 1;
  return first === last ? `${first}` : `${first}-${last}`;
}
