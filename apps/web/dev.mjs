// ตัวรัน `next dev` สำหรับปุ่ม preview ของ Claude Code (.claude/launch.json ของ workspace) — รัน `npm run dev` ตรงๆ ได้เช่นกัน
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const child = spawn("npm.cmd", ["run", "dev"], { cwd: here, stdio: "inherit", shell: true });
child.on("exit", (code) => process.exit(code ?? 0));
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill());
