import Link from "next/link";
import { ToolIcon } from "@/components/tool-icon";
import { getTool, type ToolSlug } from "@/lib/tools";

/** หัวหน้าเครื่องมือ: ลิงก์กลับ + ไอคอน + ชื่อ + คำอธิบาย */
export function ToolShell({ slug, children }: { slug: ToolSlug; children: React.ReactNode }) {
  const tool = getTool(slug);
  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted hover:text-primary">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        เครื่องมือทั้งหมด
      </Link>
      <div className="mb-6 mt-3 flex items-start gap-4">
        <span
          className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl"
          style={{ color: tool.color, backgroundColor: `${tool.color}1a` }}
        >
          <ToolIcon name={tool.slug} className="h-7 w-7" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">{tool.title}</h1>
          <p className="mt-1 text-muted">{tool.summary}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
