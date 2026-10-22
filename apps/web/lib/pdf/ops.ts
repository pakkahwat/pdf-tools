// งาน PDF ทั้งหมดที่รันใน Web Worker (และใน Node ตอน unit test) — ใช้ pdf-lib ล้วน ไม่แตะ DOM
// ทุกฟังก์ชันที่ export จากไฟล์นี้เรียกผ่าน runPdf() ได้ — error ที่ throw ต้องเป็นข้อความภาษาไทยที่แสดงให้ผู้ใช้ได้เลย
import { degrees, PDFDocument, rgb, StandardFonts, type PDFImage, type PDFPage } from "pdf-lib";
import { pageLabels } from "./labels";
import {
  anchorCenter,
  normalizeAngle,
  pageFrame,
  placeCentered,
  rotatedBounds,
  type Position,
} from "./layout";

export type NamedPdf = { name: string; bytes: Uint8Array };
/** หน้าในไฟล์ผลลัพธ์: เอาหน้าที่ index (เริ่ม 0) ของไฟล์ต้นฉบับ แล้วหมุนเพิ่ม rotate องศา (ทวีคูณของ 90) */
export type PageSpec = { index: number; rotate: number };
export type ImageInput = { bytes: Uint8Array; type: "jpg" | "png"; width: number; height: number };
export type ImagesToPdfOptions = {
  pageSize: "fit" | "a4" | "letter";
  orientation: "auto" | "portrait" | "landscape";
  /** ระยะขอบ (pt) */
  margin: number;
};
export type WatermarkOptions = {
  image: { bytes: Uint8Array; type: "jpg" | "png"; width: number; height: number };
  /** ความกว้างของลายน้ำเทียบกับความกว้างหน้า (0–1) */
  widthRatio: number;
  position: Position | "tile";
  /** มุมเอียงตามที่ผู้ใช้เห็น (องศา ทวนเข็มนาฬิกา) */
  rotate: number;
  opacity: number;
  /** index หน้าที่จะใส่ — ไม่ระบุ = ทุกหน้า */
  pages?: number[];
};
export type PageNumberOptions = {
  position: "tl" | "tc" | "tr" | "bl" | "bc" | "br";
  margin: number;
  fontSize: number;
  format: string;
  startAt: number;
  /** หน้าแรกที่เริ่มใส่เลข (เริ่ม 1) */
  fromPage: number;
  /** แทนค่า {total} (ใช้ตอนพรีวิวด้วยไฟล์หน้าเดียว) */
  total?: number;
  /** ภาพข้อความที่วาดจากเบราว์เซอร์ (สำหรับรูปแบบภาษาไทย) เรียงตามหน้าที่ใส่เลข — สูง 1 หน่วย = 1/scale pt */
  labels?: { bytes: Uint8Array; width: number; height: number }[];
  labelScale?: number;
};

const A4: [number, number] = [595.28, 841.89];
const LETTER: [number, number] = [612, 792];

async function load(bytes: Uint8Array, name?: string): Promise<PDFDocument> {
  const who = name ? `ไฟล์ "${name}"` : "ไฟล์นี้";
  try {
    return await PDFDocument.load(bytes, { updateMetadata: false });
  } catch (e) {
    // error ของ pdf-lib คอมไพล์แบบ ES5 จึงใช้ instanceof EncryptedPDFError ไม่ได้ — ดูจากข้อความแทน
    if (e instanceof Error && /is encrypted/i.test(e.message)) {
      throw new Error(`${who} ถูกล็อกหรือเข้ารหัสไว้ จึงแก้ไขในเบราว์เซอร์ไม่ได้ (เครื่องมือปลดล็อกจะมาในเวอร์ชันถัดไป)`);
    }
    throw new Error(`เปิด${who} ไม่ได้ — ไฟล์อาจเสียหรือไม่ใช่ PDF`);
  }
}

function addRotation(page: PDFPage, delta: number) {
  if (normalizeAngle(delta) === 0) return;
  page.setRotation(degrees(normalizeAngle(page.getRotation().angle + delta)));
}

export async function mergePdfs(files: NamedPdf[]): Promise<Uint8Array> {
  if (files.length < 2) throw new Error("ต้องมีอย่างน้อย 2 ไฟล์");
  const out = await PDFDocument.create();
  for (const f of files) {
    const src = await load(f.bytes, f.name);
    const pages = await out.copyPages(src, src.getPageIndices());
    for (const p of pages) out.addPage(p);
  }
  return out.save();
}

/** แต่ละกลุ่มของ index หน้า → 1 ไฟล์ */
export async function splitPdf(bytes: Uint8Array, groups: number[][]): Promise<Uint8Array[]> {
  const src = await load(bytes);
  const results: Uint8Array[] = [];
  for (const group of groups) {
    const out = await PDFDocument.create();
    const pages = await out.copyPages(src, group);
    for (const p of pages) out.addPage(p);
    results.push(await out.save());
  }
  return results;
}

/** หมุนทีละหน้า (rotations[i] = องศาที่หมุนเพิ่มของหน้า i) — แก้ในไฟล์เดิม จึงเก็บ bookmark/ฟอร์มไว้ครบ */
export async function rotatePdf(bytes: Uint8Array, rotations: number[]): Promise<Uint8Array> {
  const doc = await load(bytes);
  doc.getPages().forEach((page, i) => addRotation(page, rotations[i] ?? 0));
  return doc.save();
}

