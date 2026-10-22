import type { Metadata } from "next";
import { ToolShell } from "@/components/tool-shell";
import { ImagesToPdfTool } from "@/components/tools/images-to-pdf-tool";
import { getTool } from "@/lib/tools";

const tool = getTool("jpg-to-pdf");

export const metadata: Metadata = { title: tool.title, description: tool.summary };

export default function Page() {
  return (
    <ToolShell slug="jpg-to-pdf">
      <ImagesToPdfTool />
    </ToolShell>
  );
}