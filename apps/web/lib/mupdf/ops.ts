// งาน PDF ที่ใช้ MuPDF (WASM): ตรวจ/ปลด/ใส่รหัสผ่าน และบีบอัดไฟล์
// รับโมดูล mupdf จากผู้เรียก — worker โหลดจาก public/mupdf, unit test ใช้จาก node_modules
// ข้อควรระวัง: Uint8Array ที่ mupdf คืนมาชี้เข้าไปในหน่วยความจำ WASM — ต้อง .slice() ทันที ไม่งั้นจะเสียเมื่อหน่วยความจำขยาย
import type * as MupdfModule from "mupdf";

export type Mupdf = typeof MupdfModule;
type Doc = MupdfModule.Document;
type PdfDoc = MupdfModule.PDFDocument;

export type Permission = "print" | "copy" | "edit";
export const PERMISSIONS: Permission[] = ["print", "copy", "edit"];

export type LockInfo = {
  /** เข้ารหัสไว้ (มีรหัสเปิดไฟล์ หรือแค่จำกัดสิทธิ์) */
  encrypted: boolean;
  /** ต้องใส่รหัสก่อนเปิด */
  needsPassword: boolean;
  /** สิทธิ์ที่ถูกห้าม — รู้ได้เฉพาะไฟล์ที่เปิดได้โดยไม่ต้องใส่รหัส */
  restricted: Permission[];
  /** เช่น "AES 256-bit" */
  method: string;
  /** null = ยังไม่รู้ (ต้องใส่รหัสก่อน) */
  pages: number | null;
};

export type ProtectOptions = { password: string; allow: Record<Permission, boolean> };

export type CompressLevel = "low" | "recommended" | "high";

export type CompressResult = {
  bytes: Uint8Array;
  before: number;
  after: number;
  /** จำนวนรูปที่ย่อ/บีบใหม่ */
  images: number;
  /** false = บีบแล้วไม่เล็กลง คืนไฟล์เดิม */
  smaller: boolean;
};

/** ความละเอียดสูงสุดของรูป (เทียบกับหน้ากระดาษที่ใหญ่ที่สุด) และคุณภาพ JPEG ของแต่ละระดับ */
export const COMPRESS_LEVELS: Record<CompressLevel, { dpi: number; quality: number }> = {
  low: { dpi: 100, quality: 50 },
  recommended: { dpi: 150, quality: 65 },
  high: { dpi: 220, quality: 80 },
};

/** เก็บกวาด object ที่ไม่ใช้ + บีบ stream + รวม object เป็น object stream */
const SAVE = "garbage=compact,compress,objstms";
/** รหัสผ่าน PDF แบบ AES-256 ยาวได้ไม่เกิน 127 ไบต์ (UTF-8) */
const MAX_PASSWORD_BYTES = 127;

function open(mu: Mupdf, bytes: Uint8Array): Doc {
  let doc: Doc;
  try {
    doc = mu.Document.openDocument(bytes, "application/pdf");
  } catch {
    throw new Error("เปิดไฟล์ไม่ได้ — ไฟล์อาจเสียหรือไม่ใช่ PDF");
  }
  if (!doc.isPDF()) {
    doc.destroy();
    throw new Error("ไฟล์นี้ไม่ใช่ PDF");
  }
  return doc;
}

function save(doc: Doc, options: string): Uint8Array {
  return (doc as PdfDoc).saveToBuffer(options).asUint8Array().slice();
}

/** "Standard V5 R6 256-bit AES" → "AES 256-bit" */
function methodName(meta: string | undefined): string {
  if (!meta || meta === "None") return "";
  const m = /(\d+)-bit (\w+)/.exec(meta);
  return m ? `${m[2]} ${m[1]}-bit` : meta;
}

function restrictedOf(doc: Doc): Permission[] {
  return PERMISSIONS.filter((p) => !doc.hasPermission(p));
}

/** เรียกตอนผู้ใช้เลือกไฟล์ ให้ worker โหลด mupdf ไว้ก่อนกดปุ่ม */
export function warmUp(mu: Mupdf): boolean {
  return Boolean(mu.Document);
}

export function inspectLock(mu: Mupdf, bytes: Uint8Array): LockInfo {
  const doc = open(mu, bytes);
  try {
    const method = methodName(doc.getMetaData(mu.Document.META_ENCRYPTION));
    const needsPassword = doc.needsPassword();
    return {
      encrypted: method !== "",
      needsPassword,
      restricted: needsPassword ? [] : restrictedOf(doc),
      method,
      pages: needsPassword ? null : doc.countPages(),
    };
  } finally {
    doc.destroy();
  }
}

