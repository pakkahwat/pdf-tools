"use client";

import { useState } from "react";
import { Dropzone } from "@/components/dropzone";
import { PageThumb } from "@/components/page-thumb";
import { TaskStatus } from "@/components/task-status";
import { Button, ErrorBox, Panel, SourceBar, ToolLayout } from "@/components/ui";
import { baseName, isPdfFile, PDF_ACCEPT, pdfBlob } from "@/lib/files";
import { runPdf } from "@/lib/pdf/client";
import { usePdfSource } from "@/lib/use-pdf-source";
import { useTask } from "@/lib/use-task";

export function RotateTool() {
  const pdf = usePdfSource({ thumbSize: 220 });
  const task = useTask();
  /** องศาที่หมุนเพิ่มของแต่ละหน้า (สะสมได้เกิน 360 เพื่อให้ภาพหมุนต่อเนื่องไม่ย้อนกลับ) */
  const [rotations, setRotations] = useState<number[]>([]);

  const pageCount = pdf.source?.pageCount ?? 0;
  const rot = (i: number) => rotations[i] ?? 0;
  const changed = rotations.some((r) => r % 360 !== 0);

  function rotateWhere(pick: (i: number) => boolean, delta: number) {
    task.reset();
    setRotations(Array.from({ length: pageCount }, (_, i) => rot(i) + (pick(i) ? delta : 0)));
  }

  function clear() {
    task.reset();
    setRotations([]);
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
          <SourceBar name={source.file.name} detail={`${pageCount} หน้า`} onClear={clear} />
          <p className="mb-3 text-sm text-muted">แตะที่หน้าเพื่อหมุนตามเข็มนาฬิกาทีละ 90°</p>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {pdf.thumbs.map((thumb, i) => (
              <li key={i}>
                <button
                  type="button"
                  className="group block w-full text-left"
                  aria-label={`หมุนหน้า ${i + 1}`}
                  onClick={() => rotateWhere((k) => k === i, 90)}
                >
                  <div className="relative">
                    <PageThumb src={thumb} rotate={rot(i)} alt={`หน้า ${i + 1}`} />
                    <span className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-card/90 text-muted shadow transition group-hover:text-primary">
                      <RotateIcon />
                    </span>
                  </div>
                  <span className="mt-1 block px-1 text-xs text-muted">
                    หน้า {i + 1}
                    {rot(i) % 360 !== 0 && <span className="text-primary"> · หมุน {((rot(i) % 360) + 360) % 360}°</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      }
      side={
        <>
          <Panel className="space-y-3">
            <p className="text-sm font-medium">หมุนทุกหน้า</p>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => rotateWhere(() => true, -90)}>
                <RotateIcon flip /> ทวนเข็ม
              </Button>
              <Button onClick={() => rotateWhere(() => true, 90)}>
                <RotateIcon /> ตามเข็ม
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              disabled={!changed}
              onClick={() => {
                task.reset();
                setRotations([]);
              }}
            >
              คืนค่าเดิม
            </Button>
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabled={!changed || task.state.status === "working"}
              onClick={() =>
                task.run(async (progress) => {
                  progress("กำลังหมุนหน้า…");
                  const bytes = await runPdf(
                    "rotatePdf",
                    source.bytes,
                    Array.from({ length: pageCount }, (_, i) => rot(i) % 360),
                  );
                  return { blob: pdfBlob(bytes), name: `${baseName(source.file.name)}-rotated.pdf` };
                })
              }
            >
              บันทึก PDF
            </Button>
            {!changed && <p className="text-xs text-muted">ยังไม่ได้หมุนหน้าใด</p>}
          </Panel>
          <TaskStatus task={task} onStartOver={clear} />
        </>
      }
    />
  );
}

function RotateIcon({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={flip ? { transform: "scaleX(-1)" } : undefined}
      aria-hidden
    >
      <path d="M20 12a8 8 0 1 1-2.34-5.66" />
      <path d="M20 4v5h-5" />
    </svg>
  );
}
