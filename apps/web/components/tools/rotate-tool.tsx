"use client";

import { useState } from "react";
import { ActionBar } from "@/components/action-bar";
import { Dropzone } from "@/components/dropzone";
import { PageThumb } from "@/components/page-thumb";
import { Button, EmptyState, Panel, SourceBar, Steps, ToolLayout } from "@/components/ui";
import { baseName, isPdfFile, PDF_ACCEPT, pdfBlob } from "@/lib/files";
import { runPdf } from "@/lib/pdf/client";
import { usePdfSource } from "@/lib/use-pdf-source";
import { useTask } from "@/lib/use-task";

const norm = (deg: number) => ((deg % 360) + 360) % 360;

export function RotateTool() {
  const pdf = usePdfSource({ thumbSize: 220 });
  const task = useTask();
  /** องศาที่หมุนเพิ่มของแต่ละหน้า (สะสมได้เกิน 360 เพื่อให้ภาพหมุนต่อเนื่องไม่ย้อนกลับ) */
  const [rotations, setRotations] = useState<number[]>([]);

  const pageCount = pdf.source?.pageCount ?? 0;
  const rot = (i: number) => rotations[i] ?? 0;
  const changed = rotations.some((r) => norm(r) !== 0);
  const changedCount = rotations.filter((r) => norm(r) !== 0).length;

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
        top={<SourceBar name={source.file.name} detail={`${pageCount} หน้า`} onClear={clear} />}
        main={
          <>
            <p className="mb-3 text-sm text-muted">แตะที่หน้าเพื่อหมุนตามเข็มนาฬิกาทีละ 90°</p>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {pdf.thumbs.map((thumb, i) => {
                const angle = norm(rot(i));
                return (
                  <li key={i}>
                    <button
                      type="button"
                      className="group block w-full rounded-2xl border border-line bg-card p-2 text-left transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:bg-primary-soft"
                      aria-label={`หมุนหน้า ${i + 1}`}
                      onClick={() => rotateWhere((k) => k === i, 90)}
                    >
                      <div className="relative">
                        <PageThumb src={thumb} rotate={rot(i)} alt={`หน้า ${i + 1}`} />
                        <span className="absolute right-2 top-2 grid h-11 w-11 place-items-center rounded-full border border-line bg-card/95 text-muted shadow-sm transition-colors group-hover:text-primary sm:h-9 sm:w-9">
                          <RotateIcon />
                        </span>
                      </div>
                      <span className="mt-1.5 flex justify-between px-1 text-sm text-muted">
                        <span>หน้า {i + 1}</span>
                        {angle !== 0 && <span className="font-medium text-primary">หมุน {angle}°</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        }
        side={
          <>
            <Panel title="หมุนทุกหน้าพร้อมกัน">
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => rotateWhere(() => true, -90)}>
                  <RotateIcon flip /> ทวนเข็ม
                </Button>
                <Button onClick={() => rotateWhere(() => true, 90)}>
                  <RotateIcon /> ตามเข็ม
                </Button>
              </div>
              {changed && (
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted">หมุนแล้ว {changedCount} หน้า</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      task.reset();
                      setRotations([]);
                    }}
                  >
                    คืนค่าเดิม
                  </Button>
                </div>
              )}
            </Panel>
            <ActionBar
              task={task}
              label="บันทึก PDF"
              disabled={!changed}
              hint={!changed ? "ยังไม่ได้หมุนหน้าใด" : undefined}
              onRun={() =>
                task.run(async (progress) => {
                  progress("กำลังหมุนหน้า…");
                  const bytes = await runPdf(
                    "rotatePdf",
                    source.bytes,
                    Array.from({ length: pageCount }, (_, i) => norm(rot(i))),
                  );
                  return { blob: pdfBlob(bytes), name: `${baseName(source.file.name)}-rotated.pdf` };
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

function RotateIcon({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
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
