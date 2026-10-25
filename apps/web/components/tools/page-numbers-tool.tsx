"use client";

import { useState } from "react";
import type { TextImage } from "@/lib/text-image";
import { ActionBar } from "@/components/action-bar";
import { Dropzone } from "@/components/dropzone";
import { PreviewBox } from "@/components/preview-box";
import {
  EmptyState,
  Field,
  inputClass,
  Panel,
  PositionPicker,
  Segmented,
  Slider,
  SourceBar,
  Steps,
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
      <>
        <Steps current={1} />
        <EmptyState error={pdf.error}>
          <Dropzone
            accept={PDF_ACCEPT}
            filter={isPdfFile}
            onFiles={([f]) => void pdf.load(f)}
            onRejected={() => pdf.setError("ไฟล์นี้ไม่ใช่ PDF — กรุณาเลือกไฟล์ .pdf")}
            buttonLabel="เลือกไฟล์ PDF"
            busy={pdf.loading}
          />
        </EmptyState>
      </>
    );
  }

  const { source } = pdf;

  return (
    <>
      <Steps current={task.state.status === "done" ? 3 : 2} />
      <ToolLayout
        top={<SourceBar name={source.file.name} detail={`${pageCount} หน้า · ตัวอย่างหน้า ${fromPage}`} onClear={clear} />}
        main={
          <>
            <PreviewBox
              url={preview.url}
              updating={preview.updating}
              error={preview.error}
              alt={`ตัวอย่างหน้า ${fromPage} พร้อมเลขหน้า`}
            />
          </>
        }
        side={
          <>
            <Panel title="รูปแบบเลขหน้า">
              <PositionPicker label="ตำแหน่ง" value={s.position} rows={ROWS} onChange={(v) => set("position", v)} />
              <Segmented label="รูปแบบ" value={s.format} options={PAGE_NUMBER_FORMATS} onChange={(v) => set("format", v)} />
              <Slider label="ขนาดตัวเลข" value={s.fontSize} min={8} max={24} unit=" pt" onChange={(v) => set("fontSize", v)} />
              <Segmented label="ระยะจากขอบ" value={s.margin} options={MARGINS} onChange={(v) => set("margin", v)} />
            </Panel>
            <Panel title="เริ่มนับ">
              <div className="grid grid-cols-2 gap-3">
                <Field label="เริ่มใส่ที่หน้า">
                  <input
                    className={inputClass}
                    type="number"
                    inputMode="numeric"
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
                    inputMode="numeric"
                    min={0}
                    value={s.startAt}
                    onChange={(e) => set("startAt", Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                  />
                </Field>
              </div>
              <p className="rounded-xl bg-primary-soft px-3 py-2 text-sm text-primary">
                หน้า {fromPage} จะเป็น “{formatLabel(s.format, s.startAt, total)}”
                <span className="block text-muted">ไม่อยากใส่เลขที่หน้าปก? ตั้ง “เริ่มใส่ที่หน้า” เป็น 2</span>
              </p>
            </Panel>
            <ActionBar
              task={task}
              label="ใส่เลขหน้า"
              disabled={!!preview.error}
              onRun={() =>
                task.run(async (progress) => {
                  const opts: PageNumberOptions = { ...s, fromPage, labelScale: LABEL_SCALE };
                  if (thai) {
                    const all = pageLabels(pageCount, opts);
                    const labels: TextImage[] = [];
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
              onStartOver={clear}
            />
          </>
        }
      />
    </>
  );
}
