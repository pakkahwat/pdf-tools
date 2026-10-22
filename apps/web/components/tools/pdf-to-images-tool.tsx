"use client";

import { useMemo, useState } from "react";
import { Dropzone } from "@/components/dropzone";
import { PageThumb } from "@/components/page-thumb";
import { TaskStatus } from "@/components/task-status";
import { Button, ErrorBox, Field, inputClass, Panel, Segmented, SourceBar, ToolLayout } from "@/components/ui";
import { baseName, isPdfFile, padNumber, PDF_ACCEPT, zipBlob } from "@/lib/files";
import { parsePageList } from "@/lib/pdf/ranges";
import { renderPage } from "@/lib/pdfjs";
import { usePdfSource } from "@/lib/use-pdf-source";
import { useTask } from "@/lib/use-task";

const FORMATS = [
  { value: "jpg", label: "JPG" },
  { value: "png", label: "PNG" },
] as const;
const QUALITIES = [
  { value: 96, label: "ปกติ" },
  { value: 150, label: "ชัด" },
  { value: 300, label: "ชัดมาก" },
] as const;
const SCOPES = [
  { value: "all", label: "ทุกหน้า" },
  { value: "some", label: "เลือกหน้า" },
] as const;

export function PdfToImagesTool() {
  const pdf = usePdfSource({ thumbSize: 200 });
  const task = useTask();
  const [format, setFormat] = useState<"jpg" | "png">("jpg");
  const [dpi, setDpi] = useState<96 | 150 | 300>(150);
  const [scope, setScope] = useState<"all" | "some">("all");
  const [pagesText, setPagesText] = useState("");

  const pageCount = pdf.source?.pageCount ?? 0;
  const selection = useMemo((): { pages: number[]; error?: string } => {
    if (scope === "all") return { pages: Array.from({ length: pageCount }, (_, i) => i) };
    if (!pagesText.trim()) return { pages: [] };
    try {
      return { pages: parsePageList(pagesText, pageCount) };
    } catch (e) {
      return { pages: [], error: (e as Error).message };
    }
  }, [scope, pagesText, pageCount]);

  function edit(fn: () => void) {
    task.reset();
    fn();
  }
  function clear() {
    task.reset();
    pdf.reset();
  }

  if (!pdf.source) {
    return (
      <div className="space-y-4">
        {pdf.error && <ErrorBox message={pdf.error} />}
        <Dropzone
          accept={PDF_ACCEPT}
          filter={isPdfFile}
          onFiles={([f]) => void pdf.load(f)}
          onRejected={() => pdf.setError("กรุณาเลือกไฟล์ PDF")}
          buttonLabel={pdf.loading ? "กำลังเปิดไฟล์…" : "เลือกไฟล์ PDF"}
        />
      </div>
    );
  }

  const { source } = pdf;
  const chosen = new Set(selection.pages);

  return (
    <ToolLayout
      main={
        <>
          <SourceBar name={source.file.name} detail={`${pageCount} หน้า`} onClear={clear} />
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-5">
            {pdf.thumbs.map((thumb, i) => (
              <li key={i}>
                <PageThumb
                  src={thumb}
                  alt={`หน้า ${i + 1}`}
                  className={scope === "some" ? (chosen.has(i) ? "ring-3 ring-primary" : "opacity-50") : ""}
                />
                <span className="mt-1 block px-1 text-xs text-muted">หน้า {i + 1}</span>
              </li>
            ))}
          </ul>
        </>
      }
      side={
        <>
          <Panel className="space-y-5">
            <Segmented label="ชนิดไฟล์" value={format} options={FORMATS} onChange={(v) => edit(() => setFormat(v))} />
            <Segmented label="ความละเอียด" value={dpi} options={QUALITIES} onChange={(v) => edit(() => setDpi(v))} />
            <p className="-mt-3 text-xs text-muted">ปกติ = ดูบนจอ · ชัด = ส่งต่อ/พิมพ์ทั่วไป · ชัดมาก = พิมพ์คุณภาพสูง (ไฟล์ใหญ่)</p>
            <Segmented label="หน้าที่จะแปลง" value={scope} options={SCOPES} onChange={(v) => edit(() => setScope(v))} />
            {scope === "some" && (
              <Field label="หน้า" hint="เช่น 1, 3, 5-7">
                <input
                  className={inputClass}
                  value={pagesText}
                  placeholder="1, 3, 5-7"
                  inputMode="numeric"
                  onChange={(e) => edit(() => setPagesText(e.target.value))}
                />
              </Field>
            )}
            {selection.error && <p className="text-sm text-danger">{selection.error}</p>}
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabled={selection.pages.length === 0 || task.state.status === "working"}
              onClick={() =>
                task.run(async (progress) => {
                  const base = baseName(source.file.name);
                  const type = format === "jpg" ? "image/jpeg" : "image/png";
                  const files: { name: string; bytes: Uint8Array }[] = [];
                  for (const [k, index] of selection.pages.entries()) {
                    progress(`กำลังแปลงหน้า ${k + 1}/${selection.pages.length}…`);
                    const blob = await renderPage(source.doc, index + 1, { scale: dpi / 72, type, quality: 0.92 });
                    files.push({
                      name: `${base}-page-${padNumber(index + 1, pageCount)}.${format}`,
                      bytes: new Uint8Array(await blob.arrayBuffer()),
                    });
                  }
                  if (files.length === 1) {
                    return { blob: new Blob([files[0].bytes as Uint8Array<ArrayBuffer>], { type }), name: files[0].name };
                  }
                  progress("กำลังรวมเป็นไฟล์ .zip…");
                  return { blob: zipBlob(files), name: `${base}-images.zip`, note: `${files.length} รูป` };
                })
              }
            >
              แปลงเป็นรูปภาพ
              {selection.pages.length > 0 && ` (${selection.pages.length} หน้า)`}
            </Button>
          </Panel>
          <TaskStatus task={task} onStartOver={clear} />
        </>
      }
    />
  );
}
