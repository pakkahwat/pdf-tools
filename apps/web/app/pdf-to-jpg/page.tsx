import type { Metadata } from "next";
import { ToolShell } from "@/components/tool-shell";
import { PdfToImagesTool } from "@/components/tools/pdf-to-images-tool";
import { getTool } from "@/lib/tools";

const tool = getTool("pdf-to-jpg");

export const metadata: Metadata = { title: tool.title, description: tool.summary };

export default function Page() {
  return (
    <ToolShell slug="pdf-to-jpg">
      <PdfToImagesTool />
    </ToolShell>
  );
}