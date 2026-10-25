# วัดว่าการตัดบรรทัดตรงกับต้นฉบับแค่ไหน: ข้อความแต่ละบรรทัดของต้นฉบับ ไปเจอเป็นบรรทัดเดียวกันในผลลัพธ์ไหม
# พิมพ์บรรทัดที่ไม่ตรง พร้อมความกว้าง (pt) ของบรรทัดต้นฉบับ เพื่อดูว่าบรรทัดยาว ๆ ถูกตัดก่อนหรือไม่
import sys

import pymupdf


def lines_of(path: str):
    out = []
    doc = pymupdf.open(path)
    for pno, page in enumerate(doc):
        rows: dict[tuple, list] = {}
        for block in page.get_text("dict")["blocks"]:
            for line in block.get("lines", []):
                for span in line["spans"]:
                    if not span["text"].strip():
                        continue
                    key = (pno, round(span["origin"][1] / 2))  # จัดกลุ่มตามเส้นฐาน (ห่างไม่เกิน ~2pt)
                    rows.setdefault(key, []).append(span)
        for key in sorted(rows):
            spans = sorted(rows[key], key=lambda s: s["bbox"][0])
            text = "".join("".join(s["text"].split()) for s in spans)
            x0, x1 = spans[0]["bbox"][0], spans[-1]["bbox"][2]
            out.append((text, x0, x1))
    return out


orig = lines_of(sys.argv[1])
rt = lines_of(sys.argv[2])
rt_set = {t for t, *_ in rt}
miss = [(t, x0, x1) for t, x0, x1 in orig if t not in rt_set]
print(f"lines: original {len(orig)} | roundtrip {len(rt)} | exact-match {len(orig) - len(miss)}/{len(orig)} ({100 * (len(orig) - len(miss)) / max(1, len(orig)):.0f}%)")
for t, x0, x1 in miss[: int(sys.argv[3]) if len(sys.argv) > 3 else 12]:
    print(f"  x {x0:6.1f}-{x1:6.1f} w {x1 - x0:6.1f} | {t[:70]}")
# บรรทัดที่ตรงกัน: อัตราส่วนความกว้าง ผลลัพธ์/ต้นฉบับ (>1 = Word วาดกว้างกว่า)
rt_w = {t: (a, b) for t, a, b in rt}
ratios = [((rt_w[t][1] - rt_w[t][0]) / (x1 - x0), t) for t, x0, x1 in orig if t in rt_w and x1 - x0 > 80]
if ratios:
    rs = sorted(r for r, _ in ratios)
    print(f"width ratio (matched lines >80pt): min {rs[0]:.4f} median {rs[len(rs) // 2]:.4f} max {rs[-1]:.4f}")
    for r, t in sorted(ratios)[:3] + sorted(ratios)[-3:]:
        print(f"   {r:.4f} | {t[:50]}")
