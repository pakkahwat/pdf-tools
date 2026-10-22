"use client";

import { useState } from "react";
import { Dropzone } from "@/components/dropzone";
import { PageThumb } from "@/components/page-thumb";
import { noDrag, SortableList } from "@/components/sortable";
import { TaskStatus } from "@/components/task-status";
import { Button, ErrorBox, Panel, SourceBar, ToolLayout } from "@/components/ui";
import { baseName, isPdfFile, PDF_ACCEPT, pdfBlob } from "@/lib/files";
import { runPdf } from "@/lib/pdf/client";
import { usePdfSource } from "@/lib/use-pdf-source";
import { useTask } from "@/lib/use-task";

type Card = { id: string; index: number; rotate: number };

const initial = (n: number): Card[] => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, index: i, rotate: 0 }));

export function OrganizeTool() {
  const pdf = usePdfSource({ thumbSize: 220 });
  const task = useTask();
  const [cards, setCards] = useState<Card[] | null>(null);

  const pageCount = pdf.source?.pageCount ?? 0;
  const list = cards ?? initial(pageCount);
  const changed =
    list.length !== pageCount || list.some((c, i) => c.index !== i || c.rotate % 360 !== 0);

  function change(next: Card[] | null) {
    task.reset();
    setCards(next);
  }

  function clear() {
    change(null);
    pdf.reset();
  }

  if (!pdf.source) {
    return (
      <div className="space-y-4">
        {pdf.error && <ErrorBox message={pdf.error} />}
        <Dropzone
          accept={PDF_ACCEPT}
          filter={isPdfFile}
          onFiles={([f]) => {
            setCards(null);
            void pdf.load(f);
          }}
          onRejected={() => pdf.setError("กรุณาเลือกไฟล์ PDF")}
          buttonLabel={pdf.loading ? "กำลังเปิดไฟล์…" : "เลือกไฟล์ PDF"}
        />
      </div>
    );
  }

  const { source } = pdf;
  const removed = pageCount - list.length;

  return (
    <ToolLayout
      main={
        <>
          <SourceBar name={source.file.name} detail={`${pageCount} หน้า`} onClear={clear} />
          <p className="mb-3 text-sm text-muted">ลากเพื่อสลับลำดับ (มือถือ: กดค้างแล้วลาก) · ใช้ปุ่มบนภาพเพื่อหมุนหรือลบ</p>
          {list.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line p-8 text-center text-muted">ลบหมดทุกหน้าแล้ว</p>
          ) : (
            <SortableList
              items={list}
              onChange={change}
              layout="grid"
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4"
              itemLabel={(c, i) => `ลำดับ ${i + 1} หน้าเดิม ${c.index + 1}`}
            >
              {(card, i) => (
                <div className="rounded-2xl border border-line bg-card p-2">
                  <div className="relative">
                    <PageThumb src={pdf.thumbs[card.index]} rotate={card.rotate} alt={`หน้า ${card.index + 1}`} />
                    <div className="absolute right-2 top-2 flex gap-1.5">
                      <button
                        type="button"
                        {...noDrag}
                        aria-label={`หมุนหน้า ${card.index + 1}`}
                        onClick={() => change(list.map((c) => (c.id === card.id ? { ...c, rotate: c.rotate + 90 } : c)))}
                        className="grid h-8 w-8 place-items-center rounded-full bg-card/90 text-muted shadow hover:text-primary"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
                          <path d="M20 12a8 8 0 1 1-2.34-5.66" />
                          <path d="M20 4v5h-5" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        {...noDrag}
                        aria-label={`ลบหน้า ${card.index + 1}`}
                        onClick={() => change(list.filter((c) => c.id !== card.id))}
                        className="grid h-8 w-8 place-items-center rounded-full bg-card/90 text-muted shadow hover:text-danger"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
                          <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 flex justify-between px-1 text-xs text-muted">
                    <span className="font-medium text-fg">{i + 1}</span>
                    {card.index !== i && <span>เดิมหน้า {card.index + 1}</span>}
                  </p>
                </div>
              )}
            </SortableList>
          )}
        </>
      }
      side={
        <>
          <Panel className="space-y-3">
            <p className="text-sm text-muted">
              {list.length} หน้า{removed > 0 && ` (ลบ ${removed} หน้า)`}
            </p>
            <Button variant="ghost" size="sm" disabled={!changed} onClick={() => change(null)}>
              คืนค่าเดิม
            </Button>
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabled={!changed || list.length === 0 || task.state.status === "working"}
              onClick={() =>
                task.run(async (progress) => {
                  progress("กำลังสร้างไฟล์ใหม่…");
                  const bytes = await runPdf(
                    "rebuildPdf",
                    source.bytes,
                    list.map((c) => ({ index: c.index, rotate: c.rotate % 360 })),
                  );
                  return {
                    blob: pdfBlob(bytes),
                    name: `${baseName(source.file.name)}-organized.pdf`,
                    note: `${list.length} หน้า`,
                  };
                })
              }
            >
              บันทึก PDF
            </Button>
            {!changed && <p className="text-xs text-muted">ยังไม่ได้เปลี่ยนแปลงอะไร</p>}
          </Panel>
          <TaskStatus task={task} onStartOver={clear} />
        </>
      }
    />
  );
}
