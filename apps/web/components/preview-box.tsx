import { ErrorBox, Spinner } from "./ui";

/** พรีวิวผลลัพธ์จริงหนึ่งหน้า — บนมือถือเตี้ยลงเพื่อให้เห็นตัวเลือกด้านล่างโดยไม่ต้องเลื่อนไกล */
export function PreviewBox({
  url,
  updating,
  error,
  alt,
}: {
  url: string | null;
  updating: boolean;
  error: string | null;
  alt: string;
}) {
  if (error) return <ErrorBox message={error} />;
  return (
    <figure className="relative grid min-h-72 place-items-center rounded-2xl bg-thumb p-4 sm:p-6">
      {url ? (
        <img
          src={url}
          alt={alt}
          className="max-h-[52dvh] max-w-full rounded-[3px] shadow-[0_2px_6px_rgb(0_0_0/0.15),0_12px_32px_-12px_rgb(0_0_0/0.3)] lg:max-h-[72dvh]"
        />
      ) : (
        <Spinner className="h-7 w-7 text-muted" />
      )}
      {url && updating && (
        <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-card/95 px-3 py-1.5 text-sm text-muted shadow">
          <Spinner className="h-4 w-4" />
          กำลังอัปเดต
        </span>
      )}
      <figcaption className="sr-only">ตัวอย่างผลลัพธ์</figcaption>
    </figure>
  );
}
