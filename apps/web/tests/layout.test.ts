import { describe, expect, it } from "vitest";
import { anchorCenter, placeCentered, rotatedBounds, visualToUser, type PageFrame } from "@/lib/pdf/layout";

const frame = (rot: PageFrame["rot"]): PageFrame => {
  const box = { x: 0, y: 0, width: 600, height: 800 };
  const swap = rot === 90 || rot === 270;
  return { box, rot, vw: swap ? 800 : 600, vh: swap ? 600 : 800 };
};

describe("visualToUser", () => {
  it("หน้าไม่หมุน: พิกัดเดิม", () => {
    expect(visualToUser(frame(0), 10, 20)).toEqual({ x: 10, y: 20 });
  });

  it("มุมล่างซ้ายที่ผู้ใช้เห็น ตรงกับมุมจริงของหน้าที่หมุนแล้ว", () => {
    // หมุน 90° ตามเข็ม: มุมล่างขวาของหน้าจริง (600,0) มาอยู่ล่างซ้าย
    expect(visualToUser(frame(90), 0, 0)).toEqual({ x: 600, y: 0 });
    expect(visualToUser(frame(180), 0, 0)).toEqual({ x: 600, y: 800 });
    expect(visualToUser(frame(270), 0, 0)).toEqual({ x: 0, y: 800 });
  });

  it("คิด offset ของ CropBox", () => {
    const f: PageFrame = { box: { x: 50, y: 30, width: 100, height: 200 }, rot: 0, vw: 100, vh: 200 };
    expect(visualToUser(f, 0, 0)).toEqual({ x: 50, y: 30 });
  });
});

describe("placeCentered", () => {
  it("ไม่หมุน: มุมล่างซ้าย = จุดกึ่งกลาง − ครึ่งกล่อง", () => {
    expect(placeCentered(frame(0), 300, 400, 100, 40, 0)).toEqual({ x: 250, y: 380, angle: 0 });
  });

  it("หน้าหมุน 90°: มุมของข้อความถูกชดเชยให้ผู้ใช้เห็นตรง", () => {
    const p = placeCentered(frame(90), 400, 300, 100, 40, 0);
    expect(p.angle).toBe(90);
    // จุดกึ่งกลางที่เห็น (400,300) = จุดจริง (300,400) — กล่องหมุน 90° ทวนเข็มรอบมุมล่างซ้าย
    expect(p.x).toBeCloseTo(300 + 20);
    expect(p.y).toBeCloseTo(400 - 50);
  });
});

describe("anchorCenter / rotatedBounds", () => {
  it("วางชิดมุมโดยเว้นขอบ", () => {
    expect(anchorCenter(frame(0), "br", 100, 20, 30)).toEqual({ cx: 600 - 30 - 50, cy: 30 + 10 });
    expect(anchorCenter(frame(0), "tc", 100, 20, 30)).toEqual({ cx: 300, cy: 800 - 30 - 10 });
  });

  it("กรอบของกล่องที่หมุน 90° สลับกว้าง/สูง", () => {
    const { bw, bh } = rotatedBounds(100, 40, 90);
    expect(bw).toBeCloseTo(40);
    expect(bh).toBeCloseTo(100);
  });
});
