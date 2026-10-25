import Link from "next/link";
import { ToolIcon } from "@/components/tool-icon";
import { getTool, TOOLS, type ToolSlug } from "@/lib/tools";

/** หัวหน้าเครื่องมือ (ไอคอน + ชื่อ + คำอธิบาย) และลิงก์ไปเครื่องมืออื่นท้ายหน้า */
export function ToolShell({ slug, children }: { slug: ToolSlug; children: React.ReactNode }) {
  const tool = getTool(slug);
  const others = TOOLS.filter((t) => t.slug !== slug);
  return (
    <div className="mx-auto max-w-5xl">
      <nav aria-label="ตำแหน่งปัจจุบัน" className="text-sm text-muted">
        <ol className="flex items-center gap-1">
          <li>
            <Link href="/" className="inline-flex min-h-11 items-center rounded-lg pr-1 hover:text-primary">
              หน้าแรก
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="font-medium text-fg">
            {tool.title}
          </li>
        </ol>
      </nav>
      <div className="mb-6 mt-1 flex items-start gap-4">
        <span
          className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl"
          style={{ color: tool.color, backgroundColor: `${tool.color}1f` }}
        >
          <ToolIcon name={tool.slug} className="h-8 w-8" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{tool.title}</h1>
          <p className="mt-1 text-muted">{tool.summary}</p>
        </div>
      </div>

      {children}

      <section aria-labelledby="other-tools" className="mt-14 border-t border-line pt-8">
        <h2 id="other-tools" className="mb-4 text-lg font-semibold">
          ใช้เครื่องมืออื่นต่อ
        </h2>
        <ul className="flex flex-wrap gap-2">
          {others.map((t) => (
            <li key={t.slug}>
              <Link
                href={`/${t.slug}`}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-card px-3.5 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
              >
                <span style={{ color: t.color }}>
                  <ToolIcon name={t.slug} className="h-5 w-5" />
                </span>
                {t.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
