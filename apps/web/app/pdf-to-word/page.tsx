import type { Metadata } from "next";
import { ToolShell } from "@/components/tool-shell";
import { PdfToWordTool } from "@/components/tools/pdf-to-word-tool";
import { getTool } from "@/lib/tools";

const tool = getTool("pdf-to-word");

export const metadata: Metadata = { title: tool.title, description: tool.summary };

export default function Page() {
  return (
    <ToolShell slug="pdf-to-word">
      <PdfToWordTool />
    </ToolShell>
  );
}