/** สร้างไฟล์ใหม่ตามลำดับหน้า/การหมุนที่กำหนด (ใช้กับจัดหน้า ลบหน้า และตัดหน้าเดียวไปพรีวิว) */
export async function rebuildPdf(bytes: Uint8Array, pages: PageSpec[]): Promise<Uint8Array> {
  if (pages.length === 0) throw new Error("ต้องเหลืออย่างน้อย 1 หน้า");
  const src = await load(bytes);
  const out = await PDFDocument.create();
  const copied = await out.copyPages(
    src,
    pages.map((p) => p.index),
  );
  copied.forEach((page, i) => {
    addRotation(page, pages[i].rotate);
    out.addPage(page);
  });
  return out.save();
}

export async function imagesToPdf(images: ImageInput[], opts: ImagesToPdfOptions): Promise<Uint8Array> {
  if (images.length === 0) throw new Error("ยังไม่ได้เลือกรูปภาพ");
  const out = await PDFDocument.create();
  for (const img of images) {
    const embedded = img.type === "jpg" ? await out.embedJpg(img.bytes) : await out.embedPng(img.bytes);
    const landscape =
      opts.orientation === "landscape" || (opts.orientation === "auto" && img.width > img.height);
    let pageW: number;
    let pageH: number;
    if (opts.pageSize === "fit") {
      // ถือว่ารูปเป็น 96 DPI (1px = 0.75pt) แล้วเผื่อขอบ
      pageW = img.width * 0.75 + opts.margin * 2;
      pageH = img.height * 0.75 + opts.margin * 2;
    } else {
      const [w, h] = opts.pageSize === "a4" ? A4 : LETTER;
      [pageW, pageH] = landscape ? [h, w] : [w, h];
    }
    const page = out.addPage([pageW, pageH]);
    const boxW = pageW - opts.margin * 2;
    const boxH = pageH - opts.margin * 2;
    const scale = Math.min(boxW / img.width, boxH / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    page.drawImage(embedded, { x: (pageW - w) / 2, y: (pageH - h) / 2, width: w, height: h });
  }
  return out.save();
}

export async function addWatermark(bytes: Uint8Array, opts: WatermarkOptions): Promise<Uint8Array> {
  const doc = await load(bytes);
  const image: PDFImage =
    opts.image.type === "jpg" ? await doc.embedJpg(opts.image.bytes) : await doc.embedPng(opts.image.bytes);
  const aspect = opts.image.height / opts.image.width;
  const targets = new Set(opts.pages ?? doc.getPageIndices());

  doc.getPages().forEach((page, i) => {
    if (!targets.has(i)) return;
    const f = pageFrame(page);
    const w = f.vw * opts.widthRatio;
    const h = w * aspect;
    const { bw, bh } = rotatedBounds(w, h, opts.rotate);

    const centers: { cx: number; cy: number }[] = [];
    if (opts.position === "tile") {
      // เรียงแบบอิฐ: แถวเว้นแถวเลื่อนครึ่งช่อง และเลยขอบออกไปเล็กน้อยให้เต็มหน้า
      const stepX = bw * 1.35;
      const stepY = bh * 1.6;
      for (let row = 0, cy = stepY / 2; cy - bh / 2 < f.vh; row++, cy += stepY) {
        const offset = row % 2 ? stepX / 2 : 0;
        for (let cx = offset; cx - bw / 2 < f.vw; cx += stepX) centers.push({ cx, cy });
      }
    } else {
      centers.push(anchorCenter(f, opts.position, bw, bh, Math.min(f.vw, f.vh) * 0.05));
    }

    for (const { cx, cy } of centers) {
      const p = placeCentered(f, cx, cy, w, h, opts.rotate);
      page.drawImage(image, { x: p.x, y: p.y, width: w, height: h, rotate: degrees(p.angle), opacity: opts.opacity });
    }
  });
  return doc.save();
}

export async function addPageNumbers(bytes: Uint8Array, opts: PageNumberOptions): Promise<Uint8Array> {
  const doc = await load(bytes);
  const pages = doc.getPages();
  const labels = pageLabels(pages.length, opts);
  const font = opts.labels ? null : await doc.embedFont(StandardFonts.Helvetica);
  const color = rgb(0.12, 0.12, 0.12);
  const scale = opts.labelScale ?? 1;

  for (const [k, { index, text }] of labels.entries()) {
    const page = pages[index];
    const f = pageFrame(page);
    if (font) {
      const w = font.widthOfTextAtSize(text, opts.fontSize);
      const h = font.heightAtSize(opts.fontSize, { descender: false });
      const { cx, cy } = anchorCenter(f, opts.position, w, h, opts.margin);
      const p = placeCentered(f, cx, cy, w, h, 0);
      page.drawText(text, { x: p.x, y: p.y, size: opts.fontSize, font, color, rotate: degrees(p.angle) });
    } else {
      const label = opts.labels![k];
      if (!label) throw new Error("ข้อมูลเลขหน้าไม่ครบ");
      const img = await doc.embedPng(label.bytes);
      const w = label.width / scale;
      const h = label.height / scale;
      const { cx, cy } = anchorCenter(f, opts.position, w, h, opts.margin);
      const p = placeCentered(f, cx, cy, w, h, 0);
      page.drawImage(img, { x: p.x, y: p.y, width: w, height: h, rotate: degrees(p.angle) });
    }
  }
  return doc.save();
}

/** จำนวนหน้า (ใช้ตรวจไฟล์ใน unit test / E2E) */
export async function countPages(bytes: Uint8Array): Promise<number> {
  return (await load(bytes)).getPageCount();
}
