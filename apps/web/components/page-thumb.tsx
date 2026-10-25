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
