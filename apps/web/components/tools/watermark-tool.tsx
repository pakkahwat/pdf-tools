"use client";

import { useMemo, useState } from "react";
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
import { kanit, sarabun } from "@/lib/fonts";
import { isImageFile, prepareImage } from "@/lib/images";
import { runPdf } from "@/lib/pdf/client";
import type { Position } from "@/lib/pdf/layout";
import type { WatermarkOptions } from "@/lib/pdf/ops";
import { parsePageList } from "@/lib/pdf/ranges";
import { textToPng } from "@/lib/text-image";
import { usePagePreview } from "@/lib/use-page-preview";
import { usePdfSource } from "@/lib/use-pdf-source";
import { useTask } from "@/lib/use-task";

type Settings = {
  mode: "text" | "image";
  text: string;
  font: "kanit" | "sarabun";
  bold: boolean;
  color: string;
  size: number;
  opacity: number;
  rotate: number;
  layout: "single" | "tile";
  position: Position;
};

const GRID = [
  ["tl", "tc", "tr"],
  ["ml", "mc", "mr"],
  ["bl", "bc", "br"],
] as const;

async function markImage(s: Settings, logo: WatermarkOptions["image"] | null): Promise<WatermarkOptions["image"] | null> {
  if (s.mode === "image") return logo;
  const text = s.text.trim();
  if (!text) return null;
  const family = s.font === "kanit" ? kanit.style.fontFamily : sarabun.style.fontFamily;
  const weight = s.bold ? (s.font === "kanit" ? 600 : 700) : 400;
  const img = await textToPng(text, { family, weight, sizePx: 160, color: s.color });
  return { ...img, type: "png" };
}

function markOptions(s: Settings, image: WatermarkOptions["image"]): WatermarkOptions {
  return {
    image,
    widthRatio: s.size / 100,
    position: s.layout === "tile" ? "tile" : s.position,
    rotate: s.rotate,
    opacity: s.opacity / 100,
  };
}

