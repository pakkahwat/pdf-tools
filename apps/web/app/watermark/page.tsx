import type { Metadata } from "next";
import { ToolShell } from "@/components/tool-shell";
import { WatermarkTool } from "@/components/tools/watermark-tool";
import { getTool } from "@/lib/tools";

const tool = getTool("watermark");

export const metadata: Metadata = { title: tool.title, description: tool.summary };

export default function Page() {
  return (
    <ToolShell slug="watermark">
      <WatermarkTool />
    </ToolShell>
  );
}