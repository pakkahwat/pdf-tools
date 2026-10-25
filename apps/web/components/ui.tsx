"use client";

import { useId } from "react";

type ButtonProps = React.ComponentProps<"button"> & {
  /** cta = ปุ่มลงมือทำหลัก (มีได้ปุ่มเดียวต่อหน้าจอ) */
  variant?: "cta" | "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
};

export function Button({ variant = "secondary", size = "md", className = "", ...props }: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-45";
  // ทุกขนาดสูงอย่างน้อย 44px บนมือถือ (เป้ากดนิ้ว) — ปุ่มเล็กย่อลงได้เฉพาะจอที่ใช้เมาส์
  const sizes = { sm: "min-h-11 px-3 text-sm sm:min-h-9", md: "min-h-11 px-4", lg: "min-h-13 px-6 text-lg" };
  const variants = {
    cta: "bg-cta font-semibold text-cta-fg shadow-sm hover:bg-cta-hover active:translate-y-px",
    primary: "bg-primary text-primary-fg hover:bg-primary-hover",
    secondary: "border border-line bg-card hover:border-primary hover:text-primary active:bg-primary-soft",
    ghost: "text-muted hover:bg-primary-soft hover:text-primary",
    danger: "text-danger hover:bg-danger-soft",
  };
  return <button type="button" className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props} />;
}

/** ปุ่มเลือกแบบกลุ่ม (radio) — ใช้แทน select ให้เห็นตัวเลือกทั้งหมดและกดง่ายบนมือถือ */
export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const id = useId();
  return (
    <div>
      <div id={id} className="mb-2 text-sm font-medium">
        {label}
      </div>
      <div role="radiogroup" aria-labelledby={id} className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={String(o.value)}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.value)}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-3.5 text-sm transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                active
                  ? "border-primary bg-primary-soft font-semibold text-primary"
                  : "border-line bg-card hover:border-primary"
              }`}
            >
              {active && <CheckIcon className="h-4 w-4" />}
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-sm text-muted">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "min-h-12 w-full rounded-xl border border-line bg-card px-3.5 text-base outline-none transition-colors placeholder:text-muted/70 focus:border-primary focus:ring-3 focus:ring-primary/25";

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex justify-between text-sm font-medium">
        <span>{label}</span>
        <span className="tabular-nums text-muted">
          {value}
          {unit}
        </span>
      </span>
      {/* สูง 44px ให้แตะลากได้ง่าย (แถบเลื่อนจริงอยู่ตรงกลาง) */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-11 w-full cursor-pointer accent-[var(--primary)]"
      />
    </label>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div role="alert" className="flex gap-2.5 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
      <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5M12 16.5v.01" />
      </svg>
      <span>{message}</span>
    </div>
  );
}

export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`animate-spin ${className}`} fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function CheckIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden>
      <path d="m5 12 5 5 9-10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** กล่องตัวเลือกของเครื่องมือ */
export function Panel({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-line bg-card p-4 sm:p-5 ${className}`} aria-label={title}>
      {title && <h2 className="mb-4 text-base font-semibold">{title}</h2>}
      <div className="space-y-5">{children}</div>
    </section>
  );
}

/**
 * เนื้อหาหลักซ้าย + แผงตัวเลือกขวา — จอเล็กเรียงลงมา (optionsFirst = เอาตัวเลือกขึ้นก่อน สำหรับเครื่องมือที่ตัวเลือกคือหัวใจ)
 * เว้นที่ด้านล่างบนมือถือให้แถบปุ่มหลัก (ActionBar) ที่ลอยติดขอบจอ
 */
export function ToolLayout({
  top,
  main,
  side,
  optionsFirst = false,
}: {
  /** แถบบนสุดเต็มความกว้าง (เช่นชื่อไฟล์) — อยู่บนสุดเสมอแม้สลับลำดับบนมือถือ */
  top?: React.ReactNode;
  main: React.ReactNode;
  side: React.ReactNode;
  optionsFirst?: boolean;
}) {
  return (
    <div className="grid gap-6 pb-44 lg:grid-cols-[minmax(0,1fr)_340px] lg:pb-0">
      {top && <div className="order-first -mb-2 lg:col-span-2">{top}</div>}
      <div className="min-w-0">{main}</div>
      <aside className={`space-y-4 self-start lg:sticky lg:top-22 ${optionsFirst ? "order-first lg:order-none" : ""}`}>
        {side}
      </aside>
    </div>
  );
}