/** เอารหัสผ่านและข้อจำกัดออก — ไฟล์ที่ล็อกแค่สิทธิ์ (ไม่มีรหัสเปิด) ปลดได้โดยไม่ต้องใช้รหัส */
export function unlockPdf(mu: Mupdf, bytes: Uint8Array, password: string): Uint8Array {
  const doc = open(mu, bytes);
  try {
    if (!methodName(doc.getMetaData(mu.Document.META_ENCRYPTION))) {
      throw new Error("ไฟล์นี้ไม่ได้ล็อกไว้ — ใช้งานได้เลยโดยไม่ต้องปลดรหัส");
    }
    if (doc.needsPassword()) {
      if (!password) throw new Error("กรุณาใส่รหัสผ่านของไฟล์");
      if (!doc.authenticatePassword(password)) {
        throw new Error("รหัสผ่านไม่ถูกต้อง — ลองอีกครั้ง (ตัวพิมพ์เล็ก/ใหญ่ถือว่าต่างกัน)");
      }
    }
    return save(doc, `encrypt=none,${SAVE}`);
  } finally {
    doc.destroy();
  }
}

/** ข้อความอธิบายว่ารหัสผ่านใช้ไม่ได้เพราะอะไร (null = ใช้ได้) — ใช้ทั้งฝั่งหน้าเว็บและก่อนบันทึก */
export function passwordProblem(password: string): string | null {
  if (!password) return "กรุณาตั้งรหัสผ่าน";
  // mupdf รับค่าตั้งค่าเป็นข้อความคั่นด้วยจุลภาค — รหัสที่มี "," จะถูกตัดผิดที่
  if (password.includes(",")) return "รหัสผ่านห้ามมีเครื่องหมายจุลภาค ( , )";
  if (new TextEncoder().encode(password).length > MAX_PASSWORD_BYTES) return "รหัสผ่านยาวเกินไป";
  return null;
}

/** ค่า /P ของ PDF: บิตที่ไม่ได้ใช้เป็น 1, บิต 10 (อ่านให้ผู้พิการทางสายตา) อนุญาตเสมอ */
function permissionBits(allow: Record<Permission, boolean>): number {
  let p = -3904 | 512;
  if (allow.print) p |= 4 | 2048; // พิมพ์ + พิมพ์ความละเอียดสูง
  if (allow.edit) p |= 8 | 32 | 256 | 1024; // แก้เนื้อหา, ใส่หมายเหตุ, กรอกฟอร์ม, จัดหน้า
  if (allow.copy) p |= 16;
  return p;
}

