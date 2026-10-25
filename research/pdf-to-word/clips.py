# หา clip path ที่ครอบภาพ (เช่นครอปวงกลม) จาก get_drawings(extended=True)
import sys

import pymupdf

doc = pymupdf.open(sys.argv[1])
page = doc[0]
imgs = [(i[0], page.get_image_bbox(i)) for i in page.get_images(full=True)]
print("images:", [(x, [round(v, 1) for v in r]) for x, r in imgs])
for d in page.get_drawings(extended=True):
    if d.get("type") != "clip":
        continue
    sc = d.get("scissor")
    if not sc or sc.width > 120 or sc.height > 120:
        continue
    kinds = "".join(it[0] for it in d.get("items", []))
    print("clip scissor", [round(v, 1) for v in sc], "items", kinds, "level", d.get("level"), "even_odd", d.get("even_odd"))