/** แถบบอกไฟล์ที่เลือกอยู่ + ปุ่มเปลี่ยนไฟล์ */
export function SourceBar({ name, detail, onClear }: { name: string; detail: string; onClear: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-danger-soft text-[11px] font-bold text-danger" aria-hidden>
        PDF
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium" title={name}>
          {name}
        </p>
        <p className="text-sm text-muted">{detail}</p>
      </div>
      <Button variant="secondary" size="sm" onClick={onClear}>
        เปลี่ยนไฟล์
      </Button>
    </div>
  );
}

const POSITION_NAMES: Record<string, string> = {
  tl: "บนซ้าย",
  tc: "บนกลาง",
  tr: "บนขวา",
  ml: "กลางซ้าย",
  mc: "กึ่งกลาง",
  mr: "กลางขวา",
  bl: "ล่างซ้าย",
  bc: "ล่างกลาง",
  br: "ล่างขวา",
};

/** ตำแหน่งบนหน้า 3×3 (หรือเฉพาะแถวบน/ล่างสำหรับเลขหน้า) — แสดงเป็นรูปหน้ากระดาษให้เข้าใจทันที */
export function PositionPicker<T extends string>({
  label,
  value,
  onChange,
  rows,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  rows: readonly (readonly T[])[];
}) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm font-medium">
        <span>{label}</span>
        <span className="text-muted">{POSITION_NAMES[value]}</span>
      </div>
      <div
        role="radiogroup"
        aria-label={label}
        className={`inline-grid gap-1.5 rounded-2xl border-2 border-line bg-thumb p-2 ${rows.length === 2 ? "content-between" : ""}`}
        style={rows.length === 2 ? { height: 176 } : undefined}
      >
        {rows.map((row, r) => (
          <div key={r} className="flex gap-1.5">
            {row.map((pos) => {
              const active = pos === value;
              return (
                <button
                  key={pos}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={POSITION_NAMES[pos] ?? pos}
                  title={POSITION_NAMES[pos] ?? pos}
                  onClick={() => onChange(pos)}
                  className={`grid h-12 w-14 place-items-center rounded-lg border transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-primary ${
                    active ? "border-primary bg-primary text-primary-fg" : "border-transparent bg-card hover:border-primary"
                  }`}
                >
                  <span className={`h-2.5 w-6 rounded-full ${active ? "bg-primary-fg" : "bg-muted/35"}`} />
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

const STEPS = ["เลือกไฟล์", "ตั้งค่า", "ดาวน์โหลด"];

/** บอกว่าตอนนี้อยู่ขั้นไหนของ 3 ขั้น — ผู้ใช้ทั่วไปรู้ทันทีว่าต้องทำอะไรต่อ */
export function Steps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="mb-6 flex items-center" aria-label="ขั้นตอนการใช้งาน">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const now = n === current;
        return (
          <li key={label} className={`flex items-center ${n < STEPS.length ? "flex-1" : ""}`} aria-current={now ? "step" : undefined}>
            <span className="flex shrink-0 items-center gap-2">
              <span
                className={`grid h-8 w-8 place-items-center rounded-full text-sm font-semibold ${
                  done ? "bg-primary text-primary-fg" : now ? "bg-cta text-cta-fg" : "border-2 border-line text-muted"
                }`}
              >
                {done ? <CheckIcon className="h-4 w-4" /> : n}
              </span>
              <span className={`text-sm ${now ? "font-semibold text-fg" : "text-muted"}`}>
                {label}
                {done && <span className="sr-only"> (เสร็จแล้ว)</span>}
              </span>
            </span>
            {n < STEPS.length && (
              <span aria-hidden className={`mx-2 h-0.5 flex-1 rounded-full sm:mx-3 ${done ? "bg-primary" : "bg-line"}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** ช่องวางไฟล์ตอนยังไม่เลือกไฟล์ + error */
export function EmptyState({ error, children }: { error?: string | null; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      {error && <ErrorBox message={error} />}
      {children}
    </div>
  );
}
