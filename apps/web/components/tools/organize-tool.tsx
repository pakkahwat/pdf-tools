"use client";

import { useState } from "react";
import { ActionBar } from "@/components/action-bar";
import { Dropzone } from "@/components/dropzone";
import { PageThumb } from "@/components/page-thumb";
import { MoveButtons, OverlayButton, SortableList } from "@/components/sortable";
import { Button, EmptyState, Panel, SourceBar, Steps, ToolLayout } from "@/components/ui";
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
  const changed = list.length !== pageCount || list.some((c, i) => c.index !== i || c.rotate % 360 !== 0);

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
      <>
        <Steps current={1} />
        <EmptyState error={pdf.error}>
          <Dropzone
            accept={PDF_ACCEPT}
            filter={isPdfFile}
            onFiles={([f]) => {
              setCards(null);
              void pdf.load(f);
            }}
            onRejected={() => pdf.setError("ไฟล์นี้ไม่ใช่ PDF — กรุณาเลือกไฟล์ .pdf")}
            buttonLabel="เลือกไฟล์ PDF"
            busy={pdf.loading}
          />
        </EmptyState>
      </>
    );
  }

  const { source } = pdf;
  const removed = pageCount - list.length;

  return (
    <>
      <Steps current={task.state.status === "done" ? 3 : 2} />
      <ToolLayout
        top={<SourceBar name={source.file.name} detail={`${pageCount} หน้า`} onClear={clear} />}
        main={
          <>
            <p className="mb-3 text-sm text-muted">
              ปุ่มบนภาพ: หมุน / ลบหน้า · ปุ่มลูกศรด้านล่าง: เลื่อนลำดับ (หรือลากการ์ด — มือถือกดค้างแล้วลาก)
            </p>
            {list.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-line p-10 text-center">
                <p className="text-muted">ลบหมดทุกหน้าแล้ว</p>
                <Button className="mt-3" onClick={() => change(null)}>
                  คืนค่าเดิม
                </Button>
              </div>
            ) : (
              <SortableList
                items={list}
                onChange={change}
                layout="grid"
                className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4"
                itemLabel={(c, i) => `ลำดับ ${i + 1} หน้าเดิม ${c.index + 1}`}
              >
                {(card, i, move) => (
                  <div className="rounded-2xl border border-line bg-card p-2">
                    <div className="relative">
                      <PageThumb src={pdf.thumbs[card.index]} rotate={card.rotate} alt={`หน้า ${card.index + 1}`} />
                      <span className="absolute left-2 top-2 grid h-7 min-w-7 place-items-center rounded-full bg-primary px-2 text-sm font-bold text-primary-fg shadow">
                        {i + 1}
                      </span>
                      <div className="absolute right-2 top-2 flex flex-col gap-1.5 sm:flex-row">
                        <OverlayButton
                          label={`หมุนหน้า ${card.index + 1}`}
                          onClick={() => change(list.map((c) => (c.id === card.id ? { ...c, rotate: c.rotate + 90 } : c)))}
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
                            <path d="M20 12a8 8 0 1 1-2.34-5.66" />
                            <path d="M20 4v5h-5" />
                          </svg>
                        </OverlayButton>
                        <OverlayButton
                          label={`ลบหน้า ${card.index + 1}`}
                          tone="danger"
                          onClick={() => change(list.filter((c) => c.id !== card.id))}
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
                            <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                          </svg>
                        </OverlayButton>
                      </div>
                    </div>
                    <MoveButtons index={i} count={list.length} move={move} name={`หน้า ${card.index + 1} `}>
                      {card.index !== i && <span className="text-xs text-muted">เดิมหน้า {card.index + 1}</span>}
                    </MoveButtons>
                  </div>
                )}
              </SortableList>
            )}
          </>
        }
        side={
          <>
            <Panel title="สรุป">
              <p className="text-sm text-muted">
                เหลือ {list.length} จาก {pageCount} หน้า{removed > 0 && ` (ลบ ${removed} หน้า)`}
              </p>
              {changed && (
                <Button variant="ghost" size="sm" onClick={() => change(null)}>
                  คืนค่าเดิมทั้งหมด
                </Button>
              )}
            </Panel>
            <ActionBar
              task={task}
              label="บันทึก PDF"
              disabled={!changed || list.length === 0}
              hint={list.length === 0 ? "ต้องเหลืออย่างน้อย 1 หน้า" : !changed ? "ยังไม่ได้เปลี่ยนแปลงอะไร" : undefined}
              onRun={() =>
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
              onStartOver={clear}
            />
          </>
        }
      />
    </>
  );
}
