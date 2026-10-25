import { Spinner } from "./ui";

/** ภาพย่อแค่บางหน้าให้ผู้ใช้เห็นว่าเลือกไฟล์ถูก — สำหรับเครื่องมือที่ทำกับทั้งไฟล์ ไม่ต้องเลือกหน้า */
export function ThumbPreview({
  thumbs,
  pageCount,
  max = 8,
  note = "ทำกับทั้งไฟล์",
}: {
  thumbs: (string | null)[];
  pageCount: number;
  max?: number;
  note?: string;
}) {
  return (
    <>
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {thumbs.slice(0, max).map((thumb, i) => (
          <li key={i}>
            <PageThumb src={thumb} alt={`หน้า ${i + 1}`} />
            <span className="mt-1 block px-1 text-sm text-muted">หน้า {i + 1}</span>
          </li>
        ))}
      </ul>
      {pageCount > max && (
        <p className="mt-3 text-sm text-muted">
          และอีก {pageCount - max} หน้า — {note}
        </p>
      )}
    </>
  );
}

/** ภาพย่อหนึ่งหน้า: ช่องสี่เหลี่ยมจัตุรัสเพื่อให้หมุน 90° แล้วภาพยังพอดีช่อง */
export function PageThumb({
  src,
  rotate = 0,
  alt,
  className = "",
}: {
  /** null = กำลังวาด, "" = วาดไม่ได้ */
  src: string | null | undefined;
  rotate?: number;
  alt: string;
  className?: string;
}) {
  return (
    <div className={`relative grid aspect-square place-items-center overflow-hidden rounded-xl bg-thumb ${className}`}>
      {src ? (
        // วางแบบ absolute + margin auto: ขนาดย่อตามช่องโดยคงสัดส่วนหน้า (max-h แบบ % ใช้กับ grid ที่สูงตาม aspect-ratio ไม่ได้)
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="absolute inset-0 m-auto max-h-[calc(100%-20px)] max-w-[calc(100%-20px)] rounded-[3px] shadow-[0_1px_3px_rgb(0_0_0/0.18),0_4px_12px_-4px_rgb(0_0_0/0.18)] transition-transform duration-300 ease-out"
          style={{ transform: rotate ? `rotate(${rotate}deg)` : undefined }}
        />
      ) : src === "" ? (
        <span className="px-2 text-center text-sm text-muted">แสดงตัวอย่างไม่ได้</span>
      ) : (
        <Spinner className="h-5 w-5 text-muted" />
      )}
    </div>
  );
}
