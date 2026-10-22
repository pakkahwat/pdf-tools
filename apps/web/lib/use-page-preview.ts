"use client";

// พรีวิวผลลัพธ์จริงบนหน้าเดียว: ตัดหน้าที่ต้องการออกมาเป็นไฟล์เล็ก → ใส่ลายน้ำ/เลขหน้าด้วยโค้ดเดียวกับตอนบันทึก
// → วาดด้วย pdf.js — สิ่งที่เห็นจึงตรงกับไฟล์ที่ได้ (ไม่ใช่ภาพจำลองด้วย CSS)
import { useEffect, useEffectEvent, useState } from "react";
import { runPdf } from "./pdf/client";
import { closePdf, openPdf, renderThumb } from "./pdfjs";
import type { PdfSource } from "./use-pdf-source";
import { errorMessage } from "./use-task";

export function usePagePreview(
  source: PdfSource | null,
  pageIndex: number,
  /** เปลี่ยนเมื่อตัวเลือกเปลี่ยน → วาดพรีวิวใหม่ */
  key: string,
  /** ใส่ผลลงไฟล์หน้าเดียว — คืน null = ยังไม่มีอะไรจะใส่ (แสดงหน้าเดิม) */
  build: (single: Uint8Array) => Promise<Uint8Array | null>,
) {
  const [single, setSingle] = useState<{ src: PdfSource; index: number; bytes: Uint8Array } | null>(null);
  const [preview, setPreview] = useState<{ url: string; key: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const onBuild = useEffectEvent(build);

  useEffect(() => {
    if (!source) return;
    let cancelled = false;
    runPdf("rebuildPdf", source.bytes, [{ index: pageIndex, rotate: 0 }]).then(
      (bytes) => !cancelled && setSingle({ src: source, index: pageIndex, bytes }),
      (e) => !cancelled && setError(errorMessage(e)),
    );
    return () => {
      cancelled = true;
    };
  }, [source, pageIndex]);

  const current = single && single.src === source && single.index === pageIndex ? single.bytes : null;

  useEffect(() => {
    if (!current) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const out = (await onBuild(current)) ?? current;
        if (cancelled) return;
        const doc = await openPdf(out);
        const url = await renderThumb(doc, 1, 1000);
        closePdf(doc);
        if (cancelled) return;
        setPreview({ url, key });
        setError(null);
      } catch (e) {
        if (!cancelled) setError(errorMessage(e));
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [current, key]);

  return { url: source ? (preview?.url ?? null) : null, updating: preview?.key !== key, error };
}
