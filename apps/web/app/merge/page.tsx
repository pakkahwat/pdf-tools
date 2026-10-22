import type { Metadata } from "next";
import { ToolShell } from "@/components/tool-shell";
import { MergeTool } from "@/components/tools/merge-tool";
import { getTool } from "@/lib/tools";

const tool = getTool("merge");

export const metadata: Metadata = { title: tool.title, description: tool.summary };

export default function Page() {
  return (
    <ToolShell slug="merge">
      <MergeTool />
    </ToolShell>
  );
}