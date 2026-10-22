"use client";

import { useMemo, useState } from "react";
import { Dropzone } from "@/components/dropzone";
import { PageThumb } from "@/components/page-thumb";
import { TaskStatus } from "@/components/task-status";
import { Button, ErrorBox, Field, inputClass, Panel, Segmented, SourceBar, ToolLayout } from "@/components/ui";
import { baseName, isPdfFile, padNumber, PDF_ACCEPT, pdfBlob, zipBlob } from "@/lib/files";
import { runPdf } from "@/lib/pdf/client";
import { chunkPages, compressRanges, everyPage, parsePageList, parseRanges } from "@/lib/pdf/ranges";
import { usePdfSource } from "@/lib/use-pdf-source";
import { useTask } from "@/lib/use-task";

type Mode = "ranges" | "extract" | "every" | "all";

const MODES = [
  { value: "ranges", label: "ตามช่วงหน้า" },
  { value: "extract", label: "ดึงเฉพาะหน้า" },
  { value: "every", label: "ทุก ๆ N หน้า" },
  { value: "all", label: "ทุกหน้า" },
] as const;

export function SplitTool() {
  const pdf = usePdfSource({ thumbSize: 200 });
  const task = useTask();
  const [mode, setMode] = useState<Mode>("ranges");
  const [ranges, setRanges] = useState("");
  const [extract, setExtract] = useState("");
  const [every, setEvery] = useState(1);

  const pageCount = pdf.source?.pageCount ?? 0;

  const plan = useMemo((): { groups: number[][]; error?: string } => {
    if (!pageCount) return { groups: [] };
    try {
      switch (mode) {
        case "all":
          return { groups: everyPage(pageCount) };
        case "every":
          return { groups: chunkPages(pageCount, every) };
        case "ranges":
          return ranges.trim() ? { groups: parseRanges(ranges, pageCount) } : { groups: [] };
        case "extract":
          return extract.trim() ? { groups: [parsePageList(extract, pageCount)] } : { groups: [] };
      }
    } catch (e) {
      return { groups: [], error: (e as Error).message };
    }
  }, [mode, ranges, extract, every, pageCount]);

  // index หน้า → ไฟล์ที่ (เริ่ม 1) ไว้แสดงป้ายบนภาพย่อ
  const fileOfPage = useMemo(() => {
    const map = new Map<number, number>();
    plan.groups.forEach((g, k) => g.forEach((i) => map.has(i) || map.set(i, k + 1)));
    return map;
  }, [plan.groups]);

  function edit(fn: () => void) {
    task.reset();
    fn();
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
  const label = (g: number[]) => {
    const a = padNumber(g[0] + 1, pageCount);
    const b = padNumber(g[g.length - 1] + 1, pageCount);
    return a === b ? a : `${a}-${b}`;
  };
  const selected = new Set(mode === "extract" ? plan.groups[0] ?? [] : []);

  return (
    <ToolLayout
      main={
        <>
          <SourceBar
            name={source.file.name}
            detail={`${pageCount} หน้า`}
            onClear={() => {
              task.reset();
              pdf.reset();
            }}
          />
          {mode === "extract" && <p className="mb-3 text-sm text-muted">แตะภาพหน้าเพื่อเลือก/ยกเลิก</p>}
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-5">
            {pdf.thumbs.map((thumb, i) => {
              const inFile = fileOfPage.get(i);
              const isSelected = selected.has(i);
              const content = (
                <>
                  <PageThumb
                    src={thumb}
                    alt={`หน้า ${i + 1}`}
                    className={isSelected ? "ring-3 ring-primary" : mode === "extract" ? "opacity-60" : ""}
                  />
                  <span className="mt-1 flex items-center justify-between px-1 text-xs text-muted">
                    <span>หน้า {i + 1}</span>
                    {mode !== "extract" && mode !== "all" && inFile && (
                      <span className="rounded bg-primary-soft px-1.5 text-primary">ไฟล์ {inFile}</span>
                    )}
                  </span>
                </>
              );
              return (
                <li key={i}>
                  {mode === "extract" ? (
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      className="block w-full text-left"
                      onClick={() =>
                        edit(() => {
                          const next = new Set(selected);
                          if (isSelected) next.delete(i);
                          else next.add(i);
                          setExtract(compressRanges([...next]));
                        })
                      }
                    >
                      {content}
                    </button>
                  ) : (
                    content
                  )}
                </li>
              );
            })}
          </ul>
        </>
      }
      side={
        <>
          <Panel className="space-y-5">
            <Segmented label="วิธีแยก" value={mode} options={MODES} onChange={(v) => edit(() => setMode(v))} />
            {mode === "ranges" && (
              <Field label="ช่วงหน้า (แต่ละช่วง = 1 ไฟล์)" hint="เช่น 1-3, 4-8, 9- (9- คือหน้า 9 ถึงหน้าสุดท้าย)">
                <input
                  className={inputClass}
                  value={ranges}
                  placeholder="1-3, 4-8, 9-"
                  inputMode="numeric"
                  onChange={(e) => edit(() => setRanges(e.target.value))}
                />
              </Field>
            )}
            {mode === "extract" && (
              <Field label="หน้าที่ต้องการ (รวมเป็นไฟล์เดียว)" hint="พิมพ์ เช่น 1, 3, 5-7 หรือแตะเลือกที่ภาพ">
                <input
                  className={inputClass}
                  value={extract}
                  placeholder="1, 3, 5-7"
                  inputMode="numeric"
                  onChange={(e) => edit(() => setExtract(e.target.value))}
                />
              </Field>
            )}
            {mode === "every" && (
              <Field label="จำนวนหน้าต่อไฟล์">
                <input
                  className={inputClass}
                  type="number"
                  min={1}
                  max={pageCount}
                  value={every}
                  onChange={(e) => edit(() => setEvery(Math.max(1, Math.floor(Number(e.target.value) || 1))))}
                />
              </Field>
            )}
            {plan.error ? (
              <p className="text-sm text-danger">{plan.error}</p>
            ) : (
              plan.groups.length > 0 && (
                <p className="text-sm text-muted">
                  จะได้ {plan.groups.length} ไฟล์
                  {plan.groups.length > 1 ? " (รวมเป็น .zip)" : ` (${plan.groups[0].length} หน้า)`}
                </p>
              )
            )}
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabled={plan.groups.length === 0 || task.state.status === "working"}
              onClick={() =>
                task.run(async (progress) => {
                  progress(`กำลังแยกเป็น ${plan.groups.length} ไฟล์…`);
                  const outputs = await runPdf("splitPdf", source.bytes, plan.groups);
                  const base = baseName(source.file.name);
                  if (outputs.length === 1) {
                    const suffix = mode === "extract" ? "selected" : `pages-${label(plan.groups[0])}`;
                    return {
                      blob: pdfBlob(outputs[0]),
                      name: `${base}-${suffix}.pdf`,
                      note: `${plan.groups[0].length} หน้า`,
                    };
                  }
                  progress("กำลังรวมเป็นไฟล์ .zip…");
                  const files = outputs.map((bytes, k) => ({ name: `${base}-${label(plan.groups[k])}.pdf`, bytes }));
                  return { blob: zipBlob(files), name: `${base}-split.zip`, note: `${outputs.length} ไฟล์` };
                })
              }
            >
              แยก PDF
            </Button>
          </Panel>
          <TaskStatus
            task={task}
            onStartOver={() => {
              task.reset();
              pdf.reset();
            }}
          />
        </>
      }
    />
  );
}
