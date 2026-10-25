import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // ภาพย่อ/พรีวิวเป็น data URL ที่สร้างในเบราว์เซอร์ — next/image ใช้กับภาพแบบนี้ไม่ได้
    rules: { "@next/next/no-img-element": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // ไฟล์ static (pdf.js ที่คัดลอกมา, worker ของ PDF → Word ที่ไม่ผ่าน bundler) และผลการทดสอบ
    "public/**",
    "e2e/report/**",
    "e2e/test-results/**",
  ]),
]);

export default eslintConfig;
