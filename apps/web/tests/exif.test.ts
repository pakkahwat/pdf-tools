import { describe, expect, it } from "vitest";
import { jpegOrientation } from "@/lib/exif";

/** ส่วนหัว JPEG ที่มี APP1/EXIF บรรจุแท็ก Orientation เดียว (ไม่ใช่ภาพที่ถอดรหัสได้ — พอสำหรับทดสอบตัวอ่าน) */
function jpegWithOrientation(value: number, littleEndian: boolean): Uint8Array {
  const tiff: number[] = littleEndian
    ? [0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x12, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00, value, 0x00, 0x00, 0x00, 0, 0, 0, 0]
    : [0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08, 0x00, 0x01, 0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, value, 0x00, 0x00, 0, 0, 0, 0];
  const app1 = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00, ...tiff];
  const len = app1.length + 2;
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe1, len >> 8, len & 0xff, ...app1, 0xff, 0xda, 0x00, 0x02, 0, 0, 0, 0]);
}

describe("jpegOrientation", () => {
  it("อ่านได้ทั้ง little/big endian", () => {
    expect(jpegOrientation(jpegWithOrientation(6, true))).toBe(6);
    expect(jpegOrientation(jpegWithOrientation(8, false))).toBe(8);
  });

  it("ไม่มี EXIF = 1, ไม่ใช่ JPEG = 0", () => {
    expect(jpegOrientation(new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0, 2, 0, 0, 0, 0, 0, 0, 0]))).toBe(1);
    expect(jpegOrientation(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe(0);
  });
});
