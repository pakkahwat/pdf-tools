"use client";

// โหลด PDF หนึ่งไฟล์สำหรับเครื่องมือที่ทำงานกับไฟล์เดียว: เก็บ bytes (ส่งให้ worker), เปิดด้วย pdf.js (นับหน้า/วาดภาพ)
// และทยอยวาดภาพย่อทุกหน้า — อัปเดต state เป็นชุด ๆ ไม่ให้ไฟล์หลายร้อยหน้าทำให้หน้าเว็บกระตุก
import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { closePdf, openPdf, renderThumb } from "./pdfjs";
import { errorMessage } from "./use-task";

export type PdfSource = { file: File; bytes: Uint8Array; pageCount: number; doc: PDFDocumentProxy };

export function usePdfSource({ thumbSize }: { thumbSize?: number } = {}) {
  const [source, setSource] = useState<PdfSource | null>(null);
  /** null = ยังไม่ได้วาด, "" = วาดไม่สำเร็จ */
  const [thumbs, setThumbs] = useState<(string | null)[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = useRef<PDFDocumentProxy | null>(null);

  const drawThumbs = useCallback(
    async (doc: PDFDocumentProxy, size: number) => {
      let batch: [number, string][] = [];
      let lastFlush = performance.now();
      for (let i = 1; i <= doc.numPages; i++) {
        if (current.current !== doc) return; // เปลี่ยนไฟล์แล้ว
        let url = "";
        try {
          url = await renderThumb(doc, i, size);
        } catch {
          // หน้าที่วาดไม่ได้แสดงเป็นกรอบว่าง แต่ยังประมวลผลได้ตามปกติ
        }
        batch.push([i - 1, url]);
        if (batch.length >= 12 || performance.now() - lastFlush > 150 || i === doc.numPages) {
          const done = batch;
          batch = [];
          lastFlush = performance.now();
          if (current.current !== doc) return;
          setThumbs((prev) => {
            const next = prev.slice();
            for (const [k, u] of done) next[k] = u;
            return next;
          });
        }
      }
    },
    [],
  );

  const load = useCallback(
    async (file: File) => {
      setError(null);
      setLoading(true);
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const doc = await openPdf(bytes);
        closePdf(current.current);
        current.current = doc;
        setSource({ file, bytes, pageCount: doc.numPages, doc });
        setThumbs(new Array<string | null>(doc.numPages).fill(null));
        setLoading(false);
        if (thumbSize) await drawThumbs(doc, thumbSize);
      } catch (e) {
        setError(errorMessage(e));
        setLoading(false);
      }
    },
    [thumbSize, drawThumbs],
  );

  const reset = useCallback(() => {
    closePdf(current.current);
    current.current = null;
    setSource(null);
    setThumbs([]);
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      closePdf(current.current);
      current.current = null;
    };
  }, []);

  return { source, thumbs, loading, error, setError, load, reset };
}
