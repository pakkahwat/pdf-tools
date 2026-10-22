"use client";

import { useId } from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "md" | "lg" | "sm";
};

export function Button({ variant = "secondary", size = "md", className = "", ...props }: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50";
  const sizes = { sm: "h-9 px-3 text-sm", md: "h-11 px-4", lg: "h-13 px-6 text-lg" };
  const variants = {
    primary: "bg-primary text-primary-fg hover:bg-primary-hover",
    secondary: "border border-line bg-card hover:border-primary hover:text-primary",
    ghost: "text-muted hover:bg-primary-soft hover:text-primary",
    danger: "text-danger hover:bg-danger-soft",
  };
  return <button type="button" className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props} />;
}

/** ปุ่มเลือกแบบกลุ่ม (radio) — ใช้แทน select ให้กดง่ายบนมือถือ */
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
              className={`h-10 rounded-lg border px-3 text-sm transition focus-visible:outline-2 focus-visible:outline-primary ${
                active
                  ? "border-primary bg-primary-soft font-medium text-primary"
                  : "border-line bg-card hover:border-primary"
              }`}
            >
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
      {hint && <span className="mt-1.5 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "h-11 w-full rounded-lg border border-line bg-card px-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25";

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
      <span className="mb-2 flex justify-between text-sm font-medium">
        <span>{label}</span>
        <span className="tabular-nums text-muted">
          {value}
          {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--primary)]"
      />
    </label>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
      {message}
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

/** กล่องตัวเลือกด้านข้าง/ด้านล่างของเครื่องมือ */
export function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-card p-4 sm:p-5 ${className}`}>{children}</div>;
}

/** เนื้อหาหลักซ้าย + แผงตัวเลือกขวา (จอเล็กเรียงต่อกันลงมา) */
export function ToolLayout({ main, side }: { main: React.ReactNode; side: React.ReactNode }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">{main}</div>
      <aside className="space-y-4 self-start lg:sticky lg:top-6">{side}</aside>
    </div>
  );
}

/** แถบบอกไฟล์ที่เลือกอยู่ + ปุ่มเปลี่ยนไฟล์ */
export function SourceBar({ name, detail, onClear }: { name: string; detail: string; onClear: () => void }) {
  return (
    <div className="mb-4 flex items-center gap-3 rounded-xl border border-line bg-card px-4 py-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-danger-soft text-[10px] font-bold text-danger">
        PDF
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium" title={name}>
          {name}
        </p>
        <p className="text-sm text-muted">{detail}</p>
      </div>
      <Button variant="ghost" size="sm" onClick={onClear}>
        เปลี่ยนไฟล์
      </Button>
    </div>
  );
}

/** ตำแหน่งบนหน้า 3×3 (หรือเฉพาะแถวบน/ล่างสำหรับเลขหน้า) */
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
  const names: Record<string, string> = {
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
  return (
    <div>
      <div className="mb-2 text-sm font-medium">{label}</div>
      <div role="radiogroup" aria-label={label} className="inline-grid gap-1 rounded-xl border border-line p-1.5">
        {rows.map((row, r) => (
          <div key={r} className="flex gap-1">
            {row.map((pos) => {
              const active = pos === value;
              return (
                <button
                  key={pos}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={names[pos] ?? pos}
                  title={names[pos] ?? pos}
                  onClick={() => onChange(pos)}
                  className={`grid h-9 w-12 place-items-center rounded-md transition ${
                    active ? "bg-primary text-primary-fg" : "hover:bg-primary-soft"
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${active ? "bg-primary-fg" : "bg-muted/50"}`} />
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
