"use client";

import { useEffect, useState } from "react";
import { ActionBar } from "@/components/action-bar";
import { Dropzone } from "@/components/dropzone";
import { ThumbPreview } from "@/components/page-thumb";
import { ChoiceCards, EmptyState, Panel, SourceBar, Steps, ToolLayout } from "@/components/ui";
import { baseName, formatBytes, isPdfFile, PDF_ACCEPT, pdfBlob } from "@/lib/files";
import { runMupdf } from "@/lib/mupdf/client";
import type { CompressLevel } from "@/lib/mupdf/ops";
import { usePdfSource } from "@/lib/use-pdf-source";
import { useTask } from "@/lib/use-task";

const LEVELS = [
  { value: "low", label: "บีบมาก", description: "ไฟล์เล็กที่สุด รูปคมชัดน้อยลง — พอสำหรับดูบนจอ" },
  { value: "recommended", label: "ปานกลาง", description: "สมดุลระหว่างขนาดกับความคมชัด เหมาะกับส่งอีเมล/LINE", badge: "แนะนำ" },
  { value: "high", label: "คุณภาพสูง", description: "ลดขนาดน้อยกว่า รูปยังคมชัด เหมาะกับสั่งพิมพ์" },
] as const satisfies readonly { value: CompressLevel; label: string; description: string; badge?: string }[];

/** ขนาดที่อีเมล/ระบบส่งไฟล์ส่วนใหญ่รับได้ */
const SEND_LIMIT = 10 * 1024 * 1024;

export function CompressTool() {
  const pdf = usePdfSource({ thumbSize: 200 });
  const task = useTask();
  const [level, setLevel] = useState<CompressLevel>("recommended");

  const hasSource = Boolean(pdf.source);
  useEffect(() => {
    if (hasSource) void runMupdf("warmUp").catch(() => {});
  }, [hasSource]);

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
            hint="ได้ผลมากกับไฟล์ที่มีรูปถ่ายหรือภาพสแกน"
          />
        </EmptyState>
      </>
    );
  }

  const { source } = pdf;
  const result = task.state.status === "done" ? task.state.result : null;
  const stillBig = result !== null && result.blob.size > SEND_LIMIT && level !== "low";

  return (
    <>
      <Steps current={result ? 3 : 2} />
      <ToolLayout
        top={
          <SourceBar name={source.file.name} detail={`${source.pageCount} หน้า · ${formatBytes(source.file.size)}`} onClear={clear} />
        }
        main={<ThumbPreview thumbs={pdf.thumbs} pageCount={source.pageCount} note="บีบอัดทั้งไฟล์" />}
        side={
          <>
            <Panel title="ระดับการบีบอัด">
              <ChoiceCards
                label="ระดับการบีบอัด"
                value={level}
                options={LEVELS}
                onChange={(v) => {
                  task.reset();
                  setLevel(v);
                }}
              />
              <p className="text-sm text-muted">ข้อความและฟอนต์ไม่ถูกแตะ — ลดขนาดจากรูปภาพและโครงสร้างไฟล์เท่านั้น</p>
              {stillBig && (
                <p className="rounded-xl bg-cta/10 px-3.5 py-2.5 text-sm text-cta">
                  ยังใหญ่กว่า {formatBytes(SEND_LIMIT)} — ลองเลือก “บีบมาก” แล้วบีบอัดใหม่
                </p>
              )}
            </Panel>
            <ActionBar
              task={task}
              label="บีบอัด PDF"
              onRun={() =>
                task.run(async (progress) => {
                  progress("กำลังบีบอัด…");
                  const out = await runMupdf("compressPdf", source.bytes.slice(), level);
                  // ปัดลง — ลดลง 99.8% ไม่ควรขึ้นว่า 100%
                  const saved = Math.floor((1 - out.after / out.before) * 100);
                  return {
                    blob: pdfBlob(out.bytes),
                    name: `${baseName(source.file.name)}-compressed.pdf`,
                    note: out.smaller && saved > 0 ? `เล็กลง ${saved}% จาก ${formatBytes(out.before)}` : "ไฟล์นี้บีบอัดมาดีแล้ว ขนาดเท่าเดิม",
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
