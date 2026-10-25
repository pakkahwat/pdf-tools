// ใส่ zero-width space (U+200B) ระหว่างคำไทยใน DOCX
// Word ตัดคำไทยด้วยพจนานุกรมเฉพาะเครื่องที่เปิดภาษาไทยใน Office — เครื่องอื่นตัดได้แค่ตรงช่องว่าง บรรทัดจึงขาดก่อนเวลา
// ตัดคำด้วย Intl.Segmenter (พจนานุกรม ICU ชุดเดียวกับ Chrome) ตำแหน่งตัดบรรทัดจึงตรงกับ PDF ที่สร้างจากเบราว์เซอร์
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";

const THAI = /[฀-๿]/;
const ZWSP = "​";
const T_RE = /<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g;

/** ตำแหน่ง (ในข้อความ) ที่ควรแทรก ZWSP ข้างหน้า: รอยต่อระหว่างคำไทยกับคำไทย */
export function thaiBreakPositions(text: string, segmenter = new Intl.Segmenter("th", { granularity: "word" })): Set<number> {
  const marks = new Set<number>();
  let prevThai = false;
  for (const { segment, index } of segmenter.segment(text)) {
    const isThai = THAI.test(segment);
    if (isThai && prevThai) marks.add(index);
    prevThai = isThai;
  }
  return marks;
}

/** ข้อความไทยที่ต่อเนื่องอาจอยู่คนละ run — ตัดคำจากข้อความทั้งย่อหน้า แล้วแทรก ZWSP กลับใน w:t ที่ครอบตำแหน่งนั้น */
export function breakParagraph(p: string, segmenter: Intl.Segmenter): string {
  const texts = [...p.matchAll(T_RE)].map((m) => m[1]);
  if (!texts.some((t) => THAI.test(t))) return p;
  const marks = thaiBreakPositions(texts.join(""), segmenter);
  if (marks.size === 0) return p;
  let offset = 0;
  return p.replace(T_RE, (_, text: string) => {
    let out = "";
    for (let k = 0; k < text.length; k++) {
      if (marks.has(offset + k)) out += ZWSP;
      out += text[k];
    }
    offset += text.length;
    return `<w:t xml:space="preserve">${out}</w:t>`;
  });
}

export function insertThaiBreaks(docx: Uint8Array): { bytes: Uint8Array; inserted: number } {
  const files = unzipSync(docx);
  const segmenter = new Intl.Segmenter("th", { granularity: "word" });
  let inserted = 0;
  for (const name of Object.keys(files)) {
    if (!/^word\/(document|header\d*|footer\d*)\.xml$/.test(name)) continue;
    const xml = strFromU8(files[name]);
    const before = (xml.match(/​/g) ?? []).length;
    const out = xml.replace(/<w:p[ >][\s\S]*?<\/w:p>/g, (p) => breakParagraph(p, segmenter));
    inserted += (out.match(/​/g) ?? []).length - before;
    files[name] = strToU8(out);
  }
  return { bytes: zipSync(files), inserted };
}
