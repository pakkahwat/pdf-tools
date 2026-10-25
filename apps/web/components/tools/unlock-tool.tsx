"use client";

import { useState } from "react";
import { ActionBar } from "@/components/action-bar";
import { Dropzone } from "@/components/dropzone";
import { EmptyState, Panel, PasswordField, SourceBar, Steps, ToolLayout } from "@/components/ui";
import { baseName, isPdfFile, PDF_ACCEPT, pdfBlob } from "@/lib/files";
import { runMupdf } from "@/lib/mupdf/client";
import type { LockInfo, Permission } from "@/lib/mupdf/ops";
import { errorMessage, useTask } from "@/lib/use-task";

const PERMISSION_NAMES: Record<Permission, string> = { print: "พิมพ์", copy: "คัดลอกข้อความ", edit: "แก้ไข" };

type Source = { file: File; bytes: Uint8Array; info: LockInfo };

/** ไฟล์ที่มีรหัสผ่านเปิดด้วย pdf.js ไม่ได้ (ไม่มีภาพย่อ) — ตรวจสถานะการล็อกด้วย mupdf ทันทีที่เลือกไฟล์ */
export function UnlockTool() {
  const task = useTask();
  const [source, setSource] = useState<Source | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(file: File) {
    setError(null);
    setLoading(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      // ส่งสำเนาไป — worker ได้ buffer ไปใช้ ส่วนต้นฉบับเก็บไว้ปลดรหัส
      const info = await runMupdf("inspectLock", bytes.slice());
      if (!info.encrypted) {
        setError(`ไฟล์ “${file.name}” ไม่ได้ล็อกไว้ — เปิดและใช้กับเครื่องมืออื่นได้เลยโดยไม่ต้องปลดรหัส`);
      } else {
        setSource({ file, bytes, info });
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  function clear() {
    task.reset();
    setSource(null);
    setPassword("");
    setError(null);
  }

  if (!source) {
    return (
      <>
        <Steps current={1} />
        <EmptyState error={error}>
          <Dropzone
            accept={PDF_ACCEPT}
            filter={isPdfFile}
            onFiles={([f]) => void load(f)}
            onRejected={() => setError("ไฟล์นี้ไม่ใช่ PDF — กรุณาเลือกไฟล์ .pdf")}
            buttonLabel="เลือกไฟล์ PDF ที่ล็อกไว้"
            busy={loading}
          />
        </EmptyState>
      </>
    );
  }

  const { info } = source;
  const needsPassword = info.needsPassword;
  const working = task.state.status === "working";

  function run() {
    if (working || (needsPassword && !password)) return;
    void task.run(async (progress) => {
      progress("กำลังปลดรหัส…");
      const bytes = await runMupdf("unlockPdf", source!.bytes.slice(), needsPassword ? password : "");
      return { blob: pdfBlob(bytes), name: `${baseName(source!.file.name)}-unlocked.pdf`, note: "ไม่มีรหัสผ่านแล้ว" };
    });
  }

  return (
    <>
      <Steps current={task.state.status === "done" ? 3 : 2} />
      <ToolLayout
        top={
          <SourceBar
            name={source.file.name}
            detail={[info.pages ? `${info.pages} หน้า` : null, info.method ? `เข้ารหัส ${info.method}` : null].filter(Boolean).join(" · ")}
            onClear={clear}
          />
        }
        main={
          <div className="flex gap-4 rounded-2xl border border-line bg-card p-5 sm:p-6">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary" aria-hidden>
              <LockIcon />
            </span>
            <div className="space-y-1.5">
              {needsPassword ? (
                <>
                  <h2 className="text-lg font-semibold">ไฟล์นี้ต้องใช้รหัสผ่านเปิด</h2>
                  <p className="text-muted">
                    ใส่รหัสผ่านของไฟล์ แล้วกด “ปลดรหัส PDF” — จะได้ไฟล์ใหม่ที่เปิดได้เลยโดยไม่ต้องใส่รหัส
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-lg font-semibold">
                    ไฟล์นี้เปิดได้ แต่ถูกห้าม{info.restricted.length ? info.restricted.map((p) => PERMISSION_NAMES[p]).join(" ") : "บางอย่าง"}
                  </h2>
                  <p className="text-muted">ปลดข้อห้ามได้ทันทีโดยไม่ต้องใช้รหัส — กด “ปลดรหัส PDF” ได้เลย</p>
                </>
              )}
              <p className="text-sm text-muted">ปลดรหัสเฉพาะไฟล์ของคุณเองหรือไฟล์ที่ได้รับอนุญาตเท่านั้น</p>
            </div>
          </div>
        }
        side={
          <>
            {needsPassword && (
              <Panel title="รหัสผ่านของไฟล์">
                <PasswordField
                  label="รหัสผ่าน"
                  value={password}
                  onChange={(v) => {
                    setPassword(v);
                    if (task.state.status === "error") task.reset();
                  }}
                  hint="ตัวพิมพ์เล็ก/ใหญ่ถือว่าต่างกัน"
                  autoFocus
                  onEnter={run}
                />
              </Panel>
            )}
            <ActionBar
              task={task}
              label="ปลดรหัส PDF"
              disabled={needsPassword && !password}
              hint={needsPassword && !password ? "ใส่รหัสผ่านของไฟล์ก่อน" : undefined}
              onRun={run}
              onStartOver={clear}
            />
          </>
        }
      />
    </>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14.5v2.5" />
    </svg>
  );
}
