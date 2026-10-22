"use client";

import { useState } from "react";
import { Dropzone } from "@/components/dropzone";
import { PageThumb } from "@/components/page-thumb";
import { noDrag, SortableList } from "@/components/sortable";
import { TaskStatus } from "@/components/task-status";
import { Button, ErrorBox, Panel, ToolLayout } from "@/components/ui";
import { formatBytes, isPdfFile, PDF_ACCEPT, pdfBlob } from "@/lib/files";
import { runPdf } from "@/lib/pdf/client";
import { closePdf, openPdf, renderThumb } from "@/lib/pdfjs";
import { errorMessage, useTask } from "@/lib/use-task";

type Item = {
  id: string;
  file: File;
  bytes: Uint8Array | null;
  pages: number | null;
  thumb: string | null;
  error?: string;
};

let nextId = 0;

export function MergeTool() {
  const [items, setItems] = useState<Item[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const task = useTask();

  const update = (id: string, patch: Partial<Item>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  async function inspect(item: Item) {
    try {
      const bytes = new Uint8Array(await item.file.arrayBuffer());
      const doc = await openPdf(bytes);
      const thumb = await renderThumb(doc, 1, 240).catch(() => "");
      update(item.id, { bytes, pages: doc.numPages, thumb });
      closePdf(doc);
    } catch (e) {
      update(item.id, { error: errorMessage(e), thumb: "" });
    }
  }

  function add(files: File[]) {
    task.reset();
    setNotice(null);
    const fresh = files.map((file): Item => ({ id: `f${++nextId}`, file, bytes: null, pages: null, thumb: null }));
    setItems((prev) => [...prev, ...fresh]);
    for (const item of fresh) void inspect(item);
  }

  function change(next: Item[]) {
    task.reset();
    setItems(next);
  }

  const ready = items.length >= 2 && items.every((i) => i.bytes && !i.error);
  const totalPages = items.reduce((n, i) => n + (i.pages ?? 0), 0);
  const rejected = (names: string[]) => setNotice(`ข้ามไฟล์ที่ไม่ใช่ PDF: ${names.join(", ")}`);

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        {notice && <ErrorBox message={notice} />}
        <Dropzone
          accept={PDF_ACCEPT}
          multiple
          filter={isPdfFile}
          onFiles={add}
          onRejected={rejected}
          buttonLabel="เลือกไฟล์ PDF"
          hint="เลือกได้หลายไฟล์พร้อมกัน"
        />
      </div>
    );
  }

  return (
    <ToolLayout
      main={
        <div className="space-y-4">
          {notice && <ErrorBox message={notice} />}
          <p className="text-sm text-muted">ลากการ์ดเพื่อเรียงลำดับ (มือถือ: กดค้างแล้วลาก) — ไฟล์จะถูกรวมจากซ้ายไปขวา</p>
          <SortableList
            items={items}
            onChange={change}
            layout="grid"
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4"
            itemLabel={(item, i) => `ไฟล์ที่ ${i + 1} ${item.file.name}`}
          >
            {(item, i) => (
              <div className="h-full rounded-2xl border border-line bg-card p-2">
                <div className="relative">
                  <PageThumb src={item.thumb} alt={item.file.name} />
                  <span className="absolute left-2 top-2 grid h-6 min-w-6 place-items-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-fg">
                    {i + 1}
                  </span>
                  <button
                    type="button"
                    {...noDrag}
                    onClick={() => change(items.filter((x) => x.id !== item.id))}
                    aria-label={`เอา ${item.file.name} ออก`}
                    className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-card/90 text-muted shadow hover:text-danger"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
                      <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
                <p className="mt-2 truncate px-1 text-sm font-medium" title={item.file.name}>
                  {item.file.name}
                </p>
                <p className={`px-1 text-xs ${item.error ? "text-danger" : "text-muted"}`}>
                  {item.error ??
                    (item.pages === null
                      ? "กำลังอ่านไฟล์…"
                      : `${item.pages} หน้า · ${formatBytes(item.file.size)}`)}
                </p>
              </div>
            )}
          </SortableList>
        </div>
      }
      side={
        <>
          <Panel className="space-y-3">
            <p className="text-sm text-muted">
              {items.length} ไฟล์ · รวม {totalPages} หน้า
            </p>
            <Dropzone
              compact
              accept={PDF_ACCEPT}
              multiple
              filter={isPdfFile}
              onFiles={add}
              onRejected={rejected}
              buttonLabel="เพิ่มไฟล์"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() =>
                  change(
                    [...items].sort((a, b) =>
                      a.file.name.localeCompare(b.file.name, "th", { numeric: true }),
                    ),
                  )
                }
              >
                เรียงตามชื่อ
              </Button>
              <Button size="sm" variant="danger" onClick={() => change([])}>
                ล้างทั้งหมด
              </Button>
            </div>
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabled={!ready || task.state.status === "working"}
              onClick={() =>
                task.run(async (progress) => {
                  progress(`กำลังรวม ${items.length} ไฟล์…`);
                  const bytes = await runPdf(
                    "mergePdfs",
                    items.map((i) => ({ name: i.file.name, bytes: i.bytes! })),
                  );
                  return { blob: pdfBlob(bytes), name: "merged.pdf", note: `${totalPages} หน้า` };
                })
              }
            >
              รวม PDF
            </Button>
            {items.length < 2 && <p className="text-xs text-muted">เพิ่มอย่างน้อย 2 ไฟล์</p>}
            {items.some((i) => i.error) && (
              <p className="text-xs text-danger">เอาไฟล์ที่เปิดไม่ได้ออกก่อน จึงจะรวมได้</p>
            )}
          </Panel>
          <TaskStatus task={task} onStartOver={() => change([])} />
        </>
      }
    />
  );
}
