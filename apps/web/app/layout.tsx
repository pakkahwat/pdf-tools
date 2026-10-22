import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { kanit } from "@/lib/fonts";
import { SITE } from "@/lib/tools";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: `${SITE.name} — ${SITE.tagline}`, template: `%s · ${SITE.name}` },
  description:
    "รวม แยก หมุน จัดหน้า แปลงรูปภาพ ใส่ลายน้ำ และใส่เลขหน้า PDF ฟรี ประมวลผลในเบราว์เซอร์ ไม่มีการอัปโหลดไฟล์",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f6fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0c1120" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${kanit.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <header className="border-b border-line bg-card">
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-xs font-bold text-primary-fg">
                PDF
              </span>
              <span className="text-lg">{SITE.name}</span>
            </Link>
            <span className="ml-auto hidden items-center gap-1.5 text-sm text-muted sm:flex">
              <LockIcon />
              ไฟล์ไม่ถูกอัปโหลด
            </span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-10">{children}</main>
        <footer className="border-t border-line py-6 text-center text-sm text-muted">
          <p className="px-4">
            ทุกเครื่องมือทำงานในเบราว์เซอร์ของคุณ — ไฟล์ไม่ถูกส่งขึ้นเซิร์ฟเวอร์และไม่ถูกเก็บไว้ที่ใด
          </p>
        </footer>
      </body>
    </html>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}
