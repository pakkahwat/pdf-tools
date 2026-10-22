import Link from "next/link";
import { ToolIcon } from "@/components/tool-icon";
import { TOOLS, UPCOMING } from "@/lib/tools";

export default function Home() {
  return (
    <div className="space-y-12">
      <section className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">จัดการไฟล์ PDF ได้ในเบราว์เซอร์</h1>
        <p className="mt-3 text-base text-muted sm:text-lg">
          รวม แยก หมุน จัดหน้า แปลงรูปภาพ ใส่ลายน้ำและเลขหน้า — ฟรี ไม่ต้องสมัคร และไฟล์ไม่ถูกส่งออกจากเครื่องคุณ
        </p>
      </section>

      <section aria-labelledby="tools-heading">
        <h2 id="tools-heading" className="sr-only">
          เครื่องมือทั้งหมด
        </h2>
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {TOOLS.map((tool) => (
            <li key={tool.slug}>
              <Link
                href={`/${tool.slug}`}
                className="group flex h-full flex-col gap-2 rounded-2xl border border-line bg-card p-4 transition hover:-translate-y-0.5 hover:border-primary hover:shadow-lg focus-visible:outline-2 focus-visible:outline-primary sm:gap-3 sm:p-5"
              >
                <span
                  className="grid h-11 w-11 place-items-center rounded-xl"
                  style={{ color: tool.color, backgroundColor: `${tool.color}1a` }}
                >
                  <ToolIcon name={tool.slug} />
                </span>
                <span className="text-base font-medium sm:text-lg">{tool.title}</span>
                <span className="text-xs leading-relaxed text-muted sm:text-sm">{tool.summary}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="soon-heading">
        <h2 id="soon-heading" className="mb-3 text-lg font-medium">
          เร็ว ๆ นี้
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {UPCOMING.map((item) => (
            <li
              key={item.title}
              className="flex gap-3 rounded-2xl border border-dashed border-line p-4 text-muted"
            >
              <ToolIcon name="soon" className="mt-0.5 h-5 w-5 shrink-0" />
              <span>
                <span className="block text-sm font-medium text-fg">{item.title}</span>
                <span className="block text-xs leading-relaxed">{item.summary}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
