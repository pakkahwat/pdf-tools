"use client";

import { useRef, useState } from "react";

/** ช่องเลือกไฟล์ขนาดใหญ่: กดเลือก หรือลากไฟล์มาวาง — กรองชนิดไฟล์ด้วย filter แล้วแจ้งไฟล์ที่ใช้ไม่ได้ */
export function Dropzone({
  accept,
  multiple = false,
  filter,
  onFiles,
  onRejected,
  buttonLabel,
  hint,
  compact = false,
}: {
  accept: string;
  multiple?: boolean;
  filter: (f: File) => boolean;
  onFiles: (files: File[]) => void;
  onRejected?: (names: string[]) => void;
  buttonLabel: string;
  hint?: string;
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
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-dashed border-primary px-4 text-primary transition hover:bg-primary-soft"
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
      className={`flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed px-6 py-14 text-center transition sm:py-20 ${
        over ? "border-primary bg-primary-soft" : "border-line bg-card"
      }`}
    >
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="inline-flex h-14 items-center gap-2 rounded-2xl bg-primary px-8 text-lg font-medium text-primary-fg shadow-sm transition hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <PlusIcon />
        {buttonLabel}
      </button>
      <p className="text-muted">หรือลากไฟล์มาวางตรงนี้</p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
      {input}
    </div>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}
