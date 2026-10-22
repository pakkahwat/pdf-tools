// สร้างไฟล์ทดสอบด้วยโค้ด (ไม่ต้องเก็บไฟล์ PDF/รูปไว้ใน repo) — ใช้ทั้ง unit test (Vitest) และ E2E (Playwright)
import { crc32, deflateSync } from "node:zlib";
import { degrees, PDFDict, PDFDocument, PDFName, StandardFonts } from "pdf-lib";

/** PDF จำนวน pages หน้า — ระบุขนาดแต่ละหน้าได้ (ใช้ขนาดหน้าเป็นตัวบอกว่าหน้าไหนมาจากไหน) */
export async function makePdf(
  pages: number,
  opts: { sizes?: [number, number][]; rotate?: number[]; label?: string } = {},
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < pages; i++) {
    const page = doc.addPage(opts.sizes?.[i] ?? [595, 842]);
    page.drawText(`${opts.label ?? "Page"} ${i + 1}`, { x: 40, y: page.getHeight() - 80, size: 28, font });
    if (opts.rotate?.[i]) page.setRotation(degrees(opts.rotate[i]));
  }
  return doc.save();
}

/** PNG สีเดียว RGB 8 บิต */
export function makePng(width: number, height: number, color: [number, number, number] = [37, 99, 235]): Uint8Array {
  const stride = width * 3 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) raw.set(color, y * stride + 1 + x * 3);
  }
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  return new Uint8Array(
    Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk("IHDR", ihdr),
      chunk("IDAT", deflateSync(raw)),
      chunk("IEND", Buffer.alloc(0)),
    ]),
  );
}

export type PageInfo = { width: number; height: number; rotation: number; images: number; fonts: number };

/** ขนาด/การหมุน/จำนวนภาพที่วาดและฟอนต์ที่ใช้ในแต่ละหน้า — ใช้ตรวจผลลัพธ์ */
export async function inspectPdf(bytes: Uint8Array): Promise<PageInfo[]> {
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map((page) => {
    const res = page.node.Resources();
    const count = (name: string) => res?.lookupMaybe(PDFName.of(name), PDFDict)?.keys().length ?? 0;
    const { width, height } = page.getSize();
    return { width, height, rotation: page.getRotation().angle, images: count("XObject"), fonts: count("Font") };
  });
}
