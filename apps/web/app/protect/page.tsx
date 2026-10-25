import type { Metadata } from "next";
import { ToolShell } from "@/components/tool-shell";
import { ProtectTool } from "@/components/tools/protect-tool";
import { getTool } from "@/lib/tools";

const tool = getTool("protect");

export const metadata: Metadata = { title: tool.title, description: tool.summary };

export default function Page() {
  return (
    <ToolShell slug="protect">
      <ProtectTool />
    </ToolShell>
  );
}
