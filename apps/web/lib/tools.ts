// รายการเครื่องมือ — ใช้สร้างหน้าแรก, หัวข้อแต่ละหน้า, ลิงก์เครื่องมืออื่น และ metadata

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
  | "pdf-to-word"
  | "watermark"
  | "page-numbers"
  | "compress"
  | "protect"
  | "unlock";

export type ToolCategory = "organize" | "convert" | "edit" | "security";

export type Tool = {
  slug: ToolSlug;
  title: string;
  summary: string;
  color: string;
  category: ToolCategory;
};

export const CATEGORIES: { id: ToolCategory; title: string; summary: string }[] = [
  { id: "organize", title: "จัดระเบียบ PDF", summary: "รวม แยก เรียง หมุน บีบอัด" },
  { id: "convert", title: "แปลงไฟล์", summary: "รูปภาพ ⇄ PDF, PDF → Word" },
  { id: "edit", title: "แต่ง PDF", summary: "ลายน้ำ เลขหน้า" },
  { id: "security", title: "ความปลอดภัย", summary: "ใส่ / ปลดรหัสผ่าน" },
];

export const TOOLS: Tool[] = [
  { slug: "merge", title: "รวม PDF", summary: "รวมหลายไฟล์เป็นไฟล์เดียว เรียงลำดับได้ตามต้องการ", color: "#e11d48", category: "organize" },
  { slug: "split", title: "แยก PDF", summary: "แยกทุกหน้า แบ่งตามช่วง หรือดึงเฉพาะหน้าที่ต้องการ", color: "#ea580c", category: "organize" },
  { slug: "organize", title: "จัดหน้า PDF", summary: "สลับลำดับหน้า ลบหน้า และหมุนทีละหน้า", color: "#059669", category: "organize" },
  { slug: "rotate", title: "หมุน PDF", summary: "หมุนทั้งไฟล์หรือเฉพาะหน้าที่ตะแคง", color: "#d97706", category: "organize" },
  { slug: "compress", title: "บีบอัด PDF", summary: "ลดขนาดไฟล์สำหรับส่งอีเมล/LINE เลือกระดับความคมชัดได้", color: "#65a30d", category: "organize" },
  { slug: "jpg-to-pdf", title: "รูปภาพ → PDF", summary: "แปลง JPG, PNG, WebP เป็น PDF หลายรูปในไฟล์เดียว", color: "#0284c7", category: "convert" },
  { slug: "pdf-to-jpg", title: "PDF → รูปภาพ", summary: "แปลงแต่ละหน้าเป็น JPG หรือ PNG ความละเอียดสูง", color: "#7c3aed", category: "convert" },
  { slug: "pdf-to-word", title: "PDF → Word", summary: "แปลงเป็นไฟล์ Word ที่แก้ไขได้ หน้าตาใกล้ต้นฉบับ รองรับภาษาไทย", color: "#2563eb", category: "convert" },
  { slug: "watermark", title: "ใส่ลายน้ำ", summary: "ใส่ข้อความภาษาไทยหรือโลโก้ ปรับความจาง มุม ตำแหน่ง", color: "#4f46e5", category: "edit" },
  { slug: "page-numbers", title: "ใส่เลขหน้า", summary: "เลือกตำแหน่ง รูปแบบ และหน้าที่เริ่มนับได้", color: "#0d9488", category: "edit" },
  { slug: "protect", title: "ใส่รหัส PDF", summary: "ล็อกไฟล์ด้วยรหัสผ่าน กำหนดได้ว่าพิมพ์/คัดลอกได้ไหม", color: "#c026d3", category: "security" },
  { slug: "unlock", title: "ปลดรหัส PDF", summary: "เอารหัสผ่านและข้อห้ามพิมพ์/คัดลอกออก (ต้องรู้รหัส)", color: "#0891b2", category: "security" },
];

/** เครื่องมือที่จะมาในเฟสถัดไป */
export const UPCOMING = [
  { title: "Word / Excel / PowerPoint → PDF", summary: "แปลงเอกสาร Office พร้อมฟอนต์ไทย" },
  { title: "OCR อ่านข้อความไทย", summary: "ทำให้ PDF สแกนค้นหาและคัดลอกข้อความได้" },
];

export function getTool(slug: ToolSlug): Tool {
  const tool = TOOLS.find((t) => t.slug === slug);
  if (!tool) throw new Error(`unknown tool: ${slug}`);
  return tool;
}
