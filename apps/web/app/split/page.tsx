import type { Metadata } from "next";
import { ToolShell } from "@/components/tool-shell";
import { SplitTool } from "@/components/tools/split-tool";
import { getTool } from "@/lib/tools";

const tool = getTool("split");

export const metadata: Metadata = { title: tool.title, description: tool.summary };

export default function Page() {
  return (
    <ToolShell slug="split">
      <SplitTool />
    </ToolShell>
  );
}