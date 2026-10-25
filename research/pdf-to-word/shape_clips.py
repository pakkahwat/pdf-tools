# รูปที่ PDF ครอปเป็นวงกลม/วงรี (clip path เป็นเส้นโค้งล้วน ครอบพอดีขอบรูป) → ใน DOCX ใช้รูปทรง ellipse
# (Word ครอปรูปตามรูปทรงเองและยังแก้ไขรูปได้ตามปกติ) — จับคู่ภาพใน DOCX จากตำแหน่ง/ขนาดบนหน้า
import re
import sys
import zipfile

import pymupdf

TOL = 1.5  # pt


def ellipse_image_boxes(pdf_path: str) -> list[tuple[int, pymupdf.Rect]]:
    doc = pymupdf.open(pdf_path)
    found = []
    for pno, page in enumerate(doc):
        boxes = [page.get_image_bbox(i) for i in page.get_images(full=True)]
        for d in page.get_drawings(extended=True):
            if d.get("type") != "clip" or not d.get("items"):
                continue
            if any(it[0] != "c" for it in d["items"]):
                continue
            sc = d["scissor"]
            for b in boxes:
                if all(abs(a - c) <= TOL for a, c in zip(b, sc)):
                    found.append((pno, b))
    return found


def apply(pdf_path: str, src: str, dst: str) -> int:
    targets = ellipse_image_boxes(pdf_path)
    changed = 0
    zin = zipfile.ZipFile(src)
    zout = zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED)
    emu = lambda v: int(v) / 12700
    for item in zin.infolist():
        data = zin.read(item.filename)
        if item.filename == "word/document.xml" and targets:
            xml = data.decode()

            def repl(m: re.Match) -> str:
                nonlocal changed
                a = m.group(0)
                ext = re.search(r'<wp:extent cx="(\d+)" cy="(\d+)"', a)
                ph = re.search(r'<wp:positionH relativeFrom="page">\s*<wp:posOffset>(-?\d+)</wp:posOffset>', a)
                pv = re.search(r'<wp:positionV relativeFrom="page">\s*<wp:posOffset>(-?\d+)</wp:posOffset>', a)
                if not (ext and ph and pv):
                    return a
                x0, y0 = emu(ph.group(1)), emu(pv.group(1))
                box = (x0, y0, x0 + emu(ext.group(1)), y0 + emu(ext.group(2)))
                # หมายเหตุ: ทดลองกับเอกสารหน้าเดียว — ของจริงต้องรู้ว่า anchor อยู่หน้าไหน
                if any(all(abs(p - q) <= TOL for p, q in zip(box, b)) for _, b in targets):
                    changed += 1
                    return a.replace('prst="rect"', 'prst="ellipse"')
                return a

            xml = re.sub(r"<wp:anchor .*?</wp:anchor>", repl, xml, flags=re.S)
            data = xml.encode()
        zout.writestr(item, data)
    zout.close()
    return changed


if __name__ == "__main__":
    print("ellipse images:", apply(sys.argv[1], sys.argv[2], sys.argv[3]))