export function WatermarkTool() {
  const pdf = usePdfSource();
  const task = useTask();
  const [s, setS] = useState<Settings>({
    mode: "text",
    text: "สำเนา",
    font: "kanit",
    bold: true,
    color: "#dc2626",
    size: 60,
    opacity: 25,
    rotate: 45,
    layout: "single",
    position: "mc",
  });
  const [logo, setLogo] = useState<{ name: string; image: WatermarkOptions["image"] } | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [scope, setScope] = useState<"all" | "some">("all");
  const [pagesText, setPagesText] = useState("");

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    task.reset();
    setS((prev) => ({ ...prev, [key]: value }));
  };

  const pageCount = pdf.source?.pageCount ?? 0;
  const key = JSON.stringify([s, logo?.name, logo?.image.bytes.length]);
  const preview = usePagePreview(pdf.source, 0, key, async (single) => {
    const image = await markImage(s, logo?.image ?? null);
    return image ? runPdf("addWatermark", single, markOptions(s, image)) : null;
  });

  const pages = useMemo((): { list?: number[]; error?: string } => {
    if (scope === "all") return {};
    if (!pagesText.trim()) return { error: "ระบุหน้าที่จะใส่ลายน้ำ" };
    try {
      return { list: parsePageList(pagesText, pageCount) };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [scope, pagesText, pageCount]);

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
  const hasMark = s.mode === "text" ? s.text.trim().length > 0 : !!logo;

  return (
    <ToolLayout
      main={
        <>
          <SourceBar name={source.file.name} detail={`${pageCount} หน้า · ตัวอย่างหน้าแรก`} onClear={clear} />
          {preview.error ? (
            <ErrorBox message={preview.error} />
          ) : (
            <div className="thumb-bg relative grid min-h-80 place-items-center rounded-2xl p-4">
              {preview.url ? (
                <img src={preview.url} alt="ตัวอย่างหน้าแรกพร้อมลายน้ำ" className="max-h-[75vh] max-w-full shadow-lg" />
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
            <Segmented
              label="ลายน้ำแบบ"
              value={s.mode}
              options={[
                { value: "text", label: "ข้อความ" },
                { value: "image", label: "รูป/โลโก้" },
              ]}
              onChange={(v) => set("mode", v)}
            />
            {s.mode === "text" ? (
              <>
                <Field label="ข้อความ">
                  <input className={inputClass} value={s.text} onChange={(e) => set("text", e.target.value)} />
                </Field>
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <Segmented
                      label="ฟอนต์"
                      value={s.font}
                      options={[
                        { value: "kanit", label: "Kanit" },
                        { value: "sarabun", label: "Sarabun" },
                      ]}
                      onChange={(v) => set("font", v)}
                    />
                  </div>
                  <label className="grid h-10 w-12 cursor-pointer place-items-center rounded-lg border border-line" title="สี">
                    <span className="sr-only">สี</span>
                    <input
                      type="color"
                      value={s.color}
                      onChange={(e) => set("color", e.target.value)}
                      className="h-7 w-8 cursor-pointer border-0 bg-transparent p-0"
                    />
                  </label>
                </div>
                <Segmented
                  label="น้ำหนักตัวอักษร"
                  value={s.bold ? "bold" : "normal"}
                  options={[
                    { value: "normal", label: "ปกติ" },
                    { value: "bold", label: "หนา" },
                  ]}
                  onChange={(v) => set("bold", v === "bold")}
                />
              </>
            ) : (
              <div className="space-y-2">
                {logo && <p className="truncate text-sm text-muted">ใช้รูป: {logo.name}</p>}
                <Dropzone
                  compact
                  accept="image/png,image/jpeg"
                  filter={isImageFile}
                  onFiles={async ([f]) => {
                    setLogoError(null);
                    try {
                      const image = await prepareImage(f);
                      task.reset();
                      setLogo({ name: f.name, image });
                    } catch (e) {
                      setLogoError((e as Error).message);
                    }
                  }}
                  onRejected={() => setLogoError("รองรับรูป PNG หรือ JPG")}
                  buttonLabel={logo ? "เปลี่ยนรูป" : "เลือกรูป (PNG พื้นใสจะสวยที่สุด)"}
                />
                {logoError && <p className="text-sm text-danger">{logoError}</p>}
              </div>
            )}
            <Slider label="ขนาด (เทียบความกว้างหน้า)" value={s.size} min={10} max={100} unit="%" onChange={(v) => set("size", v)} />
            <Slider label="ความเข้ม" value={s.opacity} min={5} max={100} step={5} unit="%" onChange={(v) => set("opacity", v)} />
            <Segmented
              label="มุมเอียง"
              value={s.rotate}
              options={[
                { value: 0, label: "0°" },
                { value: 45, label: "45°" },
                { value: 90, label: "90°" },
                { value: -45, label: "-45°" },
              ]}
              onChange={(v) => set("rotate", v)}
            />
            <Segmented
              label="การวาง"
              value={s.layout}
              options={[
                { value: "single", label: "ตำแหน่งเดียว" },
                { value: "tile", label: "ซ้ำทั่วหน้า" },
              ]}
              onChange={(v) => set("layout", v)}
            />
            {s.layout === "single" && (
              <PositionPicker label="ตำแหน่ง" value={s.position} rows={GRID} onChange={(v) => set("position", v)} />
            )}
            <Segmented
              label="ใส่ที่หน้า"
              value={scope}
              options={[
                { value: "all", label: "ทุกหน้า" },
                { value: "some", label: "เลือกหน้า" },
              ]}
              onChange={(v) => {
                task.reset();
                setScope(v);
              }}
            />
            {scope === "some" && (
              <Field label="หน้า" hint="เช่น 1, 3, 5-7">
                <input
                  className={inputClass}
                  value={pagesText}
                  placeholder="1, 3, 5-7"
                  inputMode="numeric"
                  onChange={(e) => {
                    task.reset();
                    setPagesText(e.target.value);
                  }}
                />
              </Field>
            )}
            {scope === "some" && pages.error && pagesText.trim() && <p className="text-sm text-danger">{pages.error}</p>}
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabled={!hasMark || !!pages.error || !!preview.error || task.state.status === "working"}
              onClick={() =>
                task.run(async (progress) => {
                  progress("กำลังใส่ลายน้ำ…");
                  const image = await markImage(s, logo?.image ?? null);
                  if (!image) throw new Error("ยังไม่ได้ใส่ข้อความหรือรูปลายน้ำ");
                  const bytes = await runPdf("addWatermark", source.bytes, { ...markOptions(s, image), pages: pages.list });
                  return { blob: pdfBlob(bytes), name: `${baseName(source.file.name)}-watermarked.pdf` };
                })
              }
            >
              ใส่ลายน้ำ
            </Button>
          </Panel>
          <TaskStatus task={task} onStartOver={clear} />
        </>
      }
    />
  );
}
