import type { Metadata } from "next";
import { ToolShell } from "@/components/tool-shell";
import { UnlockTool } from "@/components/tools/unlock-tool";
import { getTool } from "@/lib/tools";

const tool = getTool("unlock");

export const metadata: Metadata = { title: tool.title, description: tool.summary };

export default function Page() {
  return (
    <ToolShell slug="unlock">
      <UnlockTool />
    </ToolShell>
  );
}
