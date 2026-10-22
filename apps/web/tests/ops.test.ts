import { describe, expect, it } from "vitest";
import { PDFDocument, PDFName } from "pdf-lib";
import {
  addPageNumbers,
  addWatermark,
  countPages,
  imagesToPdf,
  mergePdfs,
  rebuildPdf,
  rotatePdf,
  splitPdf,
} from "@/lib/pdf/ops";
import { inspectPdf, makePdf, makePng } from "@/test-utils/fixtures";

const sizesOf = async (bytes: Uint8Array) => (await inspectPdf(bytes)).map((p) => [p.width, p.height]);

describe("mergePdfs", () => {
  it("รวมตามลำดับไฟล์", async () => {
    const a = await makePdf(2, { sizes: [[100, 100], [110, 110]] });
    const b = await makePdf(1, { sizes: [[200, 200]] });
    const out = await mergePdfs([
      { name: "b.pdf", bytes: b },
      { name: "a.pdf", bytes: a },
    ]);
    expect(await sizesOf(out)).toEqual([[200, 200], [100, 100], [110, 110]]);
  });

  it("บอกชื่อไฟล์ที่เปิดไม่ได้", async () => {
    const ok = await makePdf(1);
    await expect(
      mergePdfs([
        { name: "ok.pdf", bytes: ok },
        { name: "เสีย.pdf", bytes: new TextEncoder().encode("not a pdf") },
      ]),
    ).rejects.toThrow(/"เสีย\.pdf".*ไม่ได้/);
  });

  it("ไฟล์ที่ถูกเข้ารหัสได้ข้อความไทยที่อธิบายได้", async () => {
    const doc = await PDFDocument.load(await makePdf(1));
    doc.context.trailerInfo.Encrypt = doc.context.obj({ Filter: PDFName.of("Standard") });
    const locked = await doc.save();
    await expect(mergePdfs([{ name: "lock.pdf", bytes: locked }, { name: "x.pdf", bytes: locked }])).rejects.toThrow(
      /ถูกล็อกหรือเข้ารหัส/,
    );
  });
});

describe("splitPdf / rebuildPdf / rotatePdf", () => {
  const sizes: [number, number][] = [
    [100, 100],
    [200, 200],
    [300, 300],
    [400, 400],
  ];

  it("แยกตามกลุ่ม", async () => {
    const src = await makePdf(4, { sizes });
    const parts = await splitPdf(src, [[0, 1], [3]]);
    expect(parts).toHaveLength(2);
    expect(await sizesOf(parts[0])).toEqual([[100, 100], [200, 200]]);
    expect(await sizesOf(parts[1])).toEqual([[400, 400]]);
  });

  it("จัดลำดับใหม่ ลบหน้า และหมุนเพิ่มจากค่าเดิม", async () => {
    const src = await makePdf(4, { sizes, rotate: [0, 0, 90, 0] });
    const out = await rebuildPdf(src, [
      { index: 2, rotate: 90 },
      { index: 0, rotate: 0 },
    ]);
    const pages = await inspectPdf(out);
    expect(pages.map((p) => [p.width, p.rotation])).toEqual([
      [300, 180],
      [100, 0],
    ]);
    await expect(rebuildPdf(src, [])).rejects.toThrow(/อย่างน้อย 1 หน้า/);
  });

  it("หมุนในไฟล์เดิม (หมุนติดลบได้)", async () => {
    const src = await makePdf(3, { rotate: [0, 90, 0] });
    const out = await rotatePdf(src, [90, 90, -90]);
    expect((await inspectPdf(out)).map((p) => p.rotation)).toEqual([90, 180, 270]);
  });
});

describe("imagesToPdf", () => {
  const png = { bytes: makePng(200, 100), type: "png" as const, width: 200, height: 100 };

  it("A4 อัตโนมัติ: รูปแนวนอนได้หน้าแนวนอน", async () => {
    const out = await imagesToPdf([png], { pageSize: "a4", orientation: "auto", margin: 20 });
    const [page] = await inspectPdf(out);
    expect(page.width).toBeCloseTo(841.89);
    expect(page.height).toBeCloseTo(595.28);
    expect(page.images).toBe(1);
  });

  it("ขนาดเท่ารูป: 1px = 0.75pt บวกขอบ", async () => {
    const out = await imagesToPdf([png, png], { pageSize: "fit", orientation: "auto", margin: 10 });
    expect(await sizesOf(out)).toEqual([
      [170, 95],
      [170, 95],
    ]);
  });
});

describe("addWatermark", () => {
  const image = { bytes: makePng(40, 10), type: "png" as const, width: 40, height: 10 };

  it("ตำแหน่งเดียว: วาด 1 ครั้งต่อหน้า เฉพาะหน้าที่เลือก", async () => {
    const src = await makePdf(3);
    const out = await addWatermark(src, { image, widthRatio: 0.5, position: "mc", rotate: 45, opacity: 0.3, pages: [0, 2] });
    expect((await inspectPdf(out)).map((p) => p.images)).toEqual([1, 0, 1]);
  });

  it("ซ้ำทั่วหน้า: วาดหลายครั้ง", async () => {
    const src = await makePdf(1, { rotate: [90] });
    const out = await addWatermark(src, { image, widthRatio: 0.3, position: "tile", rotate: 0, opacity: 0.3 });
    const [page] = await inspectPdf(out);
    expect(page.images).toBeGreaterThan(4);
    expect(page.rotation).toBe(90); // ไม่เปลี่ยนการหมุนของหน้าเดิม
  });
});

describe("addPageNumbers", () => {
  it("ตัวเลขละติน: ใช้ฟอนต์ Helvetica และข้ามหน้าก่อน fromPage", async () => {
    const src = await makePdf(3);
    const before = await inspectPdf(src);
    const out = await addPageNumbers(src, {
      position: "bc",
      margin: 30,
      fontSize: 12,
      format: "{n} / {total}",
      startAt: 1,
      fromPage: 2,
    });
    const after = await inspectPdf(out);
    expect(after[0].fonts).toBe(before[0].fonts);
    expect(after[1].fonts).toBe(before[1].fonts + 1);
    expect(after[2].fonts).toBe(before[2].fonts + 1);
  });

  it("ข้อความไทย: ใช้ภาพที่วาดมาให้ทีละหน้า", async () => {
    const src = await makePdf(2);
    const label = { bytes: makePng(60, 18), width: 60, height: 18 };
    const out = await addPageNumbers(src, {
      position: "br",
      margin: 30,
      fontSize: 12,
      format: "หน้า {n}",
      startAt: 1,
      fromPage: 1,
      labels: [label, label],
      labelScale: 6,
    });
    expect((await inspectPdf(out)).map((p) => p.images)).toEqual([1, 1]);
    await expect(
      addPageNumbers(src, { position: "br", margin: 30, fontSize: 12, format: "หน้า {n}", startAt: 1, fromPage: 1, labels: [label] }),
    ).rejects.toThrow(/ไม่ครบ/);
  });
});

it("countPages", async () => {
  expect(await countPages(await makePdf(7))).toBe(7);
});
