"use client";

import { useMemo, useState } from "react";
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

/** สีที่ใช้บ่อย — กดเลือกได้ทันที ไม่ต้องเปิดตัวเลือกสี */
const SWATCHES = [
  { value: "#dc2626", name: "แดง" },
  { value: "#6b7280", name: "เทา" },
  { value: "#111827", name: "ดำ" },
  { value: "#1d4ed8", name: "น้ำเงิน" },
  { value: "#0f766e", name: "เขียว" },
];

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
  const hasMark = s.mode === "text" ? s.text.trim().length > 0 : !!logo;

  return (
    <>
      <Steps current={task.state.status === "done" ? 3 : 2} />
      <ToolLayout
        top={<SourceBar name={source.file.name} detail={`${pageCount} หน้า · ตัวอย่างหน้าแรก`} onClear={clear} />}
        main={
          <>
            <PreviewBox
              url={preview.url}
              updating={preview.updating}
              error={preview.error}
              alt="ตัวอย่างหน้าแรกพร้อมลายน้ำ"
            />
          </>
        }
        side={
          <>
            <Panel title="ลายน้ำ">
              <Segmented
                label="ใช้เป็น"
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
                  <Segmented
                    label="ฟอนต์"
                    value={s.font}
                    options={[
                      { value: "kanit", label: "Kanit" },
                      { value: "sarabun", label: "Sarabun" },
                    ]}
                    onChange={(v) => set("font", v)}
                  />
                  <Segmented
                    label="น้ำหนักตัวอักษร"
                    value={s.bold ? "bold" : "normal"}
                    options={[
                      { value: "normal", label: "ปกติ" },
                      { value: "bold", label: "หนา" },
                    ]}
                    onChange={(v) => set("bold", v === "bold")}
                  />
                  <div>
                    <div className="mb-2 text-sm font-medium">สี</div>
                    <div role="radiogroup" aria-label="สี" className="flex flex-wrap items-center gap-2">
                      {SWATCHES.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          role="radio"
                          aria-checked={s.color === c.value}
                          aria-label={c.name}
                          title={c.name}
                          onClick={() => set("color", c.value)}
                          className={`grid h-11 w-11 place-items-center rounded-full border-2 transition-colors ${
                            s.color === c.value ? "border-fg" : "border-transparent hover:border-line"
                          }`}
                        >
                          <span className="h-7 w-7 rounded-full" style={{ backgroundColor: c.value }} />
                        </button>
                      ))}
                      <label className="relative grid h-11 w-11 place-items-center rounded-full border-2 border-dashed border-line" title="สีอื่น">
                        <span className="sr-only">สีอื่น</span>
                        <input
                          type="color"
                          value={s.color}
                          onChange={(e) => set("color", e.target.value)}
                          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        />
                        <svg viewBox="0 0 24 24" className="h-5 w-5 text-muted" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                        </svg>
                      </label>
                    </div>
                  </div>
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
                    buttonLabel={logo ? "เปลี่ยนรูป" : "เลือกรูปโลโก้"}
                  />
                  <p className="text-sm text-muted">รูป PNG พื้นหลังโปร่งใสจะดูสวยที่สุด</p>
                  {logoError && (
                    <p role="alert" className="text-sm text-danger">
                      {logoError}
                    </p>
                  )}
                </div>
              )}
            </Panel>

            <Panel title="ขนาดและตำแหน่ง">
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
            </Panel>

            <Panel title="หน้าที่จะใส่">
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
                    aria-invalid={!!pages.error && !!pagesText.trim()}
                    onChange={(e) => {
                      task.reset();
                      setPagesText(e.target.value);
                    }}
                  />
                </Field>
              )}
              {scope === "some" && pages.error && pagesText.trim() && (
                <p role="alert" className="text-sm text-danger">
                  {pages.error}
                </p>
              )}
            </Panel>

            <ActionBar
              task={task}
              label="ใส่ลายน้ำ"
              disabled={!hasMark || !!pages.error || !!preview.error}
              hint={
                !hasMark
                  ? s.mode === "text"
                    ? "พิมพ์ข้อความลายน้ำก่อน"
                    : "เลือกรูปโลโก้ก่อน"
                  : pages.error && scope === "some"
                    ? pages.error
                    : undefined
              }
              onRun={() =>
                task.run(async (progress) => {
                  progress("กำลังใส่ลายน้ำ…");
                  const image = await markImage(s, logo?.image ?? null);
                  if (!image) throw new Error("ยังไม่ได้ใส่ข้อความหรือรูปลายน้ำ");
                  const bytes = await runPdf("addWatermark", source.bytes, { ...markOptions(s, image), pages: pages.list });
                  return { blob: pdfBlob(bytes), name: `${baseName(source.file.name)}-watermarked.pdf` };
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
