import type { Metadata } from "next";
import { ToolShell } from "@/components/tool-shell";
import { OrganizeTool } from "@/components/tools/organize-tool";
import { getTool } from "@/lib/tools";

const tool = getTool("organize");

export const metadata: Metadata = { title: tool.title, description: tool.summary };

export default function Page() {
  return (
    <ToolShell slug="organize">
      <OrganizeTool />
    </ToolShell>
  );
}