import { Kanit, Sarabun } from "next/font/google";

/** ฟอนต์หลักของหน้าเว็บ */
export const kanit = Kanit({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-kanit",
  display: "swap",
});

/** ฟอนต์เอกสาร (Sarabun = TH Sarabun New ฉบับโอเพนซอร์ส) — ใช้วาดลายน้ำ/เลขหน้าภาษาไทย โหลดเมื่อใช้จริงเท่านั้น */
export const sarabun = Sarabun({
  subsets: ["thai", "latin"],
  weight: ["400", "700"],
  variable: "--font-sarabun",
  display: "swap",
  preload: false,
});