function randomPassword(): string {
  const b = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

/** ใส่รหัสเปิดไฟล์ (AES-256) — ถ้าจำกัดสิทธิ์ ใช้รหัสเจ้าของแบบสุ่มที่ไม่มีใครรู้ ผู้เปิดด้วยรหัสปกติจึงแก้สิทธิ์ไม่ได้ */
export function protectPdf(mu: Mupdf, bytes: Uint8Array, { password, allow }: ProtectOptions): Uint8Array {
  const problem = passwordProblem(password);
  if (problem) throw new Error(problem);
  const doc = open(mu, bytes);
  try {
    if (doc.needsPassword()) throw new Error("ไฟล์นี้มีรหัสผ่านอยู่แล้ว — ปลดรหัสเดิมด้วยเครื่องมือ “ปลดรหัส PDF” ก่อน");
    const restricted = PERMISSIONS.some((p) => !allow[p]);
    const owner = restricted ? randomPassword() : password;
    return save(
      doc,
      `encrypt=aes-256,user-password=${password},owner-password=${owner},permissions=${permissionBits(allow)},${SAVE}`,
    );
  } finally {
    doc.destroy();
  }
}

function filterNames(obj: MupdfModule.PDFObject): string[] {
  const f = obj.get("Filter");
  if (f.isName()) return [f.asName()];
  if (f.isArray()) return Array.from({ length: f.length }, (_, k) => f.get(k).asName());
  return [];
}

/**
 * ย่อรูปที่ละเอียดเกินจำเป็นและบีบเป็น JPEG ทีละ object — ไม่แตะข้อความ/ฟอนต์ (ภาษาไทยจึงไม่เพี้ยน)
 * ข้ามรูปที่ JPEG จะทำให้เสีย: รูปขาวดำ 1 บิต (สแกนเอกสาร), stencil mask, color-key mask, รูปที่มี alpha ในตัว (JPX)
 */
function recompressImages(mu: Mupdf, pdf: PdfDoc, maxPx: number, quality: number): number {
  const { ColorSpace, DrawDevice, Image, Matrix, Pixmap } = mu;
  let changed = 0;
  const count = pdf.countObjects();
  for (let num = 1; num < count; num++) {
    const obj = pdf.newIndirect(num);
    try {
      if (!obj.isStream() || obj.get("Subtype").toString() !== "/Image") continue;
      const imageMask = obj.get("ImageMask");
      if (imageMask.isBoolean() && imageMask.asBoolean()) continue;
      if (obj.get("Mask").isArray() || !obj.get("SMaskInData").isNull()) continue;
      const bpc = obj.get("BitsPerComponent");
      if (bpc.isNumber() && bpc.asNumber() < 8) continue;
      const filters = filterNames(obj);
      if (filters.includes("JBIG2Decode") || filters.includes("CCITTFaxDecode")) continue;

      const img = pdf.loadImage(obj);
      const cs = img.getColorSpace();
      if (!cs || !(cs.isGray() || cs.isRGB() || cs.isCMYK())) continue;
      const w = img.getWidth();
      const h = img.getHeight();
      if (w * h < 128 * 128) continue;
      const scale = Math.min(1, maxPx / Math.max(w, h));
      // JPEG ที่ไม่ต้องย่อ — บีบซ้ำได้ไม่คุ้มกับคุณภาพที่เสีย
      if (scale > 0.9 && filters.length === 1 && filters[0] === "DCTDecode") continue;

      const gray = cs.isGray();
      const outCs = gray ? ColorSpace.DeviceGray : ColorSpace.DeviceRGB;
      const tw = Math.max(1, Math.round(w * scale));
      const th = Math.max(1, Math.round(h * scale));
      // แปลงเฉพาะตัวรูป (ไม่รวม SMask — mask ยังเป็น object เดิมและขนาดต่างจากรูปได้ตามสเปก)
      const base = new Image(img.toPixmap());
      const target = new Pixmap(outCs, [0, 0, tw, th], false);
      target.clear(255);
      const dev = new DrawDevice(Matrix.identity, target);
      dev.fillImage(base, [tw, 0, 0, th, 0, 0], 1);
      dev.close();
      const jpeg = target.asJPEG(quality).slice();
      if (jpeg.length >= obj.readRawStream().getLength() * 0.9) continue;

      obj.writeRawStream(jpeg);
      obj.put("Filter", pdf.newName("DCTDecode"));
      obj.delete("DecodeParms");
      obj.delete("Decode");
      obj.put("Width", tw);
      obj.put("Height", th);
      obj.put("BitsPerComponent", 8);
      obj.put("ColorSpace", pdf.newName(gray ? "DeviceGray" : "DeviceRGB"));
      changed++;
    } catch {
      // รูปที่อ่านไม่ได้/รูปแบบแปลก ๆ ปล่อยไว้ตามเดิม
    }
  }
  return changed;
}

export function compressPdf(mu: Mupdf, bytes: Uint8Array, level: CompressLevel): CompressResult {
  const doc = open(mu, bytes);
  try {
    if (doc.needsPassword()) throw new Error("ไฟล์นี้มีรหัสผ่าน — ปลดรหัสด้วยเครื่องมือ “ปลดรหัส PDF” ก่อน");
    const pdf = doc as PdfDoc;
    let longest = 0;
    for (let i = 0; i < pdf.countPages(); i++) {
      const [x0, y0, x1, y1] = pdf.loadPage(i).getBounds();
      longest = Math.max(longest, x1 - x0, y1 - y0);
    }
    const { dpi, quality } = COMPRESS_LEVELS[level];
    const images = recompressImages(mu, pdf, Math.round((longest / 72) * dpi), quality);
    try {
      pdf.subsetFonts();
    } catch {
      // ฟอนต์บางแบบตัดเฉพาะตัวที่ใช้ไม่ได้ — ข้ามไป ไฟล์ยังถูกต้อง
    }
    const out = save(doc, `${SAVE},compress-fonts,compress-images`);
    const smaller = out.length < bytes.length;
    return { bytes: smaller ? out : bytes, before: bytes.length, after: smaller ? out.length : bytes.length, images, smaller };
  } finally {
    doc.destroy();
  }
}
