"use client";

import { useEffect, useState } from "react";
import { ActionBar } from "@/components/action-bar";
import { Dropzone } from "@/components/dropzone";
import { ThumbPreview } from "@/components/page-thumb";
import { Checkbox, EmptyState, Panel, PasswordField, SourceBar, Steps, ToolLayout } from "@/components/ui";
import { baseName, isPdfFile, PDF_ACCEPT, pdfBlob } from "@/lib/files";
import { runMupdf } from "@/lib/mupdf/client";
import { passwordProblem, type Permission } from "@/lib/mupdf/ops";
import { usePdfSource } from "@/lib/use-pdf-source";
import { useTask } from "@/lib/use-task";

const ALLOW_ALL: Record<Permission, boolean> = { print: true, copy: true, edit: true };

export function ProtectTool() {
  const pdf = usePdfSource({ thumbSize: 200 });
  const task = useTask();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [allow, setAllow] = useState(ALLOW_ALL);

  // โหลดตัวเข้ารหัสไว้ระหว่างผู้ใช้ตั้งรหัส
  const hasSource = Boolean(pdf.source);
  useEffect(() => {
    if (hasSource) void runMupdf("warmUp").catch(() => {});
  }, [hasSource]);

  function clear() {
    task.reset();
    setPassword("");
    setConfirm("");
    setAllow(ALLOW_ALL);
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
  const problem = password ? passwordProblem(password) : null;
  const mismatch = confirm !== "" && confirm !== password;
  const ready = password !== "" && !problem && confirm === password;
  const hint = !password
    ? "ตั้งรหัสผ่านก่อน"
    : problem
      ? problem
      : confirm !== password
        ? "พิมพ์รหัสผ่านอีกครั้งให้ตรงกัน"
        : undefined;

  function change(fn: () => void) {
    task.reset();
    fn();
  }

  function run() {
    if (!ready || task.state.status === "working") return;
    void task.run(async (progress) => {
      progress("กำลังใส่รหัส…");
      const bytes = await runMupdf("protectPdf", source.bytes.slice(), { password, allow });
      return { blob: pdfBlob(bytes), name: `${baseName(source.file.name)}-protected.pdf`, note: "AES 256-bit" };
    });
  }

  return (
    <>
      <Steps current={task.state.status === "done" ? 3 : 2} />
      <ToolLayout
        top={<SourceBar name={source.file.name} detail={`${source.pageCount} หน้า`} onClear={clear} />}
        main={<ThumbPreview thumbs={pdf.thumbs} pageCount={source.pageCount} note="ล็อกทั้งไฟล์" />}
        optionsFirst
        side={
          <>
            <Panel title="ตั้งรหัสผ่าน">
              <PasswordField
                label="รหัสผ่าน"
                value={password}
                onChange={(v) => change(() => setPassword(v))}
                error={problem}
                autoComplete="new-password"
                autoFocus
              />
              <PasswordField
                label="พิมพ์รหัสผ่านอีกครั้ง"
                value={confirm}
                onChange={(v) => change(() => setConfirm(v))}
                error={mismatch ? "รหัสผ่านสองช่องไม่ตรงกัน" : null}
                hint="จดรหัสไว้ให้ดี — ถ้าลืมจะเปิดไฟล์ไม่ได้ และไม่มีใครกู้คืนให้ได้"
                autoComplete="new-password"
                onEnter={run}
              />
            </Panel>
            <Panel title="ผู้เปิดไฟล์ทำอะไรได้บ้าง">
              <div className="-my-1 space-y-0.5">
                <Checkbox label="พิมพ์" checked={allow.print} onChange={(v) => change(() => setAllow({ ...allow, print: v }))} />
                <Checkbox label="คัดลอกข้อความ" checked={allow.copy} onChange={(v) => change(() => setAllow({ ...allow, copy: v }))} />
                <Checkbox label="แก้ไขเนื้อหาและกรอกฟอร์ม" checked={allow.edit} onChange={(v) => change(() => setAllow({ ...allow, edit: v }))} />
              </div>
              <p className="text-sm text-muted">โปรแกรมอ่าน PDF ทั่วไปทำตามข้อห้ามนี้ แต่บางโปรแกรมไม่สนใจ — ใช้กันการพิมพ์/คัดลอกทั่วไปได้ ไม่ใช่การป้องกันเด็ดขาด</p>
            </Panel>
            <ActionBar task={task} label="ใส่รหัส PDF" disabled={!ready} hint={hint} onRun={run} onStartOver={clear} />
          </>
        }
      />
    </>
  );
}
