import type { ToolSlug } from "@/lib/tools";

const PATHS: Record<ToolSlug | "soon", React.ReactNode> = {
  merge: (
    <>
      <rect x="3" y="3" width="8" height="11" rx="1.5" />
      <rect x="13" y="3" width="8" height="11" rx="1.5" />
      <path d="M7 14v2a2 2 0 0 0 2 2h1.5M17 14v2a2 2 0 0 1-2 2h-1.5M12 18v3" />
    </>
  ),
  split: (
    <>
      <rect x="6" y="2" width="12" height="20" rx="1.5" />
      <path d="M3 12h4M17 12h4M9.5 12h1.5M13 12h1.5" />
    </>
  ),
  rotate: (
    <>
      <path d="M20 12a8 8 0 1 1-2.34-5.66" />
      <path d="M20 4v5h-5" />
    </>
  ),
  organize: (
    <>
      <rect x="3" y="3" width="7" height="8" rx="1.2" />
      <rect x="14" y="3" width="7" height="8" rx="1.2" />
      <rect x="3" y="14" width="7" height="7" rx="1.2" />
      <path d="M14 17.5h7M17.5 14v7" />
    </>
  ),
  "jpg-to-pdf": (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="1.8" />
      <path d="m21 16-5-5-8 9" />
    </>
  ),
  "pdf-to-jpg": (
    <>
      <path d="M6 2h8l4 4v6" />
      <path d="M6 2a1 1 0 0 0-1 1v8" />
      <rect x="3" y="13" width="18" height="9" rx="1.5" />
      <path d="m7 20 3-3 2 2 2-2 3 3" />
    </>
  ),
  watermark: (
    <>
      <path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11z" />
      <path d="M9.5 15a2.5 2.5 0 0 0 2.5 2.5" />
    </>
  ),
  "page-numbers": (
    <>
      <rect x="4" y="2" width="16" height="20" rx="1.5" />
      <path d="M10 13h4M10.5 17l1-6M13.5 17l1-6" transform="translate(-1 0)" />
    </>
  ),
  soon: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
};

export function ToolIcon({ name, className = "h-6 w-6" }: { name: ToolSlug | "soon"; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {PATHS[name]}
    </svg>
  );
}
