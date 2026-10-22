// เตรียมรูปสำหรับฝังลง PDF (ฝั่งเบราว์เซอร์): JPG/PNG ตั้งตรงใช้ไฟล์เดิมได้เลย (ไม่เสียคุณภาพ)
// รูปที่ต้องหมุนตาม EXIF หรือเป็นชนิดอื่น (WebP, GIF, BMP) วาดใหม่ลง canvas ก่อน
import { jpegOrientation } from "./exif";
import type { ImageInput } from "./pdf/ops";

function sniff(b: Uint8Array): "jpg" | "png" | "other" {
  if (b[0] === 0xff && b[1] === 0xd8) return "jpg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "png";
  return "other";
}

export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/bmp";

export function isImageFile(file: File): boolean {
  return /^image\/(jpeg|png|webp|gif|bmp)$/.test(file.type) || /\.(jpe?g|png|webp|gif|bmp)$/i.test(file.name);
}

export async function prepareImage(file: File): Promise<ImageInput> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniff(bytes);
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file); // หมุนตาม EXIF ให้อัตโนมัติ
  } catch {
    throw new Error(`เปิดรูป "${file.name}" ไม่ได้ — รองรับ JPG, PNG, WebP, GIF, BMP`);
  }
  try {
    const { width, height } = bitmap;
    if (kind === "png") return { bytes, type: "png", width, height };
    if (kind === "jpg" && jpegOrientation(bytes) <= 1) return { bytes, type: "jpg", width, height };

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("เบราว์เซอร์นี้วาดภาพไม่ได้");
    ctx.drawImage(bitmap, 0, 0);
    const type = kind === "jpg" ? "image/jpeg" : "image/png";
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, type, 0.92));
    canvas.width = canvas.height = 0;
    if (!blob) throw new Error(`แปลงรูป "${file.name}" ไม่สำเร็จ`);
    return { bytes: new Uint8Array(await blob.arrayBuffer()), type: kind === "jpg" ? "jpg" : "png", width, height };
  } finally {
    bitmap.close();
  }
}
