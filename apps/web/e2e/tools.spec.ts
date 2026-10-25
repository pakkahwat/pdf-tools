import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { strFromU8, unzipSync } from "fflate";
import { inspectPdf, makePdf, makePng } from "../test-utils/fixtures";

type Upload = { name: string; mimeType: string; buffer: Buffer };

const pdf = async (name: string, pages: number, sizes?: [number, number][]): Promise<Upload> => ({
  name,
  mimeType: "application/pdf",
  buffer: Buffer.from(await makePdf(pages, { sizes })),
});

async function upload(page: Page, files: Upload[]) {
  await page.getByTestId("file-input").first().setInputFiles(files);
}

async function runTool(page: Page, button: string) {
  await page.getByRole("button", { name: button, exact: true }).click();
  await expect(page.getByText("เสร็จแล้ว", { exact: true })).toBeVisible();
}

/** กดดาวน์โหลดแล้วคืนชื่อไฟล์ + เนื้อไฟล์ */
async function download(page: Page) {
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "ดาวน์โหลด" }).click()]);
  return { name: dl.suggestedFilename(), bytes: new Uint8Array(await readFile((await dl.path())!)) };
}

const magic = (b: Uint8Array) => Array.from(b.slice(0, 4));

test("หน้าแรกแสดงเครื่องมือทั้ง 9 และกดเข้าใช้งานได้", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("PDF");
  await expect(page.locator("#tools").getByRole("link")).toHaveCount(9);
  await page.locator("#tools").getByRole("link", { name: /รวม PDF/ }).click();
  await expect(page).toHaveURL(/\/merge$/);
  await expect(page.getByRole("list", { name: "ขั้นตอนการใช้งาน" })).toBeVisible();
});

test("เปลี่ยนลำดับไฟล์ด้วยปุ่มลูกศร (ไม่ต้องลาก)", async ({ page }) => {
  await page.goto("/merge");
  await upload(page, [await pdf("a.pdf", 1, [[200, 200]]), await pdf("b.pdf", 1, [[300, 300]])]);
  await expect(page.getByText("2 ไฟล์ · รวม 2 หน้า")).toBeVisible();
  await page.getByRole("button", { name: "เลื่อนไฟล์ a.pdf ไปถัดไป" }).click();
  await runTool(page, "รวม PDF");
  expect((await inspectPdf((await download(page)).bytes)).map((p) => p.width)).toEqual([300, 200]);
});

test("รวม PDF ตามลำดับไฟล์", async ({ page }) => {
  await page.goto("/merge");
  await upload(page, [await pdf("a.pdf", 2, [[200, 200], [210, 210]]), await pdf("b.pdf", 1, [[300, 300]])]);
  await expect(page.getByText("2 ไฟล์ · รวม 3 หน้า")).toBeVisible();
  await runTool(page, "รวม PDF");
  const out = await download(page);
  expect(out.name).toBe("merged.pdf");
  expect((await inspectPdf(out.bytes)).map((p) => p.width)).toEqual([200, 210, 300]);
});

test("รวม PDF แจ้งไฟล์ที่เปิดไม่ได้และไม่ใช่ PDF", async ({ page }) => {
  await page.goto("/merge");
  await upload(page, [
    await pdf("ok.pdf", 1),
    { name: "เสีย.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.7 broken") },
    { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") },
  ]);
  await expect(page.getByText("ข้ามไฟล์ที่ไม่ใช่ PDF: notes.txt")).toBeVisible();
  await expect(page.getByText(/เปิดไฟล์ไม่ได้/)).toBeVisible();
  await expect(page.getByRole("button", { name: "รวม PDF", exact: true })).toBeDisabled();
});

test("แยก PDF ตามช่วงหน้าเป็น zip", async ({ page }) => {
  await page.goto("/split");
  await upload(page, [await pdf("doc.pdf", 4)]);
  await page.getByPlaceholder("1-3, 4-8, 9-").fill("1, 2-4");
  await expect(page.getByText("จะได้ 2 ไฟล์")).toBeVisible();
  await runTool(page, "แยก PDF");
  const out = await download(page);
  expect(out.name).toBe("doc-split.zip");
  expect(magic(out.bytes)).toEqual([0x50, 0x4b, 0x03, 0x04]);
});

