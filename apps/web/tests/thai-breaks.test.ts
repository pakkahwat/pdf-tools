import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { breakParagraph, insertThaiBreaks, thaiBreakPositions } from "@/lib/pdf2word/thai-breaks";

const ZWSP = "​";
const seg = new Intl.Segmenter("th", { granularity: "word" });

/** แทรก ZWSP ตามตำแหน่งที่ได้ — ให้อ่านผลได้ง่ายในเทสต์ */
function withBreaks(text: string) {
  const marks = thaiBreakPositions(text, seg);
  return [...text].map((ch, i) => (marks.has(i) ? ZWSP : "") + ch).join("");
}

const para = (...runs: string[]) => `<w:p>${runs.map((t) => `<w:r><w:t>${t}</w:t></w:r>`).join("")}</w:p>`;
const texts = (xml: string) => [...xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]);

describe("thaiBreakPositions", () => {
  it("แทรกระหว่างคำไทยที่ติดกัน", () => {
    expect(withBreaks("สวัสดีครับ")).toBe(`สวัสดี${ZWSP}ครับ`);
  });

  it("ไม่แทรกรอบช่องว่าง ตัวเลข หรือภาษาอังกฤษ", () => {
    expect(withBreaks("Hello world")).toBe("Hello world");
    expect(withBreaks("สวัสดี ABC 2569")).toBe("สวัสดี ABC 2569");
  });
});

describe("breakParagraph", () => {
  it("ตัดคำจากข้อความทั้งย่อหน้า แม้คำเดียวกันจะอยู่คนละ run", () => {
    const out = breakParagraph(para("สวัส", "ดีครับ"), seg);
    // รอยต่อ run อยู่กลางคำ "สวัสดี" จึงไม่แทรกตรงนั้น
    expect(texts(out)).toEqual(["สวัส", `ดี${ZWSP}ครับ`]);
    expect(out).toContain('<w:t xml:space="preserve">');
  });

  it("ย่อหน้าที่ไม่มีภาษาไทยคงเดิมทุกตัวอักษร", () => {
    const p = para("Hello ", "world");
    expect(breakParagraph(p, seg)).toBe(p);
  });
});

describe("insertThaiBreaks", () => {
  it("แก้เฉพาะเนื้อหาเอกสาร/หัวกระดาษ/ท้ายกระดาษ และนับจำนวนที่แทรก", () => {
    const docx = zipSync({
      "word/document.xml": strToU8(`<w:body>${para("สวัสดีครับ")}${para("Hello")}</w:body>`),
      "word/header1.xml": strToU8(`<w:hdr>${para("สวัสดีครับ")}</w:hdr>`),
      "word/styles.xml": strToU8(`<w:styles>${para("สวัสดีครับ")}</w:styles>`),
    });
    const { bytes, inserted } = insertThaiBreaks(docx);
    const files = unzipSync(bytes);
    expect(inserted).toBe(2);
    expect(texts(strFromU8(files["word/document.xml"]))).toEqual([`สวัสดี${ZWSP}ครับ`, "Hello"]);
    expect(texts(strFromU8(files["word/header1.xml"]))).toEqual([`สวัสดี${ZWSP}ครับ`]);
    expect(texts(strFromU8(files["word/styles.xml"]))).toEqual(["สวัสดีครับ"]);
  });

  it("ไม่แทรกซ้ำเมื่อรันซ้ำกับไฟล์เดิม", () => {
    const once = insertThaiBreaks(zipSync({ "word/document.xml": strToU8(para("สวัสดีครับ")) }));
    const twice = insertThaiBreaks(once.bytes);
    expect(twice.inserted).toBe(0);
  });
});
