"use client";

import { useMemo, useState } from "react";
import { ActionBar } from "@/components/action-bar";
import { Dropzone } from "@/components/dropzone";
import { PageThumb } from "@/components/page-thumb";
import { EmptyState, Field, inputClass, Panel, Segmented, SourceBar, Steps, ToolLayout } from "@/components/ui";
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

const MODE_HELP: Record<Mode, string> = {
  ranges: "แต่ละช่วงที่พิมพ์จะได้ 1 ไฟล์",
  extract: "เลือกหน้าที่ต้องการ แล้วรวมเป็นไฟล์เดียว",
  every: "ตัดไฟล์ทุก ๆ กี่หน้าก็ได้ตามที่กำหนด",
  all: "ทุกหน้าแยกเป็นไฟล์ละ 1 หน้า",
};

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
  const label = (g: number[]) => {
    const a = padNumber(g[0] + 1, pageCount);
    const b = padNumber(g[g.length - 1] + 1, pageCount);
    return a === b ? a : `${a}-${b}`;
  };
  const selected = new Set(mode === "extract" ? (plan.groups[0] ?? []) : []);
  const emptyInput = (mode === "ranges" && !ranges.trim()) || (mode === "extract" && !extract.trim());

  return (
    <>
      <Steps current={task.state.status === "done" ? 3 : 2} />
      <ToolLayout
        optionsFirst
        top={<SourceBar name={source.file.name} detail={`${pageCount} หน้า`} onClear={clear} />}
        main={
          <>
            {mode === "extract" && <p className="mb-3 text-sm text-muted">แตะภาพหน้าเพื่อเลือก / ยกเลิก</p>}
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-5">
              {pdf.thumbs.map((thumb, i) => {
                const inFile = fileOfPage.get(i);
                const isSelected = selected.has(i);
                const content = (
                  <>
                    <div className="relative">
                      <PageThumb
                        src={thumb}
                        alt={`หน้า ${i + 1}`}
                        className={isSelected ? "ring-3 ring-primary" : mode === "extract" ? "opacity-55" : ""}
                      />
                      {isSelected && (
                        <span className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-fg shadow" aria-hidden>
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
                            <path d="m5 12 5 5 9-10" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      )}
                    </div>
                    <span className="mt-1 flex items-center justify-between gap-1 px-1 text-sm text-muted">
                      <span>หน้า {i + 1}</span>
                      {mode !== "extract" && mode !== "all" && inFile && (
                        <span className="rounded-md bg-primary-soft px-1.5 text-xs font-medium text-primary">ไฟล์ {inFile}</span>
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
                        aria-label={`หน้า ${i + 1}`}
                        className="block w-full rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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
            <Panel title="แยกอย่างไร">
              <div>
                <Segmented label="วิธีแยก" value={mode} options={MODES} onChange={(v) => edit(() => setMode(v))} />
                <p className="mt-2 text-sm text-muted">{MODE_HELP[mode]}</p>
              </div>
              {mode === "ranges" && (
                <Field label="ช่วงหน้า" hint="เช่น 1-3, 4-8, 9- (9- คือหน้า 9 ถึงหน้าสุดท้าย)">
                  <input
                    className={inputClass}
                    value={ranges}
                    placeholder="1-3, 4-8, 9-"
                    inputMode="numeric"
                    aria-invalid={!!plan.error}
                    onChange={(e) => edit(() => setRanges(e.target.value))}
                  />
                </Field>
              )}
              {mode === "extract" && (
                <Field label="หน้าที่ต้องการ" hint="พิมพ์ เช่น 1, 3, 5-7 หรือแตะเลือกที่ภาพ">
                  <input
                    className={inputClass}
                    value={extract}
                    placeholder="1, 3, 5-7"
                    inputMode="numeric"
                    aria-invalid={!!plan.error}
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
                <p role="alert" className="text-sm text-danger">
                  {plan.error}
                </p>
              ) : (
                plan.groups.length > 0 && (
                  <p className="rounded-xl bg-primary-soft px-3 py-2 text-sm font-medium text-primary">
                    จะได้ {plan.groups.length} ไฟล์
                    {plan.groups.length > 1 ? " (รวมเป็น .zip)" : ` (${plan.groups[0].length} หน้า)`}
                  </p>
                )
              )}
            </Panel>
            <ActionBar
              task={task}
              label="แยก PDF"
              disabled={plan.groups.length === 0}
              hint={emptyInput ? (mode === "ranges" ? "พิมพ์ช่วงหน้าก่อน" : "เลือกหน้าที่ต้องการก่อน") : undefined}
              onRun={() =>
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
              onStartOver={clear}
            />
          </>
        }
      />
    </>
  );
}
