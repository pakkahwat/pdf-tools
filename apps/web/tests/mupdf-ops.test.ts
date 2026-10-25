import * as mu from "mupdf";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { compressPdf, inspectLock, passwordProblem, protectPdf, unlockPdf } from "@/lib/mupdf/ops";
import { makePdf, makePhotoPdf } from "@/test-utils/fixtures";

const ALL = { print: true, copy: true, edit: true };

const open = (bytes: Uint8Array) => mu.Document.openDocument(bytes, "application/pdf");

/** ขนาดรูปทุกรูปในไฟล์ */
function imageSizes(bytes: Uint8Array): [number, number][] {
  const pdf = open(bytes).asPDF()!;
  const sizes: [number, number][] = [];
  for (let n = 1; n < pdf.countObjects(); n++) {
    const obj = pdf.newIndirect(n);
    if (obj.isStream() && obj.get("Subtype").toString() === "/Image") {
      sizes.push([obj.get("Width").asNumber(), obj.get("Height").asNumber()]);
    }
  }
  return sizes;
}

describe("ใส่ / ปลดรหัสผ่าน", () => {
  it("ใส่รหัสแล้วต้องใช้รหัสเปิด ปลดด้วยรหัสที่ถูกแล้วเปิดได้ตามปกติ", async () => {
    const locked = protectPdf(mu, await makePdf(2), { password: "ลับมาก 123", allow: ALL });
    expect(inspectLock(mu, locked)).toMatchObject({ encrypted: true, needsPassword: true, method: "AES 256-bit", pages: null });

    expect(() => unlockPdf(mu, locked, "ผิด")).toThrow("รหัสผ่านไม่ถูกต้อง");
    const plain = unlockPdf(mu, locked, "ลับมาก 123");
    expect(inspectLock(mu, plain)).toMatchObject({ encrypted: false, needsPassword: false, pages: 2 });
    // เครื่องมืออื่น (pdf-lib) เปิดไฟล์ที่ปลดแล้วได้
    expect((await PDFDocument.load(plain)).getPageCount()).toBe(2);
  });

  it("จำกัดสิทธิ์: ผู้เปิดด้วยรหัสปกติพิมพ์ไม่ได้ แต่คัดลอกได้", async () => {
    const locked = protectPdf(mu, await makePdf(1), { password: "abc", allow: { print: false, copy: true, edit: false } });
    const doc = open(locked);
    expect(doc.authenticatePassword("abc")).toBeGreaterThan(0);
    expect(doc.hasPermission("print")).toBe(false);
    expect(doc.hasPermission("copy")).toBe(true);
    expect(doc.hasPermission("edit")).toBe(false);
  });

  it("ไฟล์ที่ล็อกแค่สิทธิ์ (ไม่มีรหัสเปิด) ปลดได้โดยไม่ต้องใช้รหัส", async () => {
    const restricted = open(await makePdf(1))
      .asPDF()!
      .saveToBuffer(`encrypt=aes-128,owner-password=owner,permissions=${-3904 | 512}`)
      .asUint8Array()
      .slice();
    expect(inspectLock(mu, restricted)).toMatchObject({ encrypted: true, needsPassword: false, restricted: ["print", "copy", "edit"] });
    expect(inspectLock(mu, unlockPdf(mu, restricted, ""))).toMatchObject({ encrypted: false, restricted: [] });
  });

  it("ไฟล์ที่ไม่ได้ล็อก บอกผู้ใช้แทนการสร้างไฟล์ซ้ำ", async () => {
    const plain = await makePdf(1);
    expect(() => unlockPdf(mu, plain, "")).toThrow("ไม่ได้ล็อก");
  });

  it("ตรวจรหัสผ่านที่ใช้ไม่ได้", () => {
    expect(passwordProblem("")).not.toBeNull();
    expect(passwordProblem("a,b")).toContain("จุลภาค");
    expect(passwordProblem("ก".repeat(43))).toContain("ยาวเกินไป"); // 129 ไบต์
    expect(passwordProblem("รหัส ลับ=1")).toBeNull();
  });
});

describe("บีบอัด PDF", () => {
  it("ย่อรูปที่ละเอียดเกินและบีบเป็น JPEG — ไฟล์เล็กลงมาก หน้าเท่าเดิม", async () => {
    const src = await makePhotoPdf();
    const out = compressPdf(mu, src, "recommended");
    expect(out.smaller).toBe(true);
    expect(out.images).toBe(1);
    expect(out.after).toBeLessThan(out.before * 0.2);
    // A4 ด้านยาว 842pt ที่ 150 dpi = 1754px
    expect(imageSizes(out.bytes)).toEqual([[1316, 1754]]);
    expect((await PDFDocument.load(out.bytes)).getPageCount()).toBe(1);
  });

  it("บีบมากได้ไฟล์เล็กกว่าคุณภาพสูง", async () => {
    const src = await makePhotoPdf(1200, 1600);
    const low = compressPdf(mu, src, "low");
    const high = compressPdf(mu, src, "high");
    expect(low.after).toBeLessThan(high.after);
  });

  it("ไม่แตะข้อความ", async () => {
    const src = await makePdf(2, { label: "Hello" });
    const out = compressPdf(mu, src, "low");
    const text = (b: Uint8Array) => open(b).loadPage(1).toStructuredText("").asText().trim();
    expect(text(out.bytes)).toBe(text(src));
  });

  it("ไฟล์ที่มีรหัสเปิด ต้องปลดก่อน", async () => {
    const locked = protectPdf(mu, await makePdf(1), { password: "x", allow: ALL });
    expect(() => compressPdf(mu, locked, "recommended")).toThrow("ปลดรหัส");
  });
});
