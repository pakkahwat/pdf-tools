import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { jakarta, notoThai } from "@/lib/fonts";
import { SITE } from "@/lib/tools";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: `${SITE.name} — ${SITE.tagline}`, template: `%s · ${SITE.name}` },
  description:
    "รวม แยก หมุน จัดหน้า บีบอัด แปลงรูปภาพ แปลง PDF เป็น Word ใส่ลายน้ำ เลขหน้า ใส่/ปลดรหัสผ่าน PDF ฟรี ประมวลผลในเบราว์เซอร์ ไม่มีการอัปโหลดไฟล์",
};

export const viewport: Viewport = {
  // ให้แถบปุ่มด้านล่างบนมือถือเว้นที่ให้ขอบจอ/แถบท่าทางได้ (env(safe-area-inset-bottom))
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#12201f" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${jakarta.variable} ${notoThai.variable} h-full antialiased`}>
      <body className="flex min-h-dvh flex-col font-sans">
        <a
          href="#main"
          className="sr-only z-50 rounded-lg bg-primary px-4 py-2 text-primary-fg focus:not-sr-only focus:fixed focus:left-4 focus:top-3"
        >
          ข้ามไปเนื้อหาหลัก
        </a>
        <header className="sticky top-0 z-40 border-b border-line bg-card/90 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
            <Link href="/" className="flex min-h-11 items-center gap-2.5 font-semibold" aria-label={`${SITE.name} หน้าแรก`}>
              <LogoMark />
              <span className="text-lg tracking-tight">{SITE.name}</span>
            </Link>
            <nav aria-label="เมนูหลัก" className="ml-auto flex items-center gap-1">
              <span className="mr-2 hidden items-center gap-1.5 rounded-full bg-ok-soft px-3 py-1 text-sm text-ok sm:flex">
                <ShieldIcon />
                ไฟล์ไม่ถูกอัปโหลด
              </span>
              <Link
                href="/#tools"
                className="inline-flex min-h-11 items-center rounded-xl px-3 font-medium text-muted transition-colors hover:bg-primary-soft hover:text-primary"
              >
                เครื่องมือทั้งหมด
              </Link>
            </nav>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-10">
          {children}
        </main>
        <footer className="border-t border-line bg-card py-8 text-sm text-muted">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 text-center">
            <p className="flex items-center gap-1.5">
              <ShieldIcon />
              ทุกเครื่องมือทำงานในเบราว์เซอร์ของคุณ — ไฟล์ไม่ถูกส่งขึ้นเซิร์ฟเวอร์และไม่ถูกเก็บไว้ที่ใด
            </p>
            <p>
              ใช้ฟรี ไม่ต้องสมัคร ไม่มีโฆษณา ·{" "}
              <a
                href="https://github.com/pakkahwat/pdf-tools"
                className="underline decoration-line underline-offset-4 hover:text-primary"
              >
                ซอร์สโค้ด (AGPL-3.0)
              </a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}

function LogoMark() {
  return (
    <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-fg shadow-sm" aria-hidden>
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5M9 13h6M9 17h4" />
      </svg>
    </span>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3 5 6v5c0 4.5 3 8.4 7 9.9 4-1.5 7-5.4 7-9.9V6z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
