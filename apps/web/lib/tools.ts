// รายการเครื่องมือ — ใช้สร้างหน้าแรก, หัวข้อแต่ละหน้า และ metadata

export const SITE = {
  name: "PDF Tools",
  tagline: "เครื่องมือ PDF ใช้ฟรี ไฟล์ไม่ออกจากเครื่องคุณ",
};

export type ToolSlug =
  | "merge"
  | "split"
  | "rotate"
  | "organize"
  | "jpg-to-pdf"
  | "pdf-to-jpg"
  | "watermark"
  | "page-numbers";

export type Tool = {
  slug: ToolSlug;
  title: string;
  summary: string;
  color: string;
};

export const TOOLS: Tool[] = [
  { slug: "merge", title: "รวม PDF", summary: "รวมหลายไฟล์เป็นไฟล์เดียว เรียงลำดับได้ตามต้องการ", color: "#e11d48" },
  { slug: "split", title: "แยก PDF", summary: "แยกทุกหน้า แบ่งตามช่วง หรือดึงเฉพาะหน้าที่ต้องการ", color: "#ea580c" },
  { slug: "organize", title: "จัดหน้า PDF", summary: "ลากสลับลำดับหน้า ลบหน้า และหมุนทีละหน้า", color: "#059669" },
  { slug: "rotate", title: "หมุน PDF", summary: "หมุนทั้งไฟล์หรือเฉพาะหน้าที่ตะแคง", color: "#d97706" },
  { slug: "jpg-to-pdf", title: "รูปภาพ → PDF", summary: "แปลง JPG, PNG, WebP เป็น PDF หลายรูปในไฟล์เดียว", color: "#0284c7" },
  { slug: "pdf-to-jpg", title: "PDF → รูปภาพ", summary: "แปลงแต่ละหน้าเป็น JPG หรือ PNG ความละเอียดสูง", color: "#7c3aed" },
  { slug: "watermark", title: "ใส่ลายน้ำ", summary: "ใส่ข้อความภาษาไทยหรือโลโก้ ปรับความจาง มุม ตำแหน่ง", color: "#4f46e5" },
  { slug: "page-numbers", title: "ใส่เลขหน้า", summary: "เลือกตำแหน่ง รูปแบบ และหน้าที่เริ่มนับได้", color: "#0d9488" },
];

/** เครื่องมือที่ต้องใช้เซิร์ฟเวอร์ — จะมาในเฟสถัดไป */
export const UPCOMING = [
  { title: "Word / Excel / PowerPoint → PDF", summary: "แปลงเอกสาร Office พร้อมฟอนต์ไทย" },
  { title: "บีบอัด PDF", summary: "ลดขนาดไฟล์สำหรับส่งอีเมล/LINE" },
  { title: "OCR อ่านข้อความไทย", summary: "ทำให้ PDF สแกนค้นหาและคัดลอกข้อความได้" },
  { title: "ใส่ / ปลดรหัสผ่าน", summary: "ล็อกไฟล์ หรือปลดล็อกไฟล์ที่รู้รหัส" },
  { title: "PDF → Word", summary: "แปลงกลับเป็นไฟล์ที่แก้ไขได้" },
];

export function getTool(slug: ToolSlug): Tool {
  const tool = TOOLS.find((t) => t.slug === slug);
  if (!tool) throw new Error(`unknown tool: ${slug}`);
  return tool;
}
