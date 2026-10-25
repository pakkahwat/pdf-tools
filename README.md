# PDF Tools

เครื่องมือจัดการ PDF แบบเว็บ (คล้าย iLovePDF) สำหรับใช้เองและแชร์ให้คนที่ต้องการ — **ไม่ใช่เชิงพาณิชย์ ใช้ของฟรีทั้งหมด**

🌐 ใช้งานได้ที่ **https://pdf.devda.fyi**

เฟส 1 ทุกเครื่องมือทำงานในเบราว์เซอร์ของผู้ใช้ — ไฟล์ไม่ถูกอัปโหลดขึ้นเซิร์ฟเวอร์ จึงไม่มีค่าเซิร์ฟเวอร์

| เครื่องมือ | หน้า | ทำงานด้วย |
|---|---|---|
| รวม PDF | `/merge` | pdf-lib (Web Worker) |
| แยก PDF (ตามช่วง / ดึงหน้า / ทุก N หน้า / ทุกหน้า) | `/split` | pdf-lib + fflate (zip) |
| จัดหน้า (ลากสลับ ลบ หมุน) | `/organize` | pdf-lib + dnd-kit |
| หมุน PDF | `/rotate` | pdf-lib |
| รูปภาพ → PDF (JPG, PNG, WebP, GIF, BMP — หมุนตาม EXIF) | `/jpg-to-pdf` | pdf-lib + canvas |
| PDF → รูปภาพ (JPG/PNG 96–300 DPI) | `/pdf-to-jpg` | pdf.js |
| ใส่ลายน้ำ (ข้อความไทย/โลโก้ พรีวิวจริง) | `/watermark` | canvas + pdf-lib |
| ใส่เลขหน้า (รองรับรูปแบบภาษาไทย) | `/page-numbers` | pdf-lib / canvas |

## โครงสร้าง

```
pdf-tools/
├─ apps/web/                Next.js 16 + Tailwind v4 (deploy บน Vercel, root directory = apps/web)
│  ├─ app/                  หน้าแรก + หน้าเครื่องมือละ 1 route
│  ├─ components/tools/     UI ของแต่ละเครื่องมือ
│  ├─ lib/pdf/ops.ts        งาน PDF ทั้งหมด (pdf-lib) — รันใน Web Worker ผ่าน lib/pdf/client.ts
│  ├─ lib/pdfjs.ts          วาดหน้า PDF เป็นภาพด้วย pdf.js
│  ├─ tests/                unit test (Vitest)
│  ├─ e2e/                  E2E (Playwright) — อัปโหลดไฟล์จริง กดประมวลผล ตรวจไฟล์ที่ดาวน์โหลด
│  └─ test-utils/           สร้างไฟล์ PDF/PNG ทดสอบด้วยโค้ด
└─ .github/                 CI (GitHub Actions) + Dependabot
```

เฟส 2 จะเพิ่ม `services/api` (Docker: Gotenberg/LibreOffice, OCRmyPDF, qpdf) สำหรับ Word→PDF, บีบอัด, OCR ไทย, ใส่/ปลดรหัส

## พัฒนาในเครื่อง

```bash
cd apps/web
npm install          # postinstall คัดลอกไฟล์ pdf.js ไปที่ public/pdfjs
npm run dev          # http://localhost:3001
npm run lint && npm run typecheck && npm test
npm run e2e          # ครั้งแรก: npx playwright install chromium
```

ทดสอบเว็บที่ deploy แล้ว (ไม่เปิดเซิร์ฟเวอร์ในเครื่อง) — PowerShell:

```powershell
$env:E2E_BASE_URL = "https://pdf.devda.fyi"; npm run e2e
```

## CI/CD

- **CI** (`.github/workflows/ci.yml`) ทุก push/PR: lint → typecheck → unit test → build → E2E (desktop + มือถือ) — repo public ใช้ GitHub Actions ฟรีไม่จำกัด
- **CD** ผ่าน Vercel Git integration (Hobby ฟรี, ใช้ได้เพราะไม่ใช่เชิงพาณิชย์): ทุก branch/PR ได้ Preview URL, merge เข้า `main` = ขึ้น Production
- **Dependabot** เปิด PR อัปเดต dependency ทุกสัปดาห์ ให้ CI ตรวจก่อน merge

### ตั้งค่า Vercel ครั้งแรก

1. Vercel → Add New Project → Import repo นี้
2. **Root Directory = `apps/web`** (Framework: Next.js — ค่าอื่นใช้ค่าเริ่มต้น)
3. โดเมน: Project → Settings → Domains → เพิ่ม `pdf.devda.fyi` แล้วที่ Cloudflare DNS เพิ่ม `CNAME pdf → cname.vercel-dns.com` (ตั้งเป็น DNS only / เมฆสีเทา)
