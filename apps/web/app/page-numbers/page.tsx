import type { Metadata } from "next";
import { ToolShell } from "@/components/tool-shell";
import { PageNumbersTool } from "@/components/tools/page-numbers-tool";
import { getTool } from "@/lib/tools";

const tool = getTool("page-numbers");

export const metadata: Metadata = { title: tool.title, description: tool.summary };

export default function Page() {
  return (
    <ToolShell slug="page-numbers">
      <PageNumbersTool />
    </ToolShell>
  );
}