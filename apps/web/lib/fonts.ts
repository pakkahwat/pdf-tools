import { Kanit, Noto_Sans_Thai, Plus_Jakarta_Sans, Sarabun } from "next/font/google";

/** ฟอนต์หน้าเว็บ: ตัวละตินใช้ Plus Jakarta Sans, ตัวไทยตกไปใช้ Noto Sans Thai (ไม่มีหัว อ่านง่ายทุกขนาด) */
export const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const notoThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  variable: "--font-noto-thai",
  display: "swap",
});

/** ฟอนต์ลายน้ำ (ตัวเลือกในเครื่องมือลายน้ำ) — โหลดเมื่อใช้จริงเท่านั้น */
export const kanit = Kanit({
  subsets: ["thai", "latin"],
  weight: ["400", "600"],
  variable: "--font-kanit",
  display: "swap",
  preload: false,
});

/** ฟอนต์เอกสาร (Sarabun = TH Sarabun New ฉบับโอเพนซอร์ส) — ใช้วาดลายน้ำ/เลขหน้าภาษาไทย โหลดเมื่อใช้จริงเท่านั้น */
export const sarabun = Sarabun({
  subsets: ["thai", "latin"],
  weight: ["400", "700"],
  variable: "--font-sarabun",
  display: "swap",
  preload: false,
});
