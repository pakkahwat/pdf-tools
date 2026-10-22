import { Spinner } from "./ui";

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
    <div className={`thumb-bg relative grid aspect-square place-items-center overflow-hidden rounded-xl ${className}`}>
      {src ? (
        // วางแบบ absolute + margin auto: ขนาดย่อตามช่องโดยคงสัดส่วนหน้า (max-h แบบ % ใช้กับ grid ที่สูงตาม aspect-ratio ไม่ได้)
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="absolute inset-0 m-auto max-h-[calc(100%-16px)] max-w-[calc(100%-16px)] shadow-md transition-transform duration-200"
          style={{ transform: rotate ? `rotate(${rotate}deg)` : undefined }}
        />
      ) : src === "" ? (
        <span className="text-xs text-muted">แสดงตัวอย่างไม่ได้</span>
      ) : (
        <Spinner className="h-5 w-5 text-muted" />
      )}
    </div>
  );
}
