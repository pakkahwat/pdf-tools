/**
 * อ่านค่า EXIF Orientation จากไฟล์ JPEG (1 = ตั้งตรง, 0 = ไม่ใช่ JPEG)
 * รูปจากมือถือมักเก็บภาพแนวนอนแล้วบอกให้หมุนผ่าน EXIF — ถ้าฝังลง PDF ตรง ๆ ภาพจะตะแคง จึงต้องรู้ค่านี้ก่อน
 */
export function jpegOrientation(b: Uint8Array): number {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return 0;
  let i = 2;
  while (i + 10 < b.length) {
    if (b[i] !== 0xff) return 1;
    const marker = b[i + 1];
    const len = (b[i + 2] << 8) | b[i + 3];
    if (marker === 0xda || marker === 0xd9) return 1; // เริ่มข้อมูลภาพแล้ว ไม่มี EXIF
    const isExif =
      marker === 0xe1 &&
      b[i + 4] === 0x45 && // E
      b[i + 5] === 0x78 && // x
      b[i + 6] === 0x69 && // i
      b[i + 7] === 0x66 && // f
      b[i + 8] === 0 &&
      b[i + 9] === 0;
    if (isExif) {
      const tiff = i + 10;
      const le = b[tiff] === 0x49; // "II" = little-endian
      const u16 = (o: number) => (le ? b[o] | (b[o + 1] << 8) : (b[o] << 8) | b[o + 1]);
      const u32 = (o: number) =>
        (le
          ? b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)
          : (b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
      const ifd = tiff + u32(tiff + 4);
      if (ifd + 2 > b.length) return 1;
      const count = u16(ifd);
      for (let k = 0; k < count; k++) {
        const entry = ifd + 2 + k * 12;
        if (entry + 10 > b.length) return 1;
        if (u16(entry) === 0x0112) return u16(entry + 8) || 1;
      }
      return 1;
    }
    i += 2 + len;
  }
  return 1;
}
