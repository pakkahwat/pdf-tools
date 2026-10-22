// วางของลงหน้า PDF ตาม "สิ่งที่ผู้ใช้เห็น" — หน้าที่มี /Rotate (เช่นสแกนแนวนอน) ต้องแปลงพิกัดและมุมกลับเป็นพิกัดจริงของหน้า
// ไม่อย่างนั้นลายน้ำ/เลขหน้าจะไปโผล่ผิดมุมและเอียงตามการหมุนของหน้า
import type { PDFPage } from "pdf-lib";

export type Position = "tl" | "tc" | "tr" | "ml" | "mc" | "mr" | "bl" | "bc" | "br";

export type PageFrame = {
  box: { x: number; y: number; width: number; height: number };
  rot: 0 | 90 | 180 | 270;
  /** ความกว้าง/สูงตามที่ผู้ใช้เห็น */
  vw: number;
  vh: number;
};

export function normalizeAngle(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

export function pageFrame(page: PDFPage): PageFrame {
  const box = page.getCropBox();
  const rot = (Math.round(normalizeAngle(page.getRotation().angle) / 90) * 90) % 360 as PageFrame["rot"];
  const swap = rot === 90 || rot === 270;
  return { box, rot, vw: swap ? box.height : box.width, vh: swap ? box.width : box.height };
}

/** พิกัดที่ผู้ใช้เห็น (จุดเริ่มมุมล่างซ้าย) → พิกัดจริงของหน้า (PDF /Rotate หมุนตามเข็มนาฬิกา) */
export function visualToUser(f: PageFrame, vx: number, vy: number): { x: number; y: number } {
  const { x, y, width: w, height: h } = f.box;
  switch (f.rot) {
    case 90:
      return { x: x + w - vy, y: y + vx };
    case 180:
      return { x: x + w - vx, y: y + h - vy };
    case 270:
      return { x: x + vy, y: y + h - vx };
    default:
      return { x: x + vx, y: y + vy };
  }
}

/** ขนาดกรอบที่หุ้มกล่อง w×h เมื่อหมุน angle องศา */
export function rotatedBounds(w: number, h: number, angle: number): { bw: number; bh: number } {
  const t = (angle * Math.PI) / 180;
  const c = Math.abs(Math.cos(t));
  const s = Math.abs(Math.sin(t));
  return { bw: w * c + h * s, bh: w * s + h * c };
}

/** จุดกึ่งกลาง (ตามที่ผู้ใช้เห็น) ของกล่องที่ตำแหน่ง pos โดยเว้นขอบ margin */
export function anchorCenter(
  f: PageFrame,
  pos: Position,
  bw: number,
  bh: number,
  margin: number,
): { cx: number; cy: number } {
  const col = pos[1];
  const row = pos[0];
  const cx = col === "l" ? margin + bw / 2 : col === "r" ? f.vw - margin - bw / 2 : f.vw / 2;
  const cy = row === "b" ? margin + bh / 2 : row === "t" ? f.vh - margin - bh / 2 : f.vh / 2;
  return { cx, cy };
}

/**
 * คืนค่า x, y, rotate สำหรับ drawImage/drawText ของ pdf-lib (ซึ่งหมุนรอบมุมล่างซ้ายของกล่อง)
 * ให้กล่อง w×h มีจุดกึ่งกลางอยู่ที่ (cx, cy) และเอียง angle องศา (ทวนเข็ม) ตามที่ผู้ใช้เห็น
 */
export function placeCentered(
  f: PageFrame,
  cx: number,
  cy: number,
  w: number,
  h: number,
  angle: number,
): { x: number; y: number; angle: number } {
  const c = visualToUser(f, cx, cy);
  const a = normalizeAngle(angle + f.rot);
  const t = (a * Math.PI) / 180;
  return {
    x: c.x - ((w / 2) * Math.cos(t) - (h / 2) * Math.sin(t)),
    y: c.y - ((w / 2) * Math.sin(t) + (h / 2) * Math.cos(t)),
    angle: a,
  };
}
