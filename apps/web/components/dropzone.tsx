"use client";

import { useRef, useState } from "react";
import { Spinner } from "./ui";

/** ช่องเลือกไฟล์ขนาดใหญ่: กดตรงไหนก็ได้ในกรอบ หรือลากไฟล์มาวาง — กรองชนิดไฟล์ด้วย filter แล้วแจ้งไฟล์ที่ใช้ไม่ได้ */
export function Dropzone({
  accept,
  multiple = false,
  filter,
  onFiles,
  onRejected,
  buttonLabel,
  hint,
  busy = false,
  compact = false,
}: {
  accept: string;
  multiple?: boolean;
  filter: (f: File) => boolean;
  onFiles: (files: File[]) => void;
  onRejected?: (names: string[]) => void;
  buttonLabel: string;
  hint?: string;
  /** กำลังเปิดไฟล์ */
  busy?: boolean;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  function take(list: FileList | null) {
    if (!list) return;
    const all = Array.from(list);
    const ok = all.filter(filter);
    const bad = all.filter((f) => !filter(f)).map((f) => f.name);
    // เรียก onFiles ก่อน — เครื่องมือมักล้างข้อความแจ้งเตือนเก่าตอนรับไฟล์ใหม่ ข้อความเรื่องไฟล์ที่ข้ามจะได้ไม่หาย
    if (ok.length) onFiles(multiple ? ok : ok.slice(0, 1));
    if (bad.length) onRejected?.(bad);
  }

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept={accept}
      multiple={multiple}
      hidden
      data-testid="file-input"
      onChange={(e) => {
        take(e.target.files);
        e.target.value = ""; // เลือกไฟล์เดิมซ้ำได้
      }}
    />
  );

  if (compact) {
    return (
      <>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/60 px-4 font-medium text-primary transition-colors hover:border-primary hover:bg-primary-soft"
        >
          <PlusIcon />
          {buttonLabel}
        </button>
        {input}
      </>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        take(e.dataTransfer.files);
      }}
      onClick={(e) => {
        // กดที่ว่างในกรอบก็เปิดหน้าต่างเลือกไฟล์ได้ (ปุ่มด้านในจัดการเอง)
        if (e.target === e.currentTarget && !busy) inputRef.current?.click();
      }}
      aria-busy={busy}
      className={`flex flex-col items-center justify-center gap-5 rounded-3xl border-2 border-dashed px-6 py-12 text-center transition-colors duration-200 sm:py-16 ${
        over ? "border-primary bg-primary-soft" : "border-line bg-card hover:border-primary/60"
      }`}
    >
      <span className="pointer-events-none grid h-16 w-16 place-items-center rounded-2xl bg-primary-soft text-primary" aria-hidden>
        <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5M12 18v-6M9.5 14.5 12 12l2.5 2.5" />
        </svg>
      </span>
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="inline-flex min-h-14 items-center gap-2 rounded-2xl bg-cta px-8 text-lg font-semibold text-cta-fg shadow-sm transition-colors hover:bg-cta-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
      >
        {busy ? <Spinner /> : <PlusIcon />}
        {busy ? "กำลังเปิดไฟล์…" : buttonLabel}
      </button>
      <div className="pointer-events-none space-y-1">
        <p className="text-muted">{over ? "ปล่อยไฟล์ได้เลย" : "หรือลากไฟล์มาวางในกรอบนี้"}</p>
        {hint && <p className="text-sm text-muted">{hint}</p>}
      </div>
      <p className="pointer-events-none flex items-center gap-1.5 text-sm text-ok">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="4" y="11" width="16" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
        ไฟล์อยู่ในเครื่องคุณเท่านั้น ไม่ถูกอัปโหลด
      </p>
      {input}
    </div>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}
