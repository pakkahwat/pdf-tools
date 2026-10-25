# ดูว่า PDF มีอักขระช่องว่างจริงไหม และอยู่ใน span/ฟอนต์ไหน (บรรทัดที่มีคำค้น)
import sys

import pymupdf

doc = pymupdf.open(sys.argv[1])
needle = sys.argv[2]
for block in doc[0].get_text("rawdict")["blocks"]:
    for line in block.get("lines", []):
        text = "".join(c["c"] for s in line["spans"] for c in s["chars"])
        if needle in text:
            for s in line["spans"][:8]:
                t = "".join(c["c"] for c in s["chars"])
                print(f"span font={s['font']:<28} size={s['size']:.2f} text={t!r}")
            raise SystemExit
