"use client";

import { useState } from "react";
import { Dropzone } from "@/components/dropzone";
import { PageThumb } from "@/components/page-thumb";
import { noDrag, SortableList } from "@/components/sortable";
import { TaskStatus } from "@/components/task-status";
import { Button, ErrorBox, Panel, Segmented, ToolLayout } from "@/components/ui";
import { pdfBlob } from "@/lib/files";
import { IMAGE_ACCEPT, isImageFile, prepareImage } from "@/lib/images";
import { runPdf } from "@/lib/pdf/client";
import type { ImageInput, ImagesToPdfOptions } from "@/lib/pdf/ops";
import { useTask } from "@/lib/use-task";

type Item = { id: string; file: File; thumb: string | null };

let nextId = 0;

async function imageThumb(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file, { resizeWidth: 260, resizeQuality: "medium" });
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
  bitmap.close();
  const url = canvas.toDataURL("image/jpeg", 0.8);
  canvas.width = canvas.height = 0;
  return url;
}

const SIZES = [
  { value: "a4", label: "A4" },
  { value: "letter", label: "Letter" },
  { value: "fit", label: "เท่ารูป" },
] as const;
const ORIENTATIONS = [
  { value: "auto", label: "อัตโนมัติ" },
  { value: "portrait", label: "แนวตั้ง" },
  { value: "landscape", label: "แนวนอน" },
] as const;
const MARGINS = [
  { value: 0, label: "ไม่มี" },
  { value: 20, label: "แคบ" },
  { value: 40, label: "กว้าง" },
] as const;

export function ImagesToPdfTool() {
  const [items, setItems] = useState<Item[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [opts, setOpts] = useState<ImagesToPdfOptions>({ pageSize: "a4", orientation: "auto", margin: 20 });
  const task = useTask();

  function change(next: Item[]) {
    task.reset();
    setItems(next);
  }

  function add(files: File[]) {
    task.reset();
    setNotice(null);
    const fresh = files.map((file): Item => ({ id: `i${++nextId}`, file, thumb: null }));
    setItems((prev) => [...prev, ...fresh]);
    for (const item of fresh) {
      imageThumb(item.file)
        .catch(() => "")
        .then((thumb) => setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, thumb } : i))));
    }
  }

  const setOpt = <K extends keyof ImagesToPdfOptions>(key: K, value: ImagesToPdfOptions[K]) => {
    task.reset();
    setOpts((o) => ({ ...o, [key]: value }));
  };
  const rejected = (names: string[]) =>
    setNotice(`ข้ามไฟล์ที่ไม่รองรับ: ${names.join(", ")} (รองรับ JPG, PNG, WebP, GIF, BMP)`);

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        {notice && <ErrorBox message={notice} />}
        <Dropzone
          accept={IMAGE_ACCEPT}
          multiple
          filter={isImageFile}
          onFiles={add}
          onRejected={rejected}
          buttonLabel="เลือกรูปภาพ"
          hint="JPG, PNG, WebP, GIF, BMP — เลือกได้หลายรูป แต่ละรูปจะเป็น 1 หน้า"
        />
      </div>
    );
  }

  return (
    <ToolLayout
      main={
        <div className="space-y-4">
          {notice && <ErrorBox message={notice} />}
          <p className="text-sm text-muted">ลากเพื่อเรียงลำดับหน้า (มือถือ: กดค้างแล้วลาก)</p>
          <SortableList
            items={items}
            onChange={change}
            layout="grid"
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4"
            itemLabel={(item, i) => `หน้า ${i + 1} ${item.file.name}`}
          >
            {(item, i) => (
              <div className="rounded-2xl border border-line bg-card p-2">
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
                <p className="mt-2 truncate px-1 text-xs text-muted" title={item.file.name}>
                  {item.thumb === "" ? <span className="text-danger">เปิดรูปไม่ได้</span> : item.file.name}
                </p>
              </div>
            )}
          </SortableList>
        </div>
      }
      side={
        <>
          <Panel className="space-y-5">
            <Segmented label="ขนาดหน้า" value={opts.pageSize} options={SIZES} onChange={(v) => setOpt("pageSize", v)} />
            {opts.pageSize !== "fit" && (
              <Segmented
                label="แนวกระดาษ"
                value={opts.orientation}
                options={ORIENTATIONS}
                onChange={(v) => setOpt("orientation", v)}
              />
            )}
            <Segmented label="ขอบกระดาษ" value={opts.margin} options={MARGINS} onChange={(v) => setOpt("margin", v)} />
            <Dropzone
              compact
              accept={IMAGE_ACCEPT}
              multiple
              filter={isImageFile}
              onFiles={add}
              onRejected={rejected}
              buttonLabel="เพิ่มรูป"
            />
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabled={task.state.status === "working" || items.some((i) => i.thumb === "")}
              onClick={() =>
                task.run(async (progress) => {
                  const inputs: ImageInput[] = [];
                  for (const [k, item] of items.entries()) {
                    progress(`กำลังเตรียมรูป ${k + 1}/${items.length}…`);
                    inputs.push(await prepareImage(item.file));
                  }
                  progress("กำลังสร้าง PDF…");
                  const bytes = await runPdf("imagesToPdf", inputs, opts);
                  return { blob: pdfBlob(bytes), name: "images.pdf", note: `${items.length} หน้า` };
                })
              }
            >
              แปลงเป็น PDF ({items.length} หน้า)
            </Button>
            {items.some((i) => i.thumb === "") && (
              <p className="text-xs text-danger">เอารูปที่เปิดไม่ได้ออกก่อน (รูป HEIC ให้แปลงเป็น JPG ก่อน)</p>
            )}
          </Panel>
          <TaskStatus task={task} onStartOver={() => change([])} />
        </>
      }
    />
  );
}
