import type { Metadata } from "next";
import { ToolShell } from "@/components/tool-shell";
import { RotateTool } from "@/components/tools/rotate-tool";
import { getTool } from "@/lib/tools";

const tool = getTool("rotate");

export const metadata: Metadata = { title: tool.title, description: tool.summary };

export default function Page() {
  return (
    <ToolShell slug="rotate">
      <RotateTool />
    </ToolShell>
  );
}