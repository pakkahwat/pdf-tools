"use client";

import { ActionBar } from "@/components/action-bar";
import { Dropzone } from "@/components/dropzone";
import { ThumbPreview } from "@/components/page-thumb";
import { EmptyState, Panel, SourceBar, Steps, ToolLayout } from "@/components/ui";
import { baseName, isPdfFile, PDF_ACCEPT } from "@/lib/files";
import { pdfToWord, progressText } from "@/lib/pdf2word/client";
import { usePdfSource } from "@/lib/use-pdf-source";
import { useTask } from "@/lib/use-task";

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function PdfToWordTool() {
  const pdf = usePdfSource({ thumbSize: 200 });
  const task = useTask();

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
            hint="แปลงในเครื่องคุณ — ครั้งแรกต้องโหลดตัวแปลงราว 40MB"
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
        top={<SourceBar name={source.file.name} detail={`${source.pageCount} หน้า`} onClear={clear} />}
        main={<ThumbPreview thumbs={pdf.thumbs} pageCount={source.pageCount} note="แปลงทั้งไฟล์" />}
        side={
          <>
            <Panel title="ก่อนแปลง">
              <ul className="space-y-2.5 text-sm text-muted">
                <li className="flex gap-2">
                  <Dot />
                  ได้ไฟล์ Word ที่แก้ไขได้ ข้อความไหลเป็นย่อหน้า ตารางเป็นตารางจริง
                </li>
                <li className="flex gap-2">
                  <Dot />
                  ฝังฟอนต์ไว้ในไฟล์ (ถ้าเป็นฟอนต์ที่อนุญาต) เปิดเครื่องไหนหน้าตาก็ไม่เพี้ยน
                </li>
                <li className="flex gap-2">
                  <Dot />
                  ครั้งแรกต้องโหลดตัวแปลงราว 40MB ครั้งต่อไปเร็วขึ้นมาก — ใช้บนคอมพิวเตอร์จะเร็วกว่ามือถือ
                </li>
                <li className="flex gap-2">
                  <Dot />
                  PDF ที่เป็นภาพสแกนยังแปลงเป็นข้อความไม่ได้ (เครื่องมือ OCR กำลังจะมา)
                </li>
              </ul>
            </Panel>
            <ActionBar
              task={task}
              label="แปลงเป็น Word"
              onRun={() =>
                task.run(async (progress) => {
                  progress("กำลังเริ่มตัวแปลง…");
                  const out = await pdfToWord(source.bytes, (p) => progress(progressText(p)));
                  const notes = [`${out.pages} หน้า`];
                  if (out.textChars === 0) notes.push("ไม่พบข้อความ (ไฟล์สแกน) — ในไฟล์ Word จะเป็นรูปภาพ");
                  return {
                    blob: new Blob([out.docx as Uint8Array<ArrayBuffer>], { type: DOCX }),
                    name: `${baseName(source.file.name)}.docx`,
                    note: notes.join(" · "),
                  };
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

function Dot() {
  return <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />;
}
