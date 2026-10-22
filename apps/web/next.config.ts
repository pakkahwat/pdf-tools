import type { NextConfig } from "next";

// ไม่เปิด cacheComponents: ทุกหน้าเป็นเครื่องมือฝั่ง client ล้วน และ cacheComponents จะเก็บหน้าที่ออกไปแล้วไว้แบบซ่อน
// (React Activity) ทำให้ไฟล์ PDF ขนาดใหญ่ค้างอยู่ในหน่วยความจำ — ปิดไว้เพื่อให้ออกจากหน้าแล้วคืนหน่วยความจำทันที
const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
