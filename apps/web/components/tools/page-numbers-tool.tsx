"use client";

import { useState } from "react";
import { Dropzone } from "@/components/dropzone";
import { TaskStatus } from "@/components/task-status";
import {
  Button,
  ErrorBox,
  Field,
  inputClass,
  Panel,
  PositionPicker,
  Segmented,
  Slider,
  SourceBar,
  Spinner,
  ToolLayout,
} from "@/components/ui";
import { baseName, isPdfFile, PDF_ACCEPT, pdfBlob } from "@/lib/files";
import { sarabun } from "@/lib/fonts";
import { runPdf } from "@/lib/pdf/client";
import { formatLabel, needsTextImage, PAGE_NUMBER_FORMATS, pageLabels } from "@/lib/pdf/labels";
import type { PageNumberOptions } from "@/lib/pdf/ops";
import { textToPng } from "@/lib/text-image";
import { usePagePreview } from "@/lib/use-page-preview";
import { usePdfSource } from "@/lib/use-pdf-source";
import { useTask } from "@/lib/use-task";

type Settings = Pick<PageNumberOptions, "position" | "margin" | "fontSize" | "format" | "startAt" | "fromPage">;

const ROWS = [
  ["tl", "tc", "tr"],
  ["bl", "bc", "br"],
] as const;
const MARGINS = [
  { value: 18, label: "ชิดขอบ" },
  { value: 30, label: "ปกติ" },
  { value: 48, label: "ห่างขอบ" },
] as const;
/** วาดข้อความไทยที่ความละเอียด 6 px ต่อ 1 pt ให้คมพอสำหรับพิมพ์ */
const LABEL_SCALE = 6;

function renderLabel(text: string, fontSize: number) {
  return textToPng(text, {
    family: sarabun.style.fontFamily,
    weight: 400,
    sizePx: fontSize * LABEL_SCALE,
    color: "#1f1f1f",
  });
}

export function PageNumbersTool() {
  const pdf = usePdfSource();
  const task = useTask();
  const [s, setS] = useState<Settings>({
    position: "bc",
    margin: 30,
    fontSize: 12,
    format: "{n}",
    startAt: 1,
    fromPage: 1,
  });
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    task.reset();
    setS((prev) => ({ ...prev, [key]: value }));
  };

  const pageCount = pdf.source?.pageCount ?? 0;
  const fromPage = Math.min(Math.max(1, s.fromPage), Math.max(1, pageCount));
  const total = s.startAt + (pageCount - fromPage);
  const thai = needsTextImage(s.format);

  const preview = usePagePreview(pdf.source, fromPage - 1, JSON.stringify([s, total]), async (single) => {
    const text = formatLabel(s.format, s.startAt, total);
    const labels = thai ? [await renderLabel(text, s.fontSize)] : undefined;
    return runPdf("addPageNumbers", single, { ...s, fromPage: 1, total, labels, labelScale: LABEL_SCALE });
  });

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

  return (
    <ToolLayout
      main={
        <>
          <SourceBar name={source.file.name} detail={`${pageCount} หน้า · ตัวอย่างหน้า ${fromPage}`} onClear={clear} />
          {preview.error ? (
            <ErrorBox message={preview.error} />
          ) : (
            <div className="thumb-bg relative grid min-h-80 place-items-center rounded-2xl p-4">
              {preview.url ? (
                <img src={preview.url} alt={`ตัวอย่างหน้า ${fromPage} พร้อมเลขหน้า`} className="max-h-[75vh] max-w-full shadow-lg" />
              ) : (
                <Spinner className="h-6 w-6 text-muted" />
              )}
              {preview.url && preview.updating && (
                <span className="absolute right-3 top-3 rounded-full bg-card/90 p-1.5 text-muted shadow">
                  <Spinner className="h-4 w-4" />
                </span>
              )}
            </div>
          )}
        </>
      }
      side={
        <>
          <Panel className="space-y-5">
            <PositionPicker label="ตำแหน่ง" value={s.position} rows={ROWS} onChange={(v) => set("position", v)} />
            <Segmented label="รูปแบบ" value={s.format} options={PAGE_NUMBER_FORMATS} onChange={(v) => set("format", v)} />
            <Slider label="ขนาดตัวเลข" value={s.fontSize} min={8} max={24} unit=" pt" onChange={(v) => set("fontSize", v)} />
            <Segmented label="ระยะจากขอบ" value={s.margin} options={MARGINS} onChange={(v) => set("margin", v)} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="เริ่มใส่ที่หน้า">
                <input
                  className={inputClass}
                  type="number"
                  min={1}
                  max={pageCount}
                  value={s.fromPage}
                  onChange={(e) => set("fromPage", Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                />
              </Field>
              <Field label="เลขแรก">
                <input
                  className={inputClass}
                  type="number"
                  min={0}
                  value={s.startAt}
                  onChange={(e) => set("startAt", Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                />
              </Field>
            </div>
            <p className="-mt-2 text-xs text-muted">
              เช่น ข้ามหน้าปก: เริ่มใส่ที่หน้า 2 และเลขแรก 1 — หน้า {fromPage} จะเป็น “{formatLabel(s.format, s.startAt, total)}”
            </p>
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabled={!!preview.error || task.state.status === "working"}
              onClick={() =>
                task.run(async (progress) => {
                  const opts: PageNumberOptions = { ...s, fromPage, labelScale: LABEL_SCALE };
                  if (thai) {
                    const all = pageLabels(pageCount, opts);
                    const labels = [];
                    for (const [k, l] of all.entries()) {
                      if (k % 20 === 0) progress(`กำลังเตรียมเลขหน้า ${k + 1}/${all.length}…`);
                      labels.push(await renderLabel(l.text, s.fontSize));
                    }
                    opts.labels = labels;
                  }
                  progress("กำลังใส่เลขหน้า…");
                  const bytes = await runPdf("addPageNumbers", source.bytes, opts);
                  return { blob: pdfBlob(bytes), name: `${baseName(source.file.name)}-numbered.pdf` };
                })
              }
            >
              ใส่เลขหน้า
            </Button>
          </Panel>
          <TaskStatus task={task} onStartOver={clear} />
        </>
      }
    />
  );
}
