// วาดข้อความเป็นภาพ PNG ด้วย canvas ของเบราว์เซอร์ — เบราว์เซอร์จัดวางสระ/วรรณยุกต์ไทยได้ถูกต้อง
// (pdf-lib วางวรรณยุกต์ซ้อนเองไม่ได้) จึงใช้ทางนี้กับลายน้ำและเลขหน้าที่เป็นภาษาไทย

export type TextImage = { bytes: Uint8Array; width: number; height: number };

export async function textToPng(
  text: string,
  opts: { family: string; weight: number; sizePx: number; color: string },
): Promise<TextImage> {
  const font = `${opts.weight} ${opts.sizePx}px ${opts.family}`;
  await document.fonts.load(font, text);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("เบราว์เซอร์นี้วาดภาพไม่ได้");
  ctx.font = font;
  const m = ctx.measureText(text);
  const pad = Math.ceil(opts.sizePx * 0.08);
  // ใช้ความสูงของฟอนต์ (ไม่ใช่ของตัวอักษรจริง) ให้ทุกภาพมีเส้นฐานตรงกัน — เลขหน้าแต่ละหน้าจะไม่กระโดด
  const ascent = Math.ceil(Math.max(m.fontBoundingBoxAscent, m.actualBoundingBoxAscent));
  const descent = Math.ceil(Math.max(m.fontBoundingBoxDescent, m.actualBoundingBoxDescent));
  const left = Math.ceil(Math.max(0, m.actualBoundingBoxLeft));
  const width = Math.ceil(Math.max(m.width, m.actualBoundingBoxRight));

  canvas.width = Math.max(1, left + width + pad * 2);
  canvas.height = Math.max(1, ascent + descent + pad * 2);
  ctx.font = font; // ตั้งใหม่ เพราะเปลี่ยนขนาด canvas แล้วค่าจะถูกรีเซ็ต
  ctx.fillStyle = opts.color;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(text, pad + left, pad + ascent);

  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
  const result = { width: canvas.width, height: canvas.height };
  canvas.width = canvas.height = 0;
  if (!blob) throw new Error("วาดข้อความไม่สำเร็จ");
  return { bytes: new Uint8Array(await blob.arrayBuffer()), ...result };
}
