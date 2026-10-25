// ใส่ zero-width space (U+200B) ระหว่างคำไทยใน DOCX — ให้ Word ตัดบรรทัดตามคำได้แม้เครื่องนั้นไม่ได้เปิดการตัดคำไทย
// ตัดคำด้วย Intl.Segmenter (พจนานุกรม ICU ชุดเดียวกับ Chrome) ตอนทำในเบราว์เซอร์ใช้โค้ดนี้ได้ตรง ๆ
// ใช้: node zwsp.mjs in.docx out.docx
import { readFileSync, writeFileSync } from "node:fs";
import { strFromU8, strToU8, unzipSync, zipSync } from "../../apps/web/node_modules/fflate/esm/index.mjs";

const THAI = /[\u0E00-\u0E7F]/;
const ZWSP = "\u200B";
const T_RE = /<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g;
const segmenter = new Intl.Segmenter("th", { granularity: "word" });

/** ตำแหน่ง (ในข้อความ) ที่ควรแทรก ZWSP ข้างหน้า: รอยต่อระหว่างคำไทยกับคำไทย */
function breakPositions(text) {
  const marks = new Set();
  let prevThai = false;
  for (const { segment, index } of segmenter.segment(text)) {
    const isThai = THAI.test(segment);
    if (isThai && prevThai) marks.add(index);
    prevThai = isThai;
  }
  return marks;
}

// ข้อความไทยที่ต่อเนื่องอาจอยู่คนละ run — ตัดคำจากข้อความทั้งย่อหน้า แล้วแทรก ZWSP กลับใน w:t ที่ครอบตำแหน่งนั้น
function processParagraph(p) {
  const texts = [...p.matchAll(T_RE)].map((m) => m[1]);
  if (!texts.some((t) => THAI.test(t))) return p;
  const marks = breakPositions(texts.join(""));
  let offset = 0;
  return p.replace(T_RE, (_, text) => {
    let out = "";
    for (let k = 0; k < text.length; k++) {
      if (marks.has(offset + k)) out += ZWSP;
      out += text[k];
    }
    offset += text.length;
    return `<w:t xml:space="preserve">${out}</w:t>`;
  });
}

const [src, dst] = process.argv.slice(2);
const files = unzipSync(readFileSync(src));
let xml = strFromU8(files["word/document.xml"]);
const before = (xml.match(/\u200B/g) ?? []).length;
xml = xml.replace(/<w:p[ >][\s\S]*?<\/w:p>/g, processParagraph);
files["word/document.xml"] = strToU8(xml);
writeFileSync(dst, zipSync(files));
console.log(`zwsp inserted: ${(xml.match(/\u200B/g) ?? []).length - before}`);
