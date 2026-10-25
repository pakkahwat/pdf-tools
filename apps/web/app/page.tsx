import Link from "next/link";
import { ToolIcon } from "@/components/tool-icon";
import { CATEGORIES, TOOLS, UPCOMING } from "@/lib/tools";

const PROMISES = [
  { title: "ไฟล์ไม่ออกจากเครื่อง", text: "ประมวลผลในเบราว์เซอร์ทั้งหมด", icon: "shield" },
  { title: "ฟรี ไม่ต้องสมัคร", text: "ไม่จำกัดจำนวน ไม่มีโฆษณา", icon: "gift" },
  { title: "ใช้ได้ทุกเครื่อง", text: "คอมพิวเตอร์ แท็บเล็ต มือถือ", icon: "device" },
] as const;

// ตาม CATEGORIES: จัดระเบียบ 5 เครื่องมือ / แปลงไฟล์ 3 / แต่ง PDF 2 / ความปลอดภัย 2 (ตาราง 5 คอลัมน์บนจอใหญ่)
const SECTION_SPAN = ["lg:col-span-5", "lg:col-span-3", "lg:col-span-2", "lg:col-span-5"];
const LIST_COLS = ["lg:grid-cols-5", "lg:grid-cols-3", "lg:grid-cols-2", "lg:grid-cols-5"];

const HOW_TO = [
  { title: "เลือกเครื่องมือ", text: "กดเครื่องมือที่ต้องการด้านบน" },
  { title: "ใส่ไฟล์และตั้งค่า", text: "เลือกไฟล์ แล้วปรับตัวเลือกตามต้องการ" },
  { title: "ดาวน์โหลด", text: "กดปุ่มสีส้ม แล้วดาวน์โหลดไฟล์ที่ได้" },
];

export default function Home() {
  return (
    <div className="space-y-14 sm:space-y-16">
      <section className="mx-auto max-w-3xl pt-2 text-center sm:pt-6">
        <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
          จัดการไฟล์ PDF <span className="text-primary">ง่าย ๆ</span> ในเบราว์เซอร์
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-muted sm:text-lg">
          รวม แยก หมุน บีบอัด แปลงเป็น Word ใส่ลายน้ำ ใส่/ปลดรหัสผ่าน — เลือกเครื่องมือด้านล่างได้เลย
        </p>
        <ul className="mt-8 grid gap-3 text-left sm:grid-cols-3">
          {PROMISES.map((p) => (
            <li key={p.title} className="flex items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                <PromiseIcon name={p.icon} />
              </span>
              <span>
                <span className="block text-sm font-semibold">{p.title}</span>
                <span className="block text-sm text-muted">{p.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* จอใหญ่: การ์ดกว้างเท่ากันทุกแถว (1 ใน 5) — หมวดแรกเต็มแถว แปลงไฟล์ (3) กับแต่ง PDF (2) วางคู่กันในแถวเดียว */}
      <div id="tools" className="grid scroll-mt-24 gap-10 lg:grid-cols-5 lg:gap-x-3">
        {CATEGORIES.map((cat, k) => (
          <section key={cat.id} aria-labelledby={`cat-${cat.id}`} className={SECTION_SPAN[k] ?? ""}>
            <div className="mb-4 flex items-baseline gap-3">
              <h2 id={`cat-${cat.id}`} className="text-xl font-bold tracking-tight">
                {cat.title}
              </h2>
              <span className="text-sm text-muted">{cat.summary}</span>
            </div>
            <ul className={`grid grid-cols-2 gap-3 ${LIST_COLS[k] ?? ""}`}>
              {TOOLS.filter((t) => t.category === cat.id).map((tool) => (
                <li key={tool.slug}>
                  <Link
                    href={`/${tool.slug}`}
                    className="group flex h-full flex-col gap-3 rounded-2xl border border-line bg-card p-4 transition-[border-color,box-shadow,transform] duration-200 hover:border-primary hover:shadow-[0_8px_24px_-12px_rgb(15_118_110/0.45)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.98] motion-safe:hover:-translate-y-0.5 sm:p-5"
                  >
                    <span
                      className="grid h-12 w-12 place-items-center rounded-xl"
                      style={{ color: tool.color, backgroundColor: `${tool.color}1f` }}
                    >
                      <ToolIcon name={tool.slug} className="h-7 w-7" />
                    </span>
                    <span className="text-base font-semibold sm:text-lg">{tool.title}</span>
                    <span className="text-sm leading-relaxed text-muted">{tool.summary}</span>
                    <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary">
                      เริ่มใช้
                      <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section aria-labelledby="how-heading" className="rounded-3xl border border-line bg-card p-6 sm:p-8">
        <h2 id="how-heading" className="mb-6 text-xl font-bold tracking-tight">
          ใช้งานง่ายใน 3 ขั้นตอน
        </h2>
        <ol className="grid gap-6 sm:grid-cols-3">
          {HOW_TO.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg font-bold ${
                  i === HOW_TO.length - 1 ? "bg-cta text-cta-fg" : "bg-primary-soft text-primary"
                }`}
              >
                {i + 1}
              </span>
              <span>
                <span className="block font-semibold">{s.title}</span>
                <span className="block text-sm text-muted">{s.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="soon-heading">
        <h2 id="soon-heading" className="mb-1 text-xl font-bold tracking-tight">
          เร็ว ๆ นี้
        </h2>
        <p className="mb-4 text-sm text-muted">กำลังเตรียมในเวอร์ชันถัดไป — ทำงานในเบราว์เซอร์เหมือนเดิม ไฟล์ไม่ออกจากเครื่อง</p>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {UPCOMING.map((item) => (
            <li key={item.title} className="flex gap-3 rounded-2xl border border-dashed border-line p-4">
              <ToolIcon name="soon" className="mt-0.5 h-5 w-5 shrink-0 text-muted" />
              <span>
                <span className="block text-sm font-semibold">{item.title}</span>
                <span className="block text-sm leading-relaxed text-muted">{item.summary}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function PromiseIcon({ name }: { name: (typeof PROMISES)[number]["icon"] }) {
  const paths = {
    shield: (
      <>
        <path d="M12 3 5 6v5c0 4.5 3 8.4 7 9.9 4-1.5 7-5.4 7-9.9V6z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    gift: (
      <>
        <rect x="3" y="8" width="18" height="4" rx="1" />
        <path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5" />
      </>
    ),
    device: (
      <>
        <rect x="2" y="4" width="14" height="11" rx="2" />
        <rect x="16" y="9" width="6" height="11" rx="1.5" />
        <path d="M6 19h6" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {paths[name]}
    </svg>
  );
}
