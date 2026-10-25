import type { Metadata } from "next";
import { ToolShell } from "@/components/tool-shell";
import { CompressTool } from "@/components/tools/compress-tool";
import { getTool } from "@/lib/tools";

const tool = getTool("compress");

export const metadata: Metadata = { title: tool.title, description: tool.summary };

export default function Page() {
  return (
    <ToolShell slug="compress">
      <CompressTool />
    </ToolShell>
  );
}