test("จัดหน้า: ลบหน้าแล้วบันทึก", async ({ page }) => {
  await page.goto("/organize");
  await upload(page, [await pdf("doc.pdf", 3, [[100, 100], [200, 200], [300, 300]])]);
  await page.getByRole("button", { name: "ลบหน้า 1" }).click();
  await page.getByRole("button", { name: "หมุนหน้า 3" }).click();
  await runTool(page, "บันทึก PDF");
  const pages = await inspectPdf((await download(page)).bytes);
  expect(pages.map((p) => [p.width, p.rotation])).toEqual([
    [200, 0],
    [300, 90],
  ]);
});

test("หมุนทุกหน้าตามเข็มนาฬิกา", async ({ page }) => {
  await page.goto("/rotate");
  await upload(page, [await pdf("doc.pdf", 2)]);
  await page.getByRole("button", { name: "ตามเข็ม" }).click();
  await runTool(page, "บันทึก PDF");
  expect((await inspectPdf((await download(page)).bytes)).map((p) => p.rotation)).toEqual([90, 90]);
});

test("รูปภาพ → PDF", async ({ page }) => {
  await page.goto("/jpg-to-pdf");
  await upload(page, [{ name: "photo.png", mimeType: "image/png", buffer: Buffer.from(makePng(300, 200)) }]);
  await runTool(page, "แปลงเป็น PDF (1 หน้า)");
  const pages = await inspectPdf((await download(page)).bytes);
  expect(pages).toHaveLength(1);
  expect(pages[0].images).toBe(1);
});

test("PDF → รูปภาพ (หน้าเดียวได้ไฟล์ JPG)", async ({ page }) => {
  await page.goto("/pdf-to-jpg");
  await upload(page, [await pdf("doc.pdf", 1)]);
  await runTool(page, "แปลงเป็นรูปภาพ (1 หน้า)");
  const out = await download(page);
  expect(out.name).toBe("doc-page-1.jpg");
  expect(magic(out.bytes).slice(0, 2)).toEqual([0xff, 0xd8]);
});

test("PDF → Word ได้ไฟล์ DOCX ที่มีข้อความเดิม", async ({ page }, testInfo) => {
  // โหลดตัวแปลง (Pyodide + PyMuPDF ราว 40MB จาก CDN) — ทดสอบเฉพาะบนเดสก์ท็อปพอ
  test.skip(testInfo.project.name !== "desktop", "ตัวแปลงเหมือนกันทุกจอ");
  test.setTimeout(240_000);
  await page.goto("/pdf-to-word");
  await upload(page, [{ name: "letter.pdf", mimeType: "application/pdf", buffer: Buffer.from(await makePdf(2, { label: "Hello" })) }]);
  await page.getByRole("button", { name: "แปลงเป็น Word", exact: true }).click();
  await expect(page.getByText("เสร็จแล้ว", { exact: true })).toBeVisible({ timeout: 200_000 });
  const out = await download(page);
  expect(out.name).toBe("letter.docx");
  const xml = strFromU8(unzipSync(out.bytes)["word/document.xml"]);
  expect(xml).toContain("Hello 1");
  expect(xml).toContain("Hello 2");
});

test("ใส่ลายน้ำข้อความไทย", async ({ page }) => {
  await page.goto("/watermark");
  await upload(page, [await pdf("doc.pdf", 2)]);
  await expect(page.getByAltText("ตัวอย่างหน้าแรกพร้อมลายน้ำ")).toBeVisible();
  await page.getByRole("textbox").first().fill("ลับเฉพาะ ห้ามเผยแพร่");
  await runTool(page, "ใส่ลายน้ำ");
  expect((await inspectPdf((await download(page)).bytes)).map((p) => p.images)).toEqual([1, 1]);
});

test("ใส่เลขหน้ารูปแบบภาษาไทย ข้ามหน้าปก", async ({ page }) => {
  await page.goto("/page-numbers");
  await upload(page, [await pdf("doc.pdf", 3)]);
  await page.getByRole("radio", { name: "หน้า 1 จาก 10" }).click();
  await page.getByLabel("เริ่มใส่ที่หน้า").fill("2");
  await expect(page.getByText("หน้า 2 จะเป็น “หน้า 1 จาก 2”")).toBeVisible();
  await runTool(page, "ใส่เลขหน้า");
  expect((await inspectPdf((await download(page)).bytes)).map((p) => p.images)).toEqual([0, 1, 1]);
});
