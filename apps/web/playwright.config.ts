import { defineConfig, devices } from "@playwright/test";

// E2E: อัปโหลดไฟล์ที่สร้างด้วยโค้ด (test-utils/fixtures.ts) ผ่านหน้าเว็บจริง → กดประมวลผล → ตรวจไฟล์ที่ดาวน์โหลด
// ใน CI ใช้ `next start` (ต้อง build ก่อน) · ในเครื่องใช้ dev server ที่เปิดอยู่แล้วได้
// ทดสอบเว็บที่ deploy แล้ว: E2E_BASE_URL=https://pdf.devda.fyi npm run e2e (ไม่เปิดเซิร์ฟเวอร์ในเครื่อง)
const PORT = 3001;
const CI = !!process.env.CI;
const REMOTE = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  // "github" ทำให้เทสต์ที่ล้มขึ้นเป็น annotation บนหน้า Actions/PR (อ่านได้โดยไม่ต้องเปิด log)
  reporter: CI ? [["list"], ["github"], ["html", { open: "never", outputFolder: "e2e/report" }]] : [["list"]],
  outputDir: "e2e/test-results",
  use: {
    baseURL: REMOTE ?? `http://localhost:${PORT}`,
    locale: "th-TH",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: REMOTE
    ? undefined
    : {
        command: CI ? "npm run start" : "npm run dev",
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !CI,
        timeout: 120_000,
      },
});
